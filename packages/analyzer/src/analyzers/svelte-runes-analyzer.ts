/**
 * Svelte Runes Analyzer
 * 
 * Analyzes Svelte 5 runes API declarations:
 * - $state() rune
 * - $derived() rune
 * - $effect() rune
 * - $props() rune
 */

import * as swc from '@swc/core';
import type { TypeResolver } from '../services/type-resolver.js';

/**
 * Information about a Svelte rune
 */
export interface RuneInfo {
  name: string;
  type: 'state' | 'derived' | 'effect' | 'props';
  dataType?: string;
  line?: number;
  column?: number;
  dependencies?: string[]; // For derived and effect: list of variables they depend on
  propsProperties?: PropProperty[]; // For $props(): list of prop properties
}

/**
 * Information about a property in $props()
 */
export interface PropProperty {
  name: string;
  dataType?: string;
  isOptional?: boolean;
}

/**
 * Analyzer for Svelte 5 runes
 */
export class SvelteRunesAnalyzer {
  private typeResolver?: TypeResolver;
  private sourceCode: string = '';
  private lineStarts: number[] = [];
  private effectCounter: number = 0;

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
   * Analyze runes from a parsed Svelte script module
   * @param module - The SWC module to analyze
   * @param filePath - Optional file path for type resolution
   * @returns Promise resolving to array of RuneInfo objects
   */
  async analyzeRunes(module: swc.Module, filePath?: string): Promise<RuneInfo[]> {
    const runes: RuneInfo[] = [];
    
    // Reset effect counter for each analysis
    this.effectCounter = 0;
    
    // Analyze all statements in the module
    for (const item of module.body) {
      if (item.type === 'VariableDeclaration') {
        runes.push(...this.analyzeVariableDeclaration(item));
      } else if (item.type === 'ExpressionStatement') {
        // $effect() can be a standalone expression statement
        const effectRune = this.analyzeEffectExpression(item);
        if (effectRune) {
          runes.push(effectRune);
        }
      }
    }
    
    return runes;
  }

  /**
   * Analyze a variable declaration for rune calls
   * @param varDecl - Variable declaration to analyze
   * @returns Array of RuneInfo objects
   */
  private analyzeVariableDeclaration(varDecl: swc.VariableDeclaration): RuneInfo[] {
    const runes: RuneInfo[] = [];

    for (const decl of varDecl.declarations) {
      if (!decl.init) {
        continue;
      }

      // Check if the initializer is a rune call
      const runeInfo = this.analyzeRuneCall(decl.init, decl.id);
      if (runeInfo) {
        runes.push(runeInfo);
      }
    }

    return runes;
  }

  /**
   * Analyze an expression for rune calls
   * @param expr - Expression to analyze
   * @param id - Variable identifier (for extracting name)
   * @returns RuneInfo if a rune call is found, null otherwise
   */
  private analyzeRuneCall(expr: swc.Expression, id: swc.Pattern): RuneInfo | null {
    if (expr.type !== 'CallExpression') {
      return null;
    }

    const callee = expr.callee;
    if (callee.type !== 'Identifier') {
      return null;
    }

    const runeName = callee.value;
    
    // Check if this is a Svelte rune
    if (runeName === '$state') {
      return this.analyzeStateRune(expr, id);
    } else if (runeName === '$derived') {
      return this.analyzeDerivedRune(expr, id);
    } else if (runeName === '$props') {
      return this.analyzePropsRune(expr, id);
    }

    return null;
  }

  /**
   * Analyze $state() rune call
   * @param callExpr - Call expression
   * @param id - Variable identifier
   * @returns RuneInfo for state rune
   */
  private analyzeStateRune(callExpr: swc.CallExpression, id: swc.Pattern): RuneInfo {
    const name = this.extractVariableName(id);
    const line = callExpr.span?.start ? this.getLineNumber(callExpr.span.start) : undefined;
    const column = callExpr.span?.start ? this.getColumnNumber(callExpr.span.start) : undefined;

    // Try to infer data type from initial value
    let dataType = 'unknown';
    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      if (arg.expression.type === 'NumericLiteral') {
        dataType = 'number';
      } else if (arg.expression.type === 'StringLiteral') {
        dataType = 'string';
      } else if (arg.expression.type === 'BooleanLiteral') {
        dataType = 'boolean';
      } else if (arg.expression.type === 'ArrayExpression') {
        dataType = 'array';
      } else if (arg.expression.type === 'ObjectExpression') {
        dataType = 'object';
      }
    }

    return {
      name,
      type: 'state',
      dataType,
      line,
      column,
    };
  }

  /**
   * Analyze $derived() rune call
   * @param callExpr - Call expression
   * @param id - Variable identifier
   * @returns RuneInfo for derived rune
   */
  private analyzeDerivedRune(callExpr: swc.CallExpression, id: swc.Pattern): RuneInfo {
    const name = this.extractVariableName(id);
    const line = callExpr.span?.start ? this.getLineNumber(callExpr.span.start) : undefined;
    const column = callExpr.span?.start ? this.getColumnNumber(callExpr.span.start) : undefined;

    // Extract dependencies from the derived expression
    const dependencies: string[] = [];
    if (callExpr.arguments.length > 0) {
      const arg = callExpr.arguments[0];
      this.extractIdentifiers(arg.expression, dependencies);
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
   * Analyze $props() rune call
   * @param callExpr - Call expression
   * @param id - Variable identifier
   * @returns RuneInfo for props rune
   */
  private analyzePropsRune(callExpr: swc.CallExpression, id: swc.Pattern): RuneInfo {
    const name = this.extractVariableName(id);
    const line = callExpr.span?.start ? this.getLineNumber(callExpr.span.start) : undefined;
    const column = callExpr.span?.start ? this.getColumnNumber(callExpr.span.start) : undefined;

    // Extract prop properties from destructuring pattern or type parameter
    const propsProperties: PropProperty[] = [];
    
    // Check if id is a destructuring pattern
    if (id.type === 'ObjectPattern') {
      for (const prop of id.properties) {
        if (prop.type === 'KeyValuePatternProperty') {
          const propName = prop.key.type === 'Identifier' ? prop.key.value : 'unknown';
          propsProperties.push({
            name: propName,
            dataType: 'unknown',
          });
        } else if (prop.type === 'AssignmentPatternProperty') {
          const propName = prop.key.type === 'Identifier' ? prop.key.value : 'unknown';
          propsProperties.push({
            name: propName,
            dataType: 'unknown',
          });
        }
      }
    }

    // TODO: Extract type information from TypeScript generic syntax
    // e.g., $props<{ userName: string; age?: number }>()

    return {
      name,
      type: 'props',
      dataType: 'object',
      line,
      column,
      propsProperties: propsProperties.length > 0 ? propsProperties : undefined,
    };
  }

  /**
   * Analyze $effect() expression statement
   * @param exprStmt - Expression statement
   * @returns RuneInfo for effect rune, or null if not an effect
   */
  private analyzeEffectExpression(exprStmt: swc.ExpressionStatement): RuneInfo | null {
    const expr = exprStmt.expression;
    
    if (expr.type !== 'CallExpression') {
      return null;
    }

    const callee = expr.callee;
    if (callee.type !== 'Identifier' || callee.value !== '$effect') {
      return null;
    }

    const line = expr.span?.start ? this.getLineNumber(expr.span.start) : undefined;
    const column = expr.span?.start ? this.getColumnNumber(expr.span.start) : undefined;

    // Extract dependencies from the effect callback
    const dependencies: string[] = [];
    if (expr.arguments.length > 0) {
      const arg = expr.arguments[0];
      if (arg.expression.type === 'ArrowFunctionExpression' || arg.expression.type === 'FunctionExpression') {
        const body = arg.expression.body;
        if (body && body.type === 'BlockStatement') {
          this.extractIdentifiersFromStatements(body.stmts, dependencies);
        } else if (body) {
          this.extractIdentifiers(body as swc.Expression, dependencies);
        }
      }
    }

    // Use counter for unique effect identification internally
    this.effectCounter++;
    
    return {
      name: `effect_${this.effectCounter}`,
      type: 'effect',
      line,
      column,
      dependencies,
    };
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
      return 'props'; // Default name for destructured props
    } else if (pattern.type === 'ArrayPattern') {
      return 'array';
    }
    return 'unknown';
  }

  /**
   * Extract identifiers from an expression
   * @param expr - Expression to analyze
   * @param identifiers - Array to collect identifiers
   */
  private extractIdentifiers(expr: swc.Expression, identifiers: string[]): void {
    if (expr.type === 'Identifier') {
      if (!identifiers.includes(expr.value)) {
        identifiers.push(expr.value);
      }
    } else if (expr.type === 'MemberExpression') {
      this.extractIdentifiers(expr.object as swc.Expression, identifiers);
    } else if (expr.type === 'BinaryExpression') {
      this.extractIdentifiers(expr.left, identifiers);
      this.extractIdentifiers(expr.right, identifiers);
    } else if (expr.type === 'CallExpression') {
      for (const arg of expr.arguments) {
        this.extractIdentifiers(arg.expression, identifiers);
      }
    } else if (expr.type === 'ArrayExpression') {
      for (const elem of expr.elements) {
        if (elem && elem.expression) {
          this.extractIdentifiers(elem.expression, identifiers);
        }
      }
    }
    // Add more expression types as needed
  }

  /**
   * Extract identifiers from statements
   * @param stmts - Statements to analyze
   * @param identifiers - Array to collect identifiers
   */
  private extractIdentifiersFromStatements(stmts: swc.Statement[], identifiers: string[]): void {
    for (const stmt of stmts) {
      if (stmt.type === 'ExpressionStatement') {
        this.extractIdentifiers(stmt.expression, identifiers);
      } else if (stmt.type === 'VariableDeclaration') {
        for (const decl of stmt.declarations) {
          if (decl.init) {
            this.extractIdentifiers(decl.init, identifiers);
          }
        }
      }
      // Add more statement types as needed
    }
  }

  /**
   * Get line number from byte position
   * @param pos - Byte position in source code
   * @returns Line number (1-indexed)
   */
  private getLineNumber(pos: number): number {
    for (let i = 0; i < this.lineStarts.length; i++) {
      if (pos < this.lineStarts[i]) {
        return i; // Return 1-indexed line number
      }
    }
    return this.lineStarts.length;
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
