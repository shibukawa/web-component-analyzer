/**
 * Svelte Markup Analyzer
 * 
 * Analyzes Svelte markup sections to extract data bindings and directives.
 * Supports:
 * - Expression bindings: {variable}
 * - bind: directives: bind:value, bind:checked, etc.
 * - on: directives: on:click, on:input, etc.
 * - class: directives: class:active={condition}
 * - style: directives: style:color={value}
 * - Control flow: {#if}, {#each}, {#await}
 */

export interface MarkupBinding {
  type: 'expression' | 'bind' | 'on' | 'class' | 'style';
  variable: string;
  target?: string;
  line?: number;
  column?: number;
}

export interface SvelteMarkupElement {
  tagName: string;
  bindings: MarkupBinding[];
  children: SvelteMarkupElement[];
  line?: number;
  column?: number;
}

export interface SvelteConditionalStructure {
  type: 'conditional';
  condition: string;
  variables: string[];
  element: SvelteMarkupElement;
  line?: number;
  column?: number;
}

export interface SvelteLoopStructure {
  type: 'loop';
  source: string;
  element: SvelteMarkupElement;
  line?: number;
  column?: number;
}

export interface SvelteAwaitStructure {
  type: 'await';
  promise: string;
  element: SvelteMarkupElement;
  line?: number;
  column?: number;
}

export class SvelteMarkupAnalyzer {
  /**
   * Parse Svelte markup and extract bindings
   * @param markup - Markup HTML string
   * @returns Array of markup bindings
   */
  analyzeMarkup(markup: string): MarkupBinding[] {
    const bindings: MarkupBinding[] = [];

    // Extract all types of bindings
    bindings.push(...this.extractExpressionBindings(markup));
    bindings.push(...this.extractBindDirectives(markup));
    bindings.push(...this.extractOnDirectives(markup));
    bindings.push(...this.extractClassStyleDirectives(markup));

    return bindings;
  }

  /**
   * Parse Svelte markup and extract conditional structures
   * @param markup - Markup HTML string
   * @returns Array of conditional structures
   */
  extractConditionalStructures(markup: string): SvelteConditionalStructure[] {
    const structures: SvelteConditionalStructure[] = [];
    
    // Match {#if condition}...{/if} blocks
    // Also handle {#if}...{:else if}...{:else}...{/if} chains
    const ifBlockRegex = /\{#if\s+([^}]+)\}(.*?)(?:\{:else\s*if\s+([^}]+)\}(.*?))*(?:\{:else\}(.*?))?\{\/if\}/gs;
    
    let match: RegExpExecArray | null;
    while ((match = ifBlockRegex.exec(markup)) !== null) {
      const condition = match[1].trim();
      const content = match[2];
      
      // Extract variables from condition
      const variables = this.extractVariablesFromExpression(condition);
      
      // Extract bindings from content
      const bindings = this.extractExpressionBindings(content);
      
      const line = this.getLineNumber(markup, match.index);
      
      structures.push({
        type: 'conditional',
        condition,
        variables,
        element: {
          tagName: 'conditional',
          bindings,
          children: [],
          line,
          column: match.index,
        },
        line,
        column: match.index,
      });
    }
    
    return structures;
  }

  /**
   * Parse Svelte markup and extract loop structures
   * @param markup - Markup HTML string
   * @returns Array of loop structures
   */
  extractLoopStructures(markup: string): SvelteLoopStructure[] {
    const structures: SvelteLoopStructure[] = [];
    
    // Match {#each items as item}...{/each} blocks
    // Patterns: {#each items as item}, {#each items as item, index}, {#each items as item (key)}
    const eachBlockRegex = /\{#each\s+([a-zA-Z0-9_.]+)\s+as\s+([^}]+)\}(.*?)\{\/each\}/gs;
    
    let match: RegExpExecArray | null;
    while ((match = eachBlockRegex.exec(markup)) !== null) {
      const source = match[1].trim();
      const content = match[3];
      
      // Extract bindings from content
      const bindings = this.extractExpressionBindings(content);
      
      const line = this.getLineNumber(markup, match.index);
      
      structures.push({
        type: 'loop',
        source,
        element: {
          tagName: 'loop',
          bindings,
          children: [],
          line,
          column: match.index,
        },
        line,
        column: match.index,
      });
    }
    
    return structures;
  }

  /**
   * Parse Svelte markup and extract await structures
   * @param markup - Markup HTML string
   * @returns Array of await structures
   */
  extractAwaitStructures(markup: string): SvelteAwaitStructure[] {
    const structures: SvelteAwaitStructure[] = [];
    
    // Match {#await promise}...{/await} blocks
    // Patterns: {#await promise then value}, {#await promise catch error}
    const awaitBlockRegex = /\{#await\s+([a-zA-Z0-9_.]+)(?:\s+then\s+[^}]+)?\}(.*?)\{\/await\}/gs;
    
    let match: RegExpExecArray | null;
    while ((match = awaitBlockRegex.exec(markup)) !== null) {
      const promise = match[1].trim();
      const content = match[2];
      
      // Extract bindings from content
      const bindings = this.extractExpressionBindings(content);
      
      const line = this.getLineNumber(markup, match.index);
      
      structures.push({
        type: 'await',
        promise,
        element: {
          tagName: 'await',
          bindings,
          children: [],
          line,
          column: match.index,
        },
        line,
        column: match.index,
      });
    }
    
    return structures;
  }

  /**
   * Check if a position in the markup is inside a control flow block
   * @param markup - Markup HTML string
   * @param position - Position to check
   * @returns True if the position is inside a control flow block
   */
  private isInsideControlFlowBlock(markup: string, position: number): boolean {
    // Check if position is inside {#if}...{/if}
    const ifBlockRegex = /\{#if\s+[^}]+\}(.*?)\{\/if\}/gs;
    let match: RegExpExecArray | null;
    
    while ((match = ifBlockRegex.exec(markup)) !== null) {
      const blockStart = match.index;
      const blockEnd = match.index + match[0].length;
      if (position > blockStart && position < blockEnd) {
        return true;
      }
    }
    
    // Check if position is inside {#each}...{/each}
    const eachBlockRegex = /\{#each\s+[^}]+\}(.*?)\{\/each\}/gs;
    
    while ((match = eachBlockRegex.exec(markup)) !== null) {
      const blockStart = match.index;
      const blockEnd = match.index + match[0].length;
      if (position > blockStart && position < blockEnd) {
        return true;
      }
    }
    
    // Check if position is inside {#await}...{/await}
    const awaitBlockRegex = /\{#await\s+[^}]+\}(.*?)\{\/await\}/gs;
    
    while ((match = awaitBlockRegex.exec(markup)) !== null) {
      const blockStart = match.index;
      const blockEnd = match.index + match[0].length;
      if (position > blockStart && position < blockEnd) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Extract expression bindings {variable}
   * Only extracts bindings from element text content, not from attributes
   */
  private extractExpressionBindings(markup: string): MarkupBinding[] {
    const bindings: MarkupBinding[] = [];
    
    // Find all {variable} expressions in the markup
    const expressionRegex = /\{(?![#/:])([^}]+?)\}/g;
    
    let match: RegExpExecArray | null;
    while ((match = expressionRegex.exec(markup)) !== null) {
      const expression = match[1].trim();
      const expressionPosition = match.index;
      
      // Extract variable name (handle simple expressions like count, user.name, etc.)
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        // Find the containing element by looking backwards from the expression position
        const tagName = this.findContainingElementTag(markup, expressionPosition);
        const line = this.getLineNumber(markup, expressionPosition);
        
        bindings.push({
          type: 'expression',
          variable,
          target: tagName,
          line,
          column: expressionPosition,
        });
      }
    }

    return bindings;
  }

  /**
   * Extract all HTML elements from markup with their tag names
   * Used for template subgraph wrapping
   */
  extractAllElements(markup: string): Array<{
    tagName: string;
    line?: number;
    column?: number;
  }> {
    const elements: Array<{
      tagName: string;
      line?: number;
      column?: number;
    }> = [];
    
    // Match all opening tags
    const elementRegex = /<([a-zA-Z0-9-]+)(?:\s|>)/g;
    
    let match: RegExpExecArray | null;
    while ((match = elementRegex.exec(markup)) !== null) {
      const tagName = match[1];
      const line = this.getLineNumber(markup, match.index);
      
      // Skip Svelte control flow tags
      if (!['if', 'each', 'await', 'key', 'svelte'].includes(tagName)) {
        elements.push({
          tagName,
          line,
          column: match.index,
        });
      }
    }
    
    return elements;
  }

  /**
   * Extract bind: directive bindings
   */
  private extractBindDirectives(markup: string): MarkupBinding[] {
    const bindings: MarkupBinding[] = [];
    
    // Match bind:attribute={variable} or bind:attribute
    const bindRegex = /bind:([a-zA-Z0-9]+)(?:=\{([^}]+)\})?/g;
    
    let match: RegExpExecArray | null;
    while ((match = bindRegex.exec(markup)) !== null) {
      const attribute = match[1];
      const expression = match[2]?.trim() || attribute;
      
      // Extract variable name from expression
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(markup, match.index);
        bindings.push({
          type: 'bind',
          variable,
          target: attribute,
          line,
          column: match.index,
        });
      }
    }

    return bindings;
  }

  /**
   * Extract on: directive bindings
   */
  private extractOnDirectives(markup: string): MarkupBinding[] {
    const bindings: MarkupBinding[] = [];
    
    // Match on:event={handler} or on:event
    const onRegex = /on:([a-zA-Z0-9]+)(?:=\{([^}]+)\})?/g;
    
    let match: RegExpExecArray | null;
    while ((match = onRegex.exec(markup)) !== null) {
      const event = match[1];
      const expression = match[2]?.trim();
      
      if (expression) {
        // Extract function name (could be function call like increment() or just increment)
        const variable = this.extractVariableName(expression);
        
        if (variable) {
          const line = this.getLineNumber(markup, match.index);
          bindings.push({
            type: 'on',
            variable,
            target: event,
            line,
            column: match.index,
          });
        }
      }
    }

    return bindings;
  }

  /**
   * Extract class: and style: directive bindings
   */
  private extractClassStyleDirectives(markup: string): MarkupBinding[] {
    const bindings: MarkupBinding[] = [];
    
    // Match class:name={condition} or style:property={value}
    const directiveRegex = /(class|style):([a-zA-Z0-9-]+)=\{([^}]+)\}/g;
    
    let match: RegExpExecArray | null;
    while ((match = directiveRegex.exec(markup)) !== null) {
      const directiveType = match[1] as 'class' | 'style';
      const name = match[2];
      const expression = match[3].trim();
      
      // Extract variable name from expression
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(markup, match.index);
        
        // Find the containing element tag
        const tagName = this.findContainingElement(markup, match.index);
        
        bindings.push({
          type: directiveType,
          variable,
          target: tagName,
          line,
          column: match.index,
        });
      }
    }

    return bindings;
  }

  /**
   * Extract elements with event handlers (on:click)
   * Returns information about the element and its event handler
   */
  extractElementsWithEventHandlers(markup: string): Array<{
    tagName: string;
    event: string;
    handler: string;
    line?: number;
    column?: number;
  }> {
    const elements: Array<{
      tagName: string;
      event: string;
      handler: string;
      line?: number;
      column?: number;
    }> = [];
    
    // First, find all elements
    const elementRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
    
    let elementMatch: RegExpExecArray | null;
    while ((elementMatch = elementRegex.exec(markup)) !== null) {
      const tagName = elementMatch[1];
      const attributes = elementMatch[2];
      const elementPosition = elementMatch.index;
      
      // Then, find all event handlers within this element's attributes
      const eventRegex = /on:([a-zA-Z0-9]+)=\{([^}]+)\}/g;
      
      let eventMatch: RegExpExecArray | null;
      while ((eventMatch = eventRegex.exec(attributes)) !== null) {
        const event = eventMatch[1];
        const expression = eventMatch[2].trim();
        
        // Extract function name
        const handler = this.extractVariableName(expression);
        
        if (handler) {
          const line = this.getLineNumber(markup, elementPosition);
          elements.push({
            tagName,
            event,
            handler,
            line,
            column: elementPosition,
          });
        }
      }
    }
    
    return elements;
  }

  /**
   * Extract elements with bind: attributes
   * Returns information about the element and its bound attributes
   */
  extractElementsWithBind(markup: string): Array<{
    tagName: string;
    attribute: string;
    variable: string;
    line?: number;
    column?: number;
  }> {
    const elements: Array<{
      tagName: string;
      attribute: string;
      variable: string;
      line?: number;
      column?: number;
    }> = [];
    
    // Match all elements
    const elementRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
    
    let match: RegExpExecArray | null;
    while ((match = elementRegex.exec(markup)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const elementIndex = match.index;
      
      // Find all bind: directives within this element's attributes
      const bindRegex = /bind:([a-zA-Z0-9]+)(?:=\{([^}]+)\})?/g;
      let bindMatch: RegExpExecArray | null;
      
      while ((bindMatch = bindRegex.exec(attributes)) !== null) {
        const attribute = bindMatch[1];
        const expression = bindMatch[2]?.trim() || attribute;
        
        // Extract variable name
        const variable = this.extractVariableName(expression);
        
        if (variable) {
          const line = this.getLineNumber(markup, elementIndex);
          elements.push({
            tagName,
            attribute,
            variable,
            line,
            column: elementIndex,
          });
        }
      }
    }
    
    return elements;
  }

  /**
   * Extract expression bindings within specific elements
   * Maps bindings to their containing elements for display dependency tracking
   */
  extractElementBindings(markup: string): Array<{
    tagName: string;
    bindings: string[];
    line?: number;
    column?: number;
  }> {
    const elementBindings: Array<{
      tagName: string;
      bindings: string[];
      line?: number;
      column?: number;
    }> = [];
    
    // Match all opening tags with their immediate content (not nested elements)
    // We'll extract bindings from each element separately
    const elementRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
    
    let match: RegExpExecArray | null;
    while ((match = elementRegex.exec(markup)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const startIndex = match.index;
      const endTagIndex = markup.indexOf(`</${tagName}>`, startIndex);
      
      if (endTagIndex === -1) {
        continue; // Self-closing or malformed tag
      }

      // Skip elements that are inside control flow blocks
      // They will be handled by the control flow structure extractors
      if (this.isInsideControlFlowBlock(markup, startIndex)) {
        continue;
      }
      
      // Extract content between opening and closing tags
      const contentStart = startIndex + match[0].length;
      const content = markup.substring(contentStart, endTagIndex);
      
      // Extract expression bindings from immediate content only (not from nested elements)
      const bindings: string[] = [];
      
      // Remove nested elements from content to only get immediate text content
      const immediateContent = content.replace(/<[^>]+>.*?<\/[^>]+>/gs, '');
      
      const expressionRegex = /\{(?![#/:])([^}]+?)\}/g;
      
      let expressionMatch: RegExpExecArray | null;
      while ((expressionMatch = expressionRegex.exec(immediateContent)) !== null) {
        const expression = expressionMatch[1].trim();
        const variable = this.extractVariableName(expression);
        
        if (variable && !bindings.includes(variable)) {
          bindings.push(variable);
        }
      }
      
      // Also extract bind: bindings from attributes
      const bindRegex = /bind:([a-zA-Z0-9]+)(?:=\{([^}]+)\})?/g;
      let bindMatch: RegExpExecArray | null;
      while ((bindMatch = bindRegex.exec(attributes)) !== null) {
        const expression = bindMatch[2]?.trim() || bindMatch[1];
        const variable = this.extractVariableName(expression);
        
        if (variable && !bindings.includes(variable)) {
          bindings.push(variable);
        }
      }
      
      // Extract class: and style: directive bindings from attributes
      const classStyleRegex = /(class|style):([a-zA-Z0-9-]+)=\{([^}]+)\}/g;
      let classStyleMatch: RegExpExecArray | null;
      while ((classStyleMatch = classStyleRegex.exec(attributes)) !== null) {
        const expression = classStyleMatch[3].trim();
        const variable = this.extractVariableName(expression);
        
        if (variable && !bindings.includes(variable)) {
          bindings.push(variable);
        }
      }
      
      // Note: We don't extract on: event handlers as bindings here
      // Event handlers are handled separately through svelteMarkupBindings
      
      if (bindings.length > 0) {
        const line = this.getLineNumber(markup, startIndex);
        elementBindings.push({
          tagName,
          bindings,
          line,
          column: startIndex,
        });
      }
    }
    
    return elementBindings;
  }

  /**
   * Find the containing HTML element for a given position in the markup
   */
  private findContainingElement(markup: string, position: number): string {
    // Look backwards from position to find the opening tag
    const beforePosition = markup.substring(0, position);
    
    // Find the last opening tag before this position
    const openTagRegex = /<(\w+)(?:\s|>)/g;
    let lastOpenTag = '';
    let match: RegExpExecArray | null;
    
    while ((match = openTagRegex.exec(beforePosition)) !== null) {
      lastOpenTag = match[1];
    }
    
    return lastOpenTag ? `<${lastOpenTag}>` : '<element>';
  }

  /**
   * Find the containing HTML element tag for a given position in the markup
   * Looks backwards to find the most recent opening tag
   */
  private findContainingElementTag(markup: string, position: number): string {
    // Look backwards from position to find the opening tag
    const beforePosition = markup.substring(0, position);
    
    // Find all opening tags before this position
    const openTagRegex = /<(\w+)(?:\s|>)/g;
    const openTags: Array<{ tag: string; position: number }> = [];
    let match: RegExpExecArray | null;
    
    while ((match = openTagRegex.exec(beforePosition)) !== null) {
      openTags.push({
        tag: match[1],
        position: match.index,
      });
    }
    
    // Find all closing tags before this position
    const closeTagRegex = /<\/(\w+)>/g;
    const closeTags: Array<{ tag: string; position: number }> = [];
    
    while ((match = closeTagRegex.exec(beforePosition)) !== null) {
      closeTags.push({
        tag: match[1],
        position: match.index,
      });
    }
    
    // Match opening and closing tags to find the innermost unclosed tag
    const stack: string[] = [];
    let allTags = [
      ...openTags.map(t => ({ ...t, type: 'open' as const })),
      ...closeTags.map(t => ({ ...t, type: 'close' as const })),
    ].sort((a, b) => a.position - b.position);
    
    for (const tag of allTags) {
      if (tag.type === 'open') {
        // Skip Svelte control flow tags
        if (!['if', 'each', 'await', 'key', 'svelte'].includes(tag.tag)) {
          stack.push(tag.tag);
        }
      } else if (tag.type === 'close') {
        // Pop the matching opening tag
        if (stack.length > 0 && stack[stack.length - 1] === tag.tag) {
          stack.pop();
        }
      }
    }
    
    // The last tag in the stack is the innermost containing element
    if (stack.length > 0) {
      return stack[stack.length - 1];
    }
    
    return 'element';
  }

  /**
   * Extract variable name from an expression
   * Handles simple cases like: variable, object.property, function()
   */
  private extractVariableName(expression: string): string | null {
    // Remove function call parentheses
    expression = expression.replace(/\([^)]*\)$/, '');
    
    // Extract the first identifier (variable name)
    const match = expression.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    return match ? match[1] : null;
  }

  /**
   * Extract all variable names from a complex expression
   * Used for conditional expressions that may reference multiple variables
   */
  private extractVariablesFromExpression(expression: string): string[] {
    const variables: string[] = [];
    
    // Match all identifiers in the expression
    const identifierRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
    
    let match: RegExpExecArray | null;
    while ((match = identifierRegex.exec(expression)) !== null) {
      const identifier = match[1];
      
      // Filter out JavaScript keywords and common operators
      const keywords = new Set([
        'true', 'false', 'null', 'undefined', 'this',
        'if', 'else', 'for', 'while', 'return', 'function',
        'const', 'let', 'var', 'new', 'typeof', 'instanceof',
      ]);
      
      if (!keywords.has(identifier) && !variables.includes(identifier)) {
        variables.push(identifier);
      }
    }
    
    return variables;
  }

  /**
   * Get line number for a given position in the markup
   */
  private getLineNumber(markup: string, position: number): number {
    const lines = markup.substring(0, position).split('\n');
    return lines.length;
  }
}
