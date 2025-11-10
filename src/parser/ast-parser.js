"use strict";
/**
 * AST Parser using SWC for React component analysis
 */
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
exports.SWCASTParser = void 0;
const swc = __importStar(require("@swc/core"));
/**
 * Implementation of AST Parser using SWC
 */
class SWCASTParser {
    /**
     * Parse source code into an AST using SWC
     * @param sourceCode - The source code to parse
     * @param filePath - The file path (used to determine syntax type)
     * @returns Promise resolving to ParseResult with module or error
     */
    async parseSourceCode(sourceCode, filePath) {
        try {
            const options = this.getSWCOptions(filePath);
            const module = await swc.parse(sourceCode, options);
            return { module };
        }
        catch (error) {
            return {
                error: this.createParseError(error)
            };
        }
    }
    /**
     * Get SWC parsing options based on file extension
     * @param filePath - The file path to determine syntax
     * @returns SWC parsing options
     */
    getSWCOptions(filePath) {
        const isTypeScript = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
        const isJSX = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');
        if (isTypeScript) {
            return {
                syntax: 'typescript',
                tsx: isJSX,
                decorators: true,
                dynamicImport: true,
            };
        }
        else {
            return {
                syntax: 'ecmascript',
                jsx: isJSX,
                decorators: true,
                dynamicImport: true,
            };
        }
    }
    /**
     * Create a ParseError from an unknown error
     * @param error - The error to convert
     * @returns ParseError object
     */
    createParseError(error) {
        if (error instanceof Error) {
            // Try to extract line and column information from SWC error
            const match = error.message.match(/(\d+):(\d+)/);
            return {
                message: error.message,
                line: match ? parseInt(match[1], 10) : undefined,
                column: match ? parseInt(match[2], 10) : undefined,
            };
        }
        return {
            message: String(error),
        };
    }
}
exports.SWCASTParser = SWCASTParser;
