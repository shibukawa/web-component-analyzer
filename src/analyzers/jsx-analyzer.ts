/**
 * JSX Analyzer for extracting and simplifying JSX output
 */

import * as swc from '@swc/core';
import { JSXInfo, PlaceholderInfo } from '../parser/types';

/**
 * JSX Analyzer interface for analyzing JSX output
 */
export interface JSXAnalyzer {
  analyzeJSX(node: swc.Node): JSXInfo | null;
}

/**
 * Implementation of JSX Analyzer
 */
export class SWCJSXAnalyzer implements JSXAnalyzer {
  private placeholderCounter = 0;
  private placeholders: PlaceholderInfo[] = [];

  /**
   * Analyze JSX output from a component
   * @param node - The AST node to analyze (typically a return statement or render method)
   * @returns JSXInfo with simplified JSX and placeholder information
   */
  analyzeJSX(node: swc.Node): JSXInfo | null {
    // Reset state for each analysis
    this.placeholderCounter = 0;
    this.placeholders = [];

    const jsxNode = this.findJSXNode(node);
    if (!jsxNode) {
      return null;
    }

    const simplified = this.simplifyJSX(jsxNode);
    
    return {
      simplified,
      placeholders: this.placeholders,
    };
  }

  /**
   * Find JSX node in the AST
   * @param node - The node to search
   * @returns JSX node or null
   */
  private findJSXNode(node: swc.Node): swc.JSXElement | swc.JSXFragment | null {
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      return node as swc.JSXElement | swc.JSXFragment;
    }

    if (node.type === 'ReturnStatement') {
      const returnStmt = node as swc.ReturnStatement;
      if (returnStmt.argument) {
        return this.findJSXNode(returnStmt.argument);
      }
    }

    if (node.type === 'ParenthesisExpression') {
      const parenExpr = node as swc.ParenthesisExpression;
      return this.findJSXNode(parenExpr.expression);
    }

    if (node.type === 'ConditionalExpression') {
      const condExpr = node as swc.ConditionalExpression;
      // Analyze the consequent (true branch) as primary JSX
      return this.findJSXNode(condExpr.consequent);
    }

    if (node.type === 'BinaryExpression') {
      const binaryExpr = node as swc.BinaryExpression;
      // For logical && patterns, analyze the right side
      if (binaryExpr.operator === '&&' || binaryExpr.operator === '||') {
        return this.findJSXNode(binaryExpr.right);
      }
    }

    return null;
  }

  /**
   * Simplify JSX by replacing content with placeholders
   * @param node - The JSX node to simplify
   * @param indent - Current indentation level
   * @returns Simplified JSX string
   */
  private simplifyJSX(node: swc.JSXElement | swc.JSXFragment, indent = 0): string {
    const indentation = '  '.repeat(indent);

    if (node.type === 'JSXFragment') {
      return this.simplifyJSXFragment(node, indent);
    }

    if (node.type === 'JSXElement') {
      return this.simplifyJSXElement(node, indent);
    }

    return '';
  }

  /**
   * Simplify JSX Fragment
   * @param fragment - The JSX fragment node
   * @param indent - Current indentation level
   * @returns Simplified fragment string
   */
  private simplifyJSXFragment(fragment: swc.JSXFragment, indent: number): string {
    const indentation = '  '.repeat(indent);
    const children = this.simplifyChildren(fragment.children, indent + 1);
    
    if (children.trim()) {
      return `${indentation}<>\n${children}${indentation}</>`;
    }
    return `${indentation}<></>`;
  }

  /**
   * Simplify JSX Element
   * @param element - The JSX element node
   * @param indent - Current indentation level
   * @returns Simplified element string
   */
  private simplifyJSXElement(element: swc.JSXElement, indent: number): string {
    const indentation = '  '.repeat(indent);
    const tagName = this.getTagName(element.opening);
    
    // Process attributes to extract variables from expressions
    for (const attr of element.opening.attributes) {
      if (attr.type === 'JSXAttribute' && attr.value) {
        if (attr.value.type === 'JSXExpressionContainer') {
          const expression = attr.value.expression;
          // Extract variables from attribute expressions (e.g., onClick={increment})
          if (expression.type === 'Identifier') {
            // Direct function reference - create a placeholder for it
            this.createExpressionPlaceholder(expression, indent);
          } else if (expression.type !== 'JSXEmptyExpression') {
            // Other expressions (member expressions, call expressions, etc.)
            this.createExpressionPlaceholder(expression, indent);
          }
        }
      }
    }
    
    const children = this.simplifyChildren(element.children, indent + 1);

    if (children.trim()) {
      return `${indentation}<${tagName}>\n${children}${indentation}</${tagName}>`;
    }
    return `${indentation}<${tagName} />`;
  }

  /**
   * Get tag name from JSX opening element
   * @param opening - The JSX opening element
   * @returns Tag name as string
   */
  private getTagName(opening: swc.JSXOpeningElement): string {
    const name = opening.name;

    if (name.type === 'Identifier') {
      return name.value;
    }

    if (name.type === 'JSXMemberExpression') {
      return this.getJSXMemberExpressionName(name);
    }

    if (name.type === 'JSXNamespacedName') {
      return `${name.namespace.value}:${name.name.value}`;
    }

    return 'Unknown';
  }

  /**
   * Get name from JSX member expression (e.g., Component.Item)
   * @param expr - The JSX member expression
   * @returns Full member expression name
   */
  private getJSXMemberExpressionName(expr: swc.JSXMemberExpression): string {
    const object = expr.object;
    const property = expr.property;

    let objectName = '';
    if (object.type === 'Identifier') {
      objectName = object.value;
    } else if (object.type === 'JSXMemberExpression') {
      objectName = this.getJSXMemberExpressionName(object);
    }

    return `${objectName}.${property.value}`;
  }

  /**
   * Simplify JSX children
   * @param children - Array of JSX children
   * @param indent - Current indentation level
   * @returns Simplified children string
   */
  private simplifyChildren(children: swc.JSXElementChild[], indent: number): string {
    const indentation = '  '.repeat(indent);
    const simplified: string[] = [];

    for (const child of children) {
      if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
        simplified.push(this.simplifyJSX(child, indent));
      } else if (child.type === 'JSXExpressionContainer') {
        const placeholder = this.createExpressionPlaceholder(child.expression, indent);
        if (placeholder) {
          simplified.push(placeholder);
        }
      } else if (child.type === 'JSXText') {
        const text = child.value.trim();
        if (text) {
          simplified.push(`${indentation}{TEXT}`);
        }
      }
    }

    return simplified.join('\n') + (simplified.length > 0 ? '\n' : '');
  }

  /**
   * Create placeholder for JSX expression
   * @param expression - The expression node
   * @param indent - Current indentation level
   * @returns Placeholder string
   */
  private createExpressionPlaceholder(expression: swc.Expression, indent: number): string | null {
    const indentation = '  '.repeat(indent);
    const variables = this.extractVariablesFromExpression(expression);
    
    if (variables.length === 0) {
      // No variables found, just use TEXT placeholder
      return `${indentation}{TEXT}`;
    }

    const placeholderId = `placeholder_${this.placeholderCounter++}`;
    const variableName = variables[0]; // Use first variable as primary

    this.placeholders.push({
      id: placeholderId,
      originalExpression: this.expressionToString(expression),
      variables,
    });

    return `${indentation}{VAR:${variableName}}`;
  }

  /**
   * Extract variable names from an expression
   * @param expression - The expression to analyze
   * @returns Array of variable names
   */
  private extractVariablesFromExpression(expression: swc.Expression): string[] {
    const variables: string[] = [];

    const traverse = (node: swc.Node) => {
      if (node.type === 'Identifier') {
        const identifier = node as swc.Identifier;
        variables.push(identifier.value);
      } else if (node.type === 'MemberExpression') {
        const memberExpr = node as swc.MemberExpression;
        traverse(memberExpr.object);
      } else if (node.type === 'CallExpression') {
        const callExpr = node as swc.CallExpression;
        traverse(callExpr.callee);
      } else if (node.type === 'BinaryExpression') {
        const binaryExpr = node as swc.BinaryExpression;
        traverse(binaryExpr.left);
        traverse(binaryExpr.right);
      } else if (node.type === 'ConditionalExpression') {
        const condExpr = node as swc.ConditionalExpression;
        traverse(condExpr.test);
        traverse(condExpr.consequent);
        traverse(condExpr.alternate);
      } else if (node.type === 'ArrayExpression') {
        const arrayExpr = node as swc.ArrayExpression;
        arrayExpr.elements.forEach(elem => {
          if (elem && elem.expression) {
            traverse(elem.expression);
          }
        });
      } else if (node.type === 'ObjectExpression') {
        const objExpr = node as swc.ObjectExpression;
        objExpr.properties.forEach(prop => {
          if (prop.type === 'KeyValueProperty') {
            traverse(prop.value);
          }
        });
      }
    };

    traverse(expression);
    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Convert expression to string representation
   * @param expression - The expression to convert
   * @returns String representation
   */
  private expressionToString(expression: swc.Expression): string {
    if (expression.type === 'Identifier') {
      return (expression as swc.Identifier).value;
    }

    if (expression.type === 'MemberExpression') {
      const memberExpr = expression as swc.MemberExpression;
      const object = this.expressionToString(memberExpr.object as swc.Expression);
      const property = memberExpr.property.type === 'Identifier' 
        ? memberExpr.property.value 
        : 'computed';
      return `${object}.${property}`;
    }

    if (expression.type === 'CallExpression') {
      const callExpr = expression as swc.CallExpression;
      const callee = this.expressionToString(callExpr.callee as swc.Expression);
      return `${callee}()`;
    }

    if (expression.type === 'StringLiteral') {
      return `"${(expression as swc.StringLiteral).value}"`;
    }

    if (expression.type === 'NumericLiteral') {
      return String((expression as swc.NumericLiteral).value);
    }

    if (expression.type === 'BooleanLiteral') {
      return String((expression as swc.BooleanLiteral).value);
    }

    return 'expression';
  }
}
