import * as vscode from 'vscode';
import { LanguageServerClient } from './language-server-client';
import { TypeClassifier } from '@web-component-analyzer/analyzer';
import type { 
  TypeResolver as ITypeResolver, 
  TypeQueryRequest, 
  TypeQueryResponse 
} from '@web-component-analyzer/analyzer';

/**
 * Options for configuring the TypeResolver
 */
export interface TypeResolverOptions {
  // Minimal options - no performance tuning needed
}

/**
 * Result of a type query (legacy)
 */
export interface TypeQueryResult {
  propName: string;
  isFunction: boolean;
  typeString?: string; // e.g., "() => void"
  source: 'language-server';
  error?: string;
}

/**
 * Main service for resolving TypeScript types
 * Implements the TypeResolver interface from analyzer package
 */
export class TypeResolver implements ITypeResolver {
  private languageServerClient: LanguageServerClient;
  private typeClassifier: TypeClassifier;
  private static readonly TIMEOUT_MS = 2000; // 2 seconds per requirement 4.1
  private static readonly PERFORMANCE_WARNING_MS = 500; // 500ms warning threshold

  constructor(options?: TypeResolverOptions) {
    this.languageServerClient = new LanguageServerClient();
    this.typeClassifier = new TypeClassifier();
  }

  /**
   * Query type information (implements ITypeResolver interface)
   */
  async queryType(request: TypeQueryRequest): Promise<TypeQueryResponse | null> {
    if (!request.variableName && !request.propName) {
      return null;
    }
    
    const variableName = request.variableName || request.propName!;
    const line = request.line || request.position?.line;
    const column = request.column || request.position?.character;
    
    if (line === undefined || column === undefined) {
      return null;
    }
    
    return this.resolveType(request.filePath, variableName, line, column);
  }

  /**
   * Resolve type for a single variable (implements ITypeResolver interface)
   */
  async resolveType(filePath: string, variableName: string, line?: number, column?: number): Promise<TypeQueryResponse | null> {
    if (line === undefined || column === undefined) {
      return null;
    }
    
    const result = await this.resolveTypeLegacy({
      filePath,
      componentName: '',
      propName: variableName,
      position: { line, character: column }
    });
    
    if (result.error) {
      return null;
    }
    
    return {
      typeString: result.typeString || 'unknown',
      isFunction: result.isFunction
    };
  }

  /**
   * Resolve types for multiple requests (implements ITypeResolver interface)
   */
  async resolveTypes(requests: TypeQueryRequest[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const request of requests) {
      const propName = request.propName || request.variableName;
      if (!propName) {
        continue;
      }
      
      const line = request.line || request.position?.line;
      const column = request.column || request.position?.character;
      
      if (line === undefined || column === undefined) {
        continue;
      }
      
      const result = await this.resolveType(request.filePath, propName, line, column);
      if (result) {
        results.set(propName, result.typeString);
      }
    }
    
    return results;
  }

  /**
   * Resolve type for a single prop (legacy method)
   */
  private async resolveTypeLegacy(request: TypeQueryRequest): Promise<TypeQueryResult> {
    const startTime = Date.now();
    
    try {
      // Load the document
      const document = await vscode.workspace.openTextDocument(request.filePath);
      const position = new vscode.Position(request.position!.line, request.position!.character);

      // Query the Language Server with timeout protection
      const typeDefinition = await this.withTimeout(
        () => this.languageServerClient.getTypeAtPosition(document, position),
        TypeResolver.TIMEOUT_MS
      );

      const elapsedTime = Date.now() - startTime;
      
      // Log performance warning if query took too long
      if (elapsedTime > TypeResolver.PERFORMANCE_WARNING_MS) {
        this.logPerformanceWarning(request, elapsedTime);
      }

      if (!typeDefinition) {
        this.logError('No type information available', request);
        return {
          propName: request.propName || '',
          isFunction: false,
          source: 'language-server',
          error: 'No type information available'
        };
      }

      // Classify the type
      const isFunction = this.typeClassifier.isFunction(typeDefinition.typeString);

      return {
        propName: request.propName || '',
        isFunction,
        typeString: typeDefinition.typeString,
        source: 'language-server'
      };
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this was a timeout
      if (elapsedTime >= TypeResolver.TIMEOUT_MS) {
        this.logTimeout(request, elapsedTime);
        return {
          propName: request.propName || '',
          isFunction: false,
          source: 'language-server',
          error: `Type query timed out after ${elapsedTime}ms`
        };
      }
      
      // Log the error with details
      this.logError(errorMessage, request, error);
      
      return {
        propName: request.propName || '',
        isFunction: false,
        source: 'language-server',
        error: errorMessage
      };
    }
  }



  /**
   * Wrap an async operation with timeout protection
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Log error when Language Server query fails
   */
  private logError(message: string, request: TypeQueryRequest, error?: unknown): void {
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
  private logPerformanceWarning(request: TypeQueryRequest, elapsedTime: number): void {
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
  private logTimeout(request: TypeQueryRequest, elapsedTime: number): void {
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
