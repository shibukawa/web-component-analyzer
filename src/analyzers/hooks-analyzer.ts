/**
 * Hooks Analyzer for extracting React hook usage from AST
 */

import * as swc from '@swc/core';
import { HookInfo, HookCategory } from '../parser/types';
import { hookRegistry } from '../utils/hook-registry';
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

  constructor(typeResolver?: TypeResolver, filePath?: string) {
    this.typeResolver = typeResolver;
    this.filePath = filePath;
  }

  /**
   * Analyze hooks in the component body
   * @param body - Array of module items or statements from the component
   * @returns Array of HookInfo objects
   */
  async analyzeHooks(body: swc.ModuleItem[] | swc.Statement[]): Promise<HookInfo[]> {
    console.log('🪝 Hooks Analyzer: Starting analysis');
    console.log('🪝 Body items count:', body.length);
    
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
    
    // Classify hooks if TypeResolver is available
    const hooks: HookInfo[] = [];
    for (const { hook, declaration } of hooksWithDeclarations) {
      if (declaration) {
        // Check if this is useContext - classify with TypeResolver
        if (hook.hookName === 'useContext') {
          const classifiedHook = await this.classifyUseContextReturnValues(hook, declaration);
          hooks.push(classifiedHook);
        }
        // Check if this is useReducer - extract state properties with TypeResolver
        else if (hook.hookName === 'useReducer') {
          const classifiedHook = await this.classifyUseReducerStateProperties(hook, declaration);
          hooks.push(classifiedHook);
        }
        // Check if this is a custom hook (not in registry) - classify with heuristics
        else if (!hookRegistry.getHookCategory(hook.hookName)) {
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
    if (!declaration.init || declaration.init.type !== 'CallExpression') {
      return null;
    }

    const callExpression = declaration.init;
    const hookName = this.getHookName(callExpression);
    
    if (!hookName) {
      return null;
    }

    const category = hookRegistry.getHookCategory(hookName);
    // For custom hooks (not in registry), category will be null/undefined
    // We still want to extract them for type classification

    const variables = this.extractVariableNames(declaration.id);
    const dependencies = this.extractDependencies(callExpression);
    const isReadWritePair = this.isReadWritePair(variables);
    const isFunctionOnly = this.isFunctionOnly(callExpression, variables);

    return {
      hookName,
      category: category as any, // Allow undefined for custom hooks
      variables,
      dependencies,
      isReadWritePair,
      isFunctionOnly,
    };
  }

  /**
   * Extract hook information from a call expression (no assignment)
   */
  private extractHookInfoFromExpression(callExpression: swc.CallExpression): HookInfo | null {
    const hookName = this.getHookName(callExpression);
    
    if (!hookName) {
      return null;
    }

    const category = hookRegistry.getHookCategory(hookName);
    // For custom hooks (not in registry), category will be null/undefined
    // We still want to extract them

    const dependencies = this.extractDependencies(callExpression);

    return {
      hookName,
      category: category as any, // Allow undefined for custom hooks
      variables: [],
      dependencies,
      isReadWritePair: false,
      isFunctionOnly: false,
    };
  }

  /**
   * Classify custom hook return values using TypeResolver
   * @param hookInfo - Hook information to classify
   * @param declaration - Variable declaration containing the hook call
   * @returns Updated HookInfo with type classifications
   */
  private async classifyCustomHookReturnValues(
    hookInfo: HookInfo,
    declaration: swc.VariableDeclarator
  ): Promise<HookInfo> {
    // Only classify custom hooks (not in registry)
    if (hookRegistry.getHookCategory(hookInfo.hookName)) {
      return hookInfo;
    }

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

  /**
   * Classify useContext return values using TypeResolver
   * @param hookInfo - Hook information to classify
   * @param declaration - Variable declaration containing the hook call
   * @returns Updated HookInfo with type classifications
   */
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
                const typeResult = await this.typeResolver.resolveType({
                  filePath: this.filePath,
                  componentName: '', // Not needed for context properties
                  propName,
                  position: {
                    line: position.line,
                    character: position.character
                  }
                });

                if (!typeResult.error && typeResult.typeString) {
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
                const typeResult = await this.typeResolver.resolveType({
                  filePath: this.filePath,
                  componentName: '',
                  propName,
                  position: {
                    line: position.line,
                    character: position.character
                  }
                });

                if (!typeResult.error && typeResult.typeString) {
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

    try {
      console.log(`🪝 Classifying useReducer state properties for: ${stateVar}`);
      
      // Check if TypeResolver is available for type-based classification
      const useTypeResolver = this.typeResolver && this.filePath;
      const position = useTypeResolver ? this.getDeclarationPosition(declaration) : null;
      
      if (!useTypeResolver) {
        console.log(`🪝 No TypeResolver or filePath, cannot extract state properties`);
        return hookInfo;
      }
      
      if (!position) {
        console.log(`🪝 Could not determine position, cannot extract state properties`);
        return hookInfo;
      }

      // Query the type of the state variable
      const typeResult = await this.typeResolver!.resolveType({
        filePath: this.filePath!,
        componentName: '', // Not needed for state variable
        propName: stateVar,
        position: {
          line: position.line,
          character: position.character
        }
      });

      if (typeResult.error || !typeResult.typeString) {
        console.log(`🪝 Failed to get type for ${stateVar}:`, typeResult.error);
        return hookInfo;
      }

      console.log(`🪝 State type for ${stateVar}:`, typeResult.typeString);

      // Extract property names from the state type
      const stateProperties = this.extractPropertiesFromType(typeResult.typeString);
      
      if (stateProperties.length === 0) {
        console.log(`🪝 No properties found in state type`);
        return hookInfo;
      }

      console.log(`🪝 State properties:`, stateProperties);

      // Return updated hook info with state properties
      return {
        ...hookInfo,
        stateProperties, // Array of property names
        stateVariable: stateVar,
        dispatchVariable: dispatchVar
      };
    } catch (error) {
      console.error('Failed to classify useReducer state properties:', error);
      return hookInfo;
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
      // Convert byte offset to line/character (approximate)
      // For now, we'll use a simple approach
      return {
        line: 0, // Will need to calculate from span
        character: declaration.span.start
      };
    }
    return null;
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
