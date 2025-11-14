"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) {k2 = k;}
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
            for (var k in o) {if (Object.prototype.hasOwnProperty.call(o, k)) {ar[ar.length] = k;}}
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) {return mod;}
        var result = {};
        if (mod != null) {for (var k = ownKeys(mod), i = 0; i < k.length; i++) {if (k[i] !== "default") {__createBinding(result, mod, k[i]);}}}
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeResolver = void 0;
const vscode = __importStar(require("vscode"));
const language_server_client_1 = require("./language-server-client");
const type_classifier_1 = require("./type-classifier");
/**
 * Main service for resolving TypeScript types
 */
class TypeResolver {
    languageServerClient;
    typeClassifier;
    static TIMEOUT_MS = 2000; // 2 seconds per requirement 4.1
    static PERFORMANCE_WARNING_MS = 500; // 500ms warning threshold
    constructor(options) {
        this.languageServerClient = new language_server_client_1.LanguageServerClient();
        this.typeClassifier = new type_classifier_1.TypeClassifier();
    }
    /**
     * Resolve type for a single prop
     */
    async resolveType(request) {
        const startTime = Date.now();
        try {
            // Load the document
            const document = await vscode.workspace.openTextDocument(request.filePath);
            const position = new vscode.Position(request.position.line, request.position.character);
            // Query the Language Server with timeout protection
            const typeDefinition = await this.withTimeout(() => this.languageServerClient.getTypeAtPosition(document, position), TypeResolver.TIMEOUT_MS);
            const elapsedTime = Date.now() - startTime;
            // Log performance warning if query took too long
            if (elapsedTime > TypeResolver.PERFORMANCE_WARNING_MS) {
                this.logPerformanceWarning(request, elapsedTime);
            }
            if (!typeDefinition) {
                this.logError('No type information available', request);
                return {
                    propName: request.propName,
                    isFunction: false,
                    source: 'language-server',
                    error: 'No type information available'
                };
            }
            // Classify the type
            const isFunction = this.typeClassifier.isFunction(typeDefinition.typeString);
            return {
                propName: request.propName,
                isFunction,
                typeString: typeDefinition.typeString,
                source: 'language-server'
            };
        }
        catch (error) {
            const elapsedTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Check if this was a timeout
            if (elapsedTime >= TypeResolver.TIMEOUT_MS) {
                this.logTimeout(request, elapsedTime);
                return {
                    propName: request.propName,
                    isFunction: false,
                    source: 'language-server',
                    error: `Type query timed out after ${elapsedTime}ms`
                };
            }
            // Log the error with details
            this.logError(errorMessage, request, error);
            return {
                propName: request.propName,
                isFunction: false,
                source: 'language-server',
                error: errorMessage
            };
        }
    }
    /**
     * Resolve types for multiple props
     */
    async resolveTypes(requests) {
        const results = [];
        for (const request of requests) {
            const result = await this.resolveType(request);
            results.push(result);
        }
        return results;
    }
    /**
     * Wrap an async operation with timeout protection
     */
    async withTimeout(operation, timeoutMs) {
        return Promise.race([
            operation(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Operation timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            }),
        ]);
    }
    /**
     * Log error when Language Server query fails
     */
    logError(message, request, error) {
        console.error('[TypeResolver Error]', {
            message,
            filePath: request.filePath,
            componentName: request.componentName,
            propName: request.propName,
            position: request.position,
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
    /**
     * Log performance warning when query takes too long
     */
    logPerformanceWarning(request, elapsedTime) {
        console.warn('[TypeResolver Performance Warning]', {
            message: `Type query took ${elapsedTime}ms (threshold: ${TypeResolver.PERFORMANCE_WARNING_MS}ms)`,
            filePath: request.filePath,
            componentName: request.componentName,
            propName: request.propName,
            elapsedTime,
            timestamp: new Date().toISOString(),
        });
    }
    /**
     * Log timeout scenario
     */
    logTimeout(request, elapsedTime) {
        console.error('[TypeResolver Timeout]', {
            message: `Type query timed out after ${elapsedTime}ms (limit: ${TypeResolver.TIMEOUT_MS}ms)`,
            filePath: request.filePath,
            componentName: request.componentName,
            propName: request.propName,
            elapsedTime,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.TypeResolver = TypeResolver;
