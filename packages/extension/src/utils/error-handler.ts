/**
 * Error handler for React Parser
 * Handles syntax errors, component not found scenarios, and timeout protection
 */

import { ParseError, DFDSourceData, ComponentAnalysis } from '@web-component-analyzer/analyzer';

/**
 * Context information for error handling
 */
export interface ParsingContext {
  filePath: string;
  sourceCode: string;
  startTime: number;
}

/**
 * Timeout error class
 */
export class ParserTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParserTimeoutError';
  }
}

/**
 * Component not found error class
 */
export class ComponentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComponentNotFoundError';
  }
}

/**
 * Parser error handler class
 * Provides methods for handling various parsing errors and timeout scenarios
 */
export class ParserErrorHandler {
  private static readonly TIMEOUT_MS = 5000; // 5 seconds

  /**
   * Handle general parsing errors
   * @param error The error that occurred
   * @param context Parsing context information
   * @returns ParseError object with user-friendly message
   */
  handleError(error: Error, context: ParsingContext): ParseError {
    const parseError: ParseError = {
      message: this.getUserFriendlyMessage(error),
    };

    // Extract line and column information if available
    const locationInfo = this.extractLocationInfo(error);
    if (locationInfo) {
      parseError.line = locationInfo.line;
      parseError.column = locationInfo.column;
    }

    // Log error details for debugging
    this.logError(error, context);

    return parseError;
  }

  /**
   * Handle syntax errors with descriptive messages
   * @param error Syntax error
   * @param context Parsing context
   * @returns ParseError with syntax-specific message
   */
  handleSyntaxError(error: Error, context: ParsingContext): ParseError {
    const locationInfo = this.extractLocationInfo(error);
    
    const message = locationInfo
      ? `Syntax error at line ${locationInfo.line}, column ${locationInfo.column}: ${error.message}`
      : `Syntax error: ${error.message}`;

    this.logError(error, context);

    return {
      message,
      line: locationInfo?.line,
      column: locationInfo?.column,
    };
  }

  /**
   * Handle component not found scenarios
   * @param context Parsing context
   * @returns ParseError with component not found message
   */
  handleComponentNotFound(context: ParsingContext): ParseError {
    const error = new ComponentNotFoundError(
      `No React component found in file: ${context.filePath}`
    );

    this.logError(error, context);

    return {
      message: `No React component detected in the file. Please ensure the file contains a valid React functional or class component.`,
    };
  }

  /**
   * Handle timeout scenarios and return partial results
   * @param partialResult Partial component analysis result
   * @param context Parsing context
   * @returns DFDSourceData with partial results and timeout warning
   */
  handleTimeout(
    partialResult: Partial<ComponentAnalysis>,
    context: ParsingContext
  ): DFDSourceData {
    const elapsedTime = Date.now() - context.startTime;
    const timeoutError = new ParserTimeoutError(
      `Parsing timed out after ${elapsedTime}ms (limit: ${ParserErrorHandler.TIMEOUT_MS}ms)`
    );

    this.logError(timeoutError, context);

    // Return partial DFD data with warning
    return {
      nodes: [],
      edges: [],
      errors: [
        {
          message: `Parsing timed out after ${Math.round(elapsedTime / 1000)} seconds. The file may be too complex or contain deeply nested structures. Partial results returned.`,
        },
      ],
    };
  }

  /**
   * Check if parsing has exceeded timeout limit
   * @param startTime Start time of parsing operation
   * @returns true if timeout exceeded
   */
  isTimeoutExceeded(startTime: number): boolean {
    return Date.now() - startTime > ParserErrorHandler.TIMEOUT_MS;
  }

  /**
   * Get timeout limit in milliseconds
   * @returns Timeout limit
   */
  getTimeoutLimit(): number {
    return ParserErrorHandler.TIMEOUT_MS;
  }

  /**
   * Convert error to user-friendly message
   * @param error The error to convert
   * @returns User-friendly error message
   */
  private getUserFriendlyMessage(error: Error): string {
    if (error instanceof ParserTimeoutError) {
      return 'Parsing operation timed out. The file may be too large or complex.';
    }

    if (error instanceof ComponentNotFoundError) {
      return 'No React component found in the file.';
    }

    // Check for common SWC/parsing errors
    if (error.message.includes('Unexpected token')) {
      return `Syntax error: Unexpected token found. Please check your code for syntax errors.`;
    }

    if (error.message.includes('Expected')) {
      return `Syntax error: ${error.message}`;
    }

    // Generic error message
    return `Failed to parse component: ${error.message}`;
  }

  /**
   * Extract line and column information from error
   * @param error The error to extract location from
   * @returns Location information or null
   */
  private extractLocationInfo(error: any): { line: number; column: number } | null {
    // Try to extract from SWC error format
    if (error.span) {
      return {
        line: error.span.start?.line || 0,
        column: error.span.start?.column || 0,
      };
    }

    // Try to extract from error message patterns
    const lineMatch = error.message?.match(/line (\d+)/i);
    const columnMatch = error.message?.match(/column (\d+)/i);

    if (lineMatch || columnMatch) {
      return {
        line: lineMatch ? parseInt(lineMatch[1], 10) : 0,
        column: columnMatch ? parseInt(columnMatch[1], 10) : 0,
      };
    }

    return null;
  }

  /**
   * Log error details for debugging
   * @param error The error to log
   * @param context Parsing context
   */
  private logError(error: Error, context: ParsingContext): void {
    console.error('[ReactParser Error]', {
      errorName: error.name,
      errorMessage: error.message,
      filePath: context.filePath,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
  }

  /**
   * Create an empty DFD source data structure
   * Used when component cannot be parsed
   * @param errors Optional array of parse errors
   * @returns Empty DFDSourceData
   */
  createEmptyDFDData(errors?: ParseError[]): DFDSourceData {
    return {
      nodes: [],
      edges: [],
      errors: errors || [],
    };
  }

  /**
   * Wrap a parsing operation with timeout protection
   * @param operation The async operation to execute
   * @param context Parsing context
   * @returns Promise that resolves with operation result or rejects on timeout
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    context: ParsingContext
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(
            new ParserTimeoutError(
              `Operation timed out after ${ParserErrorHandler.TIMEOUT_MS}ms`
            )
          );
        }, ParserErrorHandler.TIMEOUT_MS);
      }),
    ]);
  }
}
