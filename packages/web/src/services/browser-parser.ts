/**
 * Browser-compatible AST Parser using @swc/wasm-web
 */

import initSwc, { parseSync, type ParseOptions } from '@swc/wasm-web';
import type { Module } from '@swc/wasm-web';
import type { ParseResult, ParseError } from '@web-component-analyzer/analyzer';
// @ts-ignore - Vite handles WASM imports
import wasmUrl from '@swc/wasm-web/wasm_bg.wasm?url';

let swcInitialized = false;

/**
 * Initialize SWC WASM module
 * Must be called before parsing
 */
export async function initializeSWC(): Promise<void> {
  if (swcInitialized) {
    return;
  }

  try {
    console.log('Initializing SWC WASM from:', wasmUrl);
    // Pass the WASM URL to initSwc
    await initSwc(wasmUrl);
    swcInitialized = true;
    console.log('SWC WASM initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SWC WASM:', error);
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Get SWC parsing options based on file extension
 * @param filePath - The file path to determine syntax
 * @returns SWC parsing options
 */
function getSWCOptions(filePath: string): ParseOptions {
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
function createParseError(error: unknown): ParseError {
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

/**
 * Parse React/TypeScript source code into an AST
 * @param sourceCode - The source code to parse
 * @param filePath - The file path (used to determine syntax type)
 * @returns ParseResult with AST or error
 */
export function parseComponent(sourceCode: string, filePath: string = 'component.tsx'): ParseResult & { ast?: Module } {
  if (!swcInitialized) {
    return {
      module: undefined,
      error: {
        message: 'SWC WASM not initialized. Call initializeSWC() first.'
      }
    };
  }

  try {
    const options = getSWCOptions(filePath);
    const module = parseSync(sourceCode, options);
    
    return {
      module
    };
  } catch (error) {
    return {
      module: undefined,
      error: createParseError(error)
    };
  }
}

/**
 * Browser parser function compatible with ParserFunction type
 * Used for dependency injection into Vue and Svelte parsers
 * 
 * @param sourceCode - The source code to parse
 * @param filePath - The file path (used to determine syntax type)
 * @returns Promise resolving to ParseResult with AST or error
 */
export async function parseWithSWCBrowser(sourceCode: string, filePath: string): Promise<ParseResult> {
  // Ensure SWC is initialized
  if (!swcInitialized) {
    await initializeSWC();
  }

  try {
    const options = getSWCOptions(filePath);
    const module = parseSync(sourceCode, options);
    
    return {
      module
    };
  } catch (error) {
    return {
      module: undefined,
      error: createParseError(error)
    };
  }
}
