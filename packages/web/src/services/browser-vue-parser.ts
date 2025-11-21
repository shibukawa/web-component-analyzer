/**
 * Browser-compatible Vue SFC Parser using @swc/wasm-web
 * 
 * This module provides a browser-compatible wrapper around Vue component analysis
 * that uses @swc/wasm-web instead of @swc/core for parsing.
 */

import { parseSync, type ParseOptions } from '@swc/wasm-web';
import type { Module } from '@swc/wasm-web';
import { VueSFCParser, type ParsedVueSFC } from '@web-component-analyzer/analyzer';
import { initializeSWC } from './browser-parser';

/**
 * Parse Vue SFC script section using @swc/wasm-web
 * 
 * @param content - Script setup content
 * @param lang - Language (ts or js)
 * @returns Parsed module or null on error
 */
export async function parseVueScriptSetup(content: string, lang: string): Promise<Module | null> {
  try {
    // Ensure SWC WASM is initialized
    await initializeSWC();

    const syntax = lang === 'ts' ? 'typescript' : 'ecmascript';
    
    const options: ParseOptions = {
      syntax,
      tsx: false, // Vue doesn't use JSX in script setup
      decorators: true,
      dynamicImport: true,
    };

    const module = parseSync(content, options);
    return module;
  } catch (error) {
    console.error('Browser Vue Parser: Failed to parse script setup:', error);
    throw error;
  }
}

/**
 * Parse Vue SFC structure (template, script, style sections)
 * 
 * @param source - Vue SFC source code
 * @returns Parsed SFC structure
 */
export function parseVueSFC(source: string): ParsedVueSFC {
  const parser = new VueSFCParser();
  return parser.parse(source);
}

/**
 * Browser-compatible Vue AST Analyzer
 * 
 * This class provides the same interface as VueASTAnalyzer but uses
 * browser-compatible parsing with @swc/wasm-web.
 */
export class BrowserVueASTAnalyzer {
  private sfcParser: VueSFCParser;

  constructor() {
    this.sfcParser = new VueSFCParser();
  }

  /**
   * Analyze a Vue component from source code
   * 
   * @param source - Vue SFC source code
   * @param filePath - File path for context
   * @returns Promise resolving to parsed SFC and script module
   */
  async analyze(
    source: string,
    filePath?: string
  ): Promise<{ sfc: ParsedVueSFC; scriptModule: Module | null } | null> {
    try {
      console.log('🔍 BrowserVueASTAnalyzer: Parsing Vue SFC...');
      
      // Step 1: Parse Vue SFC structure
      let sfc: ParsedVueSFC;
      try {
        sfc = this.sfcParser.parse(source);
      } catch (error) {
        console.error('🔍 BrowserVueASTAnalyzer: SFC parsing failed:', error);
        return null;
      }

      if (!sfc.script) {
        console.log('🔍 BrowserVueASTAnalyzer: No script setup section found');
        return null;
      }

      console.log('🔍 BrowserVueASTAnalyzer: Script setup found, lang:', sfc.script.lang);
      console.log('🔍 BrowserVueASTAnalyzer: Template found:', !!sfc.template);

      // Step 2: Parse script setup content using browser-compatible parser
      let scriptModule: Module | null;
      try {
        scriptModule = await parseVueScriptSetup(sfc.script.content, sfc.script.lang || 'js');
      } catch (error) {
        console.error('🔍 BrowserVueASTAnalyzer: Script setup parsing failed:', error);
        return null;
      }

      if (!scriptModule) {
        console.log('🔍 BrowserVueASTAnalyzer: Failed to parse script setup');
        return null;
      }

      console.log('🔍 BrowserVueASTAnalyzer: Parse successful');
      
      return { sfc, scriptModule };
    } catch (error) {
      console.error('🔍 BrowserVueASTAnalyzer: Unexpected error:', error);
      return null;
    }
  }
}
