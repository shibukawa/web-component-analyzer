/**
 * Browser-compatible Svelte SFC Parser using @swc/wasm-web
 * 
 * This module provides a browser-compatible wrapper around Svelte component analysis
 * that uses @swc/wasm-web instead of @swc/core for parsing.
 */

import { parseSync, type ParseOptions } from '@swc/wasm-web';
import type { Module } from '@swc/wasm-web';
import { SFCParser, type ParsedSFC } from '@web-component-analyzer/analyzer';
import { initializeSWC } from './browser-parser';

/**
 * Parse Svelte SFC script section using @swc/wasm-web
 * 
 * @param content - Script content
 * @param lang - Language (ts, typescript, js, or javascript)
 * @returns Parsed module or null on error
 */
export async function parseSvelteScript(content: string, lang: string): Promise<Module | null> {
  try {
    // Ensure SWC WASM is initialized
    await initializeSWC();

    const isTsx = lang === 'ts' || lang === 'typescript';
    
    const options: ParseOptions = {
      syntax: isTsx ? 'typescript' : 'ecmascript',
      tsx: false, // Svelte doesn't use JSX
      decorators: false,
      dynamicImport: true,
    };

    const module = parseSync(content, options);
    return module;
  } catch (error) {
    console.error('Browser Svelte Parser: Failed to parse script:', error);
    throw error;
  }
}

/**
 * Parse Svelte SFC structure (script, markup, style sections)
 * 
 * @param source - Svelte SFC source code
 * @returns Parsed SFC structure
 */
export function parseSvelteSFC(source: string): ParsedSFC {
  const parser = new SFCParser();
  return parser.parse(source, {
    scriptTag: 'script',
    templateTag: 'markup',
    extractMarkupWithoutTag: true,
  });
}

/**
 * Browser-compatible Svelte AST Analyzer
 * 
 * This class provides the same interface as SvelteASTAnalyzer but uses
 * browser-compatible parsing with @swc/wasm-web.
 */
export class BrowserSvelteASTAnalyzer {
  private sfcParser: SFCParser;

  constructor() {
    this.sfcParser = new SFCParser();
  }

  /**
   * Analyze a Svelte component from source code
   * 
   * @param source - Svelte SFC source code
   * @param filePath - File path for context
   * @returns Promise resolving to parsed SFC and script module
   */
  async analyze(
    source: string,
    filePath?: string
  ): Promise<{ sfc: ParsedSFC; scriptModule: Module | null } | null> {
    try {
      console.log('🔍 BrowserSvelteASTAnalyzer: Parsing Svelte SFC...');
      
      // Step 1: Parse Svelte SFC structure
      let sfc: ParsedSFC;
      try {
        sfc = this.sfcParser.parse(source, {
          scriptTag: 'script',
          templateTag: 'markup',
          extractMarkupWithoutTag: true,
        });
      } catch (error) {
        console.error('🔍 BrowserSvelteASTAnalyzer: SFC parsing failed:', error);
        return null;
      }

      if (!sfc.script) {
        console.log('🔍 BrowserSvelteASTAnalyzer: No script section found');
        return null;
      }

      console.log('🔍 BrowserSvelteASTAnalyzer: Script found, lang:', sfc.script.lang);
      console.log('🔍 BrowserSvelteASTAnalyzer: Markup found:', !!sfc.template);

      // Step 2: Parse script content using browser-compatible parser
      let scriptModule: Module | null;
      try {
        scriptModule = await parseSvelteScript(sfc.script.content, sfc.script.lang || 'javascript');
      } catch (error) {
        console.error('🔍 BrowserSvelteASTAnalyzer: Script parsing failed:', error);
        return null;
      }

      if (!scriptModule) {
        console.log('🔍 BrowserSvelteASTAnalyzer: Failed to parse script');
        return null;
      }

      console.log('🔍 BrowserSvelteASTAnalyzer: Parse successful');
      
      return { sfc, scriptModule };
    } catch (error) {
      console.error('🔍 BrowserSvelteASTAnalyzer: Unexpected error:', error);
      return null;
    }
  }

  /**
   * Extract component name from file path
   * 
   * @param filePath - File path
   * @returns Component name
   */
  extractComponentName(filePath?: string): string {
    if (!filePath) {
      return 'SvelteComponent';
    }

    const fileName = filePath.split('/').pop() || filePath;
    const nameWithoutExt = fileName.replace(/\.svelte$/, '');
    
    // Convert kebab-case or snake_case to PascalCase
    return nameWithoutExt
      .split(/[-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
