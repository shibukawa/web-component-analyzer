import * as vscode from 'vscode';
import { LanguageServerClient } from './language-server-client';
import { TypeClassifier } from './type-classifier';

/**
 * Options for configuring the TypeResolver
 */
export interface TypeResolverOptions {
  // Minimal options - no performance tuning needed
}

/**
 * Request to query type information for a prop
 */
export interface TypeQueryRequest {
  filePath: string;
  componentName: string;
  propName: string;
  position: { line: number; character: number };
}

/**
 * Result of a type query
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
 */
export class TypeResolver {
  private languageServerClient: LanguageServerClient;
  private typeClassifier: TypeClassifier;
  private static readonly TIMEOUT_MS = 2000; // 2 seconds per requirement 4.1
  private static readonly PERFORMANCE_WARNING_MS = 500; // 500ms warning threshold

  constructor(options?: TypeResolverOptions) {
    this.languageServerClient = new LanguageServerClient();
    this.typeClassifier = new TypeClassifier();
  }

  /**
   * Resolve type for a single prop
   */
  async resolveType(request: TypeQueryRequest): Promise<TypeQueryResult> {
    const startTime = Date.now();
    
    try {
      // Load the document
      const document = await vscode.workspace.openTextDocument(request.filePath);
      const position = new vscode.Position(request.position.line, request.position.character);

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
    } catch (error) {
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
  async resolveTypes(requests: TypeQueryRequest[]): Promise<TypeQueryResult[]> {
    const results: TypeQueryResult[] = [];

    for (const request of requests) {
      const result = await this.resolveType(request);
      results.push(result);
    }

    return results;
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
