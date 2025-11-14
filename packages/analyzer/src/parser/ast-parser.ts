/**
 * AST Parser types and utilities
 * 
 * Note: This module no longer contains parser implementation.
 * Parsing should be done by the caller using @swc/core (Node) or @swc/wasm-web (Browser).
 */

import type { Module, ParseOptions } from '@swc/core';
import type { ParseError } from './types';

export type { Module, ParseOptions };

/**
 * Result of parsing source code
 */
export interface ParseResult {
  module?: Module;
  error?: ParseError;
}

/**
 * Get SWC parsing options based on file extension
 * @param filePath - The file path to determine syntax
 * @returns SWC parsing options
 */
export function getSWCOptions(filePath: string): ParseOptions {
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
export function createParseError(error: unknown): ParseError {
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
