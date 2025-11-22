/**
 * Svelte AST Analyzer for analyzing Svelte 5 components with runes API
 * 
 * Analyzes Svelte Single File Components (SFC) and extracts component information
 * including props, state, derived values, effects, stores, and markup bindings.
 */

import type * as swc from '@swc/core';
import { ComponentAnalysis, PropInfo } from './types';
import { SFCParser } from './sfc-parser';
import { TypeResolver } from '../services/type-resolver';
import { ASTAnalyzer } from './ast-analyzer';
import { SvelteRunesAnalyzer } from '../analyzers/svelte-runes-analyzer';
import { SvelteStoreAnalyzer } from '../analyzers/svelte-store-analyzer';
import { SvelteMarkupAnalyzer } from '../analyzers/svelte-markup-analyzer';
import { SvelteEventAnalyzer } from '../analyzers/svelte-event-analyzer';
import { SWCProcessAnalyzer } from '../analyzers/process-analyzer';
import { createImportDetector } from '../analyzers/import-detector';
import type { ParserFunction } from './index';
import type { ParseResult } from './ast-parser';

/**
 * Svelte AST Analyzer implementation
 * 
 * Coordinates Svelte-specific analyzers to extract component information
 * from Svelte SFC files with Svelte 5 runes syntax.
 */
export class SvelteASTAnalyzer implements ASTAnalyzer {
  private parserFn: ParserFunction;
  private sfcParser: SFCParser;
  private typeResolver?: TypeResolver;
  private runesAnalyzer: SvelteRunesAnalyzer;
  private storeAnalyzer: SvelteStoreAnalyzer;
  private markupAnalyzer: SvelteMarkupAnalyzer;
  private eventAnalyzer: SvelteEventAnalyzer;
  private processAnalyzer: SWCProcessAnalyzer;

  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    this.sfcParser = new SFCParser();
    this.typeResolver = typeResolver;
    this.runesAnalyzer = new SvelteRunesAnalyzer(typeResolver);
    this.storeAnalyzer = new SvelteStoreAnalyzer(typeResolver);
    this.markupAnalyzer = new SvelteMarkupAnalyzer();
    this.eventAnalyzer = new SvelteEventAnalyzer(typeResolver);
    this.processAnalyzer = new SWCProcessAnalyzer();
  }

  /**
   * Analyze a Svelte component from source code
   * 
   * @param source - Svelte SFC source code or parsed SWC module
   * @param filePath - File path for type resolution
   * @param sourceCode - Original source code (if module is provided)
   * @returns Promise resolving to ComponentAnalysis or null if no component found
   */
  async analyze(
    source: swc.Module | string,
    filePath?: string,
    sourceCode?: string
  ): Promise<ComponentAnalysis | null> {
    // If source is a string, it's Svelte SFC source code
    if (typeof source === 'string') {
      return this.analyzeSvelteSFC(source, filePath);
    }

    // If source is a module, it's already parsed (shouldn't happen for Svelte)
    // This case is for interface compatibility with ASTAnalyzer
    return null;
  }

  /**
   * Analyze Svelte SFC source code
   * 
   * @param source - Svelte SFC source code
   * @param filePath - File path for type resolution
   * @returns Promise resolving to ComponentAnalysis or null
   */
  private async analyzeSvelteSFC(
    source: string,
    filePath?: string
  ): Promise<ComponentAnalysis | null> {
    const startTime = Date.now();

    try {
      // Step 1: Parse Svelte SFC to extract script and markup sections
      const sfc = this.sfcParser.parse(source, {
        scriptTag: 'script',
        templateTag: 'markup',
        extractMarkupWithoutTag: true,
      });

      if (!sfc.script) {
        return null;
      }

      // Step 2: Parse script section using injected parser function
      
      const scriptLang = sfc.script.lang || 'javascript';
      const filePath = `temp.${scriptLang}`;
      
      // Use the injected parser function
      const parseResult: ParseResult = await this.parserFn(sfc.script.content, filePath);
      
      // Handle parse errors
      if (parseResult.error) {
        const errorMessage = parseResult.error.message;
        const errorLocation = parseResult.error.line 
          ? ` at line ${parseResult.error.line}${parseResult.error.column ? `:${parseResult.error.column}` : ''}`
          : '';
        console.error(`SvelteASTAnalyzer: Script parsing failed${errorLocation}: ${errorMessage}`);
        return null;
      }
      
      // Get the parsed module
      const module = parseResult.module;
      if (!module) {
        console.error('SvelteASTAnalyzer: No module returned from parser');
        return null;
      }

      // Step 3: Extract component name from file path
      const componentName = this.extractComponentName(filePath);

      // Step 3.5: Detect imports
      const importDetector = createImportDetector();
      const imports = importDetector.detectImports(module);
      
      // Step 3.6: Convert SvelteKit imports to hooks
      const svelteKitHooks = this.convertSvelteKitImportsToHooks(imports, module);

      // Step 4: Analyze script section for runes
      
      // Set source code for line number calculation
      this.runesAnalyzer.setSourceCode(sfc.script.content);
      
      // Set line offset for file-relative line numbers
      this.runesAnalyzer.setLineOffset(sfc.script.line);
      
      // Analyze runes
      const runes = await this.runesAnalyzer.analyzeRunes(module, filePath);
      
      // Step 5: Analyze stores
      
      // Set source code for line number calculation
      this.storeAnalyzer.setSourceCode(sfc.script.content);
      
      // Set line offset for file-relative line numbers
      this.storeAnalyzer.setLineOffset(sfc.script.line);
      
      // Analyze stores
      const storeAnalysis = await this.storeAnalyzer.analyzeStores(module, filePath);
      
      // Step 6: Analyze processes (functions)
      
      // Set source code for line number calculation
      this.processAnalyzer.setSourceCode(sfc.script.content);
      
      // Set line offset for file-relative line numbers
      this.processAnalyzer.setLineOffset(sfc.script.line);
      
      // Analyze processes
      const processes = this.processAnalyzer.analyzeProcesses(module.body);
      
      // Step 7: Analyze events
      
      // Set source code for line number calculation
      this.eventAnalyzer.setSourceCode(sfc.script.content);
      
      // Set line offset for file-relative line numbers
      this.eventAnalyzer.setLineOffset(sfc.script.line);
      
      // Analyze events
      const eventAnalysis = await this.eventAnalyzer.analyzeEvents(module, filePath);
      
      // Step 8: Analyze markup section
      
      let markupBindings: any[] = [];
      let markupElements: any[] = [];
      let elementsWithEventHandlers: any[] = [];
      let conditionalStructures: any[] = [];
      let loopStructures: any[] = [];
      let awaitStructures: any[] = [];
      
      if (sfc.template) {
        // Set the markup line offset for accurate line number tracking
        this.markupAnalyzer.setMarkupLineOffset(sfc.template.line);
        
        markupBindings = this.markupAnalyzer.analyzeMarkup(sfc.template.content);
        markupElements = this.markupAnalyzer.extractElementBindings(sfc.template.content);
        elementsWithEventHandlers = this.markupAnalyzer.extractElementsWithEventHandlers(sfc.template.content);
        conditionalStructures = this.markupAnalyzer.extractConditionalStructures(sfc.template.content);
        loopStructures = this.markupAnalyzer.extractLoopStructures(sfc.template.content);
        awaitStructures = this.markupAnalyzer.extractAwaitStructures(sfc.template.content);
      }
      
      // Step 9: Convert runes to component analysis format
      const props: PropInfo[] = [];
      
      // Extract props from $props() rune
      for (const rune of runes) {
        if (rune.type === 'props') {
          if (rune.propsProperties && rune.propsProperties.length > 0) {
            // If we have individual prop properties, create a PropInfo for each
            for (const prop of rune.propsProperties) {
              props.push({
                name: prop.name,
                type: prop.dataType,
                isDestructured: true,
                line: rune.line,
                column: rune.column,
              });
            }
          } else {
            // If no properties extracted, create a single prop for the entire props object
            props.push({
              name: rune.name,
              type: rune.dataType,
              isDestructured: false,
              line: rune.line,
              column: rune.column,
            });
          }
        }
      }
      
      const analysis: ComponentAnalysis = {
        componentName,
        componentType: 'svelte-runes',
        props,
        hooks: svelteKitHooks,
        processes,
        jsxOutput: {
          simplified: '',
          placeholders: [],
          elements: [],
        },
        // Store Svelte runes, stores, events, and markup for DFD builder
        metadata: {
          imports,
          svelteRunes: runes,
          svelteStores: storeAnalysis.stores,
          svelteStoreSubscriptions: storeAnalysis.subscriptions,
          svelteStoreUpdates: storeAnalysis.updates,
          svelteComputedFromSubscriptions: storeAnalysis.computedFromSubscriptions,
          svelteEvents: eventAnalysis.events,
          svelteDispatchCalls: eventAnalysis.dispatchCalls,
          svelteMarkupBindings: markupBindings,
          svelteMarkupElements: markupElements,
          svelteElementsWithEventHandlers: elementsWithEventHandlers,
          svelteConditionalStructures: conditionalStructures,
          svelteLoopStructures: loopStructures,
          svelteAwaitStructures: awaitStructures,
        },
      };

      return analysis;
    } catch (error) {
      console.error('SvelteASTAnalyzer: Analysis failed:', error);
      return null;
    }
  }

  /**
   * Extract component name from file path
   * 
   * @param filePath - File path
   * @returns Component name
   */
  private extractComponentName(filePath?: string): string {
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

  /**
   * Convert SvelteKit imports to hooks for library processor
   * 
   * @param imports - Detected imports
   * @param module - Parsed AST module
   * @returns Array of HookInfo objects
   */
  private convertSvelteKitImportsToHooks(imports: any[], module: swc.Module): any[] {
    const hooks: any[] = [];
    
    for (const imp of imports) {
      // Check if this is a SvelteKit import
      if (imp.source === '$app/stores' || imp.source === '$app/navigation') {
        for (const importedItem of imp.imports) {
          // Find the import declaration in the AST to get line/column
          let line: number | undefined;
          let column: number | undefined;
          
          for (const stmt of module.body) {
            if (stmt.type === 'ImportDeclaration' && stmt.source.value === imp.source) {
              line = stmt.span.start;
              column = stmt.span.start;
              break;
            }
          }
          
          const localName = importedItem.alias || importedItem.name;
          
          hooks.push({
            hookName: importedItem.name,
            category: 'library',
            variables: [localName],
            line,
            column,
            source: imp.source,
            libraryName: 'sveltekit',
          });
        }
      }
    }
    
    return hooks;
  }
}
