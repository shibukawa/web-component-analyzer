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
  rootSubgraph?: DFDSubgraph; // Root subgraph for JSX output
  subgraphs?: DFDSubgraph[]; // Additional subgraphs (e.g., exported handlers)
}

/**
 * DFD node representing an element in the data flow diagram
 */
export interface DFDNode {
  id: string;
  label: string;
  type: 'external-entity-input' | 'external-entity-output' | 'process' | 'data-store' | 'subgraph';
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
  isLongArrow?: boolean; // True if this edge should use a longer arrow (more hyphens)
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
 * Information about an atom definition (Jotai)
 */
export interface AtomDefinition {
  name: string;
  line?: number;
  column?: number;
  dependencies: string[];
  isDerived: boolean;
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
  atomDefinitions?: AtomDefinition[]; // Jotai atom definitions
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
  // Type parameter (e.g., "User" from useSWR<User>)
  typeParameter?: string;
  // useReducer state properties
  stateProperties?: string[]; // Property names from the reducer state object
  stateVariable?: string; // The state variable name (e.g., 'state')
  dispatchVariable?: string; // The dispatch variable name (e.g., 'dispatch')
  reducerName?: string; // The reducer function name (e.g., 'counterReducer')
  // useState initial value
  initialValue?: string; // Initial value variable name for useState (e.g., 'initialTasks')
  // Hook call arguments (for extracting API endpoints, query keys, etc.)
  arguments?: Array<{ type: string; value?: string | number | boolean }>; // Extracted argument values
  // Argument identifiers (variable names used as arguments)
  argumentIdentifiers?: string[]; // Variable names passed as arguments (e.g., ['url', 'fetcher'])
}

/**
 * Information about processes (functions) in the component
 */
export interface ProcessInfo {
  name: string;
  type: 'useEffect' | 'useLayoutEffect' | 'useInsertionEffect' | 'useCallback' | 'useMemo' | 'useImperativeHandle' | 'event-handler' | 'custom-function' | 'cleanup' | 'exported-handler';
  dependencies?: string[];
  references: string[]; // Variables referenced in the function
  externalCalls: ExternalCallInfo[]; // External function calls made by this process
  line?: number;
  column?: number;
  cleanupProcess?: ProcessInfo; // Cleanup function for useEffect, useLayoutEffect, or useInsertionEffect (if exists)
  isInlineHandler?: boolean; // True if this is an inline event handler (arrow function in JSX)
  usedInJSXElement?: { line?: number; column?: number; attributeName?: string }; // JSX element where this inline handler is used
  
  // For useImperativeHandle
  exportedHandlers?: ExportedHandlerInfo[]; // Methods exposed through the hook
  parentProcessId?: string; // Reference to parent useImperativeHandle process
}

/**
 * Information about external function calls
 */
export interface ExternalCallInfo {
  functionName: string; // e.g., "api.sendData", "logger.log"
  arguments: string[]; // Variable names passed as arguments
  callbackReferences?: string[]; // Variables referenced in callback functions passed as arguments
  isImperativeHandleCall?: boolean; // Whether this is a ref.current.method() call
  refName?: string; // The ref variable name (e.g., "childRef")
  methodName?: string; // The method name (e.g., "focus")
}

/**
 * Information about a method exported through useImperativeHandle
 */
export interface ExportedHandlerInfo {
  name: string; // Method name (e.g., 'focus', 'getValue')
  parameters?: string[]; // Parameter names
  references: string[]; // Variables referenced in the method body
  externalCalls: ExternalCallInfo[]; // External calls made by the method
  returnsValue: boolean; // Whether the method returns a value
  isAsync: boolean; // Whether the method is async
  line?: number;
  column?: number;
}

/**
 * Information about JSX output
 */
/**
 * Represents a condition expression
 */
export interface ConditionExpression {
  variables: string[]; // Variables referenced in the condition
  expression: string; // String representation of the condition
}

/**
 * Represents a conditional branch in JSX
 */
export interface ConditionalBranch {
  type: 'ternary' | 'logical-and' | 'logical-or' | 'loop' | 'early-return';
  condition: ConditionExpression;
  trueBranch?: JSXStructure;
  falseBranch?: JSXStructure;
  loopVariable?: string; // For .map loops (e.g., 'item')
  line?: number;
  column?: number;
}

/**
 * Represents a JSX element with its data dependencies
 */
export interface JSXElementStructure {
  type: 'element';
  tagName: string;
  displayDependencies: string[]; // Variables displayed in content
  attributeReferences: JSXAttributeReference[]; // All attribute references (both data and handlers)
  children: JSXStructure[];
  line?: number;
  column?: number;
  metadata?: Record<string, any>; // Additional metadata for special handling
}

/**
 * Represents an attribute reference on a JSX element
 */
export interface JSXAttributeReference {
  attributeName: string; // e.g., 'onClick', 'onChange', 'onCustomEvent', 'value'
  referencedVariable: string; // Name of the variable being referenced
  propertyName?: string; // Property name if accessing object property (e.g., 'increment' in store.increment)
  isEventHandler?: boolean; // Determined by type classification (function = true, data = false)
}

/**
 * Represents JSX structure (element or conditional)
 */
export type JSXStructure = JSXElementStructure | ConditionalBranch;

/**
 * Represents a subgraph in the DFD
 */
export interface DFDSubgraph {
  id: string;
  label: string;
  type: 'jsx-output' | 'conditional' | 'exported-handlers';
  condition?: ConditionExpression; // For conditional subgraphs
  elements: (DFDNode | DFDSubgraph)[]; // Can contain nodes or nested subgraphs
  parentProcessId?: string; // Reference to parent useImperativeHandle process
}

export interface JSXInfo {
  simplified: string; // Simplified JSX with placeholders
  placeholders: PlaceholderInfo[];
  elements: JSXElementInfo[]; // Structured information about JSX elements
  structure?: JSXStructure; // NEW: Hierarchical structure
  rootSubgraph?: DFDSubgraph; // NEW: Root subgraph for visualization
}

/**
 * Information about JSX placeholders
 */
export interface PlaceholderInfo {
  id: string;
  originalExpression: string;
  variables: string[];
  tagName?: string; // Tag name where this placeholder appears
  attributeName?: string; // Attribute name if this is an attribute value
}

/**
 * Information about JSX elements
 */
export interface JSXElementInfo {
  tagName: string;
  contentVariables: string[]; // Variables used in element content
  attributeHandlers: JSXAttributeHandler[]; // Event handlers and other attributes
  attributeReferences?: JSXAttributeReference[]; // NEW: All attribute references (both data and handlers)
  line?: number; // Line number in source code
  column?: number; // Column number in source code
}

/**
 * Information about JSX attribute handlers (e.g., onClick, onChange)
 */
export interface JSXAttributeHandler {
  attributeName: string; // e.g., "onClick", "onChange"
  handlerName: string; // e.g., "handleClick", "handleChange"
}
