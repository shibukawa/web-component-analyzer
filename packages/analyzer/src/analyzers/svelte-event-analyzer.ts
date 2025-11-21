/**
 * Svelte Event Analyzer
 * 
 * Analyzes Svelte event dispatching using createEventDispatcher.
 * Tracks event dispatcher creation and dispatch() calls.
 */

import type * as swc from '@swc/core';
import { TypeResolver } from '../services/type-resolver';

/**
 * Information about a dispatched event
 */
export interface SvelteEventInfo {
  name: string;
  dataType?: string;
  line?: number;
  column?: number;
}

/**
 * Information about dispatch calls in the component
 */
export interface DispatchCallInfo {
  eventName: string;
  callerProcess?: string; // Name of the function/process that calls dispatch
  line?: number;
  column?: number;
}

/**
 * Svelte Event Analyzer
 * 
 * Detects and analyzes createEventDispatcher() usage in Svelte components:
 * - Detects createEventDispatcher() calls
 * - Tracks dispatch() calls throughout the component
 * - Extracts event names and payload types
 */
export class SvelteEventAnalyzer {
  private typeResolver?: TypeResolver;
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private dispatchVariableName: string | null = null; // Name of the dispatch variable

  /**
   * Constructor
   * @param typeResolver - Optional TypeResolver for querying type information
   */
  constructor(typeResolver?: TypeResolver) {
    this.typeResolver = typeResolver;
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
   * Analyze events from a parsed Svelte script module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to object with event definitions and dispatch calls
   */
  async analyzeEvents(
    module: swc.Module,
    filePath?: string
  ): Promise<{ events: SvelteEventInfo[]; dispatchCalls: DispatchCallInfo[] }> {
    const events: SvelteEventInfo[] = [];
    const dispatchCalls: DispatchCallInfo[] = [];
    
    // First pass: Find createEventDispatcher() calls and extract dispatch variable name
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        for (const decl of item.declarations) {
          // Check if this is a createEventDispatcher() call
          if (decl.init && this.isCreateEventDispatcherCall(decl.init)) {
            // Extract dispatch variable name
            if (decl.id.type === 'Identifier') {
              this.dispatchVariableName = decl.id.value;
            }
            
            // Extract event definitions from TypeScript generic
            events.push(...this.extractEventsFromCreateEventDispatcher(decl.init));
          }
        }
      }
    }
    
    // Second pass: Find dispatch() calls throughout the component
    if (this.dispatchVariableName) {
      this.findDispatchCalls(module.body, dispatchCalls);
    }
    
    return { events, dispatchCalls };
  }

  /**
   * Check if an expression is a createEventDispatcher() call
   * @param expr - Expression to check
   * @returns True if this is a createEventDispatcher() call
   */
  private isCreateEventDispatcherCall(expr: swc.Expression): boolean {
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      if (callee.type === 'Identifier' && callee.value === 'createEventDispatcher') {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract events from a createEventDispatcher() call expression
   * @param callExpr - The createEventDispatcher() call expression
   * @returns Array of SvelteEventInfo objects
   */
  private extractEventsFromCreateEventDispatcher(callExpr: swc.Expression): SvelteEventInfo[] {
    if (callExpr.type !== 'CallExpression') {
      return [];
    }

    const events: SvelteEventInfo[] = [];

    // Check for TypeScript generic syntax: createEventDispatcher<{ submit: FormData }>()
    if (callExpr.typeArguments && callExpr.typeArguments.params.length > 0) {
      const typeParam = callExpr.typeArguments.params[0];
      events.push(...this.extractEventsFromTypeParameter(typeParam));
    }

    return events;
  }

  /**
   * Extract events from TypeScript generic type parameter
   * @param typeParam - Type parameter from createEventDispatcher<T>()
   * @returns Array of SvelteEventInfo objects
   */
  private extractEventsFromTypeParameter(typeParam: swc.TsType): SvelteEventInfo[] {
    const events: SvelteEventInfo[] = [];

    // Handle type literal: { submit: FormData, cancel: void }
    if (typeParam.type === 'TsTypeLiteral') {
      events.push(...this.extractEventsFromTypeLiteral(typeParam));
    }
    // Handle type reference: EventsInterface
    else if (typeParam.type === 'TsTypeReference') {
      const typeName = this.getTypeReferenceName(typeParam);
      // For type references, we would need to resolve via TypeResolver
      // For now, create a placeholder
      const position = this.extractPosition(typeParam);
      events.push({
        name: 'events',
        dataType: typeName,
        line: position?.line,
        column: position?.column,
      });
    }

    return events;
  }

  /**
   * Extract events from TypeScript type literal
   * @param typeLiteral - Type literal to analyze
   * @returns Array of SvelteEventInfo objects
   */
  private extractEventsFromTypeLiteral(typeLiteral: swc.TsTypeLiteral): SvelteEventInfo[] {
    const events: SvelteEventInfo[] = [];

    for (const member of typeLiteral.members) {
      if (member.type === 'TsPropertySignature') {
        const key = member.key;
        let eventName: string | undefined;

        if (key.type === 'Identifier') {
          eventName = key.value;
        } else if (key.type === 'StringLiteral') {
          eventName = key.value;
        }

        if (eventName) {
          const position = this.extractPosition(key);
          let dataType = 'void';

          // Extract payload type from property type annotation
          if (member.typeAnnotation) {
            dataType = this.getTypeAnnotationString(member.typeAnnotation.typeAnnotation);
          }

          events.push({
            name: eventName,
            dataType,
            line: position?.line,
            column: position?.column,
          });
        }
      }
    }

    return events;
  }

  /**
   * Find dispatch() calls throughout the component
   * @param statements - AST statements to search
   * @param dispatchCalls - Array to collect dispatch call information
   * @param currentFunction - Name of the current function context
   */
  private findDispatchCalls(
    statements: swc.ModuleItem[] | swc.Statement[],
    dispatchCalls: DispatchCallInfo[],
    currentFunction?: string
  ): void {
    for (const stmt of statements) {
      this.findDispatchCallsInStatement(stmt, dispatchCalls, currentFunction);
    }
  }

  /**
   * Find dispatch calls in a single statement
   * @param stmt - Statement to search
   * @param dispatchCalls - Array to collect dispatch call information
   * @param currentFunction - Name of the current function context
   */
  private findDispatchCallsInStatement(
    stmt: swc.ModuleItem | swc.Statement,
    dispatchCalls: DispatchCallInfo[],
    currentFunction?: string
  ): void {
    // Handle function declarations
    if (stmt.type === 'FunctionDeclaration') {
      const functionName = stmt.identifier ? stmt.identifier.value : undefined;
      if (stmt.body) {
        this.findDispatchCalls(stmt.body.stmts, dispatchCalls, functionName);
      }
      return;
    }

    // Handle variable declarations with function expressions
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        const functionName = decl.id.type === 'Identifier' ? decl.id.value : undefined;
        
        if (decl.init) {
          if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
            if (decl.init.body) {
              const body = decl.init.body;
              if (body.type === 'BlockStatement') {
                this.findDispatchCalls(body.stmts, dispatchCalls, functionName);
              } else {
                // Single expression arrow function
                this.findDispatchCallsInExpression(body, dispatchCalls, functionName);
              }
            }
          } else {
            this.findDispatchCallsInExpression(decl.init, dispatchCalls, functionName);
          }
        }
      }
      return;
    }

    // Handle expression statements
    if (stmt.type === 'ExpressionStatement') {
      this.findDispatchCallsInExpression(stmt.expression, dispatchCalls, currentFunction);
      return;
    }

    // Handle return statements
    if (stmt.type === 'ReturnStatement') {
      if (stmt.argument) {
        this.findDispatchCallsInExpression(stmt.argument, dispatchCalls, currentFunction);
      }
      return;
    }

    // Handle if statements
    if (stmt.type === 'IfStatement') {
      this.findDispatchCallsInExpression(stmt.test, dispatchCalls, currentFunction);
      this.findDispatchCallsInStatement(stmt.consequent, dispatchCalls, currentFunction);
      if (stmt.alternate) {
        this.findDispatchCallsInStatement(stmt.alternate, dispatchCalls, currentFunction);
      }
      return;
    }

    // Handle block statements
    if (stmt.type === 'BlockStatement') {
      this.findDispatchCalls(stmt.stmts, dispatchCalls, currentFunction);
      return;
    }

    // Handle for/while loops
    if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement' || stmt.type === 'DoWhileStatement') {
      if ('body' in stmt) {
        this.findDispatchCallsInStatement(stmt.body, dispatchCalls, currentFunction);
      }
      return;
    }
  }

  /**
   * Find dispatch calls in an expression
   * @param expr - Expression to search
   * @param dispatchCalls - Array to collect dispatch call information
   * @param currentFunction - Name of the current function context
   */
  private findDispatchCallsInExpression(
    expr: swc.Expression,
    dispatchCalls: DispatchCallInfo[],
    currentFunction?: string
  ): void {
    // Check if this is a dispatch() call
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      
      // Check for direct dispatch call: dispatch('eventName')
      if (callee.type === 'Identifier' && callee.value === this.dispatchVariableName) {
        const eventName = this.extractEventNameFromCall(expr);
        if (eventName) {
          const position = this.extractPosition(expr);
          
          dispatchCalls.push({
            eventName,
            callerProcess: currentFunction,
            line: position?.line,
            column: position?.column,
          });
        }
      }
      
      // Recursively search in call arguments
      for (const arg of expr.arguments) {
        this.findDispatchCallsInExpression(arg.expression, dispatchCalls, currentFunction);
      }
    }

    // Handle arrow functions and function expressions
    if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
      if (expr.body) {
        const body = expr.body;
        if (body.type === 'BlockStatement') {
          this.findDispatchCalls(body.stmts, dispatchCalls, currentFunction);
        } else {
          this.findDispatchCallsInExpression(body, dispatchCalls, currentFunction);
        }
      }
    }

    // Handle binary expressions
    if (expr.type === 'BinaryExpression') {
      this.findDispatchCallsInExpression(expr.left, dispatchCalls, currentFunction);
      this.findDispatchCallsInExpression(expr.right, dispatchCalls, currentFunction);
    }

    // Handle conditional expressions
    if (expr.type === 'ConditionalExpression') {
      this.findDispatchCallsInExpression(expr.test, dispatchCalls, currentFunction);
      this.findDispatchCallsInExpression(expr.consequent, dispatchCalls, currentFunction);
      this.findDispatchCallsInExpression(expr.alternate, dispatchCalls, currentFunction);
    }

    // Handle member expressions
    if (expr.type === 'MemberExpression' && expr.object) {
      this.findDispatchCallsInExpression(expr.object, dispatchCalls, currentFunction);
    }

    // Handle array expressions
    if (expr.type === 'ArrayExpression') {
      for (const elem of expr.elements) {
        if (elem) {
          this.findDispatchCallsInExpression(elem.expression, dispatchCalls, currentFunction);
        }
      }
    }

    // Handle object expressions
    if (expr.type === 'ObjectExpression') {
      for (const prop of expr.properties) {
        if (prop.type === 'KeyValueProperty') {
          this.findDispatchCallsInExpression(prop.value, dispatchCalls, currentFunction);
        } else if (prop.type === 'SpreadElement') {
          this.findDispatchCallsInExpression(prop.arguments, dispatchCalls, currentFunction);
        }
      }
    }
  }

  /**
   * Extract event name from dispatch() call
   * @param callExpr - The dispatch() call expression
   * @returns Event name or null
   */
  private extractEventNameFromCall(callExpr: swc.CallExpression): string | null {
    if (callExpr.arguments.length === 0) {
      return null;
    }

    const firstArg = callExpr.arguments[0];
    if (firstArg.expression.type === 'StringLiteral') {
      return firstArg.expression.value;
    }

    // Could also be a template literal or identifier
    if (firstArg.expression.type === 'TemplateLiteral') {
      // For simple template literals without expressions
      if (firstArg.expression.quasis.length === 1) {
        return firstArg.expression.quasis[0].cooked || null;
      }
    }

    return null;
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

    // Handle qualified names (e.g., Svelte.EventType)
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
   * Extract position information from a node
   * @param node - The AST node
   * @returns Position object with line and column, or undefined
   */
  private extractPosition(node: any): { line: number; column: number } | undefined {
    if (node && node.span) {
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
}
