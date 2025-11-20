/**
 * Error handler for Vue Parser
 * Handles Vue SFC parsing errors, AST analysis errors, and timeout protection
 */

import { ParseError, DFDSourceData, ComponentAnalysis } from '../parser/types';
import { VueSFCParseError } from '../parser/vue-sfc-parser';

/**
 * Context information for Vue error handling
 */
export interface VueParsingContext {
  filePath: string;
  sourceCode: string;
  startTime: number;
}

/**
 * Vue analysis error codes
 */
export enum VueErrorCode {
  INVALID_SFC = 'INVALID_SFC',
  MISSING_SCRIPT_SETUP = 'MISSING_SCRIPT_SETUP',
  MISSING_TEMPLATE = 'MISSING_TEMPLATE',
  MALFORMED_SCRIPT_TAG = 'MALFORMED_SCRIPT_TAG',
  MALFORMED_TEMPLATE_TAG = 'MALFORMED_TEMPLATE_TAG',
  PARSE_ERROR = 'PARSE_ERROR',
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  UNSUPPORTED_PATTERN = 'UNSUPPORTED_PATTERN',
  TYPE_RESOLUTION_FAILED = 'TYPE_RESOLUTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Vue analysis error class with error codes
 */
export class VueAnalysisError extends Error {
  constructor(
    public code: VueErrorCode,
    message: string,
    public line?: number,
    public column?: number,
    public filePath?: string
  ) {
    super(message);
    this.name = 'VueAnalysisError';
  }

  /**
   * Create a user-friendly error message
   */
  getUserFriendlyMessage(): string {
    const location = this.line && this.column 
      ? ` at line ${this.line}, column ${this.column}`
      : '';
    
    switch (this.code) {
      case VueErrorCode.INVALID_SFC:
        return `Invalid Vue SFC structure${location}. ${this.message}`;
      
      case VueErrorCode.MISSING_SCRIPT_SETUP:
        return `No <script setup> section found. Vue 3 script setup syntax is required for analysis.`;
      
      case VueErrorCode.MISSING_TEMPLATE:
        return `No <template> section found. Vue components require a template section.`;
      
      case VueErrorCode.MALFORMED_SCRIPT_TAG:
        return `Malformed <script> tag${location}. ${this.message}`;
      
      case VueErrorCode.MALFORMED_TEMPLATE_TAG:
        return `Malformed <template> tag${location}. ${this.message}`;
      
      case VueErrorCode.PARSE_ERROR:
        return `Failed to parse Vue component${location}. ${this.message}`;
      
      case VueErrorCode.SYNTAX_ERROR:
        return `Syntax error in script setup${location}. ${this.message}`;
      
      case VueErrorCode.UNSUPPORTED_PATTERN:
        return `Unsupported Vue pattern${location}. ${this.message}`;
      
      case VueErrorCode.TYPE_RESOLUTION_FAILED:
        return `Failed to resolve types${location}. ${this.message}`;
      
      case VueErrorCode.TIMEOUT:
        return `Analysis timed out. The component may be too complex. ${this.message}`;
      
      default:
        return `Vue analysis error${location}. ${this.message}`;
    }
  }
}

/**
 * Vue parser error handler class
 * Provides methods for handling various Vue parsing errors and timeout scenarios
 */
export class VueErrorHandler {
  private static readonly TIMEOUT_MS = 5000; // 5 seconds

  /**
   * Handle general Vue parsing errors
   * @param error The error that occurred
   * @param context Parsing context information
   * @returns ParseError object with user-friendly message
   */
  handleError(error: Error, context: VueParsingContext): ParseError {
    // Convert to VueAnalysisError if not already
    const vueError = this.toVueAnalysisError(error, context);
    
    const parseError: ParseError = {
      message: vueError.getUserFriendlyMessage(),
    };

    // Add location information if available
    if (vueError.line !== undefined) {
      parseError.line = vueError.line;
    }
    if (vueError.column !== undefined) {
      parseError.column = vueError.column;
    }

    // Log error details for debugging
    this.logError(vueError, context);

    return parseError;
  }

  /**
   * Handle Vue SFC structure errors
   * @param error SFC parsing error
   * @param context Parsing context
   * @returns ParseError with SFC-specific message
   */
  handleSFCError(error: VueSFCParseError, context: VueParsingContext): ParseError {
    const vueError = new VueAnalysisError(
      VueErrorCode.INVALID_SFC,
      error.message,
      error.line,
      error.column,
      context.filePath
    );

    this.logError(vueError, context);

    return {
      message: vueError.getUserFriendlyMessage(),
      line: error.line,
      column: error.column,
    };
  }

  /**
   * Handle syntax errors in script setup
   * @param error Syntax error
   * @param context Parsing context
   * @returns ParseError with syntax-specific message
   */
  handleSyntaxError(error: Error, context: VueParsingContext): ParseError {
    const locationInfo = this.extractLocationInfo(error);
    
    const vueError = new VueAnalysisError(
      VueErrorCode.SYNTAX_ERROR,
      error.message,
      locationInfo?.line,
      locationInfo?.column,
      context.filePath
    );

    this.logError(vueError, context);

    return {
      message: vueError.getUserFriendlyMessage(),
      line: locationInfo?.line,
      column: locationInfo?.column,
    };
  }

  /**
   * Handle missing script setup section
   * @param context Parsing context
   * @returns ParseError with missing script setup message
   */
  handleMissingScriptSetup(context: VueParsingContext): ParseError {
    const vueError = new VueAnalysisError(
      VueErrorCode.MISSING_SCRIPT_SETUP,
      'No <script setup> section found in Vue SFC',
      undefined,
      undefined,
      context.filePath
    );

    this.logError(vueError, context);

    return {
      message: vueError.getUserFriendlyMessage(),
    };
  }

  /**
   * Handle missing template section
   * @param context Parsing context
   * @returns ParseError with missing template message
   */
  handleMissingTemplate(context: VueParsingContext): ParseError {
    const vueError = new VueAnalysisError(
      VueErrorCode.MISSING_TEMPLATE,
      'No <template> section found in Vue SFC',
      undefined,
      undefined,
      context.filePath
    );

    this.logError(vueError, context);

    return {
      message: vueError.getUserFriendlyMessage(),
    };
  }

  /**
   * Handle timeout scenarios and return partial results
   * @param partialResult Partial component analysis result
   * @param context Parsing context
   * @returns DFDSourceData with partial results and timeout warning
   */
  handleTimeout(
    partialResult: Partial<ComponentAnalysis> | null,
    context: VueParsingContext
  ): DFDSourceData {
    const elapsedTime = Date.now() - context.startTime;
    
    const vueError = new VueAnalysisError(
      VueErrorCode.TIMEOUT,
      `Analysis timed out after ${elapsedTime}ms (limit: ${VueErrorHandler.TIMEOUT_MS}ms)`,
      undefined,
      undefined,
      context.filePath
    );

    this.logError(vueError, context);

    // Return partial DFD data with warning
    return {
      nodes: [],
      edges: [],
      errors: [
        {
          message: `Analysis timed out after ${Math.round(elapsedTime / 1000)} seconds. The component may be too complex or contain deeply nested structures. Partial results returned.`,
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
    return Date.now() - startTime > VueErrorHandler.TIMEOUT_MS;
  }

  /**
   * Get timeout limit in milliseconds
   * @returns Timeout limit
   */
  getTimeoutLimit(): number {
    return VueErrorHandler.TIMEOUT_MS;
  }

  /**
   * Convert any error to VueAnalysisError
   * @param error The error to convert
   * @param context Parsing context
   * @returns VueAnalysisError
   */
  private toVueAnalysisError(error: Error, context: VueParsingContext): VueAnalysisError {
    // Already a VueAnalysisError
    if (error instanceof VueAnalysisError) {
      return error;
    }

    // VueSFCParseError
    if (error instanceof VueSFCParseError) {
      return new VueAnalysisError(
        VueErrorCode.INVALID_SFC,
        error.message,
        error.line,
        error.column,
        context.filePath
      );
    }

    // Check for common SWC/parsing errors
    if (error.message.includes('Unexpected token')) {
      const locationInfo = this.extractLocationInfo(error);
      return new VueAnalysisError(
        VueErrorCode.SYNTAX_ERROR,
        error.message,
        locationInfo?.line,
        locationInfo?.column,
        context.filePath
      );
    }

    if (error.message.includes('Expected')) {
      const locationInfo = this.extractLocationInfo(error);
      return new VueAnalysisError(
        VueErrorCode.SYNTAX_ERROR,
        error.message,
        locationInfo?.line,
        locationInfo?.column,
        context.filePath
      );
    }

    // Generic error
    return new VueAnalysisError(
      VueErrorCode.UNKNOWN_ERROR,
      error.message,
      undefined,
      undefined,
      context.filePath
    );
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
  private logError(error: VueAnalysisError, context: VueParsingContext): void {
    console.error('[VueParser Error]', {
      errorCode: error.code,
      errorName: error.name,
      errorMessage: error.message,
      filePath: context.filePath,
      line: error.line,
      column: error.column,
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
    context: VueParsingContext
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(
            new VueAnalysisError(
              VueErrorCode.TIMEOUT,
              `Operation timed out after ${VueErrorHandler.TIMEOUT_MS}ms`,
              undefined,
              undefined,
              context.filePath
            )
          );
        }, VueErrorHandler.TIMEOUT_MS);
      }),
    ]);
  }

  /**
   * Attempt partial analysis recovery on error
   * Returns whatever analysis results were obtained before the error
   * @param error The error that occurred
   * @param partialResult Partial analysis results
   * @param context Parsing context
   * @returns ComponentAnalysis with partial results and error information
   */
  recoverPartialAnalysis(
    error: Error,
    partialResult: Partial<ComponentAnalysis> | null,
    context: VueParsingContext
  ): ComponentAnalysis | null {
    const vueError = this.toVueAnalysisError(error, context);
    
    this.logError(vueError, context);

    // If we have some partial results, return them with error information
    if (partialResult && (partialResult.props?.length || partialResult.hooks?.length)) {
      console.warn('[VueParser] Returning partial analysis results due to error:', vueError.code);
      
      return {
        componentName: partialResult.componentName || 'VueComponent',
        componentType: 'functional',
        props: partialResult.props || [],
        hooks: partialResult.hooks || [],
        processes: partialResult.processes || [],
        jsxOutput: partialResult.jsxOutput || {
          simplified: '',
          placeholders: [],
          elements: [],
        },
        // Include error information in metadata
        metadata: {
          partialAnalysis: true,
          error: {
            code: vueError.code,
            message: vueError.getUserFriendlyMessage(),
            line: vueError.line,
            column: vueError.column,
          },
        },
      } as ComponentAnalysis;
    }

    // No useful partial results, return null
    return null;
  }

  /**
   * Validate Vue SFC structure and return validation errors
   * @param source Vue SFC source code
   * @param context Parsing context
   * @returns Array of validation errors
   */
  validateSFCStructure(source: string, context: VueParsingContext): ParseError[] {
    const errors: ParseError[] = [];

    // Check for script setup section
    if (!source.includes('<script setup')) {
      errors.push({
        message: new VueAnalysisError(
          VueErrorCode.MISSING_SCRIPT_SETUP,
          'No <script setup> section found',
          undefined,
          undefined,
          context.filePath
        ).getUserFriendlyMessage(),
      });
    }

    // Check for template section (warning, not error)
    if (!source.includes('<template>')) {
      errors.push({
        message: new VueAnalysisError(
          VueErrorCode.MISSING_TEMPLATE,
          'No <template> section found',
          undefined,
          undefined,
          context.filePath
        ).getUserFriendlyMessage(),
      });
    }

    // Check for malformed script tags
    const scriptOpenCount = (source.match(/<script/gi) || []).length;
    const scriptCloseCount = (source.match(/<\/script>/gi) || []).length;
    
    if (scriptOpenCount !== scriptCloseCount) {
      errors.push({
        message: new VueAnalysisError(
          VueErrorCode.MALFORMED_SCRIPT_TAG,
          'Opening and closing <script> tags do not match',
          undefined,
          undefined,
          context.filePath
        ).getUserFriendlyMessage(),
      });
    }

    // Check for malformed template tags
    const templateOpenCount = (source.match(/<template/gi) || []).length;
    const templateCloseCount = (source.match(/<\/template>/gi) || []).length;
    
    if (templateOpenCount !== templateCloseCount) {
      errors.push({
        message: new VueAnalysisError(
          VueErrorCode.MALFORMED_TEMPLATE_TAG,
          'Opening and closing <template> tags do not match',
          undefined,
          undefined,
          context.filePath
        ).getUserFriendlyMessage(),
      });
    }

    return errors;
  }
}
