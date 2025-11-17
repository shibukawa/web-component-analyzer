/**
 * Conditional Structure Extractor for analyzing JSX conditional rendering
 */

import * as swc from '@swc/core';
import {
  JSXStructure,
  JSXElementStructure,
  ConditionalBranch,
  ConditionExpression,
  JSXAttributeReference,
} from '../parser/types';

/**
 * Extracts hierarchical JSX structure with conditional branches
 */
export class ConditionalStructureExtractor {
  private sourceCode: string = '';
  private lineStarts: number[] = [];

  /**
   * Set source code for line number calculation
   */
  setSourceCode(sourceCode: string): void {
    this.sourceCode = sourceCode;
    this.lineStarts = this.calculateLineStarts(sourceCode);
  }

  /**
   * Calculate line start positions in source code
   */
  private calculateLineStarts(sourceCode: string): number[] {
    const lineStarts = [0];
    for (let i = 0; i < sourceCode.length; i++) {
      if (sourceCode[i] === '\n') {
        lineStarts.push(i + 1);
      }
    }
    return lineStarts;
  }

  /**
   * Extract hierarchical JSX structure from AST
   */
  extractStructure(jsxNode: swc.JSXElement | swc.JSXFragment): JSXStructure {
    return this.processNode(jsxNode);
  }

  /**
   * Process a JSX node and return its structure
   */
  private processNode(node: swc.Node): JSXStructure {
    if (node.type === 'JSXElement') {
      return this.analyzeElement(node as swc.JSXElement);
    }

    if (node.type === 'JSXFragment') {
      return this.analyzeFragment(node as swc.JSXFragment);
    }

    if (node.type === 'JSXExpressionContainer') {
      const container = node as swc.JSXExpressionContainer;
      return this.processExpression(container.expression);
    }

    // Default: return text node structure
    return {
      type: 'element',
      tagName: '"text"',
      displayDependencies: [],
      attributeReferences: [],
      children: [],
    };
  }

  /**
   * Process an expression that might contain JSX or conditionals
   */
  private processExpression(expr: swc.Expression): JSXStructure {
    // Handle conditional expressions (ternary)
    if (expr.type === 'ConditionalExpression') {
      return this.analyzeConditional(expr as swc.ConditionalExpression);
    }

    // Handle logical expressions (&& and ||)
    if (expr.type === 'BinaryExpression') {
      const binary = expr as swc.BinaryExpression;
      if (binary.operator === '&&' || binary.operator === '||') {
        return this.analyzeLogicalExpression(binary);
      }
    }

    // Handle call expressions (potential .map() loops)
    if (expr.type === 'CallExpression') {
      const callExpr = expr as swc.CallExpression;
      if (this.isMapCall(callExpr)) {
        return this.analyzeLoop(callExpr);
      }
    }

    // Handle parenthesis expressions
    if (expr.type === 'ParenthesisExpression') {
      const paren = expr as swc.ParenthesisExpression;
      return this.processExpression(paren.expression);
    }

    // Handle JSX elements/fragments within expressions
    if (expr.type === 'JSXElement') {
      return this.analyzeElement(expr as swc.JSXElement);
    }

    if (expr.type === 'JSXFragment') {
      return this.analyzeFragment(expr as swc.JSXFragment);
    }

    // Default: return text node
    return {
      type: 'element',
      tagName: '"text"',
      displayDependencies: [],
      attributeReferences: [],
      children: [],
    };
  }

  /**
   * Analyze a JSX element for data dependencies
   */
  private analyzeElement(element: swc.JSXElement): JSXElementStructure {
    const tagName = this.getTagName(element.opening);
    const line = element.span ? this.getLineFromSpan(element.span.start) : undefined;
    const column = element.span ? this.getColumnFromSpan(element.span.start) : undefined;

    // Extract attribute references
    const attributeReferences = this.extractAttributeReferences(element.opening.attributes);

    // Extract display dependencies from children
    const displayDependencies = this.extractDisplayDependencies(element.children);

    // Process children recursively
    const children: JSXStructure[] = [];
    for (const child of element.children) {
      if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
        children.push(this.processNode(child));
      } else if (child.type === 'JSXExpressionContainer') {
        const structure = this.processExpression(child.expression);
        children.push(structure);
      }
    }

    // Extract metadata for special handling (e.g., React Hook Form register field name)
    const metadata: Record<string, any> = {};
    
    // Check for React Hook Form register spread operator
    const registerAttr = attributeReferences.find(attr => {
      return attr.referencedVariable === 'register' || 
             (attr.attributeName === 'register' && attr.referencedVariable.includes('register'));
    });
    
    if (registerAttr && tagName === 'input') {
      // Try to extract field name from register call
      // This would be in the form: {...register('fieldName')}
      metadata.hasRegister = true;
      
      // Try to extract field name from JSX attributes
      // Look for name attribute or data-field attribute
      const nameAttr = element.opening.attributes.find(attr => {
        if (attr.type === 'JSXAttribute' && attr.name.type === 'Identifier') {
          return attr.name.value === 'name' || attr.name.value === 'data-field';
        }
        return false;
      });
      
      if (nameAttr && nameAttr.type === 'JSXAttribute' && nameAttr.value) {
        if (nameAttr.value.type === 'StringLiteral') {
          metadata.fieldName = nameAttr.value.value;
        } else if (nameAttr.value.type === 'JSXExpressionContainer' && nameAttr.value.expression.type === 'StringLiteral') {
          metadata.fieldName = nameAttr.value.expression.value;
        }
      }
    }

    return {
      type: 'element',
      tagName,
      displayDependencies,
      attributeReferences,
      children,
      line,
      column,
      metadata,
    };
  }

  /**
   * Analyze a JSX fragment
   */
  private analyzeFragment(fragment: swc.JSXFragment): JSXElementStructure {
    const children: JSXStructure[] = [];
    const displayDependencies: string[] = [];

    for (const child of fragment.children) {
      if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
        children.push(this.processNode(child));
      } else if (child.type === 'JSXExpressionContainer') {
        const structure = this.processExpression(child.expression);
        children.push(structure);
      }
    }

    return {
      type: 'element',
      tagName: 'Fragment',
      displayDependencies,
      attributeReferences: [],
      children,
    };
  }

  /**
   * Analyze a conditional expression (ternary operator)
   */
  private analyzeConditional(expr: swc.ConditionalExpression): ConditionalBranch {
    const condition = this.extractConditionExpression(expr.test);
    const line = expr.span ? this.getLineFromSpan(expr.span.start) : undefined;
    const column = expr.span ? this.getColumnFromSpan(expr.span.start) : undefined;

    const trueBranch = this.processExpression(expr.consequent);
    const falseBranch = this.processExpression(expr.alternate);

    return {
      type: 'ternary',
      condition,
      trueBranch,
      falseBranch,
      line,
      column,
    };
  }

  /**
   * Analyze a logical expression (&& or ||)
   */
  private analyzeLogicalExpression(expr: swc.BinaryExpression): ConditionalBranch {
    const condition = this.extractConditionExpression(expr.left);
    const line = expr.span ? this.getLineFromSpan(expr.span.start) : undefined;
    const column = expr.span ? this.getColumnFromSpan(expr.span.start) : undefined;

    const branch = this.processExpression(expr.right);

    if (expr.operator === '&&') {
      return {
        type: 'logical-and',
        condition,
        trueBranch: branch,
        line,
        column,
      };
    } else {
      // logical-or
      return {
        type: 'logical-or',
        condition,
        falseBranch: branch,
        line,
        column,
      };
    }
  }

  /**
   * Analyze a .map() loop expression
   */
  private analyzeLoop(callExpr: swc.CallExpression): ConditionalBranch {
    const line = callExpr.span ? this.getLineFromSpan(callExpr.span.start) : undefined;
    const column = callExpr.span ? this.getColumnFromSpan(callExpr.span.start) : undefined;

    // Extract array variable being mapped
    const arrayVariable = this.extractArrayVariable(callExpr.callee);
    
    // Extract loop variable from arrow function parameter
    let loopVariable: string | undefined;
    let loopBody: JSXStructure | undefined;

    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      if (arg.expression.type === 'ArrowFunctionExpression') {
        const arrowFn = arg.expression as swc.ArrowFunctionExpression;
        
        // Extract loop variable from first parameter
        if (arrowFn.params.length > 0) {
          const param = arrowFn.params[0];
          if (param.type === 'Identifier') {
            loopVariable = param.value;
          } else if ('pat' in param) {
            const pat = (param as any).pat;
            if (pat && pat.type === 'Identifier') {
              loopVariable = pat.value;
            }
          }
        }

        // Process loop body
        if (arrowFn.body.type === 'BlockStatement') {
          // Find return statement in block
          const block = arrowFn.body as swc.BlockStatement;
          for (const stmt of block.stmts) {
            if (stmt.type === 'ReturnStatement') {
              const returnStmt = stmt as swc.ReturnStatement;
              if (returnStmt.argument) {
                loopBody = this.processExpression(returnStmt.argument as swc.Expression);
              }
            }
          }
        } else {
          // Direct expression body
          loopBody = this.processExpression(arrowFn.body as swc.Expression);
        }
      }
    }

    return {
      type: 'loop',
      condition: {
        variables: arrayVariable ? [arrayVariable] : [],
        expression: arrayVariable || 'array',
      },
      trueBranch: loopBody,
      loopVariable,
      line,
      column,
    };
  }

  /**
   * Extract condition expression with variables
   */
  extractConditionExpression(expr: swc.Expression): ConditionExpression {
    const variables = this.extractConditionVariables(expr);
    const expression = this.expressionToString(expr);

    return {
      variables,
      expression,
    };
  }

  /**
   * Extract variables from a condition expression
   */
  private extractConditionVariables(expr: swc.Expression): string[] {
    const variables: string[] = [];

    const isExpression = (node: any): node is swc.Expression => {
      return node && typeof node === 'object' && 'type' in node && node.type !== 'Super' && node.type !== 'Import';
    };

    const traverse = (node: swc.Expression) => {
      if (node.type === 'Identifier') {
        variables.push((node as swc.Identifier).value);
      } else if (node.type === 'MemberExpression') {
        const memberExpr = node as swc.MemberExpression;
        if (isExpression(memberExpr.object)) {
          traverse(memberExpr.object);
        }
      } else if (node.type === 'UnaryExpression') {
        const unary = node as swc.UnaryExpression;
        if (isExpression(unary.argument)) {
          traverse(unary.argument);
        }
      } else if (node.type === 'BinaryExpression') {
        const binary = node as swc.BinaryExpression;
        traverse(binary.left);
        traverse(binary.right);
      } else if (node.type === 'CallExpression') {
        const callExpr = node as swc.CallExpression;
        if (isExpression(callExpr.callee)) {
          traverse(callExpr.callee);
        }
      } else if (node.type === 'ParenthesisExpression') {
        const paren = node as swc.ParenthesisExpression;
        traverse(paren.expression);
      }
    };

    traverse(expr);
    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Extract display dependencies from JSX children
   */
  private extractDisplayDependencies(children: swc.JSXElementChild[]): string[] {
    const dependencies: string[] = [];

    for (const child of children) {
      if (child.type === 'JSXExpressionContainer') {
        const expr = child.expression;
        if (expr.type !== 'JSXEmptyExpression') {
          // Extract variables from all expressions, including conditional ones
          // Conditional expressions (ternary, &&, ||) are handled as ConditionalBranch
          // but we still need to extract the variables they reference for display dependencies
          const vars = this.extractVariablesFromExpression(expr);
          dependencies.push(...vars);
        }
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Check if an expression is a conditional or loop expression
   * These should not be included in displayDependencies as they are handled separately
   */
  private isConditionalExpression(expr: swc.Expression): boolean {
    // Ternary: condition ? true : false
    if (expr.type === 'ConditionalExpression') {
      return true;
    }
    
    // Logical AND/OR: condition && value, condition || value
    if (expr.type === 'BinaryExpression') {
      const binary = expr as swc.BinaryExpression;
      if (binary.operator === '&&' || binary.operator === '||') {
        return true;
      }
    }
    
    // Loop: array.map(...)
    if (expr.type === 'CallExpression') {
      const call = expr as swc.CallExpression;
      if (call.callee.type === 'MemberExpression') {
        const member = call.callee as swc.MemberExpression;
        if (member.property.type === 'Identifier') {
          const methodName = member.property.value;
          // Common array iteration methods
          if (['map', 'filter', 'forEach', 'reduce', 'some', 'every', 'find', 'findIndex'].includes(methodName)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Extract attribute references from JSX attributes
   */
  private extractAttributeReferences(attributes: swc.JSXAttributeOrSpread[]): JSXAttributeReference[] {
    const references: JSXAttributeReference[] = [];

    for (const attr of attributes) {
      if (attr.type === 'JSXAttribute' && attr.value) {
        const attrName = attr.name.type === 'Identifier' ? attr.name.value : '';

        if (attr.value.type === 'JSXExpressionContainer') {
          const expr = attr.value.expression;

          if (expr.type === 'Identifier') {
            // Direct variable reference
            references.push({
              attributeName: attrName,
              referencedVariable: (expr as swc.Identifier).value,
            });
          } else if (expr.type === 'ArrowFunctionExpression') {
            // Inline arrow function - extract variables from function body
            const arrowFunc = expr as swc.ArrowFunctionExpression;
            let vars: string[] = [];
            
            if (arrowFunc.body.type === 'BlockStatement') {
              // Block body: { ... }
              const block = arrowFunc.body as swc.BlockStatement;
              for (const stmt of block.stmts) {
                if (stmt.type === 'ExpressionStatement') {
                  vars.push(...this.extractVariablesFromExpression(stmt.expression));
                }
              }
            } else {
              // Expression body: => expr
              vars = this.extractVariablesFromExpression(arrowFunc.body);
            }
            
            for (const varName of vars) {
              references.push({
                attributeName: attrName,
                referencedVariable: varName,
              });
            }
          } else if (expr.type !== 'JSXEmptyExpression') {
            // Complex expression - extract all variables
            const vars = this.extractVariablesFromExpression(expr);
            for (const varName of vars) {
              references.push({
                attributeName: attrName,
                referencedVariable: varName,
              });
            }
          }
        }
      } else if ((attr as any).type === 'SpreadElement') {
        // Handle spread attributes: {...register('fieldName')}
        const spreadAttr = attr as any;
        const spreadExpr = spreadAttr.arguments; // Use 'arguments' property for the expression
        
        if (spreadExpr && spreadExpr.type === 'CallExpression') {
          // This is a function call like register('fieldName')
          const callExpr = spreadExpr as swc.CallExpression;
          
          if (callExpr.callee.type === 'Identifier') {
            const funcName = (callExpr.callee as swc.Identifier).value;
            
            // For React Hook Form register, extract the field name from the first argument
            if (funcName === 'register' && callExpr.arguments.length > 0) {
              const firstArg = callExpr.arguments[0];
              const argExpr = (firstArg as any).expression || firstArg;
              
              if (argExpr && argExpr.type === 'StringLiteral') {
                // register('fieldName') - extract field name
                const fieldName = (argExpr as swc.StringLiteral).value;
                
                // Create attribute references for spread register with field name
                // This will be used to generate both onChange and bind edges
                references.push({
                  attributeName: `spread:register:${fieldName}`,
                  referencedVariable: funcName,
                });
              } else if (argExpr && argExpr.type === 'Identifier') {
                // register(fieldNameVar) - extract variable
                references.push({
                  attributeName: 'spread:register',
                  referencedVariable: funcName,
                });
              }
            } else {
              // Generic spread attribute - extract the function name
              references.push({
                attributeName: 'spread',
                referencedVariable: funcName,
              });
            }
          }
        } else if (spreadExpr && spreadExpr.type === 'Identifier') {
          // Simple spread: {...obj} or {...field}
          const varName = (spreadExpr as swc.Identifier).value;
          
          // For React Hook Form field from useController
          if (varName === 'field') {
            references.push({
              attributeName: 'spread:field',
              referencedVariable: varName,
            });
          } else {
            references.push({
              attributeName: 'spread',
              referencedVariable: varName,
            });
          }
        }
      }
    }

    return references;
  }

  /**
   * Extract variables from an expression
   */
  private extractVariablesFromExpression(expr: swc.Expression): string[] {
    const variables: string[] = [];

    const isExpression = (node: any): node is swc.Expression => {
      return node && typeof node === 'object' && 'type' in node && node.type !== 'Super' && node.type !== 'Import';
    };

    const traverse = (node: swc.Expression) => {
      if (node.type === 'Identifier') {
        variables.push((node as swc.Identifier).value);
      } else if (node.type === 'MemberExpression') {
        const memberExpr = node as swc.MemberExpression;
        if (isExpression(memberExpr.object)) {
          traverse(memberExpr.object);
        }
      } else if (node.type === 'OptionalChainingExpression') {
        const optChain = node as swc.OptionalChainingExpression;
        if (isExpression(optChain.base)) {
          traverse(optChain.base);
        }
      } else if (node.type === 'CallExpression') {
        const callExpr = node as swc.CallExpression;
        if (isExpression(callExpr.callee)) {
          traverse(callExpr.callee);
        }
        for (const arg of callExpr.arguments) {
          traverse(arg.expression);
        }
      } else if (node.type === 'BinaryExpression') {
        const binary = node as swc.BinaryExpression;
        traverse(binary.left);
        traverse(binary.right);
      } else if (node.type === 'UnaryExpression') {
        const unary = node as swc.UnaryExpression;
        traverse(unary.argument);
      } else if (node.type === 'UpdateExpression') {
        const update = node as swc.UpdateExpression;
        traverse(update.argument);
      } else if (node.type === 'ConditionalExpression') {
        const cond = node as swc.ConditionalExpression;
        traverse(cond.test);
        traverse(cond.consequent);
        traverse(cond.alternate);
      } else if (node.type === 'ParenthesisExpression') {
        const paren = node as swc.ParenthesisExpression;
        traverse(paren.expression);
      } else if (node.type === 'ArrayExpression') {
        const arrayExpr = node as swc.ArrayExpression;
        for (const elem of arrayExpr.elements) {
          if (elem && elem.expression) {
            traverse(elem.expression);
          }
        }
      } else if (node.type === 'ObjectExpression') {
        const objExpr = node as swc.ObjectExpression;
        for (const prop of objExpr.properties) {
          if (prop.type === 'KeyValueProperty') {
            traverse(prop.value as swc.Expression);
          }
        }
      }
    };

    traverse(expr);
    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Check if a call expression is a .map() call
   */
  private isMapCall(callExpr: swc.CallExpression): boolean {
    const callee = callExpr.callee;
    
    if (callee.type === 'MemberExpression') {
      const memberExpr = callee as swc.MemberExpression;
      if (memberExpr.property.type === 'Identifier') {
        return memberExpr.property.value === 'map';
      }
    }

    return false;
  }

  /**
   * Extract array variable from .map() callee
   */
  private extractArrayVariable(callee: swc.Expression | swc.Super | swc.Import): string | undefined {
    if (callee.type === 'MemberExpression') {
      const memberExpr = callee as swc.MemberExpression;
      if (memberExpr.object.type === 'Identifier') {
        return (memberExpr.object as swc.Identifier).value;
      }
    }
    return undefined;
  }

  /**
   * Get tag name from JSX opening element
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

    console.log(`⚠️ Unknown JSX element type:`, name);
    return 'Unknown';
  }

  /**
   * Get name from JSX member expression
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
   * Convert expression to string representation
   */
  private expressionToString(expr: swc.Expression): string {
    if (expr.type === 'Identifier') {
      return (expr as swc.Identifier).value;
    }

    if (expr.type === 'UnaryExpression') {
      const unary = expr as swc.UnaryExpression;
      const arg = this.expressionToString(unary.argument as swc.Expression);
      return `${unary.operator}${arg}`;
    }

    if (expr.type === 'BinaryExpression') {
      const binary = expr as swc.BinaryExpression;
      const left = this.expressionToString(binary.left);
      const right = this.expressionToString(binary.right);
      return `${left} ${binary.operator} ${right}`;
    }

    if (expr.type === 'MemberExpression') {
      const memberExpr = expr as swc.MemberExpression;
      const object = this.expressionToString(memberExpr.object as swc.Expression);
      const property = memberExpr.property.type === 'Identifier'
        ? memberExpr.property.value
        : 'computed';
      return `${object}.${property}`;
    }

    if (expr.type === 'CallExpression') {
      const callExpr = expr as swc.CallExpression;
      const callee = this.expressionToString(callExpr.callee as swc.Expression);
      return `${callee}()`;
    }

    if (expr.type === 'ParenthesisExpression') {
      const paren = expr as swc.ParenthesisExpression;
      return `(${this.expressionToString(paren.expression)})`;
    }

    return 'expression';
  }

  /**
   * Get line number from span position
   */
  getLineFromSpan(spanStart: number): number {
    if (this.lineStarts.length === 0) {
      return 1;
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
   */
  getColumnFromSpan(spanStart: number): number {
    if (this.lineStarts.length === 0) {
      console.log(`⚠️ getColumnFromSpan: lineStarts is empty, returning 0`);
      return 0;
    }

    const line = this.getLineFromSpan(spanStart);
    const lineStartPos = this.lineStarts[line - 1];
    const column = spanStart - lineStartPos;
    
    // Debug: log if column seems wrong
    if (column > 200) {
      console.log(`⚠️ getColumnFromSpan: Suspicious column value: spanStart=${spanStart}, line=${line}, lineStartPos=${lineStartPos}, column=${column}`);
      console.log(`⚠️ lineStarts.length=${this.lineStarts.length}, first few:`, this.lineStarts.slice(0, 5));
    }
    
    return column;
  }
}
