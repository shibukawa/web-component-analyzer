/**
 * Vue Props Analyzer
 * 
 * Analyzes Vue 3 script setup defineProps() calls and extracts prop definitions.
 * Supports both TypeScript generic syntax and object syntax.
 */

import type * as swc from '@swc/core';
import { PropInfo } from '../parser/types';
import { TypeResolver } from '../services/type-resolver';

/**
 * Vue Props Analyzer
 * 
 * Detects and analyzes defineProps() calls in Vue 3 script setup:
 * - TypeScript generic syntax: defineProps<{ name: string }>()
 * - Object syntax: defineProps({ name: String })
 */
export class VuePropsAnalyzer {
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
   * Set source code for line number calculation
   * @param sourceCode - The source code string
   */
  setSourceCode(sourceCode: string): void {
    this.sourceCode = sourceCode;
    this.lineStarts = this.calculateLineStarts(sourceCode);
  }

  /**
   * Set line offset for file-relative line numbers
   * @param lineOffset - Starting line number of the source code in the original file (1-based)
   */
  setLineOffset(lineOffset: number): void {
    this.lineOffset = lineOffset;
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
   * Analyze props from a parsed Vue script setup module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to array of PropInfo objects
   */
  async analyzeProps(module: swc.Module, filePath?: string): Promise<PropInfo[]> {
    const props: PropInfo[] = [];
    
    console.log('[VuePropsAnalyzer] Starting props analysis for file:', filePath);
    
    // Find defineProps() calls in the module
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        for (const decl of item.declarations) {
          // Check if this is a defineProps() call
          if (decl.init && this.isDefinePropsCall(decl.init)) {
            console.log('[VuePropsAnalyzer] Found defineProps() call');
            props.push(...this.extractPropsFromDefineProps(decl.init));
          }
        }
      } else if (item.type === 'ExpressionStatement') {
        // Handle standalone defineProps() calls (not assigned to a variable)
        const expr = item.expression;
        if (this.isDefinePropsCall(expr)) {
          console.log('[VuePropsAnalyzer] Found standalone defineProps() call');
          props.push(...this.extractPropsFromDefineProps(expr));
        }
      }
    }
    
    console.log('[VuePropsAnalyzer] Found', props.length, 'props');
    
    return props;
  }

  /**
   * Check if an expression is a defineProps() call
   * @param expr - Expression to check
   * @returns True if this is a defineProps() call
   */
  private isDefinePropsCall(expr: swc.Expression): boolean {
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      if (callee.type === 'Identifier' && callee.value === 'defineProps') {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract props from a defineProps() call expression
   * @param callExpr - The defineProps() call expression
   * @returns Array of PropInfo objects
   */
  private extractPropsFromDefineProps(callExpr: swc.Expression): PropInfo[] {
    if (callExpr.type !== 'CallExpression') {
      return [];
    }

    const props: PropInfo[] = [];

    // Check for TypeScript generic syntax: defineProps<{ name: string }>()
    if (callExpr.typeArguments && callExpr.typeArguments.params.length > 0) {
      console.log('[VuePropsAnalyzer] Extracting props from TypeScript generic syntax');
      const typeParam = callExpr.typeArguments.params[0];
      props.push(...this.extractPropsFromTypeParameter(typeParam));
    }
    // Check for object syntax: defineProps({ name: String })
    else if (callExpr.arguments.length > 0) {
      console.log('[VuePropsAnalyzer] Extracting props from object syntax');
      const arg = callExpr.arguments[0];
      if (arg.expression.type === 'ObjectExpression') {
        props.push(...this.extractPropsFromObjectExpression(arg.expression));
      }
    }

    return props;
  }

  /**
   * Extract props from TypeScript generic type parameter
   * @param typeParam - Type parameter from defineProps<T>()
   * @returns Array of PropInfo objects
   */
  private extractPropsFromTypeParameter(typeParam: swc.TsType): PropInfo[] {
    const props: PropInfo[] = [];

    // Handle type literal: { name: string, age: number }
    if (typeParam.type === 'TsTypeLiteral') {
      props.push(...this.extractPropsFromTypeLiteral(typeParam));
    }
    // Handle type reference: PropsInterface
    else if (typeParam.type === 'TsTypeReference') {
      const typeName = this.getTypeReferenceName(typeParam);
      console.log('[VuePropsAnalyzer] Found type reference:', typeName);
      // For type references, we create a single prop entry representing the interface
      // The actual props would need to be resolved via TypeResolver
      const position = this.extractPosition(typeParam);
      props.push({
        name: 'props',
        type: typeName,
        isDestructured: false,
        line: position?.line,
        column: position?.column,
      });
    }

    return props;
  }

  /**
   * Extract props from TypeScript type literal
   * @param typeLiteral - Type literal to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromTypeLiteral(typeLiteral: swc.TsTypeLiteral): PropInfo[] {
    const props: PropInfo[] = [];

    for (const member of typeLiteral.members) {
      if (member.type === 'TsPropertySignature') {
        const key = member.key;
        let propName: string | undefined;

        if (key.type === 'Identifier') {
          propName = key.value;
        }

        if (propName && member.typeAnnotation) {
          const typeAnnotation = member.typeAnnotation.typeAnnotation;
          const position = this.extractPosition(key);
          const dataType = this.getTypeAnnotationString(typeAnnotation);

          console.log('[VuePropsAnalyzer] Extracted prop:', propName, 'type:', dataType);

          props.push({
            name: propName,
            type: dataType,
            isDestructured: false,
            line: position?.line,
            column: position?.column,
          });
        }
      }
    }

    return props;
  }

  /**
   * Extract props from object expression (runtime props definition)
   * @param objExpr - Object expression to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromObjectExpression(objExpr: swc.ObjectExpression): PropInfo[] {
    const props: PropInfo[] = [];

    for (const prop of objExpr.properties) {
      if (prop.type === 'KeyValueProperty') {
        const key = prop.key;
        let propName: string | undefined;

        if (key.type === 'Identifier') {
          propName = key.value;
        }

        if (propName) {
          const position = this.extractPosition(key);
          const dataType = this.extractTypeFromValue(prop.value);

          console.log('[VuePropsAnalyzer] Extracted prop:', propName, 'type:', dataType);

          props.push({
            name: propName,
            type: dataType,
            isDestructured: false,
            line: position?.line,
            column: position?.column,
          });
        }
      }
    }

    return props;
  }

  /**
   * Extract type from Vue runtime prop value
   * @param value - Prop value expression
   * @returns Type string
   */
  private extractTypeFromValue(value: swc.Expression): string {
    // Handle direct type constructors: String, Number, Boolean, etc.
    if (value.type === 'Identifier') {
      return this.mapVueTypeToDataType(value.value);
    }

    // Handle array of types: [String, Number]
    if (value.type === 'ArrayExpression') {
      const types = value.elements
        .filter((elem): elem is swc.ExprOrSpread => elem !== undefined)
        .map(elem => {
          if (elem.expression.type === 'Identifier') {
            return this.mapVueTypeToDataType(elem.expression.value);
          }
          return 'unknown';
        });
      return types.join(' | ');
    }

    // Handle object with type property: { type: String, required: true }
    if (value.type === 'ObjectExpression') {
      for (const prop of value.properties) {
        if (prop.type === 'KeyValueProperty') {
          const key = prop.key;
          if (key.type === 'Identifier' && key.value === 'type') {
            return this.extractTypeFromValue(prop.value);
          }
        }
      }
    }

    return 'unknown';
  }

  /**
   * Map Vue runtime type constructor to DFD data type
   * @param vueType - Vue type constructor name
   * @returns DFD data type string
   */
  private mapVueTypeToDataType(vueType: string): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Number': 'number',
      'Boolean': 'boolean',
      'Array': 'array',
      'Object': 'object',
      'Function': 'function',
      'Date': 'Date',
      'Symbol': 'symbol',
    };

    return typeMap[vueType] || vueType.toLowerCase();
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

    // Handle qualified names (e.g., Vue.PropType)
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
   * @returns Line number (1-based, adjusted by lineOffset)
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
