/**
 * Type definitions for React Parser DFD generation
 */

/**
 * Main DFD source data structure containing nodes and edges
 */
export interface DFDSourceData {
  nodes: DFDNode[];
  edges: DFDEdge[];
  errors?: ParseError[];
}

/**
 * DFD node representing an element in the data flow diagram
 */
export interface DFDNode {
  id: string;
  label: string;
  type: 'external-entity-input' | 'external-entity-output' | 'process' | 'data-store';
  metadata?: Record<string, any>;
  line?: number; // Line number in source code
  column?: number; // Column number in source code
}

/**
 * DFD edge representing data flow between nodes
 */
export interface DFDEdge {
  from: string;
  to: string;
  label?: string;
  isCleanup?: boolean; // True if this edge represents a cleanup relationship
}

/**
 * Parse error information
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Component analysis result containing all extracted information
 */
export interface ComponentAnalysis {
  componentName: string;
  componentType: 'functional' | 'class';
  props: PropInfo[];
  hooks: HookInfo[];
  processes: ProcessInfo[];
  jsxOutput: JSXInfo;
}

/**
 * Information about component props
 */
export interface PropInfo {
  name: string;
  type?: string;
  isDestructured: boolean;
  line?: number;
  column?: number;
  // NEW: Type resolution metadata
  isFunction?: boolean;
  typeString?: string; // Full TypeScript type string from Language Server
}

/**
 * Hook category types
 */
export type HookCategory = 
  | 'state'
  | 'effect'
  | 'context'
  | 'data-fetching'
  | 'state-management'
  | 'form'
  | 'routing'
  | 'server-action';

/**
 * Information about hooks used in the component
 */
export interface HookInfo {
  hookName: string;
  category: HookCategory;
  variables: string[];
  dependencies?: string[];
  isReadWritePair?: boolean; // True if variables follow [value, setValue] pattern
  isFunctionOnly?: boolean; // True if all variables are functions (for useContext)
  line?: number;
  column?: number;
  // Type classification for custom hooks
  variableTypes?: Map<string, 'function' | 'data'>; // Maps variable name to its type classification
  // useReducer state properties
  stateProperties?: string[]; // Property names from the reducer state object
  stateVariable?: string; // The state variable name (e.g., 'state')
  dispatchVariable?: string; // The dispatch variable name (e.g., 'dispatch')
}

/**
 * Information about processes (functions) in the component
 */
export interface ProcessInfo {
  name: string;
  type: 'useEffect' | 'useLayoutEffect' | 'useInsertionEffect' | 'useCallback' | 'useMemo' | 'useImperativeHandle' | 'event-handler' | 'custom-function' | 'cleanup';
  dependencies?: string[];
  references: string[]; // Variables referenced in the function
  externalCalls: ExternalCallInfo[]; // External function calls made by this process
  line?: number;
  column?: number;
  cleanupProcess?: ProcessInfo; // Cleanup function for useEffect, useLayoutEffect, or useInsertionEffect (if exists)
}

/**
 * Information about external function calls
 */
export interface ExternalCallInfo {
  functionName: string; // e.g., "api.sendData", "logger.log"
  arguments: string[]; // Variable names passed as arguments
}

/**
 * Information about JSX output
 */
export interface JSXInfo {
  simplified: string; // Simplified JSX with placeholders
  placeholders: PlaceholderInfo[];
}

/**
 * Information about JSX placeholders
 */
export interface PlaceholderInfo {
  id: string;
  originalExpression: string;
  variables: string[];
}
