/**
 * Node.js AST Parser using @swc/core
 */

import * as swc from '@swc/core';
import { getSWCOptions, createParseError, type ParseResult } from '@web-component-analyzer/analyzer';

/**
 * Parse React/TypeScript source code into an AST using Node.js SWC
 * @param sourceCode - The source code to parse
 * @param filePath - The file path (used to determine syntax type)
 * @returns Promise resolving to ParseResult with module or error
 */
export async function parseComponent(sourceCode: string, filePath: string = 'component.tsx'): Promise<ParseResult> {
  try {
    const options = getSWCOptions(filePath);
    const module = await swc.parse(sourceCode, options);
    
    return { module };
  } catch (error) {
    return {
      module: undefined,
      error: createParseError(error)
    };
  }
}
