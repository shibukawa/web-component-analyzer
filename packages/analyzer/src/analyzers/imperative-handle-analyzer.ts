/**
 * Analyzer for useImperativeHandle hook to extract exported handlers
 */

import * as swc from '@swc/core';
import { ExportedHandlerInfo, ExternalCallInfo } from '../parser/types';

/**
 * Interface for analyzing useImperativeHandle hooks
 */
export interface ImperativeHandleAnalyzer {
  /**
   * Set source code for line number calculation
   * @param sourceCode - The source code string
   */
  setSourceCode(sourceCode: string): void;

  /**
   * Analyze useImperativeHandle hook to extract exported handlers
   * @param callExpression - The useImperativeHandle call expression
   * @returns Array of ExportedHandlerInfo objects
   */
  analyzeImperativeHandle(callExpression: swc.CallExpression): ExportedHandlerInfo[];

  /**
   * Extract method definitions from factory function
   * @param factoryFunction - The factory function (second argument)
   * @returns Array of method definitions
   */
  extractMethodDefinitions(
    factoryFunction: swc.ArrowFunctionExpression | swc.FunctionExpression
  ): ExportedHandlerInfo[];
}

/**
 * SWC-based implementation of ImperativeHandleAnalyzer
 */
export class SWCImperativeHandleAnalyzer implements ImperativeHandleAnalyzer {
  private sourceCode: string = '';
  private lineStarts: number[] = [];

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
   * Get line number from span position
   */
  private getLineNumber(position: number): number {
    if (this.lineStarts.length === 0) {
      return 1; // Default to line 1 if no source code
    }

    // Binary search to find the line
    let line = 1;
    for (let i = 0; i < this.lineStarts.length; i++) {
      if (this.lineStarts[i] > position) {
        break;
      }
      line = i + 1;
    }
    return line;
  }

  /**
   * Get column number from span position
   */
  private getColumnNumber(position: number): number {
    if (this.lineStarts.length === 0) {
      return 0; // Default to column 0 if no source code
    }

    const line = this.getLineNumber(position);
    const lineStartPos = this.lineStarts[line - 1];
    return position - lineStartPos;
  }

  /**
   * Analyze useImperativeHandle hook to extract exported handlers
   * @param callExpression - The useImperativeHandle call expression
   * @returns Array of ExportedHandlerInfo objects
   */
  analyzeImperativeHandle(callExpression: swc.CallExpression): ExportedHandlerInfo[] {
    try {
      console.log('[ImperativeHandleAnalyzer] Analyzing useImperativeHandle, args:', callExpression.arguments.length);
      
      // Get the factory function (second argument)
      if (callExpression.arguments.length < 2) {
        console.log('[ImperativeHandleAnalyzer] Not enough arguments');
        return [];
      }

      const factoryArg = callExpression.arguments[1];
      if (factoryArg.spread) {
        console.log('[ImperativeHandleAnalyzer] Factory arg is spread');
        return [];
      }

      const factoryFunction = factoryArg.expression;
      console.log('[ImperativeHandleAnalyzer] Factory function type:', factoryFunction.type);
      
      if (factoryFunction.type !== 'ArrowFunctionExpression' && 
          factoryFunction.type !== 'FunctionExpression') {
        console.log('[ImperativeHandleAnalyzer] Factory function is not arrow or function expression');
        return [];
      }

      const methods = this.extractMethodDefinitions(factoryFunction);
      console.log('[ImperativeHandleAnalyzer] Extracted methods:', methods.length);
      return methods;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to analyze useImperativeHandle:', error);
      return [];
    }
  }

  /**
   * Extract method definitions from factory function
   * @param factoryFunction - The factory function (second argument)
   * @returns Array of method definitions
   */
  extractMethodDefinitions(
    factoryFunction: swc.ArrowFunctionExpression | swc.FunctionExpression
  ): ExportedHandlerInfo[] {
    try {
      console.log('[ImperativeHandleAnalyzer] Extracting method definitions from factory function');
      const objectExpression = this.findReturnedObject(factoryFunction);
      
      if (!objectExpression) {
        console.log('[ImperativeHandleAnalyzer] No object expression found');
        return [];
      }

      console.log('[ImperativeHandleAnalyzer] Found object expression with', objectExpression.properties.length, 'properties');
      const methods: ExportedHandlerInfo[] = [];

      for (const property of objectExpression.properties) {
        const methodInfo = this.extractMethodFromProperty(property);
        if (methodInfo) {
          console.log('[ImperativeHandleAnalyzer] Extracted method:', methodInfo.name);
          methods.push(methodInfo);
        }
      }

      return methods;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract method definitions:', error);
      return [];
    }
  }

  /**
   * Find the returned object expression from factory function
   * @param func - The factory function
   * @returns Object expression or null
   */
  private findReturnedObject(
    func: swc.ArrowFunctionExpression | swc.FunctionExpression
  ): swc.ObjectExpression | null {
    try {
      console.log('[ImperativeHandleAnalyzer] Finding returned object, func type:', func.type, 'body type:', func.body?.type);
      
      // Handle arrow function with expression body: () => ({ ... })
      if (func.type === 'ArrowFunctionExpression' && 
          func.body.type === 'ObjectExpression') {
        console.log('[ImperativeHandleAnalyzer] Found object expression in arrow function body');
        return func.body;
      }
      
      // Handle arrow function with parenthesized expression: () => ({ ... })
      if (func.type === 'ArrowFunctionExpression' && 
          func.body.type === 'ParenthesisExpression') {
        const parenExpr = func.body as swc.ParenthesisExpression;
        if (parenExpr.expression.type === 'ObjectExpression') {
          console.log('[ImperativeHandleAnalyzer] Found object expression in parenthesized expression');
          return parenExpr.expression;
        }
      }

      // Handle function with block statement body
      if (func.body && func.body.type === 'BlockStatement') {
        console.log('[ImperativeHandleAnalyzer] Searching for return statement in block');
        // Find return statement
        for (const statement of func.body.stmts) {
          if (statement.type === 'ReturnStatement' && 
              statement.argument?.type === 'ObjectExpression') {
            console.log('[ImperativeHandleAnalyzer] Found object expression in return statement');
            return statement.argument;
          }
        }
      }

      console.log('[ImperativeHandleAnalyzer] No object expression found');
      return null;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to find returned object:', error);
      return null;
    }
  }

  /**
   * Extract method information from object property
   * @param property - The object property
   * @returns ExportedHandlerInfo or null
   */
  private extractMethodFromProperty(
    property: swc.Property | swc.SpreadElement
  ): ExportedHandlerInfo | null {
    try {
      // Handle KeyValueProperty: { focus: () => {...} }
      if (property.type === 'KeyValueProperty') {
        const methodName = this.getPropertyKey(property.key);
        if (!methodName) {return null;}

        const methodFunction = property.value;
        if (this.isFunctionLike(methodFunction)) {
          return this.analyzeMethod(methodName, methodFunction, property);
        }
      }
      
      // Handle MethodProperty: { focus() {...} }
      else if (property.type === 'MethodProperty') {
        const methodName = this.getPropertyKey(property.key);
        if (!methodName) {return null;}

        return this.analyzeMethodProperty(methodName, property);
      }

      return null;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract method from property:', error);
      return null;
    }
  }

  /**
   * Get property key name from various key types
   * @param key - The property key
   * @returns Property name or null
   */
  private getPropertyKey(key: swc.PropertyName): string | null {
    try {
      if (key.type === 'Identifier') {
        return key.value;
      }
      if (key.type === 'StringLiteral') {
        return key.value;
      }
      return null;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to get property key:', error);
      return null;
    }
  }

  /**
   * Check if an expression is a function-like value
   * @param expression - The expression to check
   * @returns True if it's a function expression
   */
  private isFunctionLike(expression: swc.Expression): boolean {
    return expression.type === 'ArrowFunctionExpression' || 
           expression.type === 'FunctionExpression';
  }

  /**
   * Analyze a method from KeyValueProperty
   * @param name - Method name
   * @param func - Function expression
   * @param property - The property node for location info
   * @returns ExportedHandlerInfo or null
   */
  private analyzeMethod(
    name: string,
    func: swc.Expression,
    property: swc.Property
  ): ExportedHandlerInfo | null {
    try {
      if (func.type !== 'ArrowFunctionExpression' && 
          func.type !== 'FunctionExpression') {
        return null;
      }

      const parameters = this.extractParameters(func.params as any);
      const { references, externalCalls } = this.analyzeFunctionBody(func);
      const returnsValue = this.checkReturnsValue(func);
      const isAsync = func.async || false;

      // Get span from the function expression itself
      const span = func.span;

      return {
        name,
        parameters,
        references,
        externalCalls,
        returnsValue,
        isAsync,
        line: span?.start ? this.getLineNumber(span.start) : undefined,
        column: span?.start ? this.getColumnNumber(span.start) : undefined,
      };
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to analyze method:', error);
      return null;
    }
  }

  /**
   * Analyze a method from MethodProperty
   * @param name - Method name
   * @param property - The method property
   * @returns ExportedHandlerInfo or null
   */
  private analyzeMethodProperty(
    name: string,
    property: swc.MethodProperty
  ): ExportedHandlerInfo | null {
    try {
      // MethodProperty has params as Pattern[] not Param[]
      const parameters: string[] = [];
      if (Array.isArray(property.params)) {
        for (const param of property.params) {
          if ((param as any).type === 'Identifier') {
            parameters.push((param as any).value);
          }
        }
      }
      
      // Create a function-like object for analysis
      const funcLike = {
        type: 'FunctionExpression' as const,
        body: property.body,
        async: false, // MethodProperty doesn't have async property directly
        params: [] as swc.Param[], // Empty params for type compatibility
      };
      
      const { references, externalCalls } = this.analyzeFunctionBody(funcLike as any);
      const returnsValue = this.checkReturnsValue(funcLike as any);

      return {
        name,
        parameters,
        references,
        externalCalls,
        returnsValue,
        isAsync: false, // MethodProperty doesn't expose async directly
        line: undefined, // MethodProperty doesn't have span
        column: undefined,
      };
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to analyze method property:', error);
      return null;
    }
  }

  /**
   * Extract parameter names from function parameters
   * @param params - Function parameters (can be Param[] or Pattern[])
   * @returns Array of parameter names
   */
  private extractParameters(params: swc.Param[] | swc.Pattern[]): string[] {
    const paramNames: string[] = [];
    
    try {
      for (const param of params) {
        // Handle Param type (has 'pat' property)
        if ('pat' in param) {
          const pattern = param.pat;
          if (pattern.type === 'Identifier') {
            paramNames.push(pattern.value);
          }
          // Handle destructured parameters
          else if (pattern.type === 'ObjectPattern') {
            for (const prop of pattern.properties) {
              if (prop.type === 'KeyValuePatternProperty' && prop.key.type === 'Identifier') {
                paramNames.push(prop.key.value);
              } else if (prop.type === 'AssignmentPatternProperty' && prop.key.type === 'Identifier') {
                paramNames.push(prop.key.value);
              }
            }
          }
          // Handle array destructured parameters
          else if (pattern.type === 'ArrayPattern') {
            for (const element of pattern.elements) {
              if (element && element.type === 'Identifier') {
                paramNames.push(element.value);
              }
            }
          }
        }
        // Handle Pattern type directly (for MethodProperty)
        else if (param.type === 'Identifier') {
          paramNames.push(param.value);
        }
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract parameters:', error);
    }
    
    return paramNames;
  }

  /**
   * Analyze a function body to extract variable references and external calls
   * @param func - Function expression
   * @returns Object with references and external calls
   */
  private analyzeFunctionBody(
    func: swc.ArrowFunctionExpression | swc.FunctionExpression
  ): { references: string[]; externalCalls: ExternalCallInfo[] } {
    const references = new Set<string>();
    const externalCalls: ExternalCallInfo[] = [];

    try {
      // Handle arrow function with expression body
      if (func.type === 'ArrowFunctionExpression' && func.body.type !== 'BlockStatement') {
        this.extractReferencesFromExpression(func.body, references, externalCalls);
      }
      // Handle block statement body
      else if (func.body && func.body.type === 'BlockStatement') {
        this.extractReferencesFromBlockStatement(func.body, references, externalCalls);
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to analyze function body:', error);
    }

    return {
      references: Array.from(references),
      externalCalls,
    };
  }

  /**
   * Check if a function returns a value
   * @param func - Function expression
   * @returns True if function has return statement with value
   */
  private checkReturnsValue(
    func: swc.ArrowFunctionExpression | swc.FunctionExpression
  ): boolean {
    try {
      // Arrow function with expression body always returns
      if (func.type === 'ArrowFunctionExpression' && func.body.type !== 'BlockStatement') {
        return true;
      }

      // Check for return statement in block
      if (func.body && func.body.type === 'BlockStatement') {
        for (const statement of func.body.stmts) {
          if (statement.type === 'ReturnStatement' && statement.argument) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to check return value:', error);
      return false;
    }
  }

  /**
   * Extract references from a block statement
   * Reused logic from ProcessAnalyzer
   */
  private extractReferencesFromBlockStatement(
    block: swc.BlockStatement,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    try {
      for (const statement of block.stmts) {
        this.extractReferencesFromStatement(statement, references, externalCalls);
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract references from block:', error);
    }
  }

  /**
   * Extract references from a statement
   * Reused logic from ProcessAnalyzer
   */
  private extractReferencesFromStatement(
    statement: swc.Statement,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    try {
      switch (statement.type) {
        case 'ExpressionStatement':
          this.extractReferencesFromExpression(statement.expression, references, externalCalls);
          break;
        
        case 'VariableDeclaration':
          for (const decl of statement.declarations) {
            if (decl.init) {
              this.extractReferencesFromExpression(decl.init, references, externalCalls);
            }
          }
          break;
        
        case 'ReturnStatement':
          if (statement.argument) {
            this.extractReferencesFromExpression(statement.argument, references, externalCalls);
          }
          break;
        
        case 'IfStatement':
          this.extractReferencesFromExpression(statement.test, references, externalCalls);
          this.extractReferencesFromStatement(statement.consequent, references, externalCalls);
          if (statement.alternate) {
            this.extractReferencesFromStatement(statement.alternate, references, externalCalls);
          }
          break;
        
        case 'BlockStatement':
          this.extractReferencesFromBlockStatement(statement, references, externalCalls);
          break;
        
        case 'ForStatement':
          if (statement.init) {
            if (statement.init.type === 'VariableDeclaration') {
              this.extractReferencesFromStatement(statement.init, references, externalCalls);
            } else {
              this.extractReferencesFromExpression(statement.init, references, externalCalls);
            }
          }
          if (statement.test) {
            this.extractReferencesFromExpression(statement.test, references, externalCalls);
          }
          if (statement.update) {
            this.extractReferencesFromExpression(statement.update, references, externalCalls);
          }
          this.extractReferencesFromStatement(statement.body, references, externalCalls);
          break;
        
        case 'WhileStatement':
          this.extractReferencesFromExpression(statement.test, references, externalCalls);
          this.extractReferencesFromStatement(statement.body, references, externalCalls);
          break;
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract references from statement:', error);
    }
  }

  /**
   * Extract references from an expression
   * Reused logic from ProcessAnalyzer
   */
  private extractReferencesFromExpression(
    expression: swc.Expression,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    try {
      switch (expression.type) {
        case 'Identifier':
          references.add(expression.value);
          break;
        
        case 'MemberExpression':
          this.extractReferencesFromExpression(expression.object, references, externalCalls);
          break;
        
        case 'CallExpression':
          this.handleCallExpression(expression, references, externalCalls);
          break;
        
        case 'BinaryExpression':
          this.extractReferencesFromExpression(expression.left, references, externalCalls);
          this.extractReferencesFromExpression(expression.right, references, externalCalls);
          break;
        
        case 'UnaryExpression':
        case 'UpdateExpression':
          this.extractReferencesFromExpression(expression.argument, references, externalCalls);
          break;
        
        case 'ConditionalExpression':
          this.extractReferencesFromExpression(expression.test, references, externalCalls);
          this.extractReferencesFromExpression(expression.consequent, references, externalCalls);
          this.extractReferencesFromExpression(expression.alternate, references, externalCalls);
          break;
        
        case 'ArrayExpression':
          for (const element of expression.elements) {
            if (element && !element.spread) {
              this.extractReferencesFromExpression(element.expression, references, externalCalls);
            }
          }
          break;
        
        case 'ObjectExpression':
          for (const prop of expression.properties) {
            if (prop.type === 'KeyValueProperty') {
              this.extractReferencesFromExpression(prop.value, references, externalCalls);
            } else if (prop.type === 'Identifier') {
              references.add(prop.value);
            } else if (prop.type === 'SpreadElement') {
              try {
                const spreadArg = prop.arguments as any;
                if (spreadArg && typeof spreadArg === 'object' && 'type' in spreadArg) {
                  this.extractReferencesFromExpression(spreadArg, references, externalCalls);
                }
              } catch {
                // Skip if we can't process this spread element
              }
            }
          }
          break;
        
        case 'ArrowFunctionExpression':
        case 'FunctionExpression':
          // Don't traverse into nested functions
          break;
        
        case 'AssignmentExpression':
          this.extractReferencesFromExpression(expression.right, references, externalCalls);
          break;
        
        case 'AwaitExpression':
          this.extractReferencesFromExpression(expression.argument, references, externalCalls);
          break;
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract references from expression:', error);
    }
  }

  /**
   * Handle call expressions to detect external function calls
   * Reused logic from ProcessAnalyzer
   */
  private handleCallExpression(
    callExpr: swc.CallExpression,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    try {
      const callee = callExpr.callee;
      
      // Check if it's an external function call (member expression like api.sendData)
      if (callee.type === 'MemberExpression') {
        const functionName = this.getMemberExpressionName(callee);
        
        // Check if it's likely an external call (not a built-in method)
        if (functionName && this.isExternalCall(functionName)) {
          const args = this.extractCallArguments(callExpr);
          
          // Extract callback references from arguments
          const callbackReferences: string[] = [];
          for (const arg of callExpr.arguments) {
            if (!arg.spread) {
              const argExpr = arg.expression as any;
              if (argExpr && typeof argExpr === 'object' && 'type' in argExpr) {
                if (argExpr.type === 'ArrowFunctionExpression' || argExpr.type === 'FunctionExpression') {
                  const callbackAnalysis = this.analyzeFunctionBody(argExpr);
                  callbackReferences.push(...callbackAnalysis.references);
                }
              }
            }
          }
          
          externalCalls.push({
            functionName,
            arguments: args,
            callbackReferences: callbackReferences.length > 0 ? callbackReferences : undefined
          });
        }
        
        // Still extract references from the object
        this.extractReferencesFromExpression(callee.object, references, externalCalls);
      }
      // Handle direct function calls
      else if (callee.type === 'Identifier') {
        references.add(callee.value);
      }
      else if (callee.type !== 'Super' && callee.type !== 'Import') {
        this.extractReferencesFromExpression(callee as swc.Expression, references, externalCalls);
      }
      
      // Extract references from arguments
      for (const arg of callExpr.arguments) {
        if (!arg.spread) {
          const argExpr = arg.expression as any;
          if (argExpr && typeof argExpr === 'object' && 'type' in argExpr) {
            // If the argument is a callback function, analyze its body
            if (argExpr.type === 'ArrowFunctionExpression' || argExpr.type === 'FunctionExpression') {
              const callbackAnalysis = this.analyzeFunctionBody(argExpr);
              callbackAnalysis.references.forEach(ref => references.add(ref));
              externalCalls.push(...callbackAnalysis.externalCalls);
            } else {
              this.extractReferencesFromExpression(argExpr, references, externalCalls);
            }
          }
        }
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to handle call expression:', error);
    }
  }

  /**
   * Get the full name of a member expression (e.g., "api.sendData")
   * Reused logic from ProcessAnalyzer
   */
  private getMemberExpressionName(memberExpr: swc.MemberExpression): string | null {
    try {
      const parts: string[] = [];
      
      // Get the property name
      if (memberExpr.property.type === 'Identifier') {
        parts.unshift(memberExpr.property.value);
      } else {
        return null;
      }
      
      // Get the object name
      let current: swc.Expression = memberExpr.object;
      while (current.type === 'MemberExpression') {
        if (current.property.type === 'Identifier') {
          parts.unshift(current.property.value);
        }
        current = current.object;
      }
      
      if (current.type === 'Identifier') {
        parts.unshift(current.value);
      }
      
      return parts.length > 1 ? parts.join('.') : null;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to get member expression name:', error);
      return null;
    }
  }

  /**
   * Check if a function call is external (not a built-in or internal method)
   * Reused logic from ProcessAnalyzer
   */
  private isExternalCall(functionName: string): boolean {
    try {
      // Common patterns for external calls
      const externalPatterns = [
        /^api\./,
        /^logger\./,
        /^analytics\./,
        /^fetch\./,
        /^axios\./,
        /^http\./,
        /^service\./,
        /^client\./,
        /Ref\.current\./,  // Pattern for ref.current.method() - imperative handle calls
      ];
      
      // Built-in methods to exclude
      const builtInMethods = [
        'console.log',
        'console.error',
        'console.warn',
        'Math.',
        'Object.',
        'Array.',
        'String.',
        'Number.',
        'Date.',
        'JSON.',
      ];
      
      // Check if it matches external patterns
      const isExternal = externalPatterns.some(pattern => pattern.test(functionName));
      
      // Check if it's a built-in method
      const isBuiltIn = builtInMethods.some(method => functionName.startsWith(method));
      
      return isExternal && !isBuiltIn;
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to check external call:', error);
      return false;
    }
  }

  /**
   * Extract argument variable names from a call expression
   * Reused logic from ProcessAnalyzer
   */
  private extractCallArguments(callExpr: swc.CallExpression): string[] {
    const args: string[] = [];
    
    try {
      for (const arg of callExpr.arguments) {
        if (!arg.spread && arg.expression.type === 'Identifier') {
          args.push(arg.expression.value);
        }
      }
    } catch (error) {
      console.warn('[ImperativeHandleAnalyzer] Failed to extract call arguments:', error);
    }
    
    return args;
  }
}

/**
 * Factory function to create an ImperativeHandleAnalyzer instance
 */
export function createImperativeHandleAnalyzer(): ImperativeHandleAnalyzer {
  return new SWCImperativeHandleAnalyzer();
}
