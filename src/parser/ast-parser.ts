/**
 * AST Parser using SWC for React component analysis
 */

import * as swc from '@swc/core';
import { ParseError } from './types';

/**
 * AST Parser interface for parsing React component source code
 */
export interface ASTParser {
  parseSourceCode(sourceCode: string, filePath: string): Promise<ParseResult>;
}

/**
 * Result of parsing source code
 */
export interface ParseResult {
  module?: swc.Module;
  error?: ParseError;
}

/**
 * Implementation of AST Parser using SWC
 */
export class SWCASTParser implements ASTParser {
  /**
   * Parse source code into an AST using SWC
   * @param sourceCode - The source code to parse
   * @param filePath - The file path (used to determine syntax type)
   * @returns Promise resolving to ParseResult with module or error
   */
  async parseSourceCode(sourceCode: string, filePath: string): Promise<ParseResult> {
    try {
      const options = this.getSWCOptions(filePath);
      const module = await swc.parse(sourceCode, options);
      
      return { module };
    } catch (error) {
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
  private getSWCOptions(filePath: string): swc.ParseOptions {
    const isTypeScript = filePath.endsWith('.tsx') || filePath.endsWith('.ts');
    const isJSX = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    if (isTypeScript) {
      return {
        syntax: 'typescript',
        tsx: isJSX,
        decorators: true,
        dynamicImport: true,
      };
    } else {
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
  private createParseError(error: unknown): ParseError {
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
