/**
 * Vue State Analyzer
 * 
 * Analyzes Vue 3 Composition API reactive state declarations:
 * - ref() calls
 * - reactive() calls
 * - computed() calls
 */

import * as swc from '@swc/core';
import type { TypeResolver } from '../services/type-resolver.js';

/**
 * Information about Vue reactive state
 */
export interface VueStateInfo {
  name: string;
  type: 'ref' | 'reactive' | 'computed';
  dataType: string;
  line?: number;
  column?: number;
  dependencies?: string[]; // For computed properties: list of state variables they depend on
}

/**
 * Analyzer for Vue reactive state declarations
 */
export class VueStateAnalyzer {
  private typeResolver?: TypeResolver;
  private sourceCode: string = '';
  private lineStarts: number[] = [];

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
   * Analyze reactive state from a parsed Vue script setup module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to array of VueStateInfo objects
   */
  async analyzeState(module: swc.Module, filePath?: string): Promise<VueStateInfo[]> {
    const state: VueStateInfo[] = [];
    
    console.log('[VueStateAnalyzer] Starting state analysis for file:', filePath);
    
    // Analyze all statements in the module
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        state.push(...this.analyzeVariableDeclaration(item));
      }
    }
    
    console.log('[VueStateAnalyzer] Found', state.length, 'state declarations');
    
    return state;
  }

  /**
   * Analyze a variable declaration for reactive state
   * @param varDecl - Variable declaration to analyze
   * @returns Array of VueStateInfo objects
   */
  private analyzeVariableDeclaration(varDecl: swc.VariableDeclaration): VueStateInfo[] {
    const state: VueStateInfo[] = [];

    for (const decl of varDecl.declarations) {
      if (!decl.init) {
        continue;
      }

      // Check for ref(), reactive(), or computed() calls
      const stateInfo = this.extractStateFromInit(decl);
      if (stateInfo) {
        state.push(stateInfo);
      }
    }

    return state;
  }

  /**
   * Extract state information from variable initializer
   * @param decl - Variable declarator
   * @returns VueStateInfo if this is a reactive state declaration, null otherwise
   */
  private extractStateFromInit(decl: swc.VariableDeclarator): VueStateInfo | null {
    if (!decl.init || decl.init.type !== 'CallExpression') {
      return null;
    }

    const callExpr = decl.init;
    const callee = callExpr.callee;

    // Check if callee is an identifier (ref, reactive, computed)
    if (callee.type !== 'Identifier') {
      return null;
    }

    const functionName = callee.value;
    let stateType: 'ref' | 'reactive' | 'computed' | null = null;

    if (functionName === 'ref') {
      stateType = 'ref';
    } else if (functionName === 'reactive') {
      stateType = 'reactive';
    } else if (functionName === 'computed') {
      stateType = 'computed';
    }

    if (!stateType) {
      return null;
    }

    // Extract variable name
    const variableName = this.extractVariableName(decl.id);
    if (!variableName) {
      return null;
    }

    // Extract data type
    const dataType = this.extractDataType(decl, callExpr, stateType);

    // Extract position
    const position = this.extractPosition(decl.id);

    // Extract dependencies for computed properties
    let dependencies: string[] | undefined;
    if (stateType === 'computed') {
      dependencies = this.extractComputedDependencies(callExpr);
      console.log('[VueStateAnalyzer] Found', stateType, 'declaration:', variableName, 'type:', dataType, 'dependencies:', dependencies);
    } else {
      console.log('[VueStateAnalyzer] Found', stateType, 'declaration:', variableName, 'type:', dataType);
    }

    return {
      name: variableName,
      type: stateType,
      dataType,
      line: position?.line,
      column: position?.column,
      dependencies,
    };
  }

  /**
   * Extract dependencies from a computed property
   * Analyzes the arrow function body to find referenced variables
   */
  private extractComputedDependencies(callExpr: swc.CallExpression): string[] {
    const dependencies: string[] = [];
    
    // Get the first argument (should be an arrow function)
    if (callExpr.arguments.length === 0) {
      return dependencies;
    }
    
    const firstArg = callExpr.arguments[0];
    if (!firstArg || firstArg.spread) {
      return dependencies;
    }
    
    const argExpr = firstArg.expression;
    if (argExpr.type !== 'ArrowFunctionExpression' && argExpr.type !== 'FunctionExpression') {
      return dependencies;
    }
    
    // Extract identifiers from the function body
    this.extractIdentifiersFromExpression(argExpr.body, dependencies);
    
    return dependencies;
  }
  
  /**
   * Recursively extract identifier names from an expression
   */
  private extractIdentifiersFromExpression(expr: any, identifiers: string[]): void {
    if (!expr || typeof expr !== 'object') {
      return;
    }
    
    switch (expr.type) {
      case 'Identifier':
        // Add identifier if it's not already in the list
        if (!identifiers.includes(expr.value)) {
          identifiers.push(expr.value);
        }
        break;
        
      case 'MemberExpression':
        // For member expressions like firstName.value, extract the object
        this.extractIdentifiersFromExpression(expr.object, identifiers);
        break;
        
      case 'CallExpression':
        // Extract from callee and arguments
        this.extractIdentifiersFromExpression(expr.callee, identifiers);
        if (expr.arguments) {
          for (const arg of expr.arguments) {
            if (arg && !arg.spread) {
              this.extractIdentifiersFromExpression(arg.expression, identifiers);
            }
          }
        }
        break;
        
      case 'BinaryExpression':
        this.extractIdentifiersFromExpression(expr.left, identifiers);
        this.extractIdentifiersFromExpression(expr.right, identifiers);
        break;
        
      case 'TemplateLiteral':
        // Extract from template expressions
        if (expr.expressions) {
          for (const templateExpr of expr.expressions) {
            this.extractIdentifiersFromExpression(templateExpr, identifiers);
          }
        }
        break;
        
      case 'BlockStatement':
        // For block statements, process all statements
        if (expr.stmts) {
          for (const stmt of expr.stmts) {
            this.extractIdentifiersFromExpression(stmt, identifiers);
          }
        }
        break;
        
      case 'ReturnStatement':
        if (expr.argument) {
          this.extractIdentifiersFromExpression(expr.argument, identifiers);
        }
        break;
        
      case 'ArrayExpression':
        if (expr.elements) {
          for (const element of expr.elements) {
            if (element && !element.spread) {
              this.extractIdentifiersFromExpression(element.expression, identifiers);
            }
          }
        }
        break;
        
      case 'ObjectExpression':
        // For object expressions like { color: isVisible.value ? 'blue' : 'gray' }
        if (expr.properties) {
          for (const prop of expr.properties) {
            if (prop.type === 'KeyValueProperty') {
              this.extractIdentifiersFromExpression(prop.value, identifiers);
            }
          }
        }
        break;
        
      case 'ConditionalExpression':
        // For ternary expressions like showContent.value ? 'active' : 'inactive'
        this.extractIdentifiersFromExpression(expr.test, identifiers);
        this.extractIdentifiersFromExpression(expr.consequent, identifiers);
        this.extractIdentifiersFromExpression(expr.alternate, identifiers);
        break;
        
      case 'ParenthesisExpression':
        // For parenthesized expressions like (() => ({ ... }))
        this.extractIdentifiersFromExpression(expr.expression, identifiers);
        break;
    }
  }

  /**
   * Extract variable name from pattern
   * @param pattern - Variable pattern (identifier or destructuring)
   * @returns Variable name or null
   */
  private extractVariableName(pattern: swc.Pattern): string | null {
    if (pattern.type === 'Identifier') {
      return pattern.value;
    }

    // For destructuring, we could extract multiple names, but for now
    // we'll just use a placeholder or skip
    if (pattern.type === 'ObjectPattern' || pattern.type === 'ArrayPattern') {
      // TODO: Handle destructuring patterns if needed
      return null;
    }

    return null;
  }

  /**
   * Extract data type from variable declaration
   * @param decl - Variable declarator
   * @param callExpr - Call expression (ref/reactive/computed call)
   * @param stateType - Type of state (ref/reactive/computed)
   * @returns Data type string
   */
  private extractDataType(
    decl: swc.VariableDeclarator,
    callExpr: swc.CallExpression,
    stateType: 'ref' | 'reactive' | 'computed'
  ): string {
    // First, try to get type from TypeScript type annotation
    if (decl.id.type === 'Identifier' && 'typeAnnotation' in decl.id && decl.id.typeAnnotation) {
      const typeAnnotation = decl.id.typeAnnotation.typeAnnotation;
      return this.getTypeAnnotationString(typeAnnotation);
    }

    // Second, try to get type from generic type parameter
    if (callExpr.typeArguments && callExpr.typeArguments.params.length > 0) {
      const typeParam = callExpr.typeArguments.params[0];
      return this.getTypeAnnotationString(typeParam);
    }

    // Third, try to infer from initial value
    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      return this.inferTypeFromExpression(arg.expression);
    }

    // Default based on state type
    if (stateType === 'reactive') {
      return 'object';
    }

    return 'unknown';
  }

  /**
   * Infer data type from expression
   * @param expr - Expression to analyze
   * @returns Inferred type string
   */
  private inferTypeFromExpression(expr: swc.Expression): string {
    switch (expr.type) {
      case 'StringLiteral':
        return 'string';
      
      case 'NumericLiteral':
        return 'number';
      
      case 'BooleanLiteral':
        return 'boolean';
      
      case 'ArrayExpression':
        return 'array';
      
      case 'ObjectExpression':
        return 'object';
      
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        return 'function';
      
      case 'NullLiteral':
        return 'null';
      
      case 'Identifier':
        // Could potentially resolve this via TypeResolver
        return 'unknown';
      
      default:
        return 'unknown';
    }
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
