/**
 * Main Parser for DFD Generation
 * 
 * Coordinates AST parsing, analysis, and DFD building to extract
 * structured information from React and Vue component source code.
 */

import { DFDSourceData, ParseError } from './types';
import type { ParseResult } from './ast-parser';
import { SWCASTAnalyzer } from './ast-analyzer';
import { VueASTAnalyzer } from './vue-ast-analyzer';
import { SvelteASTAnalyzer } from './svelte-ast-analyzer';
import { DefaultDFDBuilder } from './dfd-builder';
import { ParserErrorHandler, ParsingContext } from '../utils/error-handler';
import { VueErrorHandler, VueParsingContext, VueAnalysisError } from '../utils/vue-error-handler';
import { SvelteErrorHandler, SvelteParsingContext, SvelteAnalysisError } from '../utils/svelte-error-handler';
import { VueSFCParseError } from './vue-sfc-parser';
import { TypeResolver } from '../services/type-resolver';

// Export shared SFC parser for use by other frameworks (e.g., Svelte)
export { SFCParser, SFCParseError, type SFCSection, type ParsedSFC, type SFCParserOptions } from './sfc-parser';

/**
 * Parser function type - should be provided by the caller (Node or Browser)
 */
export type ParserFunction = (sourceCode: string, filePath: string) => Promise<ParseResult>;

/**
 * Component Parser interface
 * 
 * Supports both React and Vue components
 */
export interface ComponentParser {
  parse(sourceCode: string, filePath: string): Promise<DFDSourceData>;
}

/**
 * React Parser interface (legacy, use ComponentParser instead)
 * @deprecated Use ComponentParser instead
 */
export interface ReactParser extends ComponentParser {}

/**
 * Default implementation of React Parser
 * 
 * Orchestrates the parsing pipeline:
 * 1. Parse source code into AST using provided parser function
 * 2. Analyze AST to extract component information
 * 3. Build DFD source data from analysis
 * 4. Handle errors and timeouts gracefully
 */
export class DefaultReactParser implements ReactParser {
  private parserFn: ParserFunction;
  private astAnalyzer: SWCASTAnalyzer;
  private dfdBuilder: DefaultDFDBuilder;
  private errorHandler: ParserErrorHandler;

  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    this.astAnalyzer = new SWCASTAnalyzer(typeResolver);
    this.dfdBuilder = new DefaultDFDBuilder();
    this.errorHandler = new ParserErrorHandler();
  }

  /**
   * Parse React component source code and generate DFD source data
   * 
   * @param sourceCode - The React component source code
   * @param filePath - The file path (used for error reporting and syntax detection)
   * @returns Promise resolving to DFDSourceData with nodes, edges, and any errors
   */
  async parse(sourceCode: string, filePath: string): Promise<DFDSourceData> {
    const context: ParsingContext = {
      filePath,
      sourceCode,
      startTime: Date.now(),
    };

    try {
      // Wrap the entire parsing operation with timeout protection
      return await this.errorHandler.withTimeout(
        () => this.parseInternal(sourceCode, filePath, context),
        context
      );
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.name === 'ParserTimeoutError') {
        return this.errorHandler.handleTimeout({}, context);
      }

      // Handle other unexpected errors
      const parseError = this.errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );

      return this.errorHandler.createEmptyDFDData([parseError]);
    }
  }

  /**
   * Internal parsing implementation
   */
  private async parseInternal(
    sourceCode: string,
    filePath: string,
    context: ParsingContext
  ): Promise<DFDSourceData> {
    const errors: ParseError[] = [];

    // Step 1: Parse source code into AST
    const parseResult = await this.parserFn(sourceCode, filePath);

    if (parseResult.error) {
      // Handle syntax errors
      const syntaxError = this.errorHandler.handleSyntaxError(
        new Error(parseResult.error.message),
        context
      );
      return this.errorHandler.createEmptyDFDData([syntaxError]);
    }

    if (!parseResult.module) {
      // No module parsed
      const error = this.errorHandler.handleError(
        new Error('Failed to parse source code'),
        context
      );
      return this.errorHandler.createEmptyDFDData([error]);
    }

    // Check timeout after parsing
    if (this.errorHandler.isTimeoutExceeded(context.startTime)) {
      return this.errorHandler.handleTimeout({}, context);
    }

    // Step 2: Analyze AST to extract component information
    const analysis = await this.astAnalyzer.analyze(parseResult.module, filePath, sourceCode);

    if (!analysis) {
      // No React component found
      const componentNotFoundError = this.errorHandler.handleComponentNotFound(context);
      return this.errorHandler.createEmptyDFDData([componentNotFoundError]);
    }

    // Check timeout after analysis
    if (this.errorHandler.isTimeoutExceeded(context.startTime)) {
      return this.errorHandler.handleTimeout(analysis, context);
    }

    // Step 3: Build DFD source data from analysis
    const dfdData = this.dfdBuilder.build(analysis);

    // Add any accumulated errors
    if (errors.length > 0) {
      dfdData.errors = errors;
    }

    return dfdData;
  }
}

/**
 * Default implementation of Vue Parser
 * 
 * Orchestrates the Vue parsing pipeline:
 * 1. Parse Vue SFC to extract script setup and template
 * 2. Parse script setup using SWC
 * 3. Analyze script and template to extract component information
 * 4. Build DFD source data from analysis
 * 5. Handle errors and timeouts gracefully
 */
export class DefaultVueParser implements ComponentParser {
  private astAnalyzer: VueASTAnalyzer;
  private dfdBuilder: DefaultDFDBuilder;
  private errorHandler: VueErrorHandler;

  constructor(typeResolver?: TypeResolver) {
    this.astAnalyzer = new VueASTAnalyzer(typeResolver);
    this.dfdBuilder = new DefaultDFDBuilder();
    this.errorHandler = new VueErrorHandler();
  }

  /**
   * Parse Vue component source code and generate DFD source data
   * 
   * @param sourceCode - The Vue component source code
   * @param filePath - The file path (used for error reporting)
   * @returns Promise resolving to DFDSourceData with nodes, edges, and any errors
   */
  async parse(sourceCode: string, filePath: string): Promise<DFDSourceData> {
    const context: VueParsingContext = {
      filePath,
      sourceCode,
      startTime: Date.now(),
    };

    try {
      // Validate SFC structure first
      const validationErrors = this.errorHandler.validateSFCStructure(sourceCode, context);
      if (validationErrors.length > 0) {
        // Return empty DFD with validation errors
        return this.errorHandler.createEmptyDFDData(validationErrors);
      }

      // Wrap the entire parsing operation with timeout protection
      return await this.errorHandler.withTimeout(
        () => this.parseInternal(sourceCode, filePath, context),
        context
      );
    } catch (error) {
      // Handle Vue-specific errors
      if (error instanceof VueAnalysisError) {
        const parseError = {
          message: error.getUserFriendlyMessage(),
          line: error.line,
          column: error.column,
        };
        return this.errorHandler.createEmptyDFDData([parseError]);
      }

      // Handle timeout errors
      if (error instanceof Error && error.name === 'VueAnalysisError' && (error as VueAnalysisError).code === 'TIMEOUT') {
        return this.errorHandler.handleTimeout(null, context);
      }

      // Handle SFC parse errors
      if (error instanceof VueSFCParseError) {
        const parseError = this.errorHandler.handleSFCError(error, context);
        return this.errorHandler.createEmptyDFDData([parseError]);
      }

      // Handle other unexpected errors
      const parseError = this.errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );

      return this.errorHandler.createEmptyDFDData([parseError]);
    }
  }

  /**
   * Internal parsing implementation
   */
  private async parseInternal(
    sourceCode: string,
    filePath: string,
    context: VueParsingContext
  ): Promise<DFDSourceData> {
    const errors: ParseError[] = [];
    let partialAnalysis = null;

    try {
      // Step 1: Analyze Vue SFC (parsing is done internally by VueASTAnalyzer)
      const analysis = await this.astAnalyzer.analyze(sourceCode, filePath);

      if (!analysis) {
        // No Vue component found
        const componentNotFoundError = this.errorHandler.handleMissingScriptSetup(context);
        return this.errorHandler.createEmptyDFDData([componentNotFoundError]);
      }

      partialAnalysis = analysis;

      // Check timeout after analysis
      if (this.errorHandler.isTimeoutExceeded(context.startTime)) {
        return this.errorHandler.handleTimeout(analysis, context);
      }

      // Step 2: Build DFD source data from analysis
      const dfdData = this.dfdBuilder.build(analysis);

      // Add any accumulated errors
      if (errors.length > 0) {
        dfdData.errors = errors;
      }

      return dfdData;
    } catch (error) {
      // Attempt partial analysis recovery
      const recoveredAnalysis = this.errorHandler.recoverPartialAnalysis(
        error instanceof Error ? error : new Error(String(error)),
        partialAnalysis,
        context
      );

      if (recoveredAnalysis) {
        // Build DFD from partial analysis
        const dfdData = this.dfdBuilder.build(recoveredAnalysis);
        
        // Add error information
        if (recoveredAnalysis.metadata?.error) {
          dfdData.errors = [
            {
              message: recoveredAnalysis.metadata.error.message,
              line: recoveredAnalysis.metadata.error.line,
              column: recoveredAnalysis.metadata.error.column,
            },
          ];
        }

        return dfdData;
      }

      // No recovery possible, re-throw
      throw error;
    }
  }
}

/**
 * Default implementation of Svelte Parser
 * 
 * Orchestrates the Svelte parsing pipeline:
 * 1. Parse Svelte SFC to extract script and markup
 * 2. Parse script using SWC
 * 3. Analyze script and markup to extract component information
 * 4. Build DFD source data from analysis
 * 5. Handle errors and timeouts gracefully
 */
export class DefaultSvelteParser implements ComponentParser {
  private astAnalyzer: SvelteASTAnalyzer;
  private dfdBuilder: DefaultDFDBuilder;
  private errorHandler: SvelteErrorHandler;

  constructor(typeResolver?: TypeResolver) {
    this.astAnalyzer = new SvelteASTAnalyzer(typeResolver);
    this.dfdBuilder = new DefaultDFDBuilder();
    this.errorHandler = new SvelteErrorHandler();
  }

  /**
   * Parse Svelte component source code and generate DFD source data
   * 
   * @param sourceCode - The Svelte component source code
   * @param filePath - The file path (used for error reporting)
   * @returns Promise resolving to DFDSourceData with nodes, edges, and any errors
   */
  async parse(sourceCode: string, filePath: string): Promise<DFDSourceData> {
    const context: SvelteParsingContext = {
      filePath,
      sourceCode,
      startTime: Date.now(),
    };

    try {
      // Validate SFC structure first
      const validationErrors = this.errorHandler.validateSFCStructure(sourceCode, context);
      if (validationErrors.length > 0) {
        // Return empty DFD with validation errors
        return this.errorHandler.createEmptyDFDData(validationErrors);
      }

      // Wrap the entire parsing operation with timeout protection
      return await this.errorHandler.withTimeout(
        () => this.parseInternal(sourceCode, filePath, context),
        context
      );
    } catch (error) {
      // Handle Svelte-specific errors
      if (error instanceof SvelteAnalysisError) {
        const parseError = error.toParseError();
        return this.errorHandler.createEmptyDFDData([parseError]);
      }

      // Handle timeout errors
      if (error instanceof Error && error.name === 'SvelteAnalysisError' && (error as SvelteAnalysisError).code === 'TIMEOUT') {
        return this.errorHandler.handleTimeout(null, context);
      }

      // Handle other unexpected errors
      const parseError = this.errorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );

      return this.errorHandler.createEmptyDFDData([parseError]);
    }
  }

  /**
   * Internal parsing implementation
   */
  private async parseInternal(
    sourceCode: string,
    filePath: string,
    context: SvelteParsingContext
  ): Promise<DFDSourceData> {
    const errors: ParseError[] = [];
    let partialAnalysis = null;

    try {
      // Step 1: Analyze Svelte SFC (parsing is done internally by SvelteASTAnalyzer)
      const analysis = await this.astAnalyzer.analyze(sourceCode, filePath);

      if (!analysis) {
        // No Svelte component found
        const componentNotFoundError = this.errorHandler.handleComponentNotFound(context);
        return this.errorHandler.createEmptyDFDData([componentNotFoundError]);
      }

      partialAnalysis = analysis;

      // Check timeout after analysis
      if (this.errorHandler.isTimeoutExceeded(context.startTime)) {
        return this.errorHandler.handleTimeout(analysis, context);
      }

      // Step 2: Build DFD source data from analysis
      const dfdData = this.dfdBuilder.build(analysis);

      // Add any accumulated errors
      if (errors.length > 0) {
        dfdData.errors = errors;
      }

      return dfdData;
    } catch (error) {
      // Attempt partial analysis recovery
      const recoveredAnalysis = this.errorHandler.recoverPartialAnalysis(
        error instanceof Error ? error : new Error(String(error)),
        partialAnalysis,
        context
      );

      if (recoveredAnalysis) {
        // Build DFD from partial analysis
        const dfdData = this.dfdBuilder.build(recoveredAnalysis);
        
        // Add error information
        if (recoveredAnalysis.metadata?.error) {
          dfdData.errors = [recoveredAnalysis.metadata.error];
        }

        return dfdData;
      }

      // No recovery possible, re-throw
      throw error;
    }
  }
}

/**
 * Create a new React Parser instance
 * 
 * @param parserFn - Parser function (Node or Browser implementation)
 * @param typeResolver - Optional TypeResolver for type information
 * @returns ReactParser instance
 */
export function createReactParser(parserFn: ParserFunction, typeResolver?: TypeResolver): ReactParser {
  return new DefaultReactParser(parserFn, typeResolver);
}

/**
 * Create a new Vue Parser instance
 * 
 * @param typeResolver - Optional TypeResolver for type information
 * @returns ComponentParser instance
 */
export function createVueParser(typeResolver?: TypeResolver): ComponentParser {
  return new DefaultVueParser(typeResolver);
}

/**
 * Create a new Svelte Parser instance
 * 
 * @param typeResolver - Optional TypeResolver for type information
 * @returns ComponentParser instance
 */
export function createSvelteParser(typeResolver?: TypeResolver): ComponentParser {
  return new DefaultSvelteParser(typeResolver);
}

/**
 * Create a parser based on file extension
 * 
 * @param filePath - File path to determine parser type
 * @param parserFn - Parser function for React (Node or Browser implementation)
 * @param typeResolver - Optional TypeResolver for type information
 * @returns ComponentParser instance
 */
export function createParser(
  filePath: string,
  parserFn: ParserFunction,
  typeResolver?: TypeResolver
): ComponentParser {
  // Detect framework based on file extension
  if (filePath.endsWith('.vue')) {
    return createVueParser(typeResolver);
  }
  
  if (filePath.endsWith('.svelte')) {
    return createSvelteParser(typeResolver);
  }
  
  // Default to React parser for .tsx, .jsx, .ts, .js files
  return createReactParser(parserFn, typeResolver);
}

