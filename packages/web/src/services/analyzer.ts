/**
 * Analyzer Service - Browser-compatible implementation using @swc/wasm-web
 */

import { SWCASTAnalyzer, DefaultDFDBuilder, createVueParser, createSvelteParser } from '@web-component-analyzer/analyzer';
import { parseComponent as parseBrowser, initializeSWC, parseWithSWCBrowser } from './browser-parser';
import type { DFDSourceData } from './types';
import { detectFramework, type Framework } from '../utils/framework-detector';

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
  detectedFramework?: Framework;
  detectionConfidence?: number;
}

/**
 * Re-export Framework type for convenience
 */
export type { Framework };



/**
 * Analyze a component and generate DFD data using browser-compatible parser
 * 
 * @param code - The component source code
 * @param framework - The framework type (react, vue, svelte). If not provided, will be auto-detected.
 * @returns Promise resolving to AnalysisResult
 */
export async function analyzeComponent(
  code: string,
  framework?: Framework
): Promise<AnalysisResult> {
  try {
    console.log('=== ANALYZER SERVICE (BROWSER) ===');
    console.log('Code length:', code.length);
    
    // Validate input
    if (!code || code.trim().length === 0) {
      return {
        success: false,
        error: 'No code provided for analysis'
      };
    }

    // Auto-detect framework if not explicitly provided
    let detectedFramework: Framework | undefined;
    let detectionConfidence: number | undefined;
    let effectiveFramework: Framework;

    if (framework) {
      // Manual override takes precedence
      console.log('Framework manually specified:', framework);
      effectiveFramework = framework;
    } else {
      // Auto-detect framework
      console.log('Auto-detecting framework...');
      const detection = detectFramework(code);
      detectedFramework = detection.framework;
      detectionConfidence = detection.confidence;
      effectiveFramework = detection.framework;
      
      console.log('Framework auto-detected:', effectiveFramework);
      console.log('Detection confidence:', detectionConfidence.toFixed(2));
      console.log('Detection reasons:', detection.reasons);
    }

    console.log('Effective framework:', effectiveFramework);

    // Ensure SWC WASM is initialized
    console.log('Ensuring SWC WASM is initialized...');
    await ensureSWCInitialized();
    console.log('SWC WASM ready');

    // Handle Vue components
    if (effectiveFramework === 'vue') {
      console.log('Analyzing Vue component...');
      
      try {
        // Use dependency injection pattern with browser parser
        const parser = createVueParser(parseWithSWCBrowser);
        const dfdData = await parser.parse(code, 'component.vue');
        
        console.log('Vue analysis successful');
        console.log('Nodes:', dfdData.nodes.length);
        console.log('Edges:', dfdData.edges.length);

        return {
          success: true,
          dfdData,
          detectedFramework,
          detectionConfidence
        };
      } catch (error) {
        console.error('Vue analysis error:', error);
        return {
          success: false,
          error: `Vue analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          detectedFramework,
          detectionConfidence
        };
      }
    }

    // Handle React components
    if (effectiveFramework === 'react') {
      console.log('Parsing React component with SWC WASM...');
      const parseResult = parseBrowser(code, 'component.tsx');
      
      if (parseResult.error || !parseResult.module) {
        console.log('Parse failed:', parseResult.error);
        return {
          success: false,
          error: parseResult.error?.message || 'Failed to parse component',
          detectedFramework,
          detectionConfidence
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
          error: 'No React component found in the code',
          detectedFramework,
          detectionConfidence
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
        dfdData,
        detectedFramework,
        detectionConfidence
      };
    }

    // Handle Svelte components
    if (effectiveFramework === 'svelte') {
      console.log('Analyzing Svelte component...');
      
      try {
        // Use dependency injection pattern with browser parser
        const parser = createSvelteParser(parseWithSWCBrowser);
        const dfdData = await parser.parse(code, 'component.svelte');
        
        console.log('Svelte analysis successful');
        console.log('Nodes:', dfdData.nodes.length);
        console.log('Edges:', dfdData.edges.length);

        return {
          success: true,
          dfdData,
          detectedFramework,
          detectionConfidence
        };
      } catch (error) {
        console.error('Svelte analysis error:', error);
        return {
          success: false,
          error: `Svelte analysis failed: ${error instanceof Error ? error.message : String(error)}`,
          detectedFramework,
          detectionConfidence
        };
      }
    }

    // Unknown framework
    return {
      success: false,
      error: `Framework "${effectiveFramework}" is not yet supported. Currently supported: React, Vue, Svelte.`,
      detectedFramework,
      detectionConfidence
    };
  } catch (error) {
    console.error('Analysis exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}


