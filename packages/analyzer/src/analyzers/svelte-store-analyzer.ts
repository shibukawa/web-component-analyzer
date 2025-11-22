/**
 * Svelte Store Analyzer
 * 
 * Analyzes Svelte store patterns:
 * - writable() store creation
 * - readable() store creation
 * - derived() store creation
 * - Auto-subscriptions ($store syntax)
 * - Manual subscriptions (store.subscribe())
 * - Store updates (store.set(), store.update())
 */

import * as swc from '@swc/core';
import type { TypeResolver } from '../services/type-resolver.js';

/**
 * Information about a Svelte store
 */
export interface StoreInfo {
  name: string;
  type: 'writable' | 'readable' | 'derived' | 'custom';
  dataType?: string;
  line?: number;
  column?: number;
  dependencies?: string[]; // For derived stores: list of stores they depend on
  isImported?: boolean; // Whether the store is imported from another file
  source?: string; // Import source if imported
}

/**
 * Information about a store subscription
 */
export interface StoreSubscription {
  storeName: string;
  variableName: string; // Variable receiving the subscribed value
  isAutoSubscription: boolean; // true for $store syntax, false for manual subscribe()
  line?: number;
  column?: number;
}

/**
 * Information about a computed value from auto-subscriptions
 */
export interface ComputedFromSubscription {
  name: string; // Variable name (e.g., 'doubled', 'greeting')
  dependencies: string[]; // Store names this computed value depends on (e.g., ['counter'], ['userName'])
  line?: number;
  column?: number;
}

/**
 * Information about a store update
 */
export interface StoreUpdate {
  storeName: string;
  method: 'set' | 'update';
  line?: number;
  column?: number;
}

/**
 * Analyzer for Svelte stores
 */
export class SvelteStoreAnalyzer {
  private typeResolver?: TypeResolver;
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private lineOffset: number = 0;

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
   * Set line offset for file-relative line number calculation
   * Used when the source code is extracted from a larger file (e.g., script section from SFC)
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
   * Analyze stores from a parsed Svelte script module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to object with stores, subscriptions, and updates
   */
  async analyzeStores(module: swc.Module, filePath?: string): Promise<{
    stores: StoreInfo[];
    subscriptions: StoreSubscription[];
    updates: StoreUpdate[];
    computedFromSubscriptions: ComputedFromSubscription[];
  }> {
    const stores: StoreInfo[] = [];
    const subscriptions: StoreSubscription[] = [];
    const updates: StoreUpdate[] = [];
    const computedFromSubscriptions: ComputedFromSubscription[] = [];
    
    // First pass: detect store imports and local store creation
    for (const item of module.body) {
      if (item.type === 'ImportDeclaration') {
        // Check if importing from 'svelte/store'
        if (item.source.value === 'svelte/store') {
          // Track imported store functions (writable, readable, derived, get)
        }
        // Skip $app/stores imports - they're handled by the SvelteKit library processor
        // This prevents duplicate nodes for page, navigating, updated stores
        else if (item.source.value === '$app/stores') {
          // Skip - handled by SvelteKit library processor
        }
      } else if (item.type === 'VariableDeclaration') {
        // Check for local store creation
        const localStores = this.analyzeVariableDeclaration(item);
        stores.push(...localStores);
      }
    }
    
    // Second pass: detect auto-subscriptions ($store syntax) and store updates
    // Note: Auto-subscriptions in script are detected by looking for identifiers starting with $
    // This is a simplified approach - full implementation would need to track all store names
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        // Check for auto-subscriptions in variable initializers
        for (const decl of item.declarations) {
          if (decl.init) {
            const autoSubs = this.findAutoSubscriptions(decl.init, decl.id);
            subscriptions.push(...autoSubs);
            
            // If this variable uses auto-subscriptions, it's a computed value
            if (autoSubs.length > 0) {
              const variableName = this.extractVariableName(decl.id);
              const dependencies = autoSubs.map(sub => sub.storeName);
              
              computedFromSubscriptions.push({
                name: variableName,
                dependencies,
                line: decl.span?.start ? this.getLineNumber(decl.span.start) : undefined,
                column: decl.span?.start ? this.getColumnNumber(decl.span.start) : undefined,
              });
            }
          }
        }
      } else if (item.type === 'ExpressionStatement') {
        // Check for store updates (store.set(), store.update())
        const storeUpdates = this.findStoreUpdates(item.expression);
        updates.push(...storeUpdates);
      } else if (item.type === 'FunctionDeclaration') {
        // Check for store updates inside function bodies
        if (item.body && item.body.type === 'BlockStatement') {
          const functionUpdates = this.findStoreUpdatesInBlock(item.body);
          updates.push(...functionUpdates);
        }
      }
    }
    
    return { stores, subscriptions, updates, computedFromSubscriptions };
  }

  /**
   * Analyze SvelteKit store imports from $app/stores
   * @param importDecl - Import declaration to analyze
   * @returns Array of StoreInfo objects for SvelteKit stores
   */
  private analyzeSvelteKitImports(importDecl: swc.ImportDeclaration): StoreInfo[] {
    const stores: StoreInfo[] = [];
    
    for (const specifier of importDecl.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        const importedName = specifier.imported 
          ? (specifier.imported.type === 'Identifier' ? specifier.imported.value : specifier.imported.value)
          : specifier.local.value;
        
        const localName = specifier.local.value;
        
        // Check if this is a known SvelteKit store
        if (importedName === 'page' || importedName === 'navigating' || importedName === 'updated') {
          const line = importDecl.span?.start ? this.getLineNumber(importDecl.span.start) : undefined;
          const column = importDecl.span?.start ? this.getColumnNumber(importDecl.span.start) : undefined;
          
          stores.push({
            name: localName,
            type: 'custom',
            dataType: this.getSvelteKitStoreType(importedName),
            line,
            column,
            isImported: true,
            source: '$app/stores',
          });
        }
      }
    }
    
    return stores;
  }

  /**
   * Get the data type for a SvelteKit store
   * @param storeName - Name of the SvelteKit store
   * @returns Data type string
   */
  private getSvelteKitStoreType(storeName: string): string {
    switch (storeName) {
      case 'page':
        return 'Page';
      case 'navigating':
        return 'Navigation | null';
      case 'updated':
        return 'boolean';
      default:
        return 'unknown';
    }
  }

  /**
   * Analyze a variable declaration for store creation
   * @param varDecl - Variable declaration to analyze
   * @returns Array of StoreInfo objects
   */
  private analyzeVariableDeclaration(varDecl: swc.VariableDeclaration): StoreInfo[] {
    const stores: StoreInfo[] = [];

    for (const decl of varDecl.declarations) {
      if (!decl.init) {
        continue;
      }

      // Check if the initializer is a store creation call
      const storeInfo = this.analyzeStoreCreation(decl.init, decl.id);
      if (storeInfo) {
        stores.push(storeInfo);
      }
    }

    return stores;
  }

  /**
   * Analyze an expression for store creation calls
   * @param expr - Expression to analyze
   * @param id - Variable identifier (for extracting name)
   * @returns StoreInfo if a store creation call is found, null otherwise
   */
  private analyzeStoreCreation(expr: swc.Expression, id: swc.Pattern): StoreInfo | null {
    if (expr.type !== 'CallExpression') {
      return null;
    }

    const callee = expr.callee;
    if (callee.type !== 'Identifier') {
      return null;
    }

    const functionName = callee.value;
    
    // Check if this is a Svelte store creation function
    if (functionName === 'writable') {
      return this.analyzeWritableStore(expr, id);
    } else if (functionName === 'readable') {
      return this.analyzeReadableStore(expr, id);
    } else if (functionName === 'derived') {
      return this.analyzeDerivedStore(expr, id);
    }

    return null;
  }

  /**
   * Analyze writable() store creation
   * @param callExpr - Call expression
   * @param id - Variable identifier
   * @returns StoreInfo for writable store
   */
  private analyzeWritableStore(callExpr: swc.CallExpression, id: swc.Pattern): StoreInfo {
    const name = this.extractVariableName(id);
    const line = callExpr.span?.start ? this.getLineNumber(callExpr.span.start) : undefined;
    const column = callExpr.span?.start ? this.getColumnNumber(callExpr.span.start) : undefined;

    // Try to infer data type from initial value
    let dataType = 'unknown';
    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      dataType = this.inferDataType(arg.expression);
    }

    return {
      name,
      type: 'writable',
      dataType,
      line,
      column,
    };
  }

  /**
   * Analyze readable() store creation
   * @param callExpr - Call expression
   * @param id - Variable identifier
   * @returns StoreInfo for readable store
   */
  private analyzeReadableStore(callExpr: swc.CallExpression, id: swc.Pattern): StoreInfo {
    const name = this.extractVariableName(id);
    const line = callExpr.span?.start ? this.getLineNumber(callExpr.span.start) : undefined;
    const column = callExpr.span?.start ? this.getColumnNumber(callExpr.span.start) : undefined;

    // Try to infer data type from initial value
    let dataType = 'unknown';
    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      dataType = this.inferDataType(arg.expression);
    }

    return {
      name,
      type: 'readable',
      dataType,
      line,
      column,
    };
  }

  /**
   * Analyze derived() store creation
   * @param callExpr - Call expression
   * @param id - Variable identifier
   * @returns StoreInfo for derived store
   */
  private analyzeDerivedStore(callExpr: swc.CallExpression, id: swc.Pattern): StoreInfo {
    const name = this.extractVariableName(id);
    const line = callExpr.span?.start ? this.getLineNumber(callExpr.span.start) : undefined;
    const column = callExpr.span?.start ? this.getColumnNumber(callExpr.span.start) : undefined;

    // Extract dependencies from the first argument (stores array or single store)
    const dependencies: string[] = [];
    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      this.extractStoreDependencies(arg.expression, dependencies);
    }

    return {
      name,
      type: 'derived',
      dataType: 'computed',
      line,
      column,
      dependencies,
    };
  }

  /**
   * Find auto-subscriptions ($store syntax) in an expression
   * @param expr - Expression to analyze
   * @param id - Variable identifier receiving the value
   * @returns Array of StoreSubscription objects
   */
  private findAutoSubscriptions(expr: swc.Expression, id: swc.Pattern): StoreSubscription[] {
    const subscriptions: StoreSubscription[] = [];
    
    // Svelte runes that should NOT be treated as store subscriptions
    const svelteRunes = new Set(['state', 'derived', 'effect', 'props', 'bindable', 'host']);
    
    // Look for identifiers starting with $ (but exclude Svelte runes)
    this.traverseExpression(expr, (node) => {
      if (node.type === 'Identifier' && node.value.startsWith('$')) {
        const nameWithoutDollar = node.value.substring(1); // Remove $ prefix
        
        // Skip if this is a Svelte rune
        if (svelteRunes.has(nameWithoutDollar)) {
          return;
        }
        
        const storeName = nameWithoutDollar;
        const variableName = this.extractVariableName(id);
        
        subscriptions.push({
          storeName,
          variableName,
          isAutoSubscription: true,
          line: node.span?.start ? this.getLineNumber(node.span.start) : undefined,
          column: node.span?.start ? this.getColumnNumber(node.span.start) : undefined,
        });
      }
    });
    
    return subscriptions;
  }

  /**
   * Find store updates (store.set(), store.update()) in an expression
   * @param expr - Expression to analyze
   * @returns Array of StoreUpdate objects
   */
  private findStoreUpdates(expr: swc.Expression): StoreUpdate[] {
    const updates: StoreUpdate[] = [];
    
    if (expr.type === 'CallExpression') {
      const callee = expr.callee;
      
      // Check for store.set() or store.update()
      if (callee.type === 'MemberExpression') {
        const object = callee.object;
        const property = callee.property;
        
        if (object.type === 'Identifier' && property.type === 'Identifier') {
          const storeName = object.value;
          const methodName = property.value;
          
          if (methodName === 'set' || methodName === 'update') {
            updates.push({
              storeName,
              method: methodName,
              line: expr.span?.start ? this.getLineNumber(expr.span.start) : undefined,
              column: expr.span?.start ? this.getColumnNumber(expr.span.start) : undefined,
            });
          }
        }
      }
    }
    
    return updates;
  }

  /**
   * Find store updates in a block statement (function body)
   */
  private findStoreUpdatesInBlock(block: swc.BlockStatement): StoreUpdate[] {
    const updates: StoreUpdate[] = [];
    
    for (const stmt of block.stmts) {
      if (stmt.type === 'ExpressionStatement') {
        const storeUpdates = this.findStoreUpdates(stmt.expression);
        updates.push(...storeUpdates);
      }
    }
    
    return updates;
  }

  /**
   * Extract store dependencies from a derived store expression
   * @param expr - Expression to analyze
   * @param dependencies - Array to collect store names
   */
  private extractStoreDependencies(expr: swc.Expression, dependencies: string[]): void {
    if (expr.type === 'Identifier') {
      // Single store dependency
      if (!dependencies.includes(expr.value)) {
        dependencies.push(expr.value);
      }
    } else if (expr.type === 'ArrayExpression') {
      // Array of store dependencies
      for (const elem of expr.elements) {
        if (elem && elem.expression && elem.expression.type === 'Identifier') {
          const storeName = elem.expression.value;
          if (!dependencies.includes(storeName)) {
            dependencies.push(storeName);
          }
        }
      }
    }
  }

  /**
   * Traverse an expression and call a visitor function on each node
   * @param expr - Expression to traverse
   * @param visitor - Visitor function
   */
  private traverseExpression(expr: swc.Expression, visitor: (node: swc.Expression) => void): void {
    visitor(expr);
    
    // Recursively traverse child expressions
    if (expr.type === 'MemberExpression') {
      this.traverseExpression(expr.object as swc.Expression, visitor);
    } else if (expr.type === 'BinaryExpression') {
      this.traverseExpression(expr.left, visitor);
      this.traverseExpression(expr.right, visitor);
    } else if (expr.type === 'CallExpression') {
      // Traverse the callee (e.g., $page.url.searchParams.get)
      this.traverseExpression(expr.callee as swc.Expression, visitor);
      // Traverse arguments
      for (const arg of expr.arguments) {
        this.traverseExpression(arg.expression, visitor);
      }
    } else if (expr.type === 'ArrayExpression') {
      for (const elem of expr.elements) {
        if (elem && elem.expression) {
          this.traverseExpression(elem.expression, visitor);
        }
      }
    } else if (expr.type === 'TemplateLiteral') {
      // Traverse template literal expressions (e.g., `Hello, ${$userName}!`)
      for (const expression of expr.expressions) {
        this.traverseExpression(expression, visitor);
      }
    }
    // Add more expression types as needed
  }

  /**
   * Infer data type from an expression
   * @param expr - Expression to analyze
   * @returns Inferred data type
   */
  private inferDataType(expr: swc.Expression): string {
    if (expr.type === 'NumericLiteral') {
      return 'number';
    } else if (expr.type === 'StringLiteral') {
      return 'string';
    } else if (expr.type === 'BooleanLiteral') {
      return 'boolean';
    } else if (expr.type === 'ArrayExpression') {
      return 'array';
    } else if (expr.type === 'ObjectExpression') {
      return 'object';
    }
    return 'unknown';
  }

  /**
   * Extract variable name from a pattern
   * @param pattern - Pattern to extract name from
   * @returns Variable name
   */
  private extractVariableName(pattern: swc.Pattern): string {
    if (pattern.type === 'Identifier') {
      return pattern.value;
    } else if (pattern.type === 'ObjectPattern') {
      return 'store'; // Default name for destructured stores
    } else if (pattern.type === 'ArrayPattern') {
      return 'array';
    }
    return 'unknown';
  }

  /**
   * Get line number from byte position
   * @param pos - Byte position in source code
   * @returns Line number (1-indexed)
   */
  private getLineNumber(pos: number): number {
    let line = 1;
    for (let i = 0; i < this.lineStarts.length; i++) {
      if (pos < this.lineStarts[i]) {
        break;
      }
      line = i + 1;
    }
    
    // Add line offset to get file-relative line number
    // The offset is 1-based, so we subtract 1 before adding to get the correct result
    return line + this.lineOffset - 1;
  }

  /**
   * Get column number from byte position
   * @param pos - Byte position in source code
   * @returns Column number (0-indexed)
   */
  private getColumnNumber(pos: number): number {
    const lineNumber = this.getLineNumber(pos);
    const lineStart = this.lineStarts[lineNumber - 1] || 0;
    return pos - lineStart;
  }
}
