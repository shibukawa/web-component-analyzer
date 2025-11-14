/**
 * Analyzer Service - Browser-compatible implementation using @swc/wasm-web
 */

import { SWCASTAnalyzer, DefaultDFDBuilder } from '@web-component-analyzer/analyzer';
import { parseComponent as parseBrowser, initializeSWC } from './browser-parser';
import type { DFDSourceData } from './types';

// Initialize SWC WASM on module load
let swcInitPromise: Promise<void> | null = null;

function ensureSWCInitialized(): Promise<void> {
  if (!swcInitPromise) {
    swcInitPromise = initializeSWC();
  }
  return swcInitPromise;
}

/**
 * Result of component analysis
 */
export interface AnalysisResult {
  success: boolean;
  dfdData?: DFDSourceData;
  error?: string;
}

/**
 * Supported framework types
 */
export type Framework = 'react' | 'vue' | 'svelte';



/**
 * Analyze a component and generate DFD data using browser-compatible parser
 * 
 * @param code - The component source code
 * @param framework - The framework type (react, vue, svelte)
 * @returns Promise resolving to AnalysisResult
 */
export async function analyzeComponent(
  code: string,
  framework: Framework
): Promise<AnalysisResult> {
  try {
    console.log('=== ANALYZER SERVICE (BROWSER) ===');
    console.log('Framework:', framework);
    console.log('Code length:', code.length);
    
    // Currently only React is supported
    if (framework !== 'react') {
      return {
        success: false,
        error: `Framework "${framework}" is not yet supported. Only React components are currently supported.`
      };
    }

    // Validate input
    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: 'No code provided for analysis'
      };
    }

    // Ensure SWC WASM is initialized
    console.log('Ensuring SWC WASM is initialized...');
    await ensureSWCInitialized();
    console.log('SWC WASM ready');

    // Parse the component using browser-compatible parser
    console.log('Parsing component with SWC WASM...');
    const parseResult = parseBrowser(code, 'component.tsx');
    
    if (parseResult.error || !parseResult.module) {
      console.log('Parse failed:', parseResult.error);
      return {
        success: false,
        error: parseResult.error?.message || 'Failed to parse component'
      };
    }

    console.log('Parse successful, analyzing AST...');
    
    // Analyze AST to extract component information
    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(parseResult.module, 'component.tsx', code);
    
    if (!analysis) {
      console.log('Analysis failed: no component found');
      return {
        success: false,
        error: 'No React component found in the code'
      };
    }

    console.log('Analysis successful, building DFD...');
    
    // Build DFD from analysis
    const builder = new DefaultDFDBuilder();
    const dfdData = builder.build(analysis);
    
    console.log('DFD built successfully');
    console.log('Nodes:', dfdData.nodes.length);
    console.log('Edges:', dfdData.edges.length);

    return {
      success: true,
      dfdData
    };
  } catch (error) {
    console.error('Analysis exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}


