/**
 * Vue Composables and Lifecycle Analyzer
 * 
 * Analyzes Vue 3 Composition API composables and lifecycle hooks:
 * - Composable calls (functions starting with "use")
 * - Lifecycle hooks (onMounted, onUpdated, onUnmounted, etc.)
 * - Dependencies between lifecycle hooks and reactive data
 */

import * as swc from '@swc/core';
import type { HookInfo } from '../parser/types.js';
import type { TypeResolver } from '../services/type-resolver.js';

/**
 * Vue lifecycle hook names
 */
const VUE_LIFECYCLE_HOOKS = [
  'onBeforeMount',
  'onMounted',
  'onBeforeUpdate',
  'onUpdated',
  'onBeforeUnmount',
  'onUnmounted',
  'onErrorCaptured',
  'onRenderTracked',
  'onRenderTriggered',
  'onActivated',
  'onDeactivated',
  'onServerPrefetch',
  // Vue Router navigation guards
  'onBeforeRouteUpdate',
  'onBeforeRouteLeave',
] as const;

/**
 * Analyzer for Vue composables and lifecycle hooks
 */
export class VueComposablesAnalyzer {
  private typeResolver?: TypeResolver;
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private lineOffset: number = 1;

  /**
   * Constructor
   * @param typeResolver - Optional TypeResolver for querying type information
   */
  constructor(typeResolver?: TypeResolver) {
    this.typeResolver = typeResolver;
  }

  /**
   * Set line offset for file-relative line numbers
   * @param lineOffset - Starting line number of the source code in the original file (1-based)
   */
  setLineOffset(lineOffset: number): void {
    this.lineOffset = lineOffset;
  }

  /**
   * Set source code for line number calculation
   * @param sourceCode - The source code string
   */
  setSourceCode(sourceCode: string): void {
    this.sourceCode = sourceCode;
    this.lineStarts = this.calculateLineStarts(sourceCode);
  }

  /**
   * Calculate line start positions in source code
   * @param sourceCode - The source code string
   * @returns Array of byte positions where each line starts
   */
  private calculateLineStarts(sourceCode: string): number[] {
    const lineStarts = [0]; // First line starts at position 0
    for (let i = 0; i < sourceCode.length; i++) {
      if (sourceCode[i] === '\n') {
        lineStarts.push(i + 1);
      }
    }
    return lineStarts;
  }

  /**
   * Analyze composables and lifecycle hooks from a parsed Vue script setup module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to object with composables and lifecycle hooks
   */
  async analyzeComposablesAndLifecycle(
    module: swc.Module,
    filePath?: string
  ): Promise<{ composables: HookInfo[]; lifecycle: HookInfo[]; watchers: HookInfo[] }> {
    const composables: HookInfo[] = [];
    const lifecycle: HookInfo[] = [];
    const watchers: HookInfo[] = [];
    
    console.log('[VueComposablesAnalyzer] Starting analysis for file:', filePath);
    
    // Analyze all statements in the module
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        // Check for composable calls assigned to variables
        for (const decl of item.declarations) {
          if (decl.init && decl.init.type === 'CallExpression') {
            const hookInfo = this.analyzeCallExpression(decl.init, decl.id);
            if (hookInfo) {
              if (this.isLifecycleHook(hookInfo.hookName)) {
                lifecycle.push(hookInfo);
              } else if (this.isWatcher(hookInfo.hookName)) {
                watchers.push(hookInfo);
              } else {
                composables.push(hookInfo);
              }
            }
          }
        }
      } else if (item.type === 'ExpressionStatement') {
        // Check for standalone lifecycle hook calls or watchers (not assigned to variables)
        const expr = item.expression;
        if (expr.type === 'CallExpression') {
          const hookInfo = this.analyzeCallExpression(expr);
          if (hookInfo) {
            if (this.isLifecycleHook(hookInfo.hookName)) {
              lifecycle.push(hookInfo);
            } else if (this.isWatcher(hookInfo.hookName)) {
              watchers.push(hookInfo);
            }
          }
        }
      }
    }
    
    console.log('[VueComposablesAnalyzer] Found', composables.length, 'composables');
    console.log('[VueComposablesAnalyzer] Found', lifecycle.length, 'lifecycle hooks');
    console.log('[VueComposablesAnalyzer] Found', watchers.length, 'watchers');
    
    return { composables, lifecycle, watchers };
  }

  /**
   * Analyze a call expression to determine if it's a composable or lifecycle hook
   * @param callExpr - Call expression to analyze
   * @param pattern - Optional variable pattern (for destructured returns)
   * @returns HookInfo if this is a composable/lifecycle hook, null otherwise
   */
  private analyzeCallExpression(
    callExpr: swc.CallExpression,
    pattern?: swc.Pattern
  ): HookInfo | null {
    const callee = callExpr.callee;

    // Only handle direct function calls (Identifier)
    if (callee.type !== 'Identifier') {
      return null;
    }

    const functionName = callee.value;

    // Check if this is a composable (starts with "use"), lifecycle hook, or watcher
    if (!this.isComposable(functionName) && !this.isLifecycleHook(functionName) && !this.isWatcher(functionName)) {
      return null;
    }

    console.log('[VueComposablesAnalyzer] Found', functionName, 'call');

    // Extract variables from the pattern (if assigned to a variable)
    const variables = pattern ? this.extractVariablesFromPattern(pattern) : [];

    // Extract dependencies from the call expression arguments
    const dependencies = this.extractDependencies(callExpr, functionName);

    // Extract position
    const position = this.extractPosition(callee);

    // Determine category
    const category = this.determineCategory(functionName);

    // Extract type parameter if present
    const typeParameter = this.extractTypeParameter(callExpr);

    // Extract argument identifiers
    const argumentIdentifiers = this.extractArgumentIdentifiers(callExpr);

    // Classify returned properties (for composables only)
    const variableTypes = this.isComposable(functionName) && variables.length > 0
      ? this.classifyReturnedProperties(variables)
      : undefined;

    // Extract state modifications from lifecycle hook or watcher callback
    const stateModifications = (this.isLifecycleHook(functionName) || this.isWatcher(functionName))
      ? this.extractStateModificationsFromCallback(callExpr, functionName)
      : undefined;

    // Detect cleanup function for watchEffect
    const hasCleanup = functionName === 'watchEffect' 
      ? this.hasCleanupFunction(callExpr)
      : undefined;

    return {
      hookName: functionName,
      category,
      variables,
      dependencies,
      line: position?.line,
      column: position?.column,
      typeParameter,
      argumentIdentifiers,
      variableTypes,
      stateModifications, // Add state modifications for lifecycle hooks and watchers
      hasCleanup, // Add cleanup detection for watchEffect
    };
  }

  /**
   * Check if a function name is a composable (starts with "use")
   * @param functionName - Function name to check
   * @returns True if this is a composable
   */
  private isComposable(functionName: string): boolean {
    // Special case for storeToRefs from Pinia
    if (functionName === 'storeToRefs') {
      return true;
    }
    return functionName.startsWith('use') && functionName.length > 3;
  }

  /**
   * Check if a function name is a Vue lifecycle hook
   * @param functionName - Function name to check
   * @returns True if this is a lifecycle hook
   */
  private isLifecycleHook(functionName: string): boolean {
    return VUE_LIFECYCLE_HOOKS.includes(functionName as any);
  }

  /**
   * Check if a function name is a Vue watcher (watch or watchEffect)
   * @param functionName - Function name to check
   * @returns True if this is a watcher
   */
  private isWatcher(functionName: string): boolean {
    return functionName === 'watch' || functionName === 'watchEffect';
  }

  /**
   * Extract variables from a pattern (identifier or destructuring)
   * @param pattern - Variable pattern
   * @returns Array of variable names
   */
  private extractVariablesFromPattern(pattern: swc.Pattern): string[] {
    const variables: string[] = [];

    if (pattern.type === 'Identifier') {
      variables.push(pattern.value);
    } else if (pattern.type === 'ObjectPattern') {
      // Handle object destructuring: const { data, error } = useQuery()
      for (const prop of pattern.properties) {
        if (prop.type === 'KeyValuePatternProperty') {
          if (prop.value.type === 'Identifier') {
            variables.push(prop.value.value);
          }
        } else if (prop.type === 'AssignmentPatternProperty') {
          if (prop.key.type === 'Identifier') {
            variables.push(prop.key.value);
          }
        }
      }
    } else if (pattern.type === 'ArrayPattern') {
      // Handle array destructuring: const [state, setState] = useState()
      for (const element of pattern.elements) {
        if (element && element.type === 'Identifier') {
          variables.push(element.value);
        }
      }
    }

    return variables;
  }

  /**
   * Classify returned properties from composables as function or data
   * Uses heuristic-based classification based on naming patterns
   * @param variables - Array of variable names from destructuring
   * @returns Map of variable names to their type classification
   */
  private classifyReturnedProperties(variables: string[]): Map<string, 'function' | 'data'> {
    const variableTypes = new Map<string, 'function' | 'data'>();

    for (const varName of variables) {
      // Common function name patterns in Vue composables:
      // - Starts with action verbs: set, get, update, delete, create, fetch, load, toggle, increment, decrement, refetch
      // - Starts with event handlers: on, handle
      // - Common function names: dispatch, navigate, logout, login, submit, reset, clear, push, pop, add, remove
      const isFunctionName = 
        /^(on|handle|set|get|update|delete|create|fetch|load|toggle|increment|decrement|dispatch|navigate|logout|login|submit|register|reset|add|remove|push|pop|clear|refetch)[A-Z]/.test(varName) ||
        ['dispatch', 'navigate', 'logout', 'login', 'submit', 'reset', 'clear', 'increment', 'decrement', 'add', 'remove', 'push', 'pop', 'setValue', 'setCount', 'setData', 'refetch'].includes(varName);

      variableTypes.set(varName, isFunctionName ? 'function' : 'data');
      console.log(`[VueComposablesAnalyzer] Classified ${varName}: ${isFunctionName ? 'function' : 'data'}`);
    }

    return variableTypes;
  }

  /**
   * Extract dependencies from call expression arguments
   * @param callExpr - Call expression
   * @returns Array of dependency variable names
   */
  private extractDependencies(callExpr: swc.CallExpression, functionName: string): string[] {
    const dependencies: string[] = [];

    // For watchers, extract dependencies from the first argument
    if (this.isWatcher(functionName)) {
      if (callExpr.arguments.length >= 1) {
        const firstArg = callExpr.arguments[0];
        
        // watchEffect() takes a function as first argument
        if (functionName === 'watchEffect') {
          if (firstArg.expression.type === 'ArrowFunctionExpression' || firstArg.expression.type === 'FunctionExpression') {
            const watchedVars = this.extractIdentifiersFromFunction(firstArg.expression);
            dependencies.push(...watchedVars);
          }
          return dependencies;
        }
        
        // watch() can take a single ref/reactive as first argument
        if (firstArg.expression.type === 'Identifier') {
          dependencies.push(firstArg.expression.value);
        }
        // watch() can take an array of refs/reactives as first argument
        else if (firstArg.expression.type === 'ArrayExpression') {
          for (const element of firstArg.expression.elements) {
            if (element && element.expression.type === 'Identifier') {
              dependencies.push(element.expression.value);
            }
          }
        }
        // watch() can take a getter function as first argument
        else if (firstArg.expression.type === 'ArrowFunctionExpression' || firstArg.expression.type === 'FunctionExpression') {
          // Extract identifiers from the function body
          const watchedVars = this.extractIdentifiersFromFunction(firstArg.expression);
          dependencies.push(...watchedVars);
        }
      }
      return dependencies;
    }

    // For lifecycle hooks, the first argument is typically a callback function
    // The second argument (if present) might be a dependency array
    if (callExpr.arguments.length >= 2) {
      const secondArg = callExpr.arguments[1];
      if (secondArg.expression.type === 'ArrayExpression') {
        // Extract identifiers from the dependency array
        for (const element of secondArg.expression.elements) {
          if (element && element.expression.type === 'Identifier') {
            dependencies.push(element.expression.value);
          }
        }
      }
    }

    // For composables, we might want to track all argument identifiers as dependencies
    // This is handled separately in argumentIdentifiers

    return dependencies;
  }

  /**
   * Extract identifiers from a function expression (for watch getter functions)
   * @param func - Arrow function or function expression
   * @returns Array of identifier names
   */
  private extractIdentifiersFromFunction(func: swc.ArrowFunctionExpression | swc.FunctionExpression): string[] {
    const identifiers: string[] = [];
    const writtenIdentifiers = new Set<string>();
    
    // Simple extraction: look for identifiers in the function body
    // Track which identifiers are being written to (left side of assignments)
    const extractFromNode = (node: any, isLeftSideOfAssignment: boolean = false): void => {
      if (!node) {return;}
      
      if (node.type === 'Identifier') {
        if (isLeftSideOfAssignment) {
          writtenIdentifiers.add(node.value);
        } else {
          identifiers.push(node.value);
        }
      } else if (node.type === 'MemberExpression') {
        // For member expressions like count.value, extract the object
        if (node.object.type === 'Identifier') {
          if (isLeftSideOfAssignment) {
            writtenIdentifiers.add(node.object.value);
          } else {
            identifiers.push(node.object.value);
          }
        }
      } else if (node.type === 'BlockStatement' && node.stmts) {
        // Traverse block statements
        for (const stmt of node.stmts) {
          extractFromNode(stmt, false);
        }
      } else if (node.type === 'ReturnStatement' && node.argument) {
        extractFromNode(node.argument, false);
      } else if (node.type === 'ExpressionStatement' && node.expression) {
        extractFromNode(node.expression, false);
      } else if (node.type === 'AssignmentExpression') {
        // Handle assignments like doubled.value = count.value * 2
        // Left side is being written to, right side is being read from
        extractFromNode(node.left, true);
        extractFromNode(node.right, false);
      } else if (node.type === 'UpdateExpression') {
        // Handle update expressions like count.value++
        // The argument is being written to
        extractFromNode(node.argument, true);
      } else if (node.type === 'BinaryExpression') {
        extractFromNode(node.left, false);
        extractFromNode(node.right, false);
      } else if (node.type === 'CallExpression') {
        // For call expressions, check if the callee is 'onCleanup' parameter
        // If so, skip it as it's not a dependency
        if (node.callee.type === 'Identifier' && node.callee.value === 'onCleanup') {
          // Skip onCleanup calls - they're not dependencies
          return;
        }
        extractFromNode(node.callee, false);
        if (node.arguments) {
          for (const arg of node.arguments) {
            extractFromNode(arg.expression, false);
          }
        }
      }
    };
    
    // Extract from function body
    if (func.body) {
      extractFromNode(func.body, false);
    }
    
    // Remove duplicates and filter out written identifiers
    const uniqueIdentifiers = [...new Set(identifiers)];
    const filteredIdentifiers = uniqueIdentifiers.filter(id => !writtenIdentifiers.has(id));
    
    // Also filter out function parameters (like onCleanup)
    const paramNames = new Set<string>();
    if (func.params) {
      for (const param of func.params) {
        if (param.type === 'Identifier') {
          paramNames.add(param.value);
        } else if (param.type === 'Parameter' && param.pat.type === 'Identifier') {
          paramNames.add(param.pat.value);
        }
      }
    }
    
    return filteredIdentifiers.filter(id => !paramNames.has(id));
  }

  /**
   * Extract state modifications from lifecycle hook callback
   * Detects assignments to .value properties (ref modifications)
   * @param callExpr - Call expression for the lifecycle hook
   * @returns Array of state variable names that are modified
   */
  private extractStateModificationsFromCallback(callExpr: swc.CallExpression, functionName: string): string[] {
    const modifications: string[] = [];
    
    // Determine which argument contains the callback
    let callbackArg: swc.Argument | undefined;
    
    if (this.isLifecycleHook(functionName)) {
      // Lifecycle hooks take a callback function as the first argument
      if (callExpr.arguments.length === 0) {
        return modifications;
      }
      callbackArg = callExpr.arguments[0];
    } else if (this.isWatcher(functionName)) {
      // watch() takes the callback as the second argument
      // watchEffect() takes the callback as the first argument
      if (functionName === 'watchEffect') {
        if (callExpr.arguments.length === 0) {
          return modifications;
        }
        callbackArg = callExpr.arguments[0];
      } else if (functionName === 'watch') {
        if (callExpr.arguments.length < 2) {
          return modifications;
        }
        callbackArg = callExpr.arguments[1];
      }
    }
    
    if (!callbackArg) {
      return modifications;
    }
    
    if (callbackArg.expression.type !== 'ArrowFunctionExpression' && 
        callbackArg.expression.type !== 'FunctionExpression') {
      return modifications;
    }
    
    const callback = callbackArg.expression;
    
    // Extract assignments from the callback body
    const extractAssignments = (node: any): void => {
      if (!node) {return;}
      
      // Handle assignment expressions like: mountCount.value++, updateCount.value = 1
      if (node.type === 'AssignmentExpression' || node.type === 'UpdateExpression') {
        const target = node.type === 'AssignmentExpression' ? node.left : node.argument;
        
        // Check if this is a .value assignment (ref modification)
        if (target.type === 'MemberExpression' && 
            target.property.type === 'Identifier' && 
            target.property.value === 'value' &&
            target.object.type === 'Identifier') {
          modifications.push(target.object.value);
        }
      }
      // Handle expression statements
      else if (node.type === 'ExpressionStatement' && node.expression) {
        extractAssignments(node.expression);
      }
      // Handle block statements
      else if (node.type === 'BlockStatement' && node.stmts) {
        for (const stmt of node.stmts) {
          extractAssignments(stmt);
        }
      }
    };
    
    // Extract from callback body
    if (callback.body) {
      extractAssignments(callback.body);
    }
    
    // Remove duplicates
    return [...new Set(modifications)];
  }

  /**
   * Detect if a watchEffect has a cleanup function
   * @param callExpr - Call expression for watchEffect
   * @returns True if the watchEffect has a cleanup function
   */
  private hasCleanupFunction(callExpr: swc.CallExpression): boolean {
    // watchEffect takes a callback as the first argument
    if (callExpr.arguments.length === 0) {
      return false;
    }
    
    const firstArg = callExpr.arguments[0];
    if (firstArg.expression.type !== 'ArrowFunctionExpression' && 
        firstArg.expression.type !== 'FunctionExpression') {
      return false;
    }
    
    const callback = firstArg.expression;
    
    // Check if the callback has a parameter (onCleanup)
    if (!callback.params || callback.params.length === 0) {
      return false;
    }
    
    // Check if onCleanup is called in the function body
    const hasOnCleanupCall = (node: any): boolean => {
      if (!node) {return false;}
      
      if (node.type === 'CallExpression') {
        if (node.callee.type === 'Identifier' && node.callee.value === 'onCleanup') {
          return true;
        }
      }
      
      if (node.type === 'BlockStatement' && node.stmts) {
        for (const stmt of node.stmts) {
          if (hasOnCleanupCall(stmt)) {
            return true;
          }
        }
      }
      
      if (node.type === 'ExpressionStatement' && node.expression) {
        return hasOnCleanupCall(node.expression);
      }
      
      return false;
    };
    
    return hasOnCleanupCall(callback.body);
  }

  /**
   * Extract type parameter from call expression
   * @param callExpr - Call expression
   * @returns Type parameter string or undefined
   */
  private extractTypeParameter(callExpr: swc.CallExpression): string | undefined {
    if (callExpr.typeArguments && callExpr.typeArguments.params.length > 0) {
      const typeParam = callExpr.typeArguments.params[0];
      return this.getTypeAnnotationString(typeParam);
    }
    return undefined;
  }

  /**
   * Extract argument identifiers from call expression
   * @param callExpr - Call expression
   * @returns Array of argument identifier names
   */
  private extractArgumentIdentifiers(callExpr: swc.CallExpression): string[] {
    const identifiers: string[] = [];

    for (const arg of callExpr.arguments) {
      if (arg.expression.type === 'Identifier') {
        identifiers.push(arg.expression.value);
      }
    }

    return identifiers;
  }

  /**
   * Determine hook category based on function name
   * @param functionName - Function name
   * @returns Hook category
   */
  private determineCategory(functionName: string): HookInfo['category'] {
    // Watchers are effects
    if (this.isWatcher(functionName)) {
      return 'effect';
    }

    // Lifecycle hooks are effects
    if (this.isLifecycleHook(functionName)) {
      return 'effect';
    }

    // Composables starting with "use" - try to categorize
    if (functionName.startsWith('useRoute') || functionName.startsWith('useRouter')) {
      return 'routing';
    }

    if (functionName.includes('Store') || functionName.includes('State')) {
      return 'state-management';
    }

    if (functionName.includes('Fetch') || functionName.includes('Query') || functionName.includes('Data')) {
      return 'data-fetching';
    }

    if (functionName.includes('Form')) {
      return 'form';
    }

    // Default to state for custom composables
    return 'state';
  }

  /**
   * Get type annotation as string
   * @param typeAnnotation - The type annotation
   * @returns Type string
   */
  private getTypeAnnotationString(typeAnnotation: swc.TsType): string {
    switch (typeAnnotation.type) {
      case 'TsKeywordType':
        return typeAnnotation.kind;

      case 'TsTypeReference':
        return this.getTypeReferenceName(typeAnnotation);

      case 'TsArrayType':
        return `${this.getTypeAnnotationString(typeAnnotation.elemType)}[]`;

      case 'TsUnionType':
        return typeAnnotation.types.map(t => this.getTypeAnnotationString(t)).join(' | ');

      case 'TsIntersectionType':
        return typeAnnotation.types.map(t => this.getTypeAnnotationString(t)).join(' & ');

      case 'TsLiteralType':
        if (typeAnnotation.literal.type === 'StringLiteral') {
          return `"${typeAnnotation.literal.value}"`;
        } else if (typeAnnotation.literal.type === 'NumericLiteral') {
          return String(typeAnnotation.literal.value);
        } else if (typeAnnotation.literal.type === 'BooleanLiteral') {
          return String(typeAnnotation.literal.value);
        }
        return 'literal';

      case 'TsFunctionType':
        return 'function';

      case 'TsTypeLiteral':
        return 'object';

      default:
        return 'unknown';
    }
  }

  /**
   * Get type reference name
   * @param typeRef - The type reference
   * @returns Type name string
   */
  private getTypeReferenceName(typeRef: swc.TsTypeReference): string {
    const typeName = typeRef.typeName;

    if (typeName.type === 'Identifier') {
      return typeName.value;
    }

    // Handle qualified names (e.g., Vue.Ref)
    if (typeName.type === 'TsQualifiedName') {
      return this.getQualifiedName(typeName);
    }

    return 'unknown';
  }

  /**
   * Get qualified name as string
   * @param qualifiedName - The qualified name
   * @returns Qualified name string
   */
  private getQualifiedName(qualifiedName: swc.TsQualifiedName): string {
    const left = qualifiedName.left;
    const right = qualifiedName.right;

    let leftName = '';
    if (left.type === 'Identifier') {
      leftName = left.value;
    } else if (left.type === 'TsQualifiedName') {
      leftName = this.getQualifiedName(left);
    }

    return `${leftName}.${right.value}`;
  }

  /**
   * Extract position information from a node
   * @param node - The AST node
   * @returns Position object with line and column, or undefined
   */
  private extractPosition(node: any): { line: number; column: number } | undefined {
    if (node.span) {
      const line = this.getLineFromSpan(node.span.start);
      const column = this.getColumnFromSpan(node.span.start);
      return { line, column };
    }
    return undefined;
  }

  /**
   * Get line number from span position
   * @param spanStart - Span start position (byte offset)
   * @returns Line number (1-based)
   */
  private getLineFromSpan(spanStart: number): number {
    if (this.lineStarts.length === 0) {
      return this.lineOffset; // Default to lineOffset if no source code
    }

    // Find the line number: lineStarts[i] is the start of line (i+1)
    for (let i = this.lineStarts.length - 1; i >= 0; i--) {
      if (spanStart >= this.lineStarts[i]) {
        return i + 1 + (this.lineOffset - 1);
      }
    }

    return this.lineOffset;
  }

  /**
   * Get column number from span position
   * @param spanStart - Span start position (byte offset)
   * @returns Column number (0-based)
   */
  private getColumnFromSpan(spanStart: number): number {
    if (this.lineStarts.length === 0) {
      return 0; // Default to column 0 if no source code
    }

    const line = this.getLineFromSpan(spanStart);
    const lineStartPos = this.lineStarts[line - 1];
    return spanStart - lineStartPos;
  }
}
