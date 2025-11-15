/**
 * AST Analyzer for traversing and analyzing React component AST
 */

import type * as swc from '@swc/core';
import { ComponentAnalysis, JSXInfo, ProcessInfo, JSXStructure, ConditionalBranch } from './types';
import { SWCPropsAnalyzer } from '../analyzers/props-analyzer';
import { SWCHooksAnalyzer } from '../analyzers/hooks-analyzer';
import { SWCProcessAnalyzer } from '../analyzers/process-analyzer';
import { ConditionalStructureExtractor } from '../analyzers/conditional-extractor';
import { TypeResolver } from '../services/type-resolver';
import { createImportDetector } from '../analyzers/import-detector';
import { hookRegistry } from '../utils/hook-registry';

/**
 * AST Analyzer interface for analyzing React components
 */
export interface ASTAnalyzer {
  analyze(module: swc.Module, filePath?: string, sourceCode?: string): Promise<ComponentAnalysis | null>;
}

/**
 * Implementation of AST Analyzer using visitor pattern
 */
export class SWCASTAnalyzer implements ASTAnalyzer {
  private propsAnalyzer: SWCPropsAnalyzer;
  private processAnalyzer: SWCProcessAnalyzer;
  private conditionalExtractor: ConditionalStructureExtractor;
  private typeResolver?: TypeResolver;

  constructor(typeResolver?: TypeResolver) {
    this.typeResolver = typeResolver;
    this.propsAnalyzer = new SWCPropsAnalyzer(typeResolver);
    this.processAnalyzer = new SWCProcessAnalyzer();
    this.conditionalExtractor = new ConditionalStructureExtractor();
  }

  /**
   * Analyze a parsed module to extract component information
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @param sourceCode - Optional source code for line number calculation
   * @returns Promise resolving to ComponentAnalysis object or null if no component found
   */
  async analyze(module: swc.Module, filePath?: string, sourceCode?: string): Promise<ComponentAnalysis | null> {
    // Set source code for analyzers (for line number calculation)
    if (sourceCode) {
      this.conditionalExtractor.setSourceCode(sourceCode);
      this.propsAnalyzer.setSourceCode(sourceCode);
    }

    // Detect imports and activate library adapters
    console.log('🔍 ========================================');
    console.log('🔍 AST Analyzer: Detecting imports...');
    const importDetector = createImportDetector();
    const imports = importDetector.detectImports(module);
    console.log('🔍 AST Analyzer: Imports detected:', imports.length);
    imports.forEach(imp => {
      console.log(`🔍   - ${imp.source}:`, imp.imports.map(i => i.name).join(', '));
    });
    
    // Get registered libraries from hook registry
    const registeredLibraries = new Set<string>();
    // We need to get all registered library names from the hook registry
    // For now, we'll check against a known list of libraries that have adapters
    // This will be populated when library adapters are loaded
    const knownLibraries = ['swr', 'swr/mutation', '@tanstack/react-query', 'react-router-dom', 'next/navigation', 
                            'react-hook-form', 'zustand', 'jotai', 'mobx-react-lite', 
                            '@apollo/client', '@reduxjs/toolkit/query', '@trpc/react-query'];
    knownLibraries.forEach(lib => registeredLibraries.add(lib));
    console.log('🔍 AST Analyzer: Registered libraries:', Array.from(registeredLibraries));
    
    const activeLibraries = importDetector.getActiveLibraries(imports, registeredLibraries);
    console.log('🔍 AST Analyzer: Active libraries:', activeLibraries);
    console.log('🔍 ========================================');

    // Find React component in the module
    const componentInfo = this.findReactComponent(module);
    
    if (!componentInfo) {
      console.log('🔍 AST Analyzer: No component found');
      return null;
    }

    const { name, type, body } = componentInfo;
    console.log('🔍 AST Analyzer: Component found:', name, 'type:', type);
    console.log('🔍 AST Analyzer: Body statements:', body.length);

    // Extract props using Props Analyzer (with type resolution if file path is available)
    const props = await this.propsAnalyzer.analyzeProps(module, filePath, name);

    // Extract hooks using Hooks Analyzer (with type resolution if available)
    console.log('🔍 ========================================');
    console.log('🔍 AST Analyzer: Calling hooks analyzer...');
    const hooksAnalyzer = new SWCHooksAnalyzer(this.typeResolver, filePath);
    if (sourceCode) {
      hooksAnalyzer.setSourceCode(sourceCode);
    }
    // Pass active libraries to hooks analyzer
    console.log('🔍 AST Analyzer: Setting active libraries:', activeLibraries);
    hooksAnalyzer.setActiveLibraries(activeLibraries);
    const hooks = await hooksAnalyzer.analyzeHooks(body);
    console.log('🔍 AST Analyzer: Hooks returned:', hooks.length);
    hooks.forEach(hook => {
      console.log(`🔍   - ${hook.hookName}:`, hook.variables);
      if ((hook as any).libraryName) {
        console.log(`🔍     Library: ${(hook as any).libraryName}`);
      }
    });
    console.log('🔍 ========================================');

    // Extract processes using Process Analyzer
    if (sourceCode) {
      this.processAnalyzer.setSourceCode(sourceCode);
    }
    const processes = this.processAnalyzer.analyzeProcesses(body);

    // Extract JSX output using JSX Analyzer
    const jsxOutput = this.extractJSXOutput(componentInfo);

    // Extract inline callbacks from JSX
    const inlineCallbacks = this.extractInlineCallbacksFromJSX(componentInfo);
    
    // Combine regular processes with inline callbacks
    const allProcesses = [...processes, ...inlineCallbacks];

    return {
      componentName: name,
      componentType: type,
      props,
      hooks,
      processes: allProcesses,
      jsxOutput,
    };
  }

  /**
   * Find React component definition in the module
   * @param module - The SWC module to search
   * @returns Component information or null
   */
  private findReactComponent(module: swc.Module): ComponentInfo | null {
    // First pass: look for inline exports (export default function App() {})
    for (const item of module.body) {
      // Check for export default declarations
      if (item.type === 'ExportDefaultDeclaration') {
        const componentInfo = this.extractComponentFromDeclaration(item.decl);
        if (componentInfo) {
          return componentInfo;
        }
      }
      
      // Check for named export declarations
      if (item.type === 'ExportDeclaration') {
        const componentInfo = this.extractComponentFromDeclaration(item.declaration);
        if (componentInfo) {
          return componentInfo;
        }
      }
    }

    // Second pass: look for function/class declarations that might be exported separately
    // (e.g., function App() {} ... export default App)
    for (const item of module.body) {
      // Check for function declarations
      if (item.type === 'FunctionDeclaration') {
        const componentInfo = this.extractComponentFromFunction(item);
        if (componentInfo) {
          return componentInfo;
        }
      }
      
      // Check for variable declarations (arrow functions)
      if (item.type === 'VariableDeclaration') {
        const componentInfo = this.extractComponentFromVariableDeclaration(item);
        if (componentInfo) {
          return componentInfo;
        }
      }
      
      // Check for class declarations
      if (item.type === 'ClassDeclaration') {
        const componentInfo = this.extractComponentFromClass(item);
        if (componentInfo) {
          return componentInfo;
        }
      }
    }

    return null;
  }

  /**
   * Extract component from a declaration
   */
  private extractComponentFromDeclaration(
    declaration: swc.Declaration | swc.Expression | swc.DefaultDecl | undefined
  ): ComponentInfo | null {
    if (!declaration) {
      return null;
    }

    if (declaration.type === 'FunctionDeclaration') {
      return this.extractComponentFromFunction(declaration);
    }

    if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
      return this.extractComponentFromFunctionExpression(declaration);
    }

    if (declaration.type === 'VariableDeclaration') {
      return this.extractComponentFromVariableDeclaration(declaration);
    }

    if (declaration.type === 'ClassDeclaration') {
      return this.extractComponentFromClass(declaration);
    }

    if (declaration.type === 'ClassExpression') {
      return this.extractComponentFromClassExpression(declaration);
    }

    return null;
  }

  /**
   * Extract component from function declaration
   */
  private extractComponentFromFunction(func: swc.FunctionDeclaration): ComponentInfo | null {
    const name = func.identifier?.value || 'AnonymousComponent';
    
    // Check if function returns JSX
    if (!func.body || !this.hasJSXReturn(func.body)) {
      return null;
    }

    const body = this.extractFunctionBody(func.body);

    return {
      name,
      type: 'functional',
      body,
      node: func,
    };
  }

  /**
   * Extract component from function expression (arrow or regular)
   */
  private extractComponentFromFunctionExpression(
    func: swc.ArrowFunctionExpression | swc.FunctionExpression
  ): ComponentInfo | null {
    const name = 'identifier' in func && func.identifier ? func.identifier.value : 'AnonymousComponent';
    
    if (!func.body) {
      return null;
    }
    
    // Check if function returns JSX
    if (func.body.type === 'BlockStatement') {
      if (!this.hasJSXReturn(func.body)) {
        return null;
      }
      
      const body = this.extractFunctionBody(func.body);
      
      return {
        name,
        type: 'functional',
        body,
        node: func,
      };
    } else {
      // Arrow function with expression body
      if (!this.isJSXExpression(func.body)) {
        return null;
      }
      
      return {
        name,
        type: 'functional',
        body: [],
        node: func,
      };
    }
  }

  /**
   * Extract component from variable declaration
   */
  private extractComponentFromVariableDeclaration(varDecl: swc.VariableDeclaration): ComponentInfo | null {
    for (const declarator of varDecl.declarations) {
      if (!declarator.init) {
        continue;
      }

      // Check for forwardRef call
      if (declarator.init.type === 'CallExpression') {
        const callExpr = declarator.init as swc.CallExpression;
        
        // Check if it's a forwardRef call
        if (callExpr.callee.type === 'Identifier' && callExpr.callee.value === 'forwardRef') {
          const name = declarator.id.type === 'Identifier' ? declarator.id.value : 'AnonymousComponent';
          
          // Extract the function passed to forwardRef
          if (callExpr.arguments.length > 0 && !callExpr.arguments[0].spread) {
            const arg = callExpr.arguments[0].expression;
            
            if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
              if (!arg.body) {
                continue;
              }
              
              // Check if function returns JSX
              if (arg.body.type === 'BlockStatement') {
                if (!this.hasJSXReturn(arg.body)) {
                  continue;
                }
                
                const body = this.extractFunctionBody(arg.body);
                
                return {
                  name,
                  type: 'functional',
                  body,
                  node: arg,
                };
              } else {
                // Arrow function with expression body
                if (!this.isJSXExpression(arg.body)) {
                  continue;
                }
                
                return {
                  name,
                  type: 'functional',
                  body: [],
                  node: arg,
                };
              }
            }
          }
        }
      }

      // Check for arrow function or function expression
      if (declarator.init.type === 'ArrowFunctionExpression' || declarator.init.type === 'FunctionExpression') {
        const name = declarator.id.type === 'Identifier' ? declarator.id.value : 'AnonymousComponent';
        
        if (!declarator.init.body) {
          continue;
        }
        
        // Check if function returns JSX
        if (declarator.init.body.type === 'BlockStatement') {
          if (!this.hasJSXReturn(declarator.init.body)) {
            continue;
          }
          
          const body = this.extractFunctionBody(declarator.init.body);
          
          return {
            name,
            type: 'functional',
            body,
            node: declarator.init,
          };
        } else {
          // Arrow function with expression body
          if (!this.isJSXExpression(declarator.init.body)) {
            continue;
          }
          
          return {
            name,
            type: 'functional',
            body: [],
            node: declarator.init,
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract component from class declaration
   */
  private extractComponentFromClass(classDecl: swc.ClassDeclaration): ComponentInfo | null {
    const name = classDecl.identifier?.value || 'AnonymousComponent';
    
    // Check if class extends React.Component or React.PureComponent
    if (!this.extendsReactComponent(classDecl)) {
      return null;
    }

    const body = this.extractClassBody(classDecl.body);

    return {
      name,
      type: 'class',
      body,
      node: classDecl,
    };
  }

  /**
   * Extract component from class expression
   */
  private extractComponentFromClassExpression(classExpr: swc.ClassExpression): ComponentInfo | null {
    const name = classExpr.identifier?.value || 'AnonymousComponent';
    
    // Check if class extends React.Component or React.PureComponent
    if (!classExpr.superClass) {
      return null;
    }

    const body = this.extractClassBody(classExpr.body);

    return {
      name,
      type: 'class',
      body,
      node: classExpr,
    };
  }

  /**
   * Check if a function body has a JSX return statement
   */
  private hasJSXReturn(body: swc.BlockStatement): boolean {
    for (const statement of body.stmts) {
      if (statement.type === 'ReturnStatement' && statement.argument) {
        if (this.isJSXExpression(statement.argument)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if an expression is JSX
   */
  private isJSXExpression(expression: swc.Expression): boolean {
    if (expression.type === 'JSXElement' || expression.type === 'JSXFragment') {
      return true;
    }

    // Check for JSX wrapped in parentheses
    if (expression.type === 'ParenthesisExpression') {
      return this.isJSXExpression(expression.expression);
    }

    // Check for conditional expressions that return JSX
    if (expression.type === 'ConditionalExpression') {
      return this.isJSXExpression(expression.consequent) || this.isJSXExpression(expression.alternate);
    }

    // Check for logical expressions that return JSX
    if (expression.type === 'BinaryExpression') {
      if (expression.operator === '&&' || expression.operator === '||') {
        return this.isJSXExpression(expression.right);
      }
    }

    return false;
  }

  /**
   * Check if class extends React.Component or React.PureComponent
   */
  private extendsReactComponent(classDecl: swc.ClassDeclaration): boolean {
    if (!classDecl.superClass) {
      return false;
    }

    const superClass = classDecl.superClass;

    // Check for direct Component or PureComponent
    if (superClass.type === 'Identifier') {
      return superClass.value === 'Component' || superClass.value === 'PureComponent';
    }

    // Check for React.Component or React.PureComponent
    if (superClass.type === 'MemberExpression') {
      const object = superClass.object;
      const property = superClass.property;

      if (object.type === 'Identifier' && object.value === 'React') {
        if (property.type === 'Identifier') {
          return property.value === 'Component' || property.value === 'PureComponent';
        }
      }
    }

    return false;
  }

  /**
   * Extract function body as array of statements
   */
  private extractFunctionBody(body: swc.BlockStatement): swc.Statement[] {
    return body.stmts;
  }

  /**
   * Extract class body as array of statements
   */
  private extractClassBody(body: swc.ClassMember[]): swc.Statement[] {
    const statements: swc.Statement[] = [];

    for (const member of body) {
      if (member.type === 'ClassMethod' && member.function.body) {
        statements.push(...member.function.body.stmts);
      }
    }

    return statements;
  }

  /**
   * Extract JSX output from component
   */
  private extractJSXOutput(componentInfo: ComponentInfo): JSXInfo {
    const defaultJSXInfo: JSXInfo = {
      simplified: '',
      placeholders: [],
      elements: [],
    };

    // For functional components, find return statement
    if (componentInfo.type === 'functional') {
      const node = componentInfo.node;
      
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        if (node.body) {
          const jsxInfo = this.findJSXInBlockStatement(node.body);
          if (jsxInfo) {
            return jsxInfo;
          }
        }
      } else if (node.type === 'ArrowFunctionExpression') {
        if (node.body.type === 'BlockStatement') {
          const jsxInfo = this.findJSXInBlockStatement(node.body);
          if (jsxInfo) {
            return jsxInfo;
          }
        } else {
          // Expression body
          let body = node.body;
          
          // Unwrap ParenthesisExpression
          while (body.type === 'ParenthesisExpression') {
            body = (body as swc.ParenthesisExpression).expression;
          }
          
          if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
            const structure = this.conditionalExtractor.extractStructure(body);
            return {
              simplified: '',
              placeholders: [],
              elements: [],
              structure
            };
          }
        }
      }
    }
    
    // For class components, find render method
    if (componentInfo.type === 'class') {
      const node = componentInfo.node;
      
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        const jsxInfo = this.findJSXInClassBody(node.body);
        if (jsxInfo) {
          return jsxInfo;
        }
      }
    }

    return defaultJSXInfo;
  }

  /**
   * Find JSX in block statement
   */
  private findJSXInBlockStatement(body: swc.BlockStatement): JSXInfo | null {
    const earlyReturns: Array<{ condition: swc.Expression; jsx: swc.JSXElement | swc.JSXFragment }> = [];
    let finalReturn: swc.JSXElement | swc.JSXFragment | null = null;

    for (const statement of body.stmts) {
      // Check for early return pattern: if (condition) { return <JSX>; }
      if (statement.type === 'IfStatement') {
        const ifStmt = statement as swc.IfStatement;
        const earlyReturnJSX = this.extractEarlyReturnJSX(ifStmt);
        
        if (earlyReturnJSX) {
          earlyReturns.push({
            condition: ifStmt.test,
            jsx: earlyReturnJSX
          });
        }
      }
      // Check for final return statement
      else if (statement.type === 'ReturnStatement' && statement.argument) {
        let arg = statement.argument;
        
        // Unwrap ParenthesisExpression
        while (arg.type === 'ParenthesisExpression') {
          arg = (arg as swc.ParenthesisExpression).expression;
        }
        
        if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
          finalReturn = arg;
        }
      }
    }

    // If we have early returns, create a combined structure
    if (earlyReturns.length > 0 || finalReturn) {
      const structure = this.createCombinedJSXStructure(earlyReturns, finalReturn);
      return {
        simplified: '',
        placeholders: [],
        elements: [],
        structure
      };
    }

    return null;
  }

  /**
   * Extract JSX from early return pattern: if (condition) { return <JSX>; }
   */
  private extractEarlyReturnJSX(ifStmt: swc.IfStatement): swc.JSXElement | swc.JSXFragment | null {
    // Check if consequent is a block statement
    if (ifStmt.consequent.type !== 'BlockStatement') {
      return null;
    }

    const block = ifStmt.consequent as swc.BlockStatement;
    
    // Check if block contains only a return statement
    if (block.stmts.length !== 1) {
      return null;
    }

    const stmt = block.stmts[0];
    if (stmt.type !== 'ReturnStatement' || !stmt.argument) {
      return null;
    }

    let arg = stmt.argument;
    
    // Unwrap ParenthesisExpression
    while (arg.type === 'ParenthesisExpression') {
      arg = (arg as swc.ParenthesisExpression).expression;
    }

    // Check if it's JSX
    if (arg.type === 'JSXElement' || arg.type === 'JSXFragment') {
      return arg;
    }

    return null;
  }

  /**
   * Create a combined JSX structure from early returns and final return
   */
  private createCombinedJSXStructure(
    earlyReturns: Array<{ condition: swc.Expression; jsx: swc.JSXElement | swc.JSXFragment }>,
    finalReturn: swc.JSXElement | swc.JSXFragment | null
  ): JSXStructure {
    // If we only have a final return with no early returns, just extract it normally
    if (earlyReturns.length === 0 && finalReturn) {
      return this.conditionalExtractor.extractStructure(finalReturn);
    }

    // Create a fragment structure to hold all conditional branches
    const children: JSXStructure[] = [];

    // Add each early return as a conditional branch
    for (const earlyReturn of earlyReturns) {
      const condition = this.conditionalExtractor.extractConditionExpression(earlyReturn.condition);
      const jsxStructure = this.conditionalExtractor.extractStructure(earlyReturn.jsx);

      // Create a conditional branch for the early return
      const conditionalBranch: ConditionalBranch = {
        type: 'early-return',
        condition,
        trueBranch: jsxStructure,
        line: earlyReturn.jsx.span ? this.conditionalExtractor.getLineFromSpan(earlyReturn.jsx.span.start) : undefined,
        column: earlyReturn.jsx.span ? this.conditionalExtractor.getColumnFromSpan(earlyReturn.jsx.span.start) : undefined,
      };

      children.push(conditionalBranch);
    }

    // Add the final return if it exists
    if (finalReturn) {
      const finalStructure = this.conditionalExtractor.extractStructure(finalReturn);
      children.push(finalStructure);
    }

    // Return a fragment structure containing all branches
    return {
      type: 'element',
      tagName: 'Fragment',
      displayDependencies: [],
      attributeReferences: [],
      children,
    };
  }

  /**
   * Find JSX in class body (render method)
   */
  private findJSXInClassBody(body: swc.ClassMember[]): JSXInfo | null {
    for (const member of body) {
      if (member.type === 'ClassMethod') {
        const key = member.key;
        
        // Check if this is the render method
        if (key.type === 'Identifier' && key.value === 'render') {
          if (member.function.body) {
            return this.findJSXInBlockStatement(member.function.body);
          }
        }
      }
    }
    return null;
  }

  /**
   * Extract inline callbacks from JSX
   */
  private extractInlineCallbacksFromJSX(componentInfo: ComponentInfo): ProcessInfo[] {
    const jsxNode = this.findJSXNodeFromComponent(componentInfo);
    
    if (!jsxNode) {
      return [];
    }

    return this.processAnalyzer.extractInlineCallbacks(jsxNode);
  }

  /**
   * Find JSX node from component
   */
  private findJSXNodeFromComponent(componentInfo: ComponentInfo): swc.JSXElement | swc.JSXFragment | null {
    // For functional components, find return statement
    if (componentInfo.type === 'functional') {
      const node = componentInfo.node;
      
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
        if (node.body) {
          return this.findJSXNodeInBlockStatement(node.body);
        }
      } else if (node.type === 'ArrowFunctionExpression') {
        if (node.body.type === 'BlockStatement') {
          return this.findJSXNodeInBlockStatement(node.body);
        } else {
          // Expression body
          return this.findJSXNodeInExpression(node.body);
        }
      }
    }
    
    // For class components, find render method
    if (componentInfo.type === 'class') {
      const node = componentInfo.node;
      
      if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
        return this.findJSXNodeInClassBody(node.body);
      }
    }

    return null;
  }

  /**
   * Find JSX node in block statement
   */
  private findJSXNodeInBlockStatement(body: swc.BlockStatement): swc.JSXElement | swc.JSXFragment | null {
    for (const statement of body.stmts) {
      if (statement.type === 'ReturnStatement' && statement.argument) {
        return this.findJSXNodeInExpression(statement.argument);
      }
    }
    return null;
  }

  /**
   * Find JSX node in expression
   */
  private findJSXNodeInExpression(expression: swc.Expression): swc.JSXElement | swc.JSXFragment | null {
    if (expression.type === 'JSXElement' || expression.type === 'JSXFragment') {
      return expression;
    }

    // Check for JSX wrapped in parentheses
    if (expression.type === 'ParenthesisExpression') {
      return this.findJSXNodeInExpression(expression.expression);
    }

    // Check for conditional expressions that return JSX
    if (expression.type === 'ConditionalExpression') {
      const consequent = this.findJSXNodeInExpression(expression.consequent);
      if (consequent) {
        return consequent;
      }
      return this.findJSXNodeInExpression(expression.alternate);
    }

    // Check for logical expressions that return JSX
    if (expression.type === 'BinaryExpression') {
      if (expression.operator === '&&' || expression.operator === '||') {
        return this.findJSXNodeInExpression(expression.right);
      }
    }

    return null;
  }

  /**
   * Find JSX node in class body (render method)
   */
  private findJSXNodeInClassBody(body: swc.ClassMember[]): swc.JSXElement | swc.JSXFragment | null {
    for (const member of body) {
      if (member.type === 'ClassMethod') {
        const key = member.key;
        
        // Check if this is the render method
        if (key.type === 'Identifier' && key.value === 'render') {
          if (member.function.body) {
            return this.findJSXNodeInBlockStatement(member.function.body);
          }
        }
      }
    }
    return null;
  }
}

/**
 * Component information extracted from AST
 */
interface ComponentInfo {
  name: string;
  type: 'functional' | 'class';
  body: swc.Statement[];
  node: swc.FunctionDeclaration | swc.ArrowFunctionExpression | swc.FunctionExpression | swc.ClassDeclaration | swc.ClassExpression;
}
