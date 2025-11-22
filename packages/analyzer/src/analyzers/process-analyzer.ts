/**
 * Process Analyzer for extracting processes (functions) from React components
 */

import * as swc from '@swc/core';
import { ProcessInfo, ExternalCallInfo } from '../parser/types';
import { ImperativeHandleAnalyzer, createImperativeHandleAnalyzer } from './imperative-handle-analyzer';

/**
 * Process Analyzer interface
 */
export interface ProcessAnalyzer {
  analyzeProcesses(body: swc.ModuleItem[] | swc.Statement[]): ProcessInfo[];
  extractInlineCallbacks(jsxNode: swc.JSXElement | swc.JSXFragment): ProcessInfo[];
}

/**
 * Implementation of Process Analyzer
 */
export class SWCProcessAnalyzer implements ProcessAnalyzer {
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private lineOffset: number = 0;
  private imperativeHandleAnalyzer: ImperativeHandleAnalyzer;

  constructor() {
    this.imperativeHandleAnalyzer = createImperativeHandleAnalyzer();
  }

  /**
   * Set source code for line number calculation
   * @param sourceCode - The source code string
   */
  setSourceCode(sourceCode: string): void {
    this.sourceCode = sourceCode;
    this.lineStarts = this.calculateLineStarts(sourceCode);
    this.imperativeHandleAnalyzer.setSourceCode(sourceCode);
    console.log('[ProcessAnalyzer] setSourceCode: sourceCode.length=' + sourceCode.length + ', lineStarts.length=' + this.lineStarts.length);
  }

  /**
   * Set line offset for file-relative line number calculation
   * Used when the source code is extracted from a larger file (e.g., script section from SFC)
   * @param lineOffset - Starting line number of the source code in the original file (1-based)
   */
  setLineOffset(lineOffset: number): void {
    this.lineOffset = lineOffset;
    console.log('[ProcessAnalyzer] setLineOffset:', lineOffset);
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
    console.log('[ProcessAnalyzer] calculateLineStarts: sourceCode.length=' + sourceCode.length + ', lineStarts.length=' + lineStarts.length);
    return lineStarts;
  }
  /**
   * Analyze processes in the component body
   * @param body - Array of module items or statements from the component
   * @returns Array of ProcessInfo objects
   */
  analyzeProcesses(body: swc.ModuleItem[] | swc.Statement[]): ProcessInfo[] {
    const processes: ProcessInfo[] = [];

    for (const item of body) {
      // Check if this is a Statement (from function body) or ModuleItem (from module)
      if ('type' in item) {
        // Try to process as Statement first (for function body items)
        if (this.isStatement(item)) {
          this.extractProcessesFromStatement(item as swc.Statement, processes);
        } else {
          // Process as ModuleItem
          this.traverseModuleItem(item, processes);
        }
      }
    }

    return processes;
  }

  /**
   * Check if an item is a Statement (not a ModuleItem)
   */
  private isStatement(item: swc.ModuleItem | swc.Statement): boolean {
    // Statements that can appear in function bodies
    const statementTypes = [
      'VariableDeclaration',
      'ExpressionStatement',
      'ReturnStatement',
      'IfStatement',
      'ForStatement',
      'WhileStatement',
      'BlockStatement',
      'FunctionDeclaration',
    ];
    return statementTypes.includes(item.type);
  }

  /**
   * Traverse a module item to find processes
   */
  private traverseModuleItem(item: swc.ModuleItem | swc.Statement, processes: ProcessInfo[]): void {
    // Handle function declarations
    if (item.type === 'FunctionDeclaration') {
      if (item.body) {
        this.extractProcessesFromFunctionBody(item.body, processes);
      }
    }
    // Handle variable declarations (arrow functions)
    else if (item.type === 'VariableDeclaration') {
      for (const decl of item.declarations) {
        if (decl.init) {
          if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
            if (decl.init.body && decl.init.body.type === 'BlockStatement') {
              this.extractProcessesFromFunctionBody(decl.init.body, processes);
            }
          }
        }
      }
    }
    // Handle export declarations
    else if (item.type === 'ExportDefaultDeclaration') {
      const declaration = item.decl;
      if (declaration) {
        this.traverseDeclaration(declaration, processes);
      }
    }
    else if (item.type === 'ExportDeclaration') {
      const declaration = item.declaration;
      if (declaration) {
        this.traverseDeclaration(declaration, processes);
      }
    }
  }

  /**
   * Traverse a declaration to find processes
   */
  private traverseDeclaration(
    declaration: swc.Declaration | swc.Expression | swc.DefaultDecl,
    processes: ProcessInfo[]
  ): void {
    if (declaration.type === 'FunctionDeclaration') {
      if (declaration.body) {
        this.extractProcessesFromFunctionBody(declaration.body, processes);
      }
    }
    else if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
      if (declaration.body && declaration.body.type === 'BlockStatement') {
        this.extractProcessesFromFunctionBody(declaration.body, processes);
      }
    }
    else if (declaration.type === 'VariableDeclaration') {
      for (const decl of declaration.declarations) {
        if (decl.init) {
          if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
            if (decl.init.body && decl.init.body.type === 'BlockStatement') {
              this.extractProcessesFromFunctionBody(decl.init.body, processes);
            }
          }
        }
      }
    }
  }

  /**
   * Extract processes from a function body
   */
  private extractProcessesFromFunctionBody(body: swc.BlockStatement, processes: ProcessInfo[]): void {
    for (const statement of body.stmts) {
      this.extractProcessesFromStatement(statement, processes);
    }
  }

  /**
   * Extract processes from a statement
   */
  private extractProcessesFromStatement(statement: swc.Statement, processes: ProcessInfo[]): void {
    if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        // Check for hook-based processes (useEffect, useCallback, useMemo)
        if (declaration.init && this.isProcessHook(declaration.init)) {
          const processInfo = this.extractProcessFromHook(declaration);
          if (processInfo) {
            processes.push(processInfo);
          }
        }
        // Check for event handlers and custom functions
        else if (declaration.init && this.isFunctionExpression(declaration.init)) {
          const processInfo = this.extractProcessFromFunction(declaration);
          if (processInfo) {
            processes.push(processInfo);
          }
        }
      }
    }
    // Handle function declarations
    else if (statement.type === 'FunctionDeclaration') {
      const processInfo = this.extractProcessFromFunctionDeclaration(statement);
      if (processInfo) {
        processes.push(processInfo);
      }
    }
    // Handle expression statements (e.g., useEffect() without assignment)
    else if (statement.type === 'ExpressionStatement') {
      if (this.isProcessHook(statement.expression)) {
        const processInfo = this.extractProcessFromHookExpression(statement.expression as swc.CallExpression);
        if (processInfo) {
          processes.push(processInfo);
        }
      }
    }
  }

  /**
   * Check if an expression is a process hook (useEffect, useLayoutEffect, useInsertionEffect, useCallback, useMemo, useImperativeHandle)
   */
  private isProcessHook(expression: swc.Expression): boolean {
    if (expression.type !== 'CallExpression') {
      return false;
    }

    const callee = expression.callee;
    
    // Direct hook call
    if (callee.type === 'Identifier') {
      return ['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(callee.value);
    }

    // Member expression: React.useEffect()
    if (callee.type === 'MemberExpression') {
      const property = callee.property;
      if (property.type === 'Identifier') {
        return ['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(property.value);
      }
    }

    return false;
  }

  /**
   * Check if an expression is a function expression
   */
  private isFunctionExpression(expression: swc.Expression): boolean {
    return expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression';
  }

  /**
   * Extract process information from a hook call
   */
  private extractProcessFromHook(declaration: swc.VariableDeclarator): ProcessInfo | null {
    if (!declaration.init || declaration.init.type !== 'CallExpression') {
      return null;
    }

    const callExpression = declaration.init;
    const hookName = this.getHookName(callExpression);
    
    if (!hookName || !['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(hookName)) {
      return null;
    }

    const name = this.getVariableName(declaration.id);
    const line = callExpression.span?.start ? this.getLineNumber(callExpression.span.start) : undefined;
    const column = callExpression.span?.start ? this.getColumnNumber(callExpression.span.start) : undefined;

    // Special handling for useImperativeHandle
    if (hookName === 'useImperativeHandle') {
      try {
        const exportedHandlers = this.imperativeHandleAnalyzer.analyzeImperativeHandle(callExpression);
        
        if (exportedHandlers.length > 0) {
          // Extract dependencies from third argument (index 2) for useImperativeHandle
          const dependencies = this.extractDependencies(callExpression, 2);
          
          console.log(`[ProcessAnalyzer] Extracted useImperativeHandle with ${exportedHandlers.length} exported handlers: ${name || hookName}, line: ${line}, column: ${column}`);
          
          return {
            name: name || hookName,
            type: 'useImperativeHandle',
            dependencies,
            references: [],
            externalCalls: [],
            exportedHandlers,
            line,
            column,
          };
        }
      } catch (error) {
        console.warn('[ProcessAnalyzer] Failed to analyze useImperativeHandle exported handlers, falling back to regular process:', error);
      }
    }

    // Regular hook handling
    const dependencies = this.extractDependencies(callExpression);
    const { references, externalCalls, cleanupProcess } = this.analyzeFunction(callExpression);

    console.log(`[ProcessAnalyzer] Extracted process from hook: ${name || hookName}, line: ${line}, column: ${column}`);

    return {
      name: name || hookName,
      type: hookName as 'useEffect' | 'useLayoutEffect' | 'useInsertionEffect' | 'useCallback' | 'useMemo' | 'useImperativeHandle',
      dependencies,
      references,
      externalCalls,
      cleanupProcess,
      line,
      column,
    };
  }

  /**
   * Extract process information from a hook expression (without variable assignment)
   */
  private extractProcessFromHookExpression(callExpression: swc.CallExpression): ProcessInfo | null {
    const hookName = this.getHookName(callExpression);
    
    if (!hookName || !['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(hookName)) {
      return null;
    }

    const line = callExpression.span?.start ? this.getLineNumber(callExpression.span.start) : undefined;
    const column = callExpression.span?.start ? this.getColumnNumber(callExpression.span.start) : undefined;

    // Special handling for useImperativeHandle
    if (hookName === 'useImperativeHandle') {
      try {
        const exportedHandlers = this.imperativeHandleAnalyzer.analyzeImperativeHandle(callExpression);
        
        if (exportedHandlers.length > 0) {
          // Extract dependencies from third argument (index 2) for useImperativeHandle
          const dependencies = this.extractDependencies(callExpression, 2);
          
          console.log(`[ProcessAnalyzer] Extracted useImperativeHandle expression with ${exportedHandlers.length} exported handlers, line: ${line}, column: ${column}`);
          
          return {
            name: hookName,
            type: 'useImperativeHandle',
            dependencies,
            references: [],
            externalCalls: [],
            exportedHandlers,
            line,
            column,
          };
        }
      } catch (error) {
        console.warn('[ProcessAnalyzer] Failed to analyze useImperativeHandle exported handlers, falling back to regular process:', error);
      }
    }

    // Regular hook handling
    const dependencies = this.extractDependencies(callExpression);
    const { references, externalCalls, cleanupProcess } = this.analyzeFunction(callExpression);

    return {
      name: hookName,
      type: hookName as 'useEffect' | 'useLayoutEffect' | 'useInsertionEffect' | 'useCallback' | 'useMemo' | 'useImperativeHandle',
      dependencies,
      references,
      externalCalls,
      cleanupProcess,
      line,
      column,
    };
  }

  /**
   * Extract cleanup function from useEffect, useLayoutEffect, or useInsertionEffect
   */
  private extractCleanupFunction(func: swc.ArrowFunctionExpression | swc.FunctionExpression): ProcessInfo | undefined {
    if (!func.body || func.body.type !== 'BlockStatement') {
      return undefined;
    }

    // Look for return statement that returns a function
    for (const statement of func.body.stmts) {
      if (statement.type === 'ReturnStatement' && statement.argument) {
        const returnExpr = statement.argument;
        
        // Check if returning a function
        if (returnExpr.type === 'ArrowFunctionExpression' || returnExpr.type === 'FunctionExpression') {
          const { references, externalCalls } = this.analyzeFunctionBody(returnExpr);
          
          return {
            name: 'cleanup',
            type: 'cleanup',
            references,
            externalCalls,
            line: returnExpr.span?.start ? this.getLineNumber(returnExpr.span.start) : undefined,
            column: returnExpr.span?.start ? this.getColumnNumber(returnExpr.span.start) : undefined,
          };
        }
      }
    }

    return undefined;
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
    
    // Add line offset to get file-relative line number
    // The offset is 1-based, so we subtract 1 before adding to get the correct result
    const result = line + this.lineOffset - 1;
    if (position > 1000) {
      console.log('[ProcessAnalyzer] getLineNumber: position=' + position + ', line=' + line + ', lineOffset=' + this.lineOffset + ', result=' + result + ', lineStarts.length=' + this.lineStarts.length);
    }
    return result;
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
   * Extract process information from a function expression
   */
  private extractProcessFromFunction(declaration: swc.VariableDeclarator): ProcessInfo | null {
    if (!declaration.init || !this.isFunctionExpression(declaration.init)) {
      return null;
    }

    const name = this.getVariableName(declaration.id);
    if (!name) {
      return null;
    }

    const functionExpr = declaration.init as swc.ArrowFunctionExpression | swc.FunctionExpression;
    const { references, externalCalls, writes } = this.analyzeFunctionBody(functionExpr);

    // All functions are classified as 'custom-function'
    // Event handler detection is now handled by EventHandlerUsageAnalyzer
    // which analyzes JSX attribute usage patterns instead of relying on naming conventions

    const line = declaration.span?.start ? this.getLineNumber(declaration.span.start) : undefined;
    const column = declaration.span?.start ? this.getColumnNumber(declaration.span.start) : undefined;

    console.log(`[ProcessAnalyzer] Extracted function (var): ${name}, type: custom-function, line: ${line}, column: ${column}`);

    return {
      name,
      type: 'custom-function',
      references,
      externalCalls,
      writes,
      line,
      column,
    };
  }

  /**
   * Extract process information from a function declaration
   */
  private extractProcessFromFunctionDeclaration(funcDecl: swc.FunctionDeclaration): ProcessInfo | null {
    const name = funcDecl.identifier?.value;
    if (!name) {
      return null;
    }

    const { references, externalCalls, writes } = this.analyzeFunctionBody(funcDecl);

    // All functions are classified as 'custom-function'
    // Event handler detection is now handled by EventHandlerUsageAnalyzer
    // which analyzes JSX attribute usage patterns instead of relying on naming conventions

    const line = funcDecl.span?.start ? this.getLineNumber(funcDecl.span.start) : undefined;
    const column = funcDecl.span?.start ? this.getColumnNumber(funcDecl.span.start) : undefined;

    console.log(`[ProcessAnalyzer] Extracted function (decl): ${name}, type: custom-function, span.start=${funcDecl.span?.start}, line: ${line}, column: ${column}`);

    return {
      name,
      type: 'custom-function',
      references,
      externalCalls,
      writes,
      line,
      column,
    };
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
   * Get variable name from a pattern
   */
  private getVariableName(pattern: swc.Pattern): string | null {
    if (pattern.type === 'Identifier') {
      return pattern.value;
    }
    return null;
  }

  /**
   * Extract dependencies array from hook call
   */
  private extractDependencies(callExpression: swc.CallExpression, dependencyIndex: number = 1): string[] | undefined {
    // Dependencies are typically in the second argument (index 1) for useEffect, useCallback, useMemo
    // For useImperativeHandle, dependencies are in the third argument (index 2)
    const requiredArgs = dependencyIndex + 1;
    if (callExpression.arguments.length < requiredArgs) {
      return undefined;
    }

    const depsArg = callExpression.arguments[dependencyIndex];
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
   * Analyze a function (from hook call) to extract references and external calls
   */
  private analyzeFunction(callExpression: swc.CallExpression): { references: string[]; externalCalls: ExternalCallInfo[]; cleanupProcess?: ProcessInfo } {
    // The function is the first argument
    if (callExpression.arguments.length === 0) {
      return { references: [], externalCalls: [] };
    }

    const firstArg = callExpression.arguments[0];
    if (firstArg.spread) {
      return { references: [], externalCalls: [] };
    }

    const funcExpr = firstArg.expression;
    console.log(`[ProcessAnalyzer] analyzeFunction - funcExpr.type:`, funcExpr.type);
    if (funcExpr.type === 'ArrowFunctionExpression' || funcExpr.type === 'FunctionExpression') {
      const result = this.analyzeFunctionBody(funcExpr);
      console.log(`[ProcessAnalyzer] analyzeFunction result - references:`, result.references, 'externalCalls:', result.externalCalls);
      
      // Check for cleanup function (return statement in useEffect)
      const cleanupProcess = this.extractCleanupFunction(funcExpr);
      
      return {
        ...result,
        cleanupProcess,
      };
    }

    console.log(`[ProcessAnalyzer] analyzeFunction - not a function expression, returning empty`);
    return { references: [], externalCalls: [] };
  }

  /**
   * Analyze a function body to extract variable references and external calls
   */
  private analyzeFunctionBody(
    func: swc.ArrowFunctionExpression | swc.FunctionExpression | swc.FunctionDeclaration
  ): { references: string[]; externalCalls: ExternalCallInfo[]; writes?: string[] } {
    const references = new Set<string>();
    const writes = new Set<string>();
    const externalCalls: ExternalCallInfo[] = [];

    console.log(`[ProcessAnalyzer] analyzeFunctionBody - func.type:`, func.type, 'body.type:', func.body?.type);

    // Handle arrow function with expression body
    if (func.type === 'ArrowFunctionExpression' && func.body.type !== 'BlockStatement') {
      console.log(`[ProcessAnalyzer] Arrow function with expression body`);
      this.extractReferencesFromExpression(func.body, references, externalCalls);
    }
    // Handle block statement body
    else if (func.body && func.body.type === 'BlockStatement') {
      console.log(`[ProcessAnalyzer] Block statement body with ${func.body.stmts.length} statements`);
      this.extractReferencesFromBlockStatement(func.body, references, externalCalls);
      this.extractWritesFromBlockStatement(func.body, writes);
    }

    console.log(`[ProcessAnalyzer] analyzeFunctionBody result - references:`, Array.from(references));

    return {
      references: Array.from(references),
      externalCalls,
      writes: writes.size > 0 ? Array.from(writes) : undefined,
    };
  }

  /**
   * Extract references from a block statement
   */
  private extractReferencesFromBlockStatement(
    block: swc.BlockStatement,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    console.log(`[ProcessAnalyzer] extractReferencesFromBlockStatement - ${block.stmts.length} statements`);
    for (const statement of block.stmts) {
      console.log(`[ProcessAnalyzer]   Statement type:`, statement.type);
      this.extractReferencesFromStatement(statement, references, externalCalls);
    }
    console.log(`[ProcessAnalyzer] extractReferencesFromBlockStatement done - references:`, Array.from(references));
  }

  /**
   * Extract write operations (variable modifications) from a block statement
   * Detects assignments, updates (++, --), and other write operations
   */
  private extractWritesFromBlockStatement(
    block: swc.BlockStatement,
    writes: Set<string>
  ): void {
    for (const statement of block.stmts) {
      this.extractWritesFromStatement(statement, writes);
    }
  }

  /**
   * Extract write operations from a statement
   */
  private extractWritesFromStatement(
    statement: swc.Statement,
    writes: Set<string>
  ): void {
    switch (statement.type) {
      case 'ExpressionStatement':
        this.extractWritesFromExpression(statement.expression, writes);
        break;
      
      case 'VariableDeclaration':
        // Variable declarations with initializers are writes
        for (const decl of statement.declarations) {
          if (decl.id.type === 'Identifier') {
            writes.add(decl.id.value);
          }
        }
        break;
      
      case 'IfStatement':
        this.extractWritesFromStatement(statement.consequent, writes);
        if (statement.alternate) {
          this.extractWritesFromStatement(statement.alternate, writes);
        }
        break;
      
      case 'BlockStatement':
        this.extractWritesFromBlockStatement(statement, writes);
        break;
      
      case 'ForStatement':
        if (statement.body) {
          this.extractWritesFromStatement(statement.body, writes);
        }
        break;
      
      case 'WhileStatement':
        if (statement.body) {
          this.extractWritesFromStatement(statement.body, writes);
        }
        break;
    }
  }

  /**
   * Extract write operations from an expression
   */
  private extractWritesFromExpression(
    expression: swc.Expression,
    writes: Set<string>
  ): void {
    switch (expression.type) {
      case 'AssignmentExpression':
        // Extract the left side of assignment
        if (expression.left.type === 'Identifier') {
          writes.add(expression.left.value);
        } else if (expression.left.type === 'MemberExpression' && expression.left.object.type === 'Identifier') {
          // For member expressions like obj.prop = value, track the object
          writes.add(expression.left.object.value);
        }
        break;
      
      case 'UpdateExpression':
        // Extract the argument of update expressions (++, --)
        if (expression.argument.type === 'Identifier') {
          writes.add(expression.argument.value);
        }
        break;
      
      case 'CallExpression':
        // Check for method calls that might modify state (e.g., array.push, store.set)
        if (expression.callee.type === 'MemberExpression' && expression.callee.object.type === 'Identifier') {
          const methodName = expression.callee.property.type === 'Identifier' ? expression.callee.property.value : '';
          // Common mutation methods
          if (['push', 'pop', 'shift', 'unshift', 'splice', 'set', 'update'].includes(methodName)) {
            writes.add(expression.callee.object.value);
          }
        }
        break;
    }
  }

  /**
   * Extract references from a statement
   */
  private extractReferencesFromStatement(
    statement: swc.Statement,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
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
      
      case 'SwitchStatement':
        // Extract references from discriminant (the value being switched on)
        this.extractReferencesFromExpression(statement.discriminant, references, externalCalls);
        // Extract references from each case
        for (const caseClause of statement.cases) {
          // Extract from test expression (case value)
          if (caseClause.test) {
            this.extractReferencesFromExpression(caseClause.test, references, externalCalls);
          }
          // Extract from consequent statements
          for (const consequent of caseClause.consequent) {
            this.extractReferencesFromStatement(consequent, references, externalCalls);
          }
        }
        break;
    }
  }

  /**
   * Extract references from an expression
   */
  private extractReferencesFromExpression(
    expression: swc.Expression,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
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
      
      case 'OptionalChainingExpression':
        // Handle optional chaining like obj?.method() or obj?.prop
        this.extractReferencesFromExpression(expression.base, references, externalCalls);
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
            // Regular property - extract from value
            this.extractReferencesFromExpression(prop.value, references, externalCalls);
          } else if (prop.type === 'Identifier') {
            // Shorthand property: { user } is represented as just an Identifier in SWC
            console.log(`[ProcessAnalyzer] Found shorthand property: ${prop.value}`);
            references.add(prop.value);
          } else if (prop.type === 'SpreadElement') {
            // SpreadElement.arguments can be various types including Super and Import
            // We only process regular expressions
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
        // Extract from both left (what's being assigned to) and right (the value)
        // Left side can be a Pattern or Expression
        if ('type' in expression.left && expression.left.type !== 'ArrayPattern' && expression.left.type !== 'ObjectPattern') {
          this.extractReferencesFromExpression(expression.left as swc.Expression, references, externalCalls);
        }
        this.extractReferencesFromExpression(expression.right, references, externalCalls);
        break;
      
      case 'AwaitExpression':
        this.extractReferencesFromExpression(expression.argument, references, externalCalls);
        break;
      
      case 'JSXElement':
      case 'JSXFragment':
        // Handle JSX expressions
        this.extractReferencesFromJSX(expression, references, externalCalls);
        break;
    }
  }

  /**
   * Handle call expressions to detect external function calls
   */
  private handleCallExpression(
    callExpr: swc.CallExpression,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    const callee = callExpr.callee;
    
    // Check if it's an optional chaining call (e.g., imperativeChild?.focus())
    if (callee.type === 'OptionalChainingExpression') {
      const optChain = callee as swc.OptionalChainingExpression;
      if (optChain.base.type === 'MemberExpression') {
        const memberExpr = optChain.base as swc.MemberExpression;
        
        // Check if this is a ref variable method call (e.g., imperativeChild?.focus())
        const imperativeHandleInfo = this.checkImperativeHandleCall(memberExpr);
        
        if (imperativeHandleInfo) {
          // This is an imperative handle call via optional chaining
          const args = this.extractCallArguments(callExpr);
          externalCalls.push({
            functionName: imperativeHandleInfo.methodName,
            arguments: args,
            isImperativeHandleCall: true,
            refName: imperativeHandleInfo.refName,
            methodName: imperativeHandleInfo.methodName
          });
        }
        
        // Extract references from the base
        this.extractReferencesFromExpression(optChain.base, references, externalCalls);
      }
      return;
    }
    
    // Check if it's an external function call (member expression like api.sendData)
    if (callee.type === 'MemberExpression') {
      const functionName = this.getMemberExpressionName(callee);
      
      // Check if this is a ref.current.method() pattern (imperative handle call)
      const imperativeHandleInfo = this.checkImperativeHandleCall(callee);
      
      if (imperativeHandleInfo) {
        // This is an imperative handle call
        const args = this.extractCallArguments(callExpr);
        externalCalls.push({
          functionName: imperativeHandleInfo.methodName,
          arguments: args,
          isImperativeHandleCall: true,
          refName: imperativeHandleInfo.refName,
          methodName: imperativeHandleInfo.methodName
        });
      }
      // Check if it's likely an external call (not a built-in method)
      else if (functionName && this.isExternalCall(functionName)) {
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
      // Only process if it's a valid expression type
      this.extractReferencesFromExpression(callee as swc.Expression, references, externalCalls);
    }
    
    // Extract references from arguments
    for (const arg of callExpr.arguments) {
      if (!arg.spread) {
        // arg.expression can be various types, use type assertion after checking
        const argExpr = arg.expression as any;
        if (argExpr && typeof argExpr === 'object' && 'type' in argExpr) {
          // If the argument is a callback function, analyze its body
          if (argExpr.type === 'ArrowFunctionExpression' || argExpr.type === 'FunctionExpression') {
            console.log(`[ProcessAnalyzer] Found callback function in call expression`);
            const callbackAnalysis = this.analyzeFunctionBody(argExpr);
            console.log(`[ProcessAnalyzer] Callback references:`, callbackAnalysis.references);
            console.log(`[ProcessAnalyzer] Callback external calls:`, callbackAnalysis.externalCalls);
            // Add references from callback to the parent function's references
            callbackAnalysis.references.forEach(ref => references.add(ref));
            // Add external calls from callback to the parent function's external calls
            externalCalls.push(...callbackAnalysis.externalCalls);
          } else {
            this.extractReferencesFromExpression(argExpr, references, externalCalls);
          }
        }
      }
    }
  }

  /**
   * Check if a member expression is a ref.current.method() pattern
   * Returns { refName, methodName } if it matches, null otherwise
   */
  private checkImperativeHandleCall(memberExpr: swc.MemberExpression): { refName: string; methodName: string } | null {
    // Pattern: ref.current.method()
    // memberExpr.property = method
    // memberExpr.object = ref.current (another MemberExpression)
    
    if (memberExpr.property.type !== 'Identifier') {
      return null;
    }
    
    const methodName = memberExpr.property.value;
    
    // Check if object is ref.current
    if (memberExpr.object.type === 'MemberExpression') {
      const innerMember = memberExpr.object;
      
      // Check if property is 'current'
      if (innerMember.property.type === 'Identifier' && innerMember.property.value === 'current') {
        // Check if object is an identifier (the ref variable)
        if (innerMember.object.type === 'Identifier') {
          const refName = innerMember.object.value;
          
          // Check if ref name ends with 'Ref' (common pattern)
          if (refName.endsWith('Ref') || refName.endsWith('ref')) {
            return { refName, methodName };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Get the full name of a member expression (e.g., "api.sendData")
   */
  private getMemberExpressionName(memberExpr: swc.MemberExpression): string | null {
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
  }

  /**
   * Check if a function call is external (not a built-in or internal method)
   */
  private isExternalCall(functionName: string): boolean {
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
  }

  /**
   * Extract argument variable names from a call expression
   */
  private extractCallArguments(callExpr: swc.CallExpression): string[] {
    const args: string[] = [];
    
    for (const arg of callExpr.arguments) {
      if (!arg.spread && arg.expression.type === 'Identifier') {
        args.push(arg.expression.value);
      }
    }
    
    return args;
  }

  /**
   * Extract references from JSX
   */
  private extractReferencesFromJSX(
    jsx: swc.JSXElement | swc.JSXFragment,
    references: Set<string>,
    externalCalls: ExternalCallInfo[]
  ): void {
    if (jsx.type === 'JSXElement') {
      // Extract from attributes
      for (const attr of jsx.opening.attributes) {
        if (attr.type === 'JSXAttribute' && attr.value) {
          if (attr.value.type === 'JSXExpressionContainer') {
            this.extractReferencesFromExpression(attr.value.expression as swc.Expression, references, externalCalls);
          }
        }
      }
      
      // Extract from children
      for (const child of jsx.children) {
        if (child.type === 'JSXExpressionContainer') {
          this.extractReferencesFromExpression(child.expression as swc.Expression, references, externalCalls);
        } else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
          this.extractReferencesFromJSX(child, references, externalCalls);
        }
      }
    } else if (jsx.type === 'JSXFragment') {
      // Extract from fragment children
      for (const child of jsx.children) {
        if (child.type === 'JSXExpressionContainer') {
          this.extractReferencesFromExpression(child.expression as swc.Expression, references, externalCalls);
        } else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
          this.extractReferencesFromJSX(child, references, externalCalls);
        }
      }
    }
  }

  /**
   * Extract inline callbacks from JSX attributes
   * @param jsxNode - The JSX element or fragment to analyze
   * @returns Array of ProcessInfo objects for inline callbacks
   * 
   * Note: Name-based event handler detection (isEventHandlerName) has been removed.
   * Event handler detection is now handled by EventHandlerUsageAnalyzer which analyzes
   * JSX attribute usage patterns instead of relying on naming conventions.
   */
  extractInlineCallbacks(jsxNode: swc.JSXElement | swc.JSXFragment): ProcessInfo[] {
    const processes: ProcessInfo[] = [];
    const inlineCallbackCounter = { count: 0 };

    this.traverseJSXForInlineCallbacks(jsxNode, processes, inlineCallbackCounter);

    return processes;
  }

  /**
   * Traverse JSX tree to find inline callbacks
   */
  private traverseJSXForInlineCallbacks(
    node: swc.JSXElement | swc.JSXFragment,
    processes: ProcessInfo[],
    counter: { count: number }
  ): void {
    if (node.type === 'JSXElement') {
      // Check attributes for inline callbacks
      for (const attr of node.opening.attributes) {
        if (attr.type === 'JSXAttribute') {
          this.extractInlineCallbackFromAttribute(attr, node, processes, counter);
        }
      }

      // Traverse children
      for (const child of node.children) {
        if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
          this.traverseJSXForInlineCallbacks(child, processes, counter);
        }
      }
    } else if (node.type === 'JSXFragment') {
      // Traverse fragment children
      for (const child of node.children) {
        if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
          this.traverseJSXForInlineCallbacks(child, processes, counter);
        }
      }
    }
  }

  /**
   * Extract inline callback from JSX attribute
   */
  private extractInlineCallbackFromAttribute(
    attr: swc.JSXAttribute,
    element: swc.JSXElement,
    processes: ProcessInfo[],
    counter: { count: number }
  ): void {
    // Check if attribute name is an event handler (starts with "on")
    const attrName = attr.name.type === 'Identifier' ? attr.name.value : null;
    if (!attrName || !attrName.startsWith('on')) {
      return;
    }

    // Check if value is an expression container
    if (!attr.value || attr.value.type !== 'JSXExpressionContainer') {
      return;
    }

    const expression = attr.value.expression;

    // Check if expression is an inline arrow function or function expression
    if (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression') {
      const processInfo = this.extractProcessFromInlineCallback(expression, attrName, element, counter);
      if (processInfo) {
        processes.push(processInfo);
      }
    }
  }

  /**
   * Extract process information from inline callback
   */
  private extractProcessFromInlineCallback(
    func: swc.ArrowFunctionExpression | swc.FunctionExpression,
    attrName: string,
    element: swc.JSXElement,
    counter: { count: number }
  ): ProcessInfo | null {
    // Generate a unique name for the inline callback
    const name = `inline_${attrName}_${counter.count++}`;

    const { references, externalCalls, writes } = this.analyzeFunctionBody(func);

    const line = func.span?.start ? this.getLineNumber(func.span.start) : undefined;
    const column = func.span?.start ? this.getColumnNumber(func.span.start) : undefined;

    // Get JSX element position
    const elementLine = element.span?.start ? this.getLineNumber(element.span.start) : undefined;
    const elementColumn = element.span?.start ? this.getColumnNumber(element.span.start) : undefined;

    console.log(`[ProcessAnalyzer] Extracted inline callback: ${name}, line: ${line}, column: ${column}, used in element at line: ${elementLine}, column: ${elementColumn}`);

    return {
      name,
      type: 'event-handler',
      references,
      externalCalls,
      writes,
      line,
      column,
      isInlineHandler: true,
      usedInJSXElement: {
        line: elementLine,
        column: elementColumn,
        attributeName: attrName
      }
    };
  }
}

/**
 * Create a new Process Analyzer instance
 */
export function createProcessAnalyzer(): ProcessAnalyzer {
  return new SWCProcessAnalyzer();
}
