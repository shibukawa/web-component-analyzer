/**
 * Node.js AST Parser using @swc/core
 */

import * as swc from '@swc/core';
import { getSWCOptions, createParseError, type ParseResult } from '@web-component-analyzer/analyzer';

/**
 * Normalize span offsets in an AST node.
 * SWC has a known issue where span offsets accumulate across multiple parse calls.
 * See: https://github.com/swc-project/swc/issues/1366
 * 
 * This function subtracts the accumulated offset from all spans in the AST.
 * 
 * @param node - Any AST node
 * @param offset - The offset to subtract from all span positions
 */
function normalizeSpans(node: unknown, offset: number): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  const obj = node as Record<string, unknown>;

  // Normalize span if present
  if (obj.span && typeof obj.span === 'object') {
    const span = obj.span as { start?: number; end?: number };
    if (typeof span.start === 'number') {
      span.start -= offset;
    }
    if (typeof span.end === 'number') {
      span.end -= offset;
    }
  }

  // Recursively process all properties
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        normalizeSpans(item, offset);
      }
    } else if (value && typeof value === 'object') {
      normalizeSpans(value, offset);
    }
  }
}

/**
 * Track the accumulated offset from previous parses.
 * SWC accumulates span offsets across multiple parse calls.
 * See: https://github.com/swc-project/swc/issues/1366
 */
let accumulatedOffset = 0;

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
    
    // Normalize spans to fix SWC's accumulating offset issue
    // We subtract the accumulated offset from previous parses
    // but NOT the offset within the current file (e.g., leading comments)
    if (accumulatedOffset > 0 && module.span) {
      normalizeSpans(module, accumulatedOffset);
    }
    
    // Update accumulated offset for next parse
    // The next file's spans will start from where this file ended
    if (module.span) {
      accumulatedOffset = module.span.end;
    }
    
    return { module };
  } catch (error) {
    return {
      module: undefined,
      error: createParseError(error)
    };
  }
}
