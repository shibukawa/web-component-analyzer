"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageServerClient = exports.LanguageServerError = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Error types for Language Server failures
 */
var LanguageServerError;
(function (LanguageServerError) {
    LanguageServerError["UNAVAILABLE"] = "Language Server unavailable";
    LanguageServerError["FILE_NOT_FOUND"] = "File not found";
    LanguageServerError["TYPESCRIPT_CONFIG_ERROR"] = "TypeScript configuration error";
    LanguageServerError["TIMEOUT"] = "Request timeout";
    LanguageServerError["UNKNOWN"] = "Unknown error";
})(LanguageServerError || (exports.LanguageServerError = LanguageServerError = {}));
/**
 * Wrapper for VS Code TypeScript Language Server interactions
 */
class LanguageServerClient {
    /**
     * Get type definition at a specific position
     * Uses vscode.commands.executeCommand with TypeScript commands
     * Queries hover information to extract type strings
     * Handles document loading with vscode.workspace.openTextDocument
     */
    async getTypeAtPosition(document, position) {
        try {
            // Validate document exists
            if (!document || document.isClosed) {
                console.error('Document is closed or invalid');
                return {
                    typeString: '',
                    kind: 'unknown',
                    error: LanguageServerError.FILE_NOT_FOUND
                };
            }
            // Use vscode.commands.executeCommand with TypeScript commands
            // First try to get hover information which includes type
            const hover = await this.getHoverInfo(document, position);
            if (!hover) {
                // No hover info available - could be Language Server unavailable
                return {
                    typeString: '',
                    kind: 'unknown',
                    error: LanguageServerError.UNAVAILABLE
                };
            }
            // Extract type string from hover content
            const typeString = this.extractTypeFromHover(hover);
            if (!typeString) {
                // Hover exists but no type info - might be a TypeScript config issue
                return {
                    typeString: '',
                    kind: 'unknown',
                    error: LanguageServerError.TYPESCRIPT_CONFIG_ERROR
                };
            }
            // Try to determine the kind from hover content
            const kind = this.extractKindFromHover(hover);
            return {
                typeString,
                kind,
                documentation: this.extractDocumentationFromHover(hover)
            };
        }
        catch (error) {
            // Handle specific error types
            const errorMessage = this.categorizeError(error);
            console.error('Error getting type at position:', errorMessage, error);
            return {
                typeString: '',
                kind: 'unknown',
                error: errorMessage
            };
        }
    }
    /**
     * Get hover information (includes type)
     * Uses vscode.languages.getHover API (via executeCommand)
     * Extracts type information from hover markdown
     * Parses TypeScript type from hover content
     */
    async getHoverInfo(document, position) {
        try {
            // Validate inputs
            if (!document || document.isClosed) {
                throw new Error(LanguageServerError.FILE_NOT_FOUND);
            }
            // Use vscode.commands.executeCommand with 'vscode.executeHoverProvider'
            // This internally uses vscode.languages.getHover API
            const hovers = await vscode.commands.executeCommand('vscode.executeHoverProvider', document.uri, position);
            // Return the first hover result if available
            return hovers && hovers.length > 0 ? hovers[0] : null;
        }
        catch (error) {
            const errorMessage = this.categorizeError(error);
            console.error('Error getting hover info:', errorMessage, error);
            return null;
        }
    }
    /**
     * Execute TypeScript command with error handling
     */
    async executeTypeScriptCommand(command, args) {
        try {
            return await vscode.commands.executeCommand(command, ...args);
        }
        catch (error) {
            const errorMessage = this.categorizeError(error);
            console.error(`Error executing TypeScript command ${command}:`, errorMessage, error);
            throw new Error(errorMessage);
        }
    }
    /**
     * Categorize error into specific Language Server error types
     * Returns descriptive error messages for different failure scenarios
     */
    categorizeError(error) {
        const errorMsg = error?.message || error?.toString() || '';
        // Handle Language Server unavailable scenario
        if (errorMsg.includes('language server') ||
            errorMsg.includes('not available') ||
            errorMsg.includes('not initialized')) {
            return LanguageServerError.UNAVAILABLE;
        }
        // Handle file not found errors
        if (errorMsg.includes('file not found') ||
            errorMsg.includes('ENOENT') ||
            errorMsg.includes('does not exist')) {
            return LanguageServerError.FILE_NOT_FOUND;
        }
        // Handle TypeScript configuration errors
        if (errorMsg.includes('tsconfig') ||
            errorMsg.includes('configuration') ||
            errorMsg.includes('Cannot find') ||
            errorMsg.includes('project')) {
            return LanguageServerError.TYPESCRIPT_CONFIG_ERROR;
        }
        // Handle timeout errors
        if (errorMsg.includes('timeout') ||
            errorMsg.includes('timed out')) {
            return LanguageServerError.TIMEOUT;
        }
        // Default to unknown error
        return LanguageServerError.UNKNOWN;
    }
    /**
     * Extract type string from hover markdown content
     * Parses TypeScript type from hover content
     */
    extractTypeFromHover(hover) {
        for (const content of hover.contents) {
            if (typeof content === 'string') {
                const typeMatch = this.parseTypeFromString(content);
                if (typeMatch) {
                    return typeMatch;
                }
            }
            else if ('value' in content) {
                // Extract from MarkdownString value
                const typeMatch = this.parseTypeFromString(content.value);
                if (typeMatch) {
                    return typeMatch;
                }
            }
        }
        return null;
    }
    /**
     * Parse type from markdown string
     * Handles various TypeScript type annotation formats
     */
    parseTypeFromString(text) {
        // Look for TypeScript type annotations in various formats
        // Format: (parameter) name: type
        const paramMatch = text.match(/\(parameter\)\s+\w+:\s*(.+?)(?:\n|$)/);
        if (paramMatch) {
            return this.cleanTypeString(paramMatch[1]);
        }
        // Format: (property) name: type
        const propMatch = text.match(/\(property\)\s+[\w.]+:\s*(.+?)(?:\n|$)/);
        if (propMatch) {
            return this.cleanTypeString(propMatch[1]);
        }
        // Format: (method) name(...): type
        const methodMatch = text.match(/\(method\)\s+\w+\([^)]*\):\s*(.+?)(?:\n|$)/);
        if (methodMatch) {
            return this.cleanTypeString(methodMatch[1]);
        }
        // Format: const name: type
        const constMatch = text.match(/const\s+\w+:\s*(.+?)(?:\n|$)/);
        if (constMatch) {
            return this.cleanTypeString(constMatch[1]);
        }
        // Format: let/var name: type
        const varMatch = text.match(/(?:let|var)\s+\w+:\s*(.+?)(?:\n|$)/);
        if (varMatch) {
            return this.cleanTypeString(varMatch[1]);
        }
        // Format: function name(...): type
        const funcMatch = text.match(/function\s+\w+\([^)]*\):\s*(.+?)(?:\n|$)/);
        if (funcMatch) {
            return this.cleanTypeString(funcMatch[1]);
        }
        // Format: type name = type (for type aliases)
        const typeAliasMatch = text.match(/type\s+\w+\s*=\s*(.+?)(?:\n|$)/);
        if (typeAliasMatch) {
            return this.cleanTypeString(typeAliasMatch[1]);
        }
        // Format: interface name { ... } - extract the interface name
        const interfaceMatch = text.match(/interface\s+(\w+)/);
        if (interfaceMatch) {
            return interfaceMatch[1];
        }
        return null;
    }
    /**
     * Clean type string by removing markdown formatting and extra whitespace
     */
    cleanTypeString(typeStr) {
        return typeStr
            .replace(/```[\w]*\n?/g, '') // Remove code block markers
            .replace(/`/g, '') // Remove inline code markers
            .trim();
    }
    /**
     * Extract documentation from hover content
     */
    extractDocumentationFromHover(hover) {
        for (const content of hover.contents) {
            if (typeof content === 'string') {
                return content;
            }
            else if ('value' in content) {
                return content.value;
            }
        }
        return undefined;
    }
    /**
     * Extract kind (function, property, method, etc.) from hover content
     */
    extractKindFromHover(hover) {
        for (const content of hover.contents) {
            const text = typeof content === 'string' ? content : ('value' in content ? content.value : '');
            // Check for various kind indicators in hover text
            if (text.includes('(parameter)')) {
                return 'parameter';
            }
            if (text.includes('(property)')) {
                return 'property';
            }
            if (text.includes('(method)')) {
                return 'method';
            }
            if (text.includes('function')) {
                return 'function';
            }
            if (text.includes('const')) {
                return 'const';
            }
            if (text.includes('let') || text.includes('var')) {
                return 'variable';
            }
        }
        return 'property'; // Default kind
    }
}
exports.LanguageServerClient = LanguageServerClient;
