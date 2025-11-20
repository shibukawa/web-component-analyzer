/**
 * Vue Emits Analyzer
 * 
 * Analyzes Vue 3 script setup defineEmits() calls and tracks emit usage.
 * Supports both TypeScript generic syntax and array syntax.
 */

import type * as swc from '@swc/core';
import { TypeResolver } from '../services/type-resolver';

/**
 * Information about Vue emit events
 */
export interface VueEmitInfo {
  name: string;
  dataType?: string;
  line?: number;
  column?: number;
}

/**
 * Information about emit calls in the component
 */
export interface EmitCallInfo {
  eventName: string;
  callerProcess?: string; // Name of the function/process that calls emit
  line?: number;
  column?: number;
}

/**
 * Vue Emits Analyzer
 * 
 * Detects and analyzes defineEmits() calls in Vue 3 script setup:
 * - TypeScript generic syntax: defineEmits<{ submit: [data: FormData] }>()
 * - Array syntax: defineEmits(['submit', 'cancel'])
 * - Tracks emit() calls throughout the component
 */
export class VueEmitsAnalyzer {
  private typeResolver?: TypeResolver;
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private emitVariableName: string | null = null; // Name of the emit variable (e.g., 'emit')

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
   * Analyze emits from a parsed Vue script setup module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to object with emit definitions and calls
   */
  async analyzeEmits(
    module: swc.Module,
    filePath?: string
  ): Promise<{ emits: VueEmitInfo[]; emitCalls: EmitCallInfo[] }> {
    const emits: VueEmitInfo[] = [];
    const emitCalls: EmitCallInfo[] = [];
    
    console.log('[VueEmitsAnalyzer] Starting emits analysis for file:', filePath);
    
    // First pass: Find defineEmits() calls and extract emit variable name
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        for (const decl of item.declarations) {
          // Check if this is a defineEmits() call
          if (decl.init && this.isDefineEmitsCall(decl.init)) {
            console.log('[VueEmitsAnalyzer] Found defineEmits() call');
            
            // Extract emit variable name
            if (decl.id.type === 'Identifier') {
              this.emitVariableName = decl.id.value;
              console.log('[VueEmitsAnalyzer] Emit variable name:', this.emitVariableName);
            }
            
            // Extract emit definitions
            emits.push(...this.extractEmitsFromDefineEmits(decl.init));
          }
        }
      } else if (item.type === 'ExpressionStatement') {
        // Handle standalone defineEmits() calls (not assigned to a variable)
        const expr = item.expression;
        if (this.isDefineEmitsCall(expr)) {
          console.log('[VueEmitsAnalyzer] Found standalone defineEmits() call');
          emits.push(...this.extractEmitsFromDefineEmits(expr));
        }
      }
    }
    
    // Second pass: Find emit() calls throughout the component
    if (this.emitVariableName) {
      this.findEmitCalls(module.body, emitCalls);
    }
    
    console.log('[VueEmitsAnalyzer] Found', emits.length, 'emit definitions');
    console.log('[VueEmitsAnalyzer] Found', emitCalls.length, 'emit calls');
    
    return { emits, emitCalls };
  }

  /**
   * Check if an expression is a defineEmits() call
   * @param expr - Expression to check
   * @returns True if this is a defineEmits() call
   */
  private isDefineEmitsCall(expr: swc.Expression): boolean {
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      if (callee.type === 'Identifier' && callee.value === 'defineEmits') {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract emits from a defineEmits() call expression
   * @param callExpr - The defineEmits() call expression
   * @returns Array of VueEmitInfo objects
   */
  private extractEmitsFromDefineEmits(callExpr: swc.Expression): VueEmitInfo[] {
    if (callExpr.type !== 'CallExpression') {
      return [];
    }

    const emits: VueEmitInfo[] = [];

    // Check for TypeScript generic syntax: defineEmits<{ submit: [data: FormData] }>()
    if (callExpr.typeArguments && callExpr.typeArguments.params.length > 0) {
      console.log('[VueEmitsAnalyzer] Extracting emits from TypeScript generic syntax');
      const typeParam = callExpr.typeArguments.params[0];
      emits.push(...this.extractEmitsFromTypeParameter(typeParam));
    }
    // Check for array syntax: defineEmits(['submit', 'cancel'])
    else if (callExpr.arguments.length > 0) {
      console.log('[VueEmitsAnalyzer] Extracting emits from array syntax');
      const arg = callExpr.arguments[0];
      if (arg.expression.type === 'ArrayExpression') {
        emits.push(...this.extractEmitsFromArrayExpression(arg.expression));
      }
    }

    return emits;
  }

  /**
   * Extract emits from TypeScript generic type parameter
   * @param typeParam - Type parameter from defineEmits<T>()
   * @returns Array of VueEmitInfo objects
   */
  private extractEmitsFromTypeParameter(typeParam: swc.TsType): VueEmitInfo[] {
    const emits: VueEmitInfo[] = [];

    // Handle type literal: { submit: [data: FormData], cancel: [] }
    if (typeParam.type === 'TsTypeLiteral') {
      emits.push(...this.extractEmitsFromTypeLiteral(typeParam));
    }
    // Handle type reference: EmitsInterface
    else if (typeParam.type === 'TsTypeReference') {
      const typeName = this.getTypeReferenceName(typeParam);
      console.log('[VueEmitsAnalyzer] Found type reference:', typeName);
      // For type references, we would need to resolve via TypeResolver
      // For now, create a placeholder
      const position = this.extractPosition(typeParam);
      emits.push({
        name: 'emits',
        dataType: typeName,
        line: position?.line,
        column: position?.column,
      });
    }

    return emits;
  }

  /**
   * Extract emits from TypeScript type literal
   * @param typeLiteral - Type literal to analyze
   * @returns Array of VueEmitInfo objects
   */
  private extractEmitsFromTypeLiteral(typeLiteral: swc.TsTypeLiteral): VueEmitInfo[] {
    const emits: VueEmitInfo[] = [];

    for (const member of typeLiteral.members) {
      if (member.type === 'TsPropertySignature' || member.type === 'TsMethodSignature') {
        const key = member.key;
        let emitName: string | undefined;

        if (key.type === 'Identifier') {
          emitName = key.value;
        } else if (key.type === 'StringLiteral') {
          emitName = key.value;
        }

        if (emitName) {
          const position = this.extractPosition(key);
          let dataType = 'void';

          // Extract payload type from method signature or property type
          if (member.type === 'TsMethodSignature' && member.params.length > 0) {
            // For method signature: submit(data: FormData): void
            const param = member.params[0];
            if (param.type === 'Identifier' && param.typeAnnotation) {
              dataType = this.getTypeAnnotationString(param.typeAnnotation.typeAnnotation);
            }
          } else if (member.type === 'TsPropertySignature' && member.typeAnnotation) {
            // For property signature: submit: [data: FormData]
            const typeAnnotation = member.typeAnnotation.typeAnnotation;
            if (typeAnnotation.type === 'TsTupleType' && typeAnnotation.elemTypes.length > 0) {
              // Extract first tuple element type
              const firstElem = typeAnnotation.elemTypes[0];
              // TsTupleElement can be various types, try to extract type annotation
              if ('typeAnnotation' in firstElem && firstElem.typeAnnotation) {
                dataType = this.getTypeAnnotationString(firstElem.typeAnnotation as swc.TsType);
              } else if ('type' in firstElem && firstElem.type) {
                // It's a direct type, not a named tuple member
                dataType = this.getTypeAnnotationString(firstElem as unknown as swc.TsType);
              }
            }
          }

          console.log('[VueEmitsAnalyzer] Extracted emit:', emitName, 'type:', dataType);

          emits.push({
            name: emitName,
            dataType,
            line: position?.line,
            column: position?.column,
          });
        }
      }
    }

    return emits;
  }

  /**
   * Extract emits from array expression (runtime emits definition)
   * @param arrayExpr - Array expression to analyze
   * @returns Array of VueEmitInfo objects
   */
  private extractEmitsFromArrayExpression(arrayExpr: swc.ArrayExpression): VueEmitInfo[] {
    const emits: VueEmitInfo[] = [];

    for (const elem of arrayExpr.elements) {
      if (elem && elem.expression.type === 'StringLiteral') {
        const emitName = elem.expression.value;
        const position = this.extractPosition(elem.expression);

        console.log('[VueEmitsAnalyzer] Extracted emit:', emitName);

        emits.push({
          name: emitName,
          dataType: 'unknown',
          line: position?.line,
          column: position?.column,
        });
      }
    }

    return emits;
  }

  /**
   * Find emit() calls throughout the component
   * @param statements - AST statements to search
   * @param emitCalls - Array to collect emit call information
   * @param currentFunction - Name of the current function context
   */
  private findEmitCalls(
    statements: swc.ModuleItem[] | swc.Statement[],
    emitCalls: EmitCallInfo[],
    currentFunction?: string
  ): void {
    for (const stmt of statements) {
      this.findEmitCallsInStatement(stmt, emitCalls, currentFunction);
    }
  }

  /**
   * Find emit calls in a single statement
   * @param stmt - Statement to search
   * @param emitCalls - Array to collect emit call information
   * @param currentFunction - Name of the current function context
   */
  private findEmitCallsInStatement(
    stmt: swc.ModuleItem | swc.Statement,
    emitCalls: EmitCallInfo[],
    currentFunction?: string
  ): void {
    // Handle function declarations
    if (stmt.type === 'FunctionDeclaration') {
      const functionName = stmt.identifier ? stmt.identifier.value : undefined;
      if (stmt.body) {
        this.findEmitCalls(stmt.body.stmts, emitCalls, functionName);
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
                this.findEmitCalls(body.stmts, emitCalls, functionName);
              } else {
                // Single expression arrow function
                this.findEmitCallsInExpression(body, emitCalls, functionName);
              }
            }
          } else {
            this.findEmitCallsInExpression(decl.init, emitCalls, functionName);
          }
        }
      }
      return;
    }

    // Handle expression statements
    if (stmt.type === 'ExpressionStatement') {
      this.findEmitCallsInExpression(stmt.expression, emitCalls, currentFunction);
      return;
    }

    // Handle return statements
    if (stmt.type === 'ReturnStatement') {
      if (stmt.argument) {
        this.findEmitCallsInExpression(stmt.argument, emitCalls, currentFunction);
      }
      return;
    }

    // Handle if statements
    if (stmt.type === 'IfStatement') {
      this.findEmitCallsInExpression(stmt.test, emitCalls, currentFunction);
      this.findEmitCallsInStatement(stmt.consequent, emitCalls, currentFunction);
      if (stmt.alternate) {
        this.findEmitCallsInStatement(stmt.alternate, emitCalls, currentFunction);
      }
      return;
    }

    // Handle block statements
    if (stmt.type === 'BlockStatement') {
      this.findEmitCalls(stmt.stmts, emitCalls, currentFunction);
      return;
    }

    // Handle for/while loops
    if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement' || stmt.type === 'DoWhileStatement') {
      if ('body' in stmt) {
        this.findEmitCallsInStatement(stmt.body, emitCalls, currentFunction);
      }
      return;
    }
  }

  /**
   * Find emit calls in an expression
   * @param expr - Expression to search
   * @param emitCalls - Array to collect emit call information
   * @param currentFunction - Name of the current function context
   */
  private findEmitCallsInExpression(
    expr: swc.Expression,
    emitCalls: EmitCallInfo[],
    currentFunction?: string
  ): void {
    // Check if this is an emit() call
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      
      // Check for direct emit call: emit('eventName')
      if (callee.type === 'Identifier' && callee.value === this.emitVariableName) {
        const eventName = this.extractEventNameFromCall(expr);
        if (eventName) {
          const position = this.extractPosition(expr);
          console.log('[VueEmitsAnalyzer] Found emit call:', eventName, 'in', currentFunction || 'top-level');
          
          emitCalls.push({
            eventName,
            callerProcess: currentFunction,
            line: position?.line,
            column: position?.column,
          });
        }
      }
      
      // Recursively search in call arguments
      for (const arg of expr.arguments) {
        this.findEmitCallsInExpression(arg.expression, emitCalls, currentFunction);
      }
    }

    // Handle arrow functions and function expressions
    if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
      if (expr.body) {
        const body = expr.body;
        if (body.type === 'BlockStatement') {
          this.findEmitCalls(body.stmts, emitCalls, currentFunction);
        } else {
          this.findEmitCallsInExpression(body, emitCalls, currentFunction);
        }
      }
    }

    // Handle binary expressions
    if (expr.type === 'BinaryExpression') {
      this.findEmitCallsInExpression(expr.left, emitCalls, currentFunction);
      this.findEmitCallsInExpression(expr.right, emitCalls, currentFunction);
    }

    // Handle conditional expressions
    if (expr.type === 'ConditionalExpression') {
      this.findEmitCallsInExpression(expr.test, emitCalls, currentFunction);
      this.findEmitCallsInExpression(expr.consequent, emitCalls, currentFunction);
      this.findEmitCallsInExpression(expr.alternate, emitCalls, currentFunction);
    }

    // Handle logical expressions
    if (expr.type === 'BinaryExpression') {
      this.findEmitCallsInExpression(expr.left, emitCalls, currentFunction);
      this.findEmitCallsInExpression(expr.right, emitCalls, currentFunction);
    }

    // Handle member expressions
    if (expr.type === 'MemberExpression' && expr.object) {
      this.findEmitCallsInExpression(expr.object, emitCalls, currentFunction);
    }

    // Handle array expressions
    if (expr.type === 'ArrayExpression') {
      for (const elem of expr.elements) {
        if (elem) {
          this.findEmitCallsInExpression(elem.expression, emitCalls, currentFunction);
        }
      }
    }

    // Handle object expressions
    if (expr.type === 'ObjectExpression') {
      for (const prop of expr.properties) {
        if (prop.type === 'KeyValueProperty') {
          this.findEmitCallsInExpression(prop.value, emitCalls, currentFunction);
        } else if (prop.type === 'SpreadElement') {
          this.findEmitCallsInExpression(prop.arguments, emitCalls, currentFunction);
        }
      }
    }
  }

  /**
   * Extract event name from emit() call
   * @param callExpr - The emit() call expression
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

    // Handle qualified names (e.g., Vue.EmitType)
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
