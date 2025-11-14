/**
 * Main React Parser for DFD Generation
 * 
 * Coordinates AST parsing, analysis, and DFD building to extract
 * structured information from React component source code.
 */

import { DFDSourceData, ParseError } from './types';
import { SWCASTParser } from './ast-parser';
import { SWCASTAnalyzer } from './ast-analyzer';
import { DefaultDFDBuilder } from './dfd-builder';
import { ParserErrorHandler, ParsingContext } from '../utils/error-handler';
import { TypeResolver } from '../services/type-resolver';

/**
 * React Parser interface
 */
export interface ReactParser {
  parse(sourceCode: string, filePath: string): Promise<DFDSourceData>;
}

/**
 * Default implementation of React Parser
 * 
 * Orchestrates the parsing pipeline:
 * 1. Parse source code into AST using SWC
 * 2. Analyze AST to extract component information
 * 3. Build DFD source data from analysis
 * 4. Handle errors and timeouts gracefully
 */
export class DefaultReactParser implements ReactParser {
  private astParser: SWCASTParser;
  private astAnalyzer: SWCASTAnalyzer;
  private dfdBuilder: DefaultDFDBuilder;
  private errorHandler: ParserErrorHandler;

  constructor(typeResolver?: TypeResolver) {
    this.astParser = new SWCASTParser();
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
    const parseResult = await this.astParser.parseSourceCode(sourceCode, filePath);

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
 * Create a new React Parser instance
 * 
 * @param typeResolver - Optional TypeResolver for type information
 * @returns ReactParser instance
 */
export function createReactParser(typeResolver?: TypeResolver): ReactParser {
  return new DefaultReactParser(typeResolver);
}

