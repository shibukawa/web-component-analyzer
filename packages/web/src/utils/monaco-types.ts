/**
 * Add type definitions to Monaco Editor for better IntelliSense
 */
import * as monaco from 'monaco-editor';
import { typeDefinitions } from '../config/type-definitions';
import { MonacoTypeRegistry } from './type-registry';

let registry: MonacoTypeRegistry | null = null;

/**
 * Add type definitions to Monaco Editor
 */
export function addMonacoTypes() {
  if (registry) {
    return;
  }
  
  const startTime = performance.now();
  
  try {
    // Configure TypeScript compiler options BEFORE registering types
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      skipLibCheck: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    });
    
    // Configure JSX/TSX diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    // Initialize type registry with generated definitions AFTER compiler options
    registry = new MonacoTypeRegistry(typeDefinitions);
    registry.initialize();
    
    const endTime = performance.now();
    const registeredLibraries = registry.getRegisteredLibraries();
    
    console.log(`[Monaco Types] Successfully registered ${registeredLibraries.length} libraries:`, registeredLibraries);
    console.log(`[Monaco Types] Initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
  } catch (error) {
    console.error('[Monaco Types] Failed to initialize type registry:', error);
    throw error;
  }
}
