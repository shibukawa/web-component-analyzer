/**
 * Hooks Analyzer for extracting React hook usage from AST
 */

import * as swc from '@swc/core';
import { HookInfo, HookCategory } from '../parser/types';
import { TypeResolver, TypeQueryRequest } from '../services/type-resolver';

/**
 * Hooks Analyzer interface
 */
export interface HooksAnalyzer {
  analyzeHooks(body: swc.ModuleItem[] | swc.Statement[]): Promise<HookInfo[]>;
}

/**
 * Implementation of Hooks Analyzer
 */
export class SWCHooksAnalyzer implements HooksAnalyzer {
  private typeResolver?: TypeResolver;
  private filePath?: string;
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private activeLibraries: string[] = [];

  constructor(typeResolver?: TypeResolver, filePath?: string) {
    this.typeResolver = typeResolver;
    this.filePath = filePath;
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
   * Set active libraries for the current analysis
   * @param libraries - Array of library names that are imported in the current file
   */
  setActiveLibraries(libraries: string[]): void {
    this.activeLibraries = libraries;
    console.log('🪝 Active libraries set:', libraries);
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
   * Analyze hooks in the component body
   * @param body - Array of module items or statements from the component
   * @returns Array of HookInfo objects
   */
  async analyzeHooks(body: swc.ModuleItem[] | swc.Statement[]): Promise<HookInfo[]> {
    console.log('🪝 Hooks Analyzer: Starting analysis');
    console.log('🪝 Body items count:', body.length);
    console.log('🪝 Active libraries:', this.activeLibraries);
    
    // Log each item type individually for better visibility
    const itemTypes = body.map(item => item.type);
    console.log('🪝 Body items types:', itemTypes);
    itemTypes.forEach((type, index) => {
      console.log(`🪝   [${index}]: ${type}`);
    });
    
    const hooksWithDeclarations: Array<{ hook: HookInfo; declaration?: swc.VariableDeclarator }> = [];

    for (let i = 0; i < body.length; i++) {
      const item = body[i];
      console.log(`🪝 Processing item ${i}:`, item.type);
      this.traverseModuleItem(item, hooksWithDeclarations);
    }

    console.log('🪝 Hooks found:', hooksWithDeclarations.length);
    
    // Classify hooks with library adapters or TypeResolver
    const hooks: HookInfo[] = [];
    console.log(`🪝 ========================================`);
    console.log(`🪝 Classifying ${hooksWithDeclarations.length} hooks`);
    console.log(`🪝 Active libraries:`, this.activeLibraries);
    
    for (const { hook, declaration } of hooksWithDeclarations) {
      console.log(`🪝 Processing hook: ${hook.hookName}`);
      console.log(`🪝   Variables:`, hook.variables);
      console.log(`🪝   Arguments:`, hook.arguments);
      console.log(`🪝   Dependencies:`, hook.dependencies);
      
      // Set library name based on active libraries
      // This helps processors identify which hooks they should handle
      const enrichedHook = hook as any;
      if (this.activeLibraries.length > 0) {
        // For now, we'll use a simple heuristic: check if the hook is from an active library
        // Processors will do more sophisticated matching
        for (const libraryName of this.activeLibraries) {
          enrichedHook.libraryName = libraryName;
          break; // Use the first active library for now
        }
      }
      
      console.log(`🪝 enrichedHook.libraryName:`, enrichedHook.libraryName);
      
      if (declaration) {
        // Check if this is React Hook Form hook - classify with special logic
        if (enrichedHook.libraryName === 'react-hook-form') {
          console.log(`🪝 ✅ Detected React Hook Form hook: ${hook.hookName}`);
          const classifiedHook = this.classifyReactHookFormReturnValues(hook);
          hooks.push(classifiedHook);
        }
        // Check if this is useContext - classify with TypeResolver
        else if (hook.hookName === 'useContext') {
          const classifiedHook = await this.classifyUseContextReturnValues(hook, declaration);
          hooks.push(classifiedHook);
        }
        // Check if this is useReducer - extract state properties with TypeResolver
        else if (hook.hookName === 'useReducer') {
          const classifiedHook = await this.classifyUseReducerStateProperties(hook, declaration);
          hooks.push(classifiedHook);
        }
        // Check if this is a custom hook - classify with heuristics
        else if (hook.hookName.startsWith('use') && hook.hookName[3] === hook.hookName[3].toUpperCase()) {
          const classifiedHook = await this.classifyCustomHookReturnValues(hook, declaration);
          hooks.push(classifiedHook);
        } else {
          hooks.push(hook);
        }
      } else {
        hooks.push(hook);
      }
    }

    if (hooks.length > 0) {
      hooks.forEach(h => {
        console.log(`🪝   ✅ ${h.hookName}:`, h.variables);
      });
    }

    return hooks;
  }

  /**
   * Traverse a module item to find hooks
   */
  private traverseModuleItem(
    item: swc.ModuleItem | swc.Statement,
    hooksWithDeclarations: Array<{ hook: HookInfo; declaration?: swc.VariableDeclarator }>
  ): void {
    console.log('🪝 traverseModuleItem called with type:', item.type);
    
    // Handle function declarations
    if (item.type === 'FunctionDeclaration') {
      console.log('🪝 Found FunctionDeclaration');
      if (item.body) {
        this.extractHooksFromFunctionBody(item.body, hooksWithDeclarations);
      }
    }
    // Handle variable declarations
    else if (item.type === 'VariableDeclaration') {
      console.log('🪝 Found VariableDeclaration in traverseModuleItem');
      
      // Check if this is a hook call (e.g., const [count, setCount] = useState(0))
      // or an arrow function definition
      for (const decl of item.declarations) {
        if (decl.init) {
          // Check for arrow function or function expression
          if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
            console.log('🪝 Found arrow/function expression in VariableDeclaration');
            if (decl.init.body && decl.init.body.type === 'BlockStatement') {
              this.extractHooksFromFunctionBody(decl.init.body, hooksWithDeclarations);
            }
          }
          // Check for hook call
          else if (decl.init.type === 'CallExpression') {
            console.log('🪝 Found CallExpression in VariableDeclaration, checking if it\'s a hook...');
            if (this.isHookCall(decl.init)) {
              const hookInfo = this.extractHookInfo(item.declarations[0]);
              if (hookInfo) {
                console.log('🪝 ✅ Hook extracted from VariableDeclaration:', hookInfo.hookName, hookInfo.variables);
                hooksWithDeclarations.push({ hook: hookInfo, declaration: item.declarations[0] });
              }
            }
          }
          // Check for hook call with type assertion (e.g., useSearch() as SearchParams)
          else if (decl.init.type === 'TsAsExpression' || decl.init.type === 'TsSatisfiesExpression') {
            console.log('🪝 Found TsAsExpression/TsSatisfiesExpression in VariableDeclaration');
            const expr = decl.init as any;
            if (expr.expression && expr.expression.type === 'CallExpression') {
              console.log('🪝 Found CallExpression inside TsAsExpression, checking if it\'s a hook...');
              if (this.isHookCall(expr.expression)) {
                const hookInfo = this.extractHookInfo(item.declarations[0]);
                if (hookInfo) {
                  console.log('🪝 ✅ Hook extracted from TsAsExpression:', hookInfo.hookName, hookInfo.variables);
                  hooksWithDeclarations.push({ hook: hookInfo, declaration: item.declarations[0] });
                }
              }
            }
          }
        }
      }
    }
    // Handle export declarations
    else if (item.type === 'ExportDefaultDeclaration') {
      console.log('🪝 Found ExportDefaultDeclaration');
      const declaration = item.decl;
      if (declaration) {
        this.traverseDeclaration(declaration, hooksWithDeclarations);
      }
    }
    else if (item.type === 'ExportDeclaration') {
      console.log('🪝 Found ExportDeclaration');
      const declaration = item.declaration;
      if (declaration) {
        this.traverseDeclaration(declaration, hooksWithDeclarations);
      }
    }
    else {
      console.log('🪝 ⚠️ Unhandled item type in traverseModuleItem:', item.type);
      // This might be a statement from a function body, not a module item
      // Try to extract hooks directly from the statement
      this.extractHooksFromStatement(item as swc.Statement, hooksWithDeclarations);
    }
  }

  /**
   * Traverse a declaration to find hooks
   */
  private traverseDeclaration(
    declaration: swc.Declaration | swc.Expression | swc.DefaultDecl,
    hooksWithDeclarations: Array<{ hook: HookInfo; declaration?: swc.VariableDeclarator }>
  ): void {
    if (declaration.type === 'FunctionDeclaration') {
      if (declaration.body) {
        this.extractHooksFromFunctionBody(declaration.body, hooksWithDeclarations);
      }
    }
    else if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
      if (declaration.body && declaration.body.type === 'BlockStatement') {
        this.extractHooksFromFunctionBody(declaration.body, hooksWithDeclarations);
      }
    }
    else if (declaration.type === 'VariableDeclaration') {
      for (const decl of declaration.declarations) {
        if (decl.init) {
          if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
            if (decl.init.body && decl.init.body.type === 'BlockStatement') {
              this.extractHooksFromFunctionBody(decl.init.body, hooksWithDeclarations);
            }
          }
        }
      }
    }
  }

  /**
   * Extract hooks from a function body
   */
  private extractHooksFromFunctionBody(
    body: swc.BlockStatement,
    hooksWithDeclarations: Array<{ hook: HookInfo; declaration?: swc.VariableDeclarator }>
  ): void {
    console.log('🪝 Extracting hooks from function body, statements:', body.stmts.length);
    for (const statement of body.stmts) {
      console.log('🪝 Processing statement type:', statement.type);
      this.extractHooksFromStatement(statement, hooksWithDeclarations);
    }
  }

  /**
   * Extract hooks from a statement
   */
  private extractHooksFromStatement(
    statement: swc.Statement,
    hooksWithDeclarations: Array<{ hook: HookInfo; declaration?: swc.VariableDeclarator }>
  ): void {
    if (statement.type === 'VariableDeclaration') {
      console.log('🪝 Found VariableDeclaration, declarations:', statement.declarations.length);
      for (const declaration of statement.declarations) {
        console.log('🪝 Declaration init type:', declaration.init?.type);
        if (declaration.init && this.isHookCall(declaration.init)) {
          const hookInfo = this.extractHookInfo(declaration);
          if (hookInfo) {
            console.log('🪝 ✅ Hook extracted:', hookInfo.hookName, hookInfo.variables);
            hooksWithDeclarations.push({ hook: hookInfo, declaration });
          } else {
            console.log('🪝 ❌ Failed to extract hook info');
          }
        } else if (declaration.init) {
          console.log('🪝 ❌ Not a hook call');
        }
      }
    } else if (statement.type === 'ExpressionStatement') {
      // Handle hook calls without assignment (e.g., useEffect without return)
      if (this.isHookCall(statement.expression)) {
        const hookInfo = this.extractHookInfoFromExpression(statement.expression as swc.CallExpression);
        if (hookInfo) {
          hooksWithDeclarations.push({ hook: hookInfo });
        }
      }
    }
  }

  /**
   * Check if an expression is a hook call
   */
  private isHookCall(expression: swc.Expression): boolean {
    if (expression.type !== 'CallExpression') {
      return false;
    }

    const callee = expression.callee;
    
    // Direct hook call: useState()
    if (callee.type === 'Identifier') {
      return callee.value.startsWith('use');
    }

    // Member expression: React.useState()
    if (callee.type === 'MemberExpression') {
      const property = callee.property;
      if (property.type === 'Identifier') {
        return property.value.startsWith('use');
      }
    }

    return false;
  }

  /**
   * Extract hook information from a variable declaration
   */
  private extractHookInfo(declaration: swc.VariableDeclarator): HookInfo | null {
    if (!declaration.init) {
      return null;
    }

    // Handle type assertions (e.g., useSearch() as SearchParams)
    let callExpression: swc.CallExpression | null = null;
    if (declaration.init.type === 'CallExpression') {
      callExpression = declaration.init;
    } else if (declaration.init.type === 'TsAsExpression' || declaration.init.type === 'TsSatisfiesExpression') {
      const expr = declaration.init as any;
      if (expr.expression && expr.expression.type === 'CallExpression') {
        callExpression = expr.expression;
      }
    }

    if (!callExpression) {
      return null;
    }
    const hookName = this.getHookName(callExpression);
    
    if (!hookName) {
      return null;
    }

    // Special handling for useReducer: extract only top-level array elements
    let variables: string[];
    if (hookName === 'useReducer' && declaration.id.type === 'ArrayPattern') {
      console.log('🪝 Using extractUseReducerVariables for useReducer');
      variables = this.extractUseReducerVariables(declaration.id);
      console.log('🪝 Extracted useReducer variables:', variables);
    } else {
      variables = this.extractVariableNames(declaration.id);
    }
    
    const dependencies = this.extractDependencies(callExpression);
    const isReadWritePair = this.isReadWritePair(variables);
    const isFunctionOnly = this.isFunctionOnly(callExpression, variables);
    
    // Extract initial value for useState
    let initialValue: string | undefined;
    if (hookName === 'useState') {
      console.log(`[HooksAnalyzer] Checking useState initial value, args:`, callExpression.arguments.length);
      if (callExpression.arguments.length > 0) {
        const firstArg = callExpression.arguments[0];
        console.log(`[HooksAnalyzer] First arg spread:`, firstArg.spread, 'type:', firstArg.expression.type);
        if (!firstArg.spread && firstArg.expression.type === 'Identifier') {
          initialValue = firstArg.expression.value;
          console.log(`[HooksAnalyzer] ✅ useState initial value: ${initialValue}`);
        } else {
          console.log(`[HooksAnalyzer] ❌ useState initial value not an Identifier`);
        }
      }
    }
    
    // Extract hook arguments (for API endpoints, query keys, etc.)
    const hookArguments = this.extractHookArguments(callExpression);

    // Extract argument identifiers (variable names)
    const argumentIdentifiers = this.extractArgumentIdentifiers(callExpression);

    // Extract type parameter (e.g., "User" from useSWR<User>)
    const typeParameter = this.extractTypeParameter(callExpression);

    // Extract position information
    const position = declaration.span ? {
      line: this.getLineFromSpan(declaration.span.start),
      column: this.getColumnFromSpan(declaration.span.start)
    } : undefined;

    console.log(`[HooksAnalyzer] Extracted hook: ${hookName}, line: ${position?.line}, column: ${position?.column}, typeParam: ${typeParameter || 'none'}, argIds: ${argumentIdentifiers.join(', ')}`);

    // Determine library name from active libraries
    let libraryName: string | undefined;
    for (const activeLib of this.activeLibraries) {
      // Simple heuristic: if the hook name is known to belong to a library
      // For now, we'll set it in the classification phase
      // This is a placeholder for future enhancement
    }

    return {
      hookName,
      category: null as any, // Category is no longer used, processors handle classification
      variables,
      dependencies,
      isReadWritePair,
      isFunctionOnly,
      initialValue,
      arguments: hookArguments,
      argumentIdentifiers,
      typeParameter,
      line: position?.line,
      column: position?.column,
      libraryName, // Add library name for processor routing
    } as any;
  }
  
  /**
   * Extract variables from useReducer pattern
   * For useReducer, we only want the top-level array elements (state, dispatch)
   * not the destructured properties from state
   */
  private extractUseReducerVariables(pattern: swc.ArrayPattern): string[] {
    console.log('🪝 extractUseReducerVariables: pattern.elements.length =', pattern.elements.length);
    const variables: string[] = [];
    
    for (let i = 0; i < pattern.elements.length; i++) {
      const element = pattern.elements[i];
      console.log(`🪝   Element ${i}:`, element ? element.type : 'null');
      
      if (!element || element.type === 'RestElement') {
        continue;
      }
      
      // For each array element, get a representative name
      if (element.type === 'Identifier') {
        console.log(`🪝     -> Identifier: ${element.value}`);
        variables.push(element.value);
      } else if (element.type === 'ObjectPattern') {
        // For object destructuring like { count, step, history }
        // Extract the property names for stateProperties
        const properties: string[] = [];
        console.log(`🪝     -> ObjectPattern with ${element.properties.length} properties`);
        for (const prop of element.properties) {
          if (prop.type === 'KeyValuePatternProperty' && prop.key.type === 'Identifier') {
            properties.push(prop.key.value);
            console.log(`🪝       Property: ${prop.key.value}`);
          } else if (prop.type === 'AssignmentPatternProperty' && prop.key.type === 'Identifier') {
            properties.push(prop.key.value);
            console.log(`🪝       Property: ${prop.key.value}`);
          }
        }
        // Use a synthetic variable name that won't conflict
        console.log(`🪝     -> Using __reducer_state__ for ObjectPattern`);
        variables.push('__reducer_state__');
        // Store properties for later use
        (element as any).__stateProperties = properties;
      } else if (element.type === 'ArrayPattern') {
        // Nested array destructuring (rare)
        console.log(`🪝     -> ArrayPattern (nested)`);
        variables.push('__reducer_state__');
      }
    }
    
    console.log('🪝 extractUseReducerVariables: returning', variables);
    return variables;
  }

  /**
   * Extract hook information from a call expression (no assignment)
   */
  private extractHookInfoFromExpression(callExpression: swc.CallExpression): HookInfo | null {
    const hookName = this.getHookName(callExpression);
    
    if (!hookName) {
      return null;
    }

    const dependencies = this.extractDependencies(callExpression);

    // Extract position information
    const position = callExpression.span ? {
      line: this.getLineFromSpan(callExpression.span.start),
      column: this.getColumnFromSpan(callExpression.span.start)
    } : undefined;

    return {
      hookName,
      category: null as any, // Category is no longer used
      variables: [],
      dependencies,
      isReadWritePair: false,
      isFunctionOnly: false,
      line: position?.line,
      column: position?.column,
    };
  }

  /**
   * Classify custom hook return values using TypeResolver
   * @param hookInfo - Hook information to classify
   * @param declaration - Variable declaration containing the hook call
   * @returns Updated HookInfo with type classifications
   */
  /**
   * Classify React Hook Form hook return values
   * React Hook Form hooks have well-known return value patterns
   * @param hookInfo - The hook information to classify
   * @returns Updated HookInfo with type classifications
   */
  private classifyReactHookFormReturnValues(hookInfo: HookInfo): HookInfo {
    const variableTypes = new Map<string, 'function' | 'data'>();
    
    // Define known return value types for each React Hook Form hook
    const reactHookFormPatterns: Record<string, Record<string, 'function' | 'data'>> = {
      useForm: {
        register: 'function',
        handleSubmit: 'function',
        formState: 'data',
        setValue: 'function',
        reset: 'function',
        watch: 'function',
        getValues: 'function',
        control: 'data',
        unregister: 'function',
        trigger: 'function',
        clearErrors: 'function'
      },
      useController: {
        field: 'data',
        fieldState: 'data'
      },
      useWatch: {
        value: 'data'
      },
      useFormState: {
        isDirty: 'data',
        isValid: 'data',
        errors: 'data',
        isSubmitting: 'data',
        isLoading: 'data',
        isValidating: 'data',
        touchedFields: 'data',
        dirtyFields: 'data'
      }
    };
    
    const pattern = reactHookFormPatterns[hookInfo.hookName];
    
    if (pattern) {
      for (const varName of hookInfo.variables) {
        const type = pattern[varName] || 'data'; // Default to data if not found
        variableTypes.set(varName, type);
        console.log(`🪝   ${varName}: ${type} (React Hook Form pattern)`);
      }
    } else {
      // Fallback to heuristic if hook pattern not found
      for (const varName of hookInfo.variables) {
        const isFunctionName = /^(on|handle|set|get|update|delete|create|fetch|load|toggle|increment|decrement|dispatch|navigate|logout|login|submit|register|reset)[A-Z]/.test(varName) ||
                              ['dispatch', 'navigate', 'logout', 'login', 'submit', 'reset', 'clear', 'increment', 'decrement', 'register', 'handleSubmit'].includes(varName);
        variableTypes.set(varName, isFunctionName ? 'function' : 'data');
        console.log(`🪝   ${varName}: ${isFunctionName ? 'function' : 'data'} (heuristic)`);
      }
    }
    
    return {
      ...hookInfo,
      variableTypes
    };
  }

  private async classifyCustomHookReturnValues(
    hookInfo: HookInfo,
    declaration: swc.VariableDeclarator
  ): Promise<HookInfo> {
    // Skip if no variables to classify
    if (hookInfo.variables.length === 0) {
      return hookInfo;
    }

    try {
      console.log(`🪝 Classifying custom hook: ${hookInfo.hookName} with variables:`, hookInfo.variables);
      
      // Use heuristic-based classification
      // TypeResolver can't resolve custom hook return types without the hook definition
      // So we'll classify based on naming patterns
      const variableTypes = new Map<string, 'function' | 'data'>();
      
      for (const varName of hookInfo.variables) {
        // Common function name patterns
        const isFunctionName = /^(on|handle|set|get|update|delete|create|fetch|load|toggle|increment|decrement|dispatch|navigate|logout|login|submit)[A-Z]/.test(varName) ||
                              ['dispatch', 'navigate', 'logout', 'login', 'submit', 'reset', 'clear', 'increment', 'decrement'].includes(varName);
        
        variableTypes.set(varName, isFunctionName ? 'function' : 'data');
        console.log(`🪝   ${varName}: ${isFunctionName ? 'function' : 'data'}`);
      }

      return {
        ...hookInfo,
        variableTypes
      };
    } catch (error) {
      console.error('Failed to classify custom hook return values:', error);
      return hookInfo;
    }
  }

  private async classifyUseContextReturnValues(
    hookInfo: HookInfo,
    declaration: swc.VariableDeclarator
  ): Promise<HookInfo> {
    // Only classify useContext hooks
    if (hookInfo.hookName !== 'useContext') {
      return hookInfo;
    }

    // Skip if no variables to classify
    if (hookInfo.variables.length === 0) {
      return hookInfo;
    }

    try {
      console.log(`🪝 Classifying useContext: ${hookInfo.hookName} with variables:`, hookInfo.variables);
      
      // For destructured context values, we need to query each property
      const variableTypes = new Map<string, 'function' | 'data'>();
      
      // Check if TypeResolver is available for type-based classification
      const useTypeResolver = this.typeResolver && this.filePath;
      const position = useTypeResolver ? this.getDeclarationPosition(declaration) : null;
      
      if (!useTypeResolver) {
        console.log(`🪝 No TypeResolver or filePath, using heuristic classification only`);
      } else if (!position) {
        console.log(`🪝 Could not determine position, falling back to heuristic classification`);
      }
      
      if (declaration.id.type === 'ObjectPattern') {
        // Destructured: const { user, login, logout } = useContext(AuthContext)
        for (const property of declaration.id.properties) {
          if (property.type === 'KeyValuePatternProperty') {
            const key = property.key;
            if (key.type === 'Identifier') {
              const propName = key.value;
              
              // Try TypeResolver if available
              let classified = false;
              if (useTypeResolver && position && this.typeResolver && this.filePath) {
                const typeResult = await this.typeResolver.resolveType(
                  this.filePath,
                  propName,
                  position.line,
                  position.character
                );

                if (typeResult && typeResult.typeString) {
                  // Validate the type result - if it seems wrong, fall back to heuristic
                  // For example, if a function name pattern matches but type is boolean, use heuristic
                  const isFunctionName = this.isFunctionNamePattern(propName);
                  const typeSeemsSuspicious = (isFunctionName && typeResult.typeString === 'boolean') ||
                                              (isFunctionName && !typeResult.isFunction);
                  
                  if (!typeSeemsSuspicious) {
                    variableTypes.set(propName, typeResult.isFunction ? 'function' : 'data');
                    console.log(`🪝   ${propName}: ${typeResult.isFunction ? 'function' : 'data'} (type: ${typeResult.typeString})`);
                    classified = true;
                  } else {
                    console.log(`🪝   ${propName}: Type result suspicious (${typeResult.typeString}), using heuristic`);
                  }
                }
              }
              
              // Fallback to heuristic if not classified
              if (!classified) {
                const isFunctionName = this.isFunctionNamePattern(propName);
                variableTypes.set(propName, isFunctionName ? 'function' : 'data');
                console.log(`🪝   ${propName}: ${isFunctionName ? 'function' : 'data'} (heuristic)`);
              }

            }
          } else if (property.type === 'AssignmentPatternProperty') {
            if (property.key.type === 'Identifier') {
              const propName = property.key.value;
              
              // Try TypeResolver if available
              let classified = false;
              if (useTypeResolver && position && this.typeResolver && this.filePath) {
                const typeResult = await this.typeResolver.resolveType(
                  this.filePath,
                  propName,
                  position.line,
                  position.character
                );

                if (typeResult && typeResult.typeString) {
                  // Validate the type result - if it seems wrong, fall back to heuristic
                  const isFunctionName = this.isFunctionNamePattern(propName);
                  const typeSeemsSuspicious = (isFunctionName && typeResult.typeString === 'boolean') ||
                                              (isFunctionName && !typeResult.isFunction);
                  
                  if (!typeSeemsSuspicious) {
                    variableTypes.set(propName, typeResult.isFunction ? 'function' : 'data');
                    console.log(`🪝   ${propName}: ${typeResult.isFunction ? 'function' : 'data'} (type: ${typeResult.typeString})`);
                    classified = true;
                  } else {
                    console.log(`🪝   ${propName}: Type result suspicious (${typeResult.typeString}), using heuristic`);
                  }
                }
              }
              
              // Fallback to heuristic if not classified
              if (!classified) {
                const isFunctionName = this.isFunctionNamePattern(propName);
                variableTypes.set(propName, isFunctionName ? 'function' : 'data');
                console.log(`🪝   ${propName}: ${isFunctionName ? 'function' : 'data'} (heuristic)`);
              }
            }
          }
        }
      } else if (declaration.id.type === 'Identifier') {
        // Single variable: const theme = useContext(ThemeContext)
        // This is typically read-only data
        const varName = declaration.id.value;
        variableTypes.set(varName, 'data');
        console.log(`🪝   ${varName}: data (single identifier)`);
      }

      return {
        ...hookInfo,
        variableTypes
      };
    } catch (error) {
      console.error('Failed to classify useContext return values:', error);
      return hookInfo;
    }
  }

  /**
   * Classify useReducer state properties using TypeResolver
   * @param hookInfo - Hook information to classify
   * @param declaration - Variable declaration containing the hook call
   * @returns Updated HookInfo with state properties
   */
  private async classifyUseReducerStateProperties(
    hookInfo: HookInfo,
    declaration: swc.VariableDeclarator
  ): Promise<HookInfo> {
    // Only classify useReducer hooks
    if (hookInfo.hookName !== 'useReducer') {
      return hookInfo;
    }

    // useReducer should have [state, dispatch] pattern
    if (hookInfo.variables.length !== 2) {
      return hookInfo;
    }

    const [stateVar, dispatchVar] = hookInfo.variables;
    
    // Extract reducer function name from the useReducer call
    let reducerName: string | undefined;
    if (declaration.init && declaration.init.type === 'CallExpression') {
      const callExpr = declaration.init as swc.CallExpression;
      if (callExpr.arguments.length > 0 && !callExpr.arguments[0].spread) {
        const firstArg = callExpr.arguments[0].expression;
        if (firstArg.type === 'Identifier') {
          reducerName = firstArg.value;
          console.log(`🪝 Extracted reducer name: ${reducerName}`);
        }
      }
    }
    
    // Extract state properties from destructuring pattern
    let stateProperties: string[] = [];
    console.log('🪝 Checking for state properties, declaration.id.type:', declaration.id.type);
    if (declaration.id.type === 'ArrayPattern' && declaration.id.elements.length > 0) {
      const firstElement = declaration.id.elements[0];
      console.log('🪝 First element type:', firstElement ? firstElement.type : 'null');
      if (firstElement && firstElement.type === 'ObjectPattern') {
        console.log('🪝 ObjectPattern found, extracting properties...');
        for (const prop of firstElement.properties) {
          if (prop.type === 'KeyValuePatternProperty' && prop.key.type === 'Identifier') {
            stateProperties.push(prop.key.value);
            console.log(`🪝   -> Property: ${prop.key.value}`);
          } else if (prop.type === 'AssignmentPatternProperty' && prop.key.type === 'Identifier') {
            stateProperties.push(prop.key.value);
            console.log(`🪝   -> Property: ${prop.key.value}`);
          }
        }
        console.log(`🪝 Extracted state properties from destructuring:`, stateProperties);
      }
    }

    try {
      console.log(`🪝 Classifying useReducer state properties for: ${stateVar}`);
      
      // Check if TypeResolver is available for type-based classification
      const useTypeResolver = this.typeResolver && this.filePath;
      const position = useTypeResolver ? this.getDeclarationPosition(declaration) : null;
      
      if (!useTypeResolver) {
        console.log(`🪝 No TypeResolver or filePath, using destructuring properties:`, stateProperties);
        return {
          ...hookInfo,
          stateProperties: stateProperties.length > 0 ? stateProperties : undefined,
          stateVariable: stateVar,
          dispatchVariable: dispatchVar,
          reducerName
        };
      }
      
      if (!position) {
        console.log(`🪝 Could not determine position, using destructuring properties:`, stateProperties);
        return {
          ...hookInfo,
          stateProperties: stateProperties.length > 0 ? stateProperties : undefined,
          stateVariable: stateVar,
          dispatchVariable: dispatchVar,
          reducerName
        };
      }

      // Query the type of the state variable
      const typeResult = await this.typeResolver!.resolveType(
        this.filePath!,
        stateVar,
        position.line,
        position.character
      );

      if (!typeResult || !typeResult.typeString) {
        console.log(`🪝 Failed to get type for ${stateVar}, using destructuring properties:`, stateProperties);
        return {
          ...hookInfo,
          stateProperties: stateProperties.length > 0 ? stateProperties : undefined,
          stateVariable: stateVar,
          dispatchVariable: dispatchVar,
          reducerName
        };
      }

      console.log(`🪝 State type for ${stateVar}:`, typeResult.typeString);

      // Extract property names from the state type
      const statePropertiesFromType = this.extractPropertiesFromType(typeResult.typeString);
      
      if (statePropertiesFromType.length === 0) {
        console.log(`🪝 No properties found in state type, using destructuring properties:`, stateProperties);
        // Fall back to properties extracted from destructuring
        return {
          ...hookInfo,
          stateProperties: stateProperties.length > 0 ? stateProperties : undefined,
          stateVariable: stateVar,
          dispatchVariable: dispatchVar,
          reducerName
        };
      }

      console.log(`🪝 State properties from TypeResolver:`, statePropertiesFromType);

      // Return updated hook info with state properties
      return {
        ...hookInfo,
        stateProperties: statePropertiesFromType, // Array of property names
        stateVariable: stateVar,
        dispatchVariable: dispatchVar,
        reducerName
      };
    } catch (error) {
      console.error('Failed to classify useReducer state properties:', error);
      // Return with state properties from destructuring even if type resolution fails
      return {
        ...hookInfo,
        stateProperties: stateProperties.length > 0 ? stateProperties : undefined,
        stateVariable: stateVar,
        dispatchVariable: dispatchVar,
        reducerName
      };
    }
  }

  /**
   * Extract property names from a TypeScript type string
   * Handles object types like { count: number; loading: boolean; error: string | null }
   */
  private extractPropertiesFromType(typeString: string): string[] {
    const properties: string[] = [];
    
    // Remove leading/trailing whitespace
    const trimmed = typeString.trim();
    
    // Check if this is an object type
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      // Not an object type, return empty array
      return properties;
    }

    // Extract the content between braces
    const content = trimmed.slice(1, -1).trim();
    
    // Split by semicolons or commas to get individual properties
    // Handle nested objects by tracking brace depth
    let currentProp = '';
    let depth = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{' || char === '<' || char === '(' || char === '[') {
        depth++;
        currentProp += char;
      } else if (char === '}' || char === '>' || char === ')' || char === ']') {
        depth--;
        currentProp += char;
      } else if ((char === ';' || char === ',') && depth === 0) {
        // End of property
        if (currentProp.trim()) {
          const propName = this.extractPropertyName(currentProp.trim());
          if (propName) {
            properties.push(propName);
          }
        }
        currentProp = '';
      } else {
        currentProp += char;
      }
    }
    
    // Don't forget the last property
    if (currentProp.trim()) {
      const propName = this.extractPropertyName(currentProp.trim());
      if (propName) {
        properties.push(propName);
      }
    }
    
    return properties;
  }

  /**
   * Extract property name from a property declaration
   * e.g., "count: number" -> "count"
   * e.g., "readonly loading: boolean" -> "loading"
   */
  private extractPropertyName(propDeclaration: string): string | null {
    // Remove readonly modifier
    const withoutModifiers = propDeclaration.replace(/^readonly\s+/, '');
    
    // Find the colon that separates name from type
    const colonIndex = withoutModifiers.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }
    
    // Extract the name part
    const name = withoutModifiers.slice(0, colonIndex).trim();
    
    // Handle optional properties (name?)
    return name.replace(/\?$/, '');
  }

  /**
   * Get the position of a variable declaration in the source code
   */
  private getDeclarationPosition(declaration: swc.VariableDeclarator): { line: number; character: number } | null {
    // SWC provides span information
    if (declaration.span) {
      const line = this.getLineFromSpan(declaration.span.start);
      const character = this.getColumnFromSpan(declaration.span.start);
      return { line, character };
    }
    return null;
  }

  /**
   * Get line number from span position
   * @param spanStart - Span start position (byte offset)
   * @returns Line number (1-based)
   */
  private getLineFromSpan(spanStart: number): number {
    if (this.lineStarts.length === 0) {
      return 1; // Default to line 1 if no source code
    }

    // Find the line number: lineStarts[i] is the start of line (i+1)
    for (let i = this.lineStarts.length - 1; i >= 0; i--) {
      if (spanStart >= this.lineStarts[i]) {
        return i + 1;
      }
    }
    
    return 1;
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

  /**
   * Check if a variable name follows common function naming patterns
   */
  private isFunctionNamePattern(varName: string): boolean {
    const functionPatterns = [
      /^(on|handle)[A-Z]/,  // onClick, handleClick
      /^(set|get|update|delete|create|fetch|load|toggle|increment|decrement)[A-Z]/, // setUser, getUser, updateProfile
      /^(dispatch|navigate|logout|login|submit|reset|clear)$/, // Common function names
    ];

    return functionPatterns.some(pattern => pattern.test(varName));
  }

  /**
   * Get the hook name from a call expression
   */
  private getHookName(callExpression: swc.CallExpression): string | null {
    const callee = callExpression.callee;

    if (callee.type === 'Identifier') {
      return callee.value;
    }

    if (callee.type === 'MemberExpression') {
      const property = callee.property;
      if (property.type === 'Identifier') {
        return property.value;
      }
    }

    return null;
  }

  /**
   * Extract variable names from a pattern (identifier or destructuring)
   */
  private extractVariableNames(pattern: swc.Pattern): string[] {
    const variables: string[] = [];

    if (pattern.type === 'Identifier') {
      variables.push(pattern.value);
    } else if (pattern.type === 'ArrayPattern') {
      for (const element of pattern.elements) {
        if (element && element.type !== 'RestElement') {
          variables.push(...this.extractVariableNames(element));
        }
      }
    } else if (pattern.type === 'ObjectPattern') {
      for (const property of pattern.properties) {
        if (property.type === 'KeyValuePatternProperty') {
          variables.push(...this.extractVariableNames(property.value));
        } else if (property.type === 'AssignmentPatternProperty') {
          if (property.key.type === 'Identifier') {
            variables.push(property.key.value);
          }
        }
      }
    }

    return variables;
  }

  /**
   * Extract hook arguments for API endpoint detection
   * Extracts literal values (strings, numbers, booleans) from hook call arguments
   */
  private extractHookArguments(callExpression: swc.CallExpression): Array<{ type: string; value?: string | number | boolean }> {
    const args: Array<{ type: string; value?: string | number | boolean }> = [];
    
    for (const arg of callExpression.arguments) {
      if (arg.spread) {
        continue;
      }
      
      const expr = arg.expression;
      
      // Extract string literals
      if (expr.type === 'StringLiteral') {
        args.push({ type: 'string', value: expr.value });
      }
      // Extract numeric literals
      else if (expr.type === 'NumericLiteral') {
        args.push({ type: 'number', value: expr.value });
      }
      // Extract boolean literals
      else if (expr.type === 'BooleanLiteral') {
        args.push({ type: 'boolean', value: expr.value });
      }
      // Extract template literals (simple ones without expressions)
      else if (expr.type === 'TemplateLiteral' && expr.expressions.length === 0 && expr.quasis.length === 1) {
        const quasi = expr.quasis[0];
        if (quasi.type === 'TemplateElement') {
          args.push({ type: 'string', value: quasi.cooked || quasi.raw });
        }
      }
      // For other types (identifiers, function calls, etc.), just record the type
      else {
        args.push({ type: expr.type });
      }
    }
    
    return args;
  }

  /**
   * Extract argument identifiers (variable names) from hook call
   */
  private extractArgumentIdentifiers(callExpression: swc.CallExpression): string[] {
    const identifiers: string[] = [];
    
    for (const arg of callExpression.arguments) {
      if (arg.spread) {
        continue;
      }
      
      const expr = arg.expression;
      
      // Extract identifiers (variable names)
      if (expr.type === 'Identifier') {
        identifiers.push(expr.value);
      }
    }
    
    return identifiers;
  }

  /**
   * Extract type parameter from hook call (e.g., "User" from useSWR<User>)
   */
  private extractTypeParameter(callExpression: swc.CallExpression): string | undefined {
    // Check if the callee has type arguments
    const callee = callExpression.callee;
    
    // Type arguments are on the CallExpression itself in SWC
    if ('typeArguments' in callExpression && callExpression.typeArguments) {
      const typeArgs = callExpression.typeArguments as any;
      if (typeArgs.params && typeArgs.params.length > 0) {
        const firstTypeParam = typeArgs.params[0];
        // Try to extract a simple type name
        if (firstTypeParam.type === 'TsTypeReference' && firstTypeParam.typeName) {
          if (firstTypeParam.typeName.type === 'Identifier') {
            return firstTypeParam.typeName.value;
          }
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract dependencies array from hook call
   */
  private extractDependencies(callExpression: swc.CallExpression): string[] | undefined {
    // Dependencies are typically in the second argument for useEffect, useCallback, useMemo
    if (callExpression.arguments.length < 2) {
      return undefined;
    }

    const depsArg = callExpression.arguments[1];
    if (depsArg.spread || depsArg.expression.type !== 'ArrayExpression') {
      return undefined;
    }

    const arrayExpr = depsArg.expression;
    const dependencies: string[] = [];

    for (const element of arrayExpr.elements) {
      if (element && element.expression.type === 'Identifier') {
        dependencies.push(element.expression.value);
      }
    }

    return dependencies.length > 0 ? dependencies : undefined;
  }

  /**
   * Check if variables follow the [value, setValue] pattern
   */
  private isReadWritePair(variables: string[]): boolean {
    if (variables.length !== 2) {
      return false;
    }

    const [first, second] = variables;
    
    // Check if second variable is "set" + capitalized first variable
    const expectedSetter = 'set' + first.charAt(0).toUpperCase() + first.slice(1);
    
    return second === expectedSetter;
  }

  /**
   * Check if all variables are functions (for useContext classification)
   * This is a heuristic based on common naming patterns
   */
  private isFunctionOnly(callExpression: swc.CallExpression, variables: string[]): boolean {
    // This is a simplified heuristic
    // In a real implementation, we would need type information
    // For now, we check if variable names suggest functions (common patterns)
    
    if (variables.length === 0) {
      return false;
    }

    // Common function name patterns
    const functionPatterns = [
      /^(on|handle)[A-Z]/,  // onClick, handleClick
      /^(set|get|update|delete|create|fetch|load)[A-Z]/, // setUser, getUser
      /^(is|has|can|should)[A-Z]/, // isValid, hasPermission
      /^(dispatch|navigate|logout|login|submit)$/, // Common function names
    ];

    return variables.every(varName => 
      functionPatterns.some(pattern => pattern.test(varName))
    );
  }
}

/**
 * Create a new Hooks Analyzer instance
 */
export function createHooksAnalyzer(typeResolver?: TypeResolver, filePath?: string): HooksAnalyzer {
  return new SWCHooksAnalyzer(typeResolver, filePath);
}
