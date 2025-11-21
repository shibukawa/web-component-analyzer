/**
 * Svelte-specific error handling utilities
 * 
 * Provides specialized error handling for Svelte component analysis,
 * including user-friendly error messages and error recovery strategies.
 */

import { ParseError } from '../parser/types';

/**
 * Svelte-specific error codes
 */
export enum SvelteErrorCode {
  // SFC parsing errors
  INVALID_SFC = 'INVALID_SFC',
  MISSING_SCRIPT = 'MISSING_SCRIPT',
  MALFORMED_MARKUP = 'MALFORMED_MARKUP',
  
  // Runes analysis errors
  INVALID_RUNE_SYNTAX = 'INVALID_RUNE_SYNTAX',
  UNSUPPORTED_RUNE = 'UNSUPPORTED_RUNE',
  PROPS_RUNE_ERROR = 'PROPS_RUNE_ERROR',
  STATE_RUNE_ERROR = 'STATE_RUNE_ERROR',
  DERIVED_RUNE_ERROR = 'DERIVED_RUNE_ERROR',
  EFFECT_RUNE_ERROR = 'EFFECT_RUNE_ERROR',
  
  // Store analysis errors
  STORE_CREATION_ERROR = 'STORE_CREATION_ERROR',
  STORE_SUBSCRIPTION_ERROR = 'STORE_SUBSCRIPTION_ERROR',
  STORE_UPDATE_ERROR = 'STORE_UPDATE_ERROR',
  
  // Markup analysis errors
  MARKUP_PARSE_ERROR = 'MARKUP_PARSE_ERROR',
  BINDING_ANALYSIS_ERROR = 'BINDING_ANALYSIS_ERROR',
  DIRECTIVE_ANALYSIS_ERROR = 'DIRECTIVE_ANALYSIS_ERROR',
  
  // Event analysis errors
  EVENT_DISPATCHER_ERROR = 'EVENT_DISPATCHER_ERROR',
  DISPATCH_CALL_ERROR = 'DISPATCH_CALL_ERROR',
  
  // Type resolution errors
  TYPE_RESOLUTION_FAILED = 'TYPE_RESOLUTION_FAILED',
  
  // General errors
  PARSE_ERROR = 'PARSE_ERROR',
  ANALYSIS_ERROR = 'ANALYSIS_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Svelte analysis error class
 * 
 * Provides structured error information with user-friendly messages
 */
export class SvelteAnalysisError extends Error {
  constructor(
    public code: SvelteErrorCode,
    message: string,
    public line?: number,
    public column?: number,
    public context?: any
  ) {
    super(message);
    this.name = 'SvelteAnalysisError';
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(): string {
    const location = this.line && this.column 
      ? ` (line ${this.line}, column ${this.column})` 
      : '';

    switch (this.code) {
      case SvelteErrorCode.INVALID_SFC:
        return `Invalid Svelte component structure${location}. Please ensure the file is a valid .svelte file.`;
      
      case SvelteErrorCode.MISSING_SCRIPT:
        return `No <script> section found${location}. Svelte components should have a <script> section.`;
      
      case SvelteErrorCode.MALFORMED_MARKUP:
        return `Malformed markup section${location}. Please check your HTML syntax.`;
      
      case SvelteErrorCode.INVALID_RUNE_SYNTAX:
        return `Invalid rune syntax${location}. Please check the Svelte 5 runes documentation.`;
      
      case SvelteErrorCode.UNSUPPORTED_RUNE:
        return `Unsupported rune${location}. Only $props, $state, $derived, and $effect are currently supported.`;
      
      case SvelteErrorCode.PROPS_RUNE_ERROR:
        return `Error analyzing $props() rune${location}. Please check your props definition.`;
      
      case SvelteErrorCode.STATE_RUNE_ERROR:
        return `Error analyzing $state() rune${location}. Please check your state definition.`;
      
      case SvelteErrorCode.DERIVED_RUNE_ERROR:
        return `Error analyzing $derived() rune${location}. Please check your derived value definition.`;
      
      case SvelteErrorCode.EFFECT_RUNE_ERROR:
        return `Error analyzing $effect() rune${location}. Please check your effect definition.`;
      
      case SvelteErrorCode.STORE_CREATION_ERROR:
        return `Error analyzing store creation${location}. Please check your writable(), readable(), or derived() call.`;
      
      case SvelteErrorCode.STORE_SUBSCRIPTION_ERROR:
        return `Error analyzing store subscription${location}. Please check your $store syntax.`;
      
      case SvelteErrorCode.STORE_UPDATE_ERROR:
        return `Error analyzing store update${location}. Please check your store.set() or store.update() call.`;
      
      case SvelteErrorCode.MARKUP_PARSE_ERROR:
        return `Error parsing markup${location}. Please check your HTML syntax.`;
      
      case SvelteErrorCode.BINDING_ANALYSIS_ERROR:
        return `Error analyzing bindings${location}. Please check your bind: directives.`;
      
      case SvelteErrorCode.DIRECTIVE_ANALYSIS_ERROR:
        return `Error analyzing directives${location}. Please check your on:, class:, or style: directives.`;
      
      case SvelteErrorCode.EVENT_DISPATCHER_ERROR:
        return `Error analyzing createEventDispatcher${location}. Please check your event dispatcher setup.`;
      
      case SvelteErrorCode.DISPATCH_CALL_ERROR:
        return `Error analyzing dispatch() call${location}. Please check your event dispatch calls.`;
      
      case SvelteErrorCode.TYPE_RESOLUTION_FAILED:
        return `Failed to resolve type information${location}. Type information may be incomplete.`;
      
      case SvelteErrorCode.PARSE_ERROR:
        return `Failed to parse Svelte component${location}. ${this.message}`;
      
      case SvelteErrorCode.ANALYSIS_ERROR:
        return `Failed to analyze Svelte component${location}. ${this.message}`;
      
      case SvelteErrorCode.TIMEOUT:
        return `Analysis timed out${location}. The component may be too complex.`;
      
      default:
        return `An error occurred during Svelte component analysis${location}. ${this.message}`;
    }
  }

  /**
   * Convert to ParseError format
   */
  toParseError(): ParseError {
    return {
      message: this.getUserFriendlyMessage(),
      line: this.line,
      column: this.column,
    };
  }
}

/**
 * Svelte parsing context
 */
export interface SvelteParsingContext {
  filePath: string;
  sourceCode: string;
  startTime: number;
}

/**
 * Svelte error handler
 * 
 * Provides error handling utilities for Svelte component analysis
 */
export class SvelteErrorHandler {
  private readonly timeout = 5000; // 5 seconds

  /**
   * Check if timeout has been exceeded
   */
  isTimeoutExceeded(startTime: number): boolean {
    return Date.now() - startTime > this.timeout;
  }

  /**
   * Handle timeout error
   */
  handleTimeout(partialAnalysis: any, context: SvelteParsingContext): any {
    const error = new SvelteAnalysisError(
      SvelteErrorCode.TIMEOUT,
      'Analysis timed out after 5 seconds'
    );

    console.error(`[SvelteErrorHandler] Timeout in ${context.filePath}`);

    // Return partial analysis if available
    if (partialAnalysis && Object.keys(partialAnalysis).length > 0) {
      return {
        ...partialAnalysis,
        metadata: {
          ...partialAnalysis.metadata,
          error: error.toParseError(),
        },
      };
    }

    // Return empty DFD data with error
    return this.createEmptyDFDData([error.toParseError()]);
  }

  /**
   * Handle SFC parsing error
   */
  handleSFCError(error: Error, context: SvelteParsingContext): ParseError {
    console.error(`[SvelteErrorHandler] SFC parse error in ${context.filePath}:`, error);

    return {
      message: `Failed to parse Svelte SFC: ${error.message}`,
      line: undefined,
      column: undefined,
    };
  }

  /**
   * Handle missing script section
   */
  handleMissingScript(context: SvelteParsingContext): ParseError {
    return {
      message: 'No <script> section found in Svelte component',
      line: undefined,
      column: undefined,
    };
  }

  /**
   * Handle general error
   */
  handleError(error: Error, context: SvelteParsingContext): ParseError {
    console.error(`[SvelteErrorHandler] Error in ${context.filePath}:`, error);

    return {
      message: `Analysis error: ${error.message}`,
      line: undefined,
      column: undefined,
    };
  }

  /**
   * Handle component not found
   */
  handleComponentNotFound(context: SvelteParsingContext): ParseError {
    return {
      message: 'No Svelte component found in file',
      line: undefined,
      column: undefined,
    };
  }

  /**
   * Validate SFC structure
   */
  validateSFCStructure(sourceCode: string, context: SvelteParsingContext): ParseError[] {
    const errors: ParseError[] = [];

    // Check for basic SFC structure
    if (!sourceCode.includes('<script')) {
      errors.push({
        message: 'No <script> section found. Svelte components should have a <script> section.',
        line: undefined,
        column: undefined,
      });
    }

    return errors;
  }

  /**
   * Create empty DFD data with errors
   */
  createEmptyDFDData(errors: ParseError[]): any {
    return {
      nodes: [],
      edges: [],
      errors,
    };
  }

  /**
   * Wrap async operation with timeout protection
   */
  async withTimeout<T>(
    operation: () => Promise<T>,
    context: SvelteParsingContext
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new SvelteAnalysisError(
            SvelteErrorCode.TIMEOUT,
            'Analysis timed out after 5 seconds'
          ));
        }, this.timeout);
      }),
    ]);
  }

  /**
   * Attempt to recover partial analysis from error
   */
  recoverPartialAnalysis(
    error: Error,
    partialAnalysis: any,
    context: SvelteParsingContext
  ): any | null {
    // If we have partial analysis with at least some data, return it with error
    if (partialAnalysis && (
      partialAnalysis.props?.length > 0 ||
      partialAnalysis.processes?.length > 0 ||
      partialAnalysis.metadata?.svelteRunes?.length > 0
    )) {
      return {
        ...partialAnalysis,
        metadata: {
          ...partialAnalysis.metadata,
          error: {
            message: error.message,
            line: undefined,
            column: undefined,
          },
        },
      };
    }

    return null;
  }
}
