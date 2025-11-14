/**
 * Props Analyzer for extracting component props information
 */

import * as swc from '@swc/core';
import { PropInfo } from '../parser/types';
import { TypeResolver, TypeQueryRequest } from '../services/type-resolver';

/**
 * Props Analyzer interface
 */
export interface PropsAnalyzer {
  analyzeProps(module: swc.Module, filePath?: string, componentName?: string): Promise<PropInfo[]>;
}

/**
 * Implementation of Props Analyzer
 */
export class SWCPropsAnalyzer implements PropsAnalyzer {
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
   * Analyze props from a parsed module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @param componentName - Optional component name for type resolution
   * @returns Promise resolving to array of PropInfo objects
   */
  async analyzeProps(module: swc.Module, filePath?: string, componentName?: string): Promise<PropInfo[]> {
    const props: PropInfo[] = [];
    
    // Find React components in the module
    for (const item of module.body) {
      // Check for functional components (function declarations and arrow functions)
      if (item.type === 'ExportDefaultDeclaration') {
        const declaration = item.decl;
        if (declaration) {
          props.push(...this.extractPropsFromDeclaration(declaration));
        }
      } else if (item.type === 'ExportDeclaration') {
        const declaration = item.declaration;
        if (declaration) {
          props.push(...this.extractPropsFromDeclaration(declaration));
        }
      } else if (item.type === 'FunctionDeclaration') {
        props.push(...this.extractPropsFromDeclaration(item));
      } else if (item.type === 'VariableDeclaration') {
        props.push(...this.extractPropsFromDeclaration(item));
      } else if (item.type === 'ClassDeclaration') {
        props.push(...this.extractPropsFromDeclaration(item));
      }
    }
    
    // If TypeResolver is available and we have file path and component name, resolve types
    if (this.typeResolver && filePath && componentName && props.length > 0) {
      await this.resolvePropsTypes(props, filePath, componentName);
    }
    
    return props;
  }

  /**
   * Resolve types for all props using TypeResolver
   * @param props - Array of PropInfo objects to resolve types for
   * @param filePath - File path for type resolution
   * @param componentName - Component name for type resolution
   */
  private async resolvePropsTypes(props: PropInfo[], filePath: string, componentName: string): Promise<void> {
    // Create type query requests for props that have position information
    const typeRequests: TypeQueryRequest[] = props
      .filter(prop => prop.line !== undefined && prop.column !== undefined)
      .map(prop => ({
        filePath,
        componentName,
        propName: prop.name,
        position: { line: prop.line!, character: prop.column! }
      }));

    if (typeRequests.length === 0) {
      return;
    }

    try {
      // Query types for all props
      const typeResults = await this.typeResolver!.resolveTypes(typeRequests);

      // Merge type information back into props
      for (const request of typeRequests) {
        const propName = request.propName!;
        const result = typeResults.get(propName);
        
        // Find the corresponding prop
        const prop = props.find(p => p.name === propName);
        if (prop && result) {
          prop.isFunction = result.includes('function') || result.includes('=>');
          prop.typeString = result;
        }
      }
    } catch (error) {
      // Log error but don't fail the entire analysis
      console.error('[PropsAnalyzer] Failed to resolve types:', error);
    }
  }

  /**
   * Extract props from a declaration
   * @param declaration - The declaration to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromDeclaration(declaration: swc.ModuleItem | swc.Declaration | swc.Expression | swc.DefaultDecl): PropInfo[] {
    // Handle function declarations
    if (declaration.type === 'FunctionDeclaration') {
      return this.extractPropsFromFunction(declaration);
    }
    
    // Handle variable declarations (arrow functions)
    if (declaration.type === 'VariableDeclaration') {
      const props: PropInfo[] = [];
      for (const decl of declaration.declarations) {
        if (decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')) {
          props.push(...this.extractPropsFromFunction(decl.init));
        }
      }
      return props;
    }
    
    // Handle arrow function expressions
    if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
      return this.extractPropsFromFunction(declaration);
    }
    
    // Handle class declarations
    if (declaration.type === 'ClassDeclaration') {
      return this.extractPropsFromClass(declaration);
    }
    
    // Handle class expressions
    if (declaration.type === 'ClassExpression') {
      return this.extractPropsFromClass(declaration);
    }
    
    return [];
  }

  /**
   * Extract props from a function (functional component)
   * @param func - The function to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromFunction(
    func: swc.FunctionDeclaration | swc.ArrowFunctionExpression | swc.FunctionExpression
  ): PropInfo[] {
    const props: PropInfo[] = [];
    
    // Check if this is likely a React component (starts with uppercase)
    if (func.type === 'FunctionDeclaration' && func.identifier) {
      const functionName = func.identifier.value;
      // Skip functions that don't start with uppercase (not React components)
      if (functionName && functionName[0] !== functionName[0].toUpperCase()) {
        return props;
      }
    }
    
    // Get the first parameter (props parameter)
    if (func.params.length === 0) {
      return props;
    }
    
    const firstParam = func.params[0];
    
    // Handle different parameter patterns
    if (firstParam.type === 'Parameter') {
      const param = firstParam.pat;
      
      // Handle object pattern (destructured props)
      if (param.type === 'ObjectPattern') {
        props.push(...this.extractPropsFromObjectPattern(param));
      }
      // Handle identifier (non-destructured props)
      else if (param.type === 'Identifier') {
        props.push(...this.extractPropsFromIdentifier(param));
      }
    }
    // Handle patterns directly (for arrow functions)
    else if (firstParam.type === 'ObjectPattern') {
      props.push(...this.extractPropsFromObjectPattern(firstParam));
    }
    else if (firstParam.type === 'Identifier') {
      props.push(...this.extractPropsFromIdentifier(firstParam));
    }
    
    return props;
  }

  /**
   * Extract props from object pattern (destructured props)
   * @param pattern - The object pattern to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromObjectPattern(pattern: swc.ObjectPattern): PropInfo[] {
    const props: PropInfo[] = [];
    
    for (const prop of pattern.properties) {
      if (prop.type === 'KeyValuePatternProperty') {
        const key = prop.key;
        let propName: string | undefined;
        
        if (key.type === 'Identifier') {
          propName = key.value;
        }
        
        if (propName) {
          // Extract type information if available
          const typeAnnotation = this.extractTypeFromPattern(prop.value);
          
          // Extract position information from the key
          const position = this.extractPosition(key);
          
          props.push({
            name: propName,
            type: typeAnnotation,
            isDestructured: true,
            line: position?.line,
            column: position?.column,
          });
        }
      } else if (prop.type === 'AssignmentPatternProperty') {
        // Handle default values in destructuring
        const key = prop.key;
        if (key.type === 'Identifier') {
          const position = this.extractPosition(key);
          
          props.push({
            name: key.value,
            type: undefined,
            isDestructured: true,
            line: position?.line,
            column: position?.column,
          });
        }
      } else if (prop.type === 'RestElement') {
        // Handle rest props (...rest)
        const arg = prop.argument;
        if (arg.type === 'Identifier') {
          const position = this.extractPosition(arg);
          
          props.push({
            name: arg.value,
            type: 'rest',
            isDestructured: true,
            line: position?.line,
            column: position?.column,
          });
        }
      }
    }
    
    return props;
  }

  /**
   * Extract props from identifier (non-destructured props)
   * @param identifier - The identifier to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromIdentifier(identifier: swc.Identifier | swc.BindingIdentifier): PropInfo[] {
    const props: PropInfo[] = [];
    const position = this.extractPosition(identifier);
    
    // Check if there's a type annotation
    if ('typeAnnotation' in identifier && identifier.typeAnnotation) {
      const typeAnnotation = identifier.typeAnnotation.typeAnnotation;
      
      // Handle type reference (interface or type alias)
      if (typeAnnotation.type === 'TsTypeReference') {
        const typeName = this.getTypeReferenceName(typeAnnotation);
        
        props.push({
          name: identifier.value,
          type: typeName,
          isDestructured: false,
          line: position?.line,
          column: position?.column,
        });
      }
      // Handle inline object type
      else if (typeAnnotation.type === 'TsTypeLiteral') {
        props.push(...this.extractPropsFromTypeLiteral(typeAnnotation));
      }
      // Handle other type annotations
      else {
        props.push({
          name: identifier.value,
          type: this.getTypeAnnotationString(typeAnnotation),
          isDestructured: false,
          line: position?.line,
          column: position?.column,
        });
      }
    } else {
      // No type annotation
      const name = 'value' in identifier ? identifier.value : '';
      if (name) {
        props.push({
          name,
          type: undefined,
          isDestructured: false,
          line: position?.line,
          column: position?.column,
        });
      }
    }
    
    return props;
  }

  /**
   * Extract props from a type literal (inline object type)
   * @param typeLiteral - The type literal to analyze
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
          
          props.push({
            name: propName,
            type: this.getTypeAnnotationString(typeAnnotation),
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
   * Extract props from a class component
   * @param classDecl - The class declaration or expression to analyze
   * @returns Array of PropInfo objects
   */
  private extractPropsFromClass(classDecl: swc.ClassDeclaration | swc.ClassExpression): PropInfo[] {
    const props: PropInfo[] = [];
    
    // Check if class extends React.Component or React.PureComponent
    if (!classDecl.superClass) {
      return props;
    }
    
    // Check for generic type parameters (Props type)
    if (classDecl.superTypeParams && classDecl.superTypeParams.params.length > 0) {
      const propsType = classDecl.superTypeParams.params[0];
      const position = this.extractPosition(propsType);
      
      // Handle type reference
      if (propsType.type === 'TsTypeReference') {
        const typeName = this.getTypeReferenceName(propsType);
        
        props.push({
          name: 'props',
          type: typeName,
          isDestructured: false,
          line: position?.line,
          column: position?.column,
        });
      }
      // Handle inline type literal
      else if (propsType.type === 'TsTypeLiteral') {
        props.push(...this.extractPropsFromTypeLiteral(propsType));
      }
    }
    
    return props;
  }

  /**
   * Extract type from a pattern
   * @param pattern - The pattern to analyze
   * @returns Type string or undefined
   */
  private extractTypeFromPattern(pattern: swc.Pattern): string | undefined {
    if (pattern.type === 'Identifier' && 'typeAnnotation' in pattern && pattern.typeAnnotation) {
      return this.getTypeAnnotationString(pattern.typeAnnotation.typeAnnotation);
    }
    
    return undefined;
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
    
    // Handle qualified names (e.g., React.FC)
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
