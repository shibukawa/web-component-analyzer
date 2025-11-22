/**
 * Vue Template Analyzer
 * 
 * Analyzes Vue template sections to extract data bindings and directives.
 * Supports:
 * - Mustache bindings: {{ variable }}
 * - v-bind directives: v-bind:attr or :attr
 * - v-on directives: v-on:event or @event
 * - v-model directives: v-model="variable"
 * - Conditional rendering: v-if, v-else-if, v-else
 * - Loop rendering: v-for
 */

export interface TemplateBinding {
  type: 'mustache' | 'v-bind' | 'v-on' | 'v-model' | 'v-if' | 'v-for' | 'v-show';
  variable: string;
  target?: string;
  line?: number;
  column?: number;
}

export interface VueTemplateElement {
  tagName: string;
  vIf?: string;
  vElseIf?: string;
  vElse?: boolean;
  vFor?: string;
  bindings: TemplateBinding[];
  children: VueTemplateElement[];
  line?: number;
  column?: number;
}

export interface VueConditionalStructure {
  type: 'conditional';
  condition: string;
  variables: string[];
  element: VueTemplateElement;
  line?: number;
  column?: number;
}

export interface VueLoopStructure {
  type: 'loop';
  source: string;
  element: VueTemplateElement;
  line?: number;
  column?: number;
}

export class VueTemplateAnalyzer {
  /**
   * Line offset for template section in SFC file
   * Used to adjust line numbers from template-relative to file-relative
   */
  private templateLineOffset: number = 0;

  /**
   * Set the line offset for the template section
   * @param lineOffset - Starting line number of template in SFC file
   */
  setTemplateLineOffset(lineOffset: number): void {
    this.templateLineOffset = lineOffset;
  }

  /**
   * Parse Vue template and extract bindings
   * @param template - Template HTML string
   * @returns Array of template bindings
   */
  analyzeTemplate(template: string): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];

    // Extract all types of bindings
    bindings.push(...this.extractMustacheBindings(template));
    bindings.push(...this.extractVBindBindings(template));
    bindings.push(...this.extractVOnBindings(template));
    bindings.push(...this.extractVModelBindings(template));
    bindings.push(...this.extractConditionalBindings(template));

    return bindings;
  }

  /**
   * Parse Vue template and extract conditional structures
   * @param template - Template HTML string
   * @returns Array of conditional structures
   */
  extractConditionalStructures(template: string): VueConditionalStructure[] {
    const structures: VueConditionalStructure[] = [];
    
    // Match elements with v-if, v-else-if, or v-else directives
    // We need to track these to create linked chains
    const conditionalRegex = /<([a-zA-Z0-9-]+)([^>]*?\b(v-if|v-else-if|v-else)(?:=[\"']([^\"']+)[\"'])?[^>]*)>(.*?)<\/\1>/gs;
    
    let match: RegExpExecArray | null;
    const conditionalElements: Array<{
      tagName: string;
      directive: 'v-if' | 'v-else-if' | 'v-else';
      condition?: string;
      variables: string[];
      line: number;
      column: number;
      index: number;
      content: string;
      attributes: string;
    }> = [];
    
    // First pass: collect all conditional elements
    while ((match = conditionalRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const directive = match[3] as 'v-if' | 'v-else-if' | 'v-else';
      const condition = match[4]?.trim();
      const content = match[5];
      
      // Skip elements that also have v-for directive
      // These will be handled by extractLoopStructures as combined loop-conditional structures
      if (attributes.includes('v-for=')) {
        continue;
      }
      
      // Extract variables from condition (if present)
      const variables = condition ? this.extractVariablesFromExpression(condition) : [];
      
      const line = this.getLineNumber(template, match.index);
      
      conditionalElements.push({
        tagName,
        directive,
        condition,
        variables,
        line,
        column: match.index,
        index: match.index,
        content,
        attributes,
      });
    }
    
    // Second pass: group conditional chains (v-if followed by v-else-if/v-else)
    let i = 0;
    while (i < conditionalElements.length) {
      const element = conditionalElements[i];
      
      if (element.directive === 'v-if') {
        // Start a new conditional chain
        const chain: typeof conditionalElements = [element];
        
        // Look for following v-else-if and v-else elements
        let j = i + 1;
        while (j < conditionalElements.length) {
          const nextElement = conditionalElements[j];
          
          // Check if this is part of the same chain (v-else-if or v-else)
          if (nextElement.directive === 'v-else-if' || nextElement.directive === 'v-else') {
            // Check if there's only whitespace between elements (simple heuristic)
            const betweenText = template.substring(
              conditionalElements[j - 1].index,
              nextElement.index
            );
            
            // If there's a closing tag and minimal content, consider it part of the chain
            if (betweenText.includes('</')) {
              chain.push(nextElement);
              j++;
            } else {
              break;
            }
          } else {
            break;
          }
        }
        
        // Create a structure for the entire chain
        const allVariables = Array.from(
          new Set(chain.flatMap(el => el.variables))
        );
        
        // Create a simplified condition label
        // Extract the common part from the first condition (e.g., "status ===" from "status === 'loading'")
        let chainCondition = element.condition || 'condition';
        
        // Try to extract a simplified version (e.g., "status ===" from "status === 'loading'")
        const simplifiedMatch = chainCondition.match(/^([a-zA-Z0-9_.]+\s*[=!<>]+)/);
        if (simplifiedMatch) {
          chainCondition = simplifiedMatch[1].trim();
        }
        
        // Extract bindings from element content and attributes
        const bindings: TemplateBinding[] = [];
        
        // Extract mustache bindings from content
        // We need to find the actual position in the template, not just in the content
        // The content starts after the opening tag, so we need to find where that is
        const openingTagEnd = template.indexOf('>', element.index) + 1;
        
        const mustacheRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
        let mustacheMatch: RegExpExecArray | null;
        while ((mustacheMatch = mustacheRegex.exec(element.content)) !== null) {
          const expression = mustacheMatch[1].trim();
          const variable = this.extractVariableName(expression);
          
          if (variable) {
            // Calculate the actual position of this binding within the template
            const bindingPositionInTemplate = openingTagEnd + mustacheMatch.index;
            const bindingLine = this.getLineNumber(template, bindingPositionInTemplate);
            
            bindings.push({
              type: 'mustache',
              variable,
              line: bindingLine,
              column: bindingPositionInTemplate,
            });
          }
        }
        
        // Extract v-bind bindings from attributes
        const vBindRegex = /(?:v-bind:|\:)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
        let vBindMatch: RegExpExecArray | null;
        while ((vBindMatch = vBindRegex.exec(element.attributes)) !== null) {
          const attribute = vBindMatch[1];
          const expression = vBindMatch[2].trim();
          const variable = this.extractVariableName(expression);
          
          if (variable) {
            // For attributes, the position is within the opening tag
            const bindingPositionInTemplate = element.column + vBindMatch.index;
            const bindingLine = this.getLineNumber(template, bindingPositionInTemplate);
            
            bindings.push({
              type: 'v-bind',
              variable,
              target: attribute,
              line: bindingLine,
              column: bindingPositionInTemplate,
            });
          }
        }
        
        structures.push({
          type: 'conditional',
          condition: chainCondition,
          variables: allVariables,
          element: {
            tagName: element.tagName,
            vIf: element.condition,
            vElseIf: chain.find(el => el.directive === 'v-else-if')?.condition,
            vElse: chain.some(el => el.directive === 'v-else'),
            bindings: bindings,
            children: [],
            line: element.line,
            column: element.column,
          },
          line: element.line,
          column: element.column,
        });
        
        // Skip the elements we've processed
        i = j;
      } else {
        // Standalone v-else-if or v-else (shouldn't happen in valid Vue, but handle it)
        i++;
      }
    }
    
    return structures;
  }

  /**
   * Parse Vue template and extract loop structures
   * @param template - Template HTML string
   * @returns Array of loop structures
   */
  extractLoopStructures(template: string): VueLoopStructure[] {
    const structures: VueLoopStructure[] = [];
    
    // Match elements with v-for directive
    // Patterns: v-for="item in items", v-for="(item, index) in items", v-for="item of items"
    const vForRegex = /<([a-zA-Z0-9-]+)([^>]*?v-for=[\"']([^\"']+)[\"'][^>]*)>(.*?)<\/\1>/gs;
    
    let match: RegExpExecArray | null;
    while ((match = vForRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const forExpression = match[3].trim();
      const content = match[4];
      
      // Extract the source array from various v-for patterns
      // Patterns: "item in items", "(item, index) in items", "item of items"
      const inOfMatch = forExpression.match(/\s+(?:in|of)\s+([a-zA-Z0-9_.]+)/);
      
      if (inOfMatch) {
        const source = inOfMatch[1];
        const line = this.getLineNumber(template, match.index);
        
        // Extract loop variable(s) - e.g., "item" from "item in items" or "(item, index)" from "(item, index) in items"
        const loopVarMatch = forExpression.match(/^(\([^)]+\)|[a-zA-Z0-9_]+)\s+(?:in|of)/);
        const loopVariable = loopVarMatch ? loopVarMatch[1].replace(/[()]/g, '').split(',')[0].trim() : undefined;
        
        // Check if this element also has a v-if directive (combined v-for and v-if)
        const vIfMatch = attributes.match(/v-if=["']([^"']+)["']/);
        const vIfCondition = vIfMatch ? vIfMatch[1].trim() : undefined;
        
        // Extract bindings from element content and attributes
        const bindings: TemplateBinding[] = [];
        
        // Extract mustache bindings from content
        // We need to find the actual position in the template, not just in the content
        const openingTagEnd = template.indexOf('>', match.index) + 1;
        
        const mustacheRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
        let mustacheMatch: RegExpExecArray | null;
        while ((mustacheMatch = mustacheRegex.exec(content)) !== null) {
          const expression = mustacheMatch[1].trim();
          const variable = this.extractVariableName(expression);
          
          if (variable) {
            // Calculate the actual position of this binding within the template
            const bindingPositionInTemplate = openingTagEnd + mustacheMatch.index;
            const bindingLine = this.getLineNumber(template, bindingPositionInTemplate);
            
            bindings.push({
              type: 'mustache',
              variable,
              line: bindingLine,
              column: bindingPositionInTemplate,
            });
          }
        }
        
        // Extract v-bind bindings from attributes
        const vBindRegex = /(?:v-bind:|\:)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
        let vBindMatch: RegExpExecArray | null;
        while ((vBindMatch = vBindRegex.exec(attributes)) !== null) {
          const attribute = vBindMatch[1];
          const expression = vBindMatch[2].trim();
          const variable = this.extractVariableName(expression);
          
          if (variable) {
            // For attributes, the position is within the opening tag
            const bindingPositionInTemplate = match.index + vBindMatch.index;
            const bindingLine = this.getLineNumber(template, bindingPositionInTemplate);
            
            bindings.push({
              type: 'v-bind',
              variable,
              target: attribute,
              line: bindingLine,
              column: bindingPositionInTemplate,
            });
          }
        }
        
        structures.push({
          type: 'loop',
          source,
          element: {
            tagName,
            vFor: forExpression,
            vIf: vIfCondition, // Store v-if condition if present
            bindings: bindings,
            children: [],
            line,
            column: match.index,
          },
          line,
          column: match.index,
        });
      }
    }
    
    return structures;
  }

  /**
   * Extract mustache bindings {{ variable }}
   */
  private extractMustacheBindings(template: string): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];
    const mustacheRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
    
    let match: RegExpExecArray | null;
    while ((match = mustacheRegex.exec(template)) !== null) {
      const fullMatch = match[0];
      const expression = match[1].trim();
      
      // Extract variable name (handle simple expressions like count, user.name, etc.)
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(template, match.index);
        
        // Try to find the containing element tag
        const target = this.findContainingElement(template, match.index);
        
        bindings.push({
          type: 'mustache',
          variable,
          target,
          line,
          column: match.index,
        });
      }
    }

    return bindings;
  }

  /**
   * Find the containing HTML element for a given position in the template
   */
  private findContainingElement(template: string, position: number): string {
    // Look backwards from position to find the opening tag
    const beforePosition = template.substring(0, position);
    
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
   * Extract v-bind or : bindings
   */
  private extractVBindBindings(template: string): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];
    
    // Match both v-bind:attr="value" and :attr="value"
    const vBindRegex = /(?:v-bind:|\:)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
    
    let match: RegExpExecArray | null;
    while ((match = vBindRegex.exec(template)) !== null) {
      const attribute = match[1];
      const expression = match[2].trim();
      
      // Skip :key bindings - they're not visual elements, just Vue keys for reconciliation
      if (attribute === 'key') {
        continue;
      }
      
      // Extract variable name from expression
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(template, match.index);
        bindings.push({
          type: 'v-bind',
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
   * Extract v-on or @ bindings
   */
  private extractVOnBindings(template: string): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];
    
    // Match both v-on:event="handler" and @event="handler"
    const vOnRegex = /(?:v-on:|\@)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
    
    let match: RegExpExecArray | null;
    while ((match = vOnRegex.exec(template)) !== null) {
      const event = match[1];
      const expression = match[2].trim();
      
      // Extract function name (could be function call like increment() or just increment)
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(template, match.index);
        bindings.push({
          type: 'v-on',
          variable,
          target: event,
          line,
          column: match.index,
        });
      }
    }

    return bindings;
  }

  /**
   * Extract elements with event handlers (v-on/@click)
   * Returns information about the element and its event handler
   */
  extractElementsWithEventHandlers(template: string): Array<{
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
    while ((elementMatch = elementRegex.exec(template)) !== null) {
      const tagName = elementMatch[1];
      const attributes = elementMatch[2];
      const elementPosition = elementMatch.index;
      
      // Then, find all event handlers within this element's attributes
      const eventRegex = /(?:v-on:|\@)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
      
      let eventMatch: RegExpExecArray | null;
      while ((eventMatch = eventRegex.exec(attributes)) !== null) {
        const event = eventMatch[1];
        const expression = eventMatch[2].trim();
        
        // Extract function name
        const handler = this.extractVariableName(expression);
        
        if (handler) {
          const line = this.getLineNumber(template, elementPosition);
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
   * Extract elements with v-bind attributes
   * Returns information about the element and its bound attributes
   */
  extractElementsWithVBind(template: string): Array<{
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
    while ((match = elementRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const elementIndex = match.index;
      
      // Find all v-bind or : directives within this element's attributes
      const vBindRegex = /(?:v-bind:|:)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
      let bindMatch: RegExpExecArray | null;
      
      while ((bindMatch = vBindRegex.exec(attributes)) !== null) {
        const attribute = bindMatch[1];
        const expression = bindMatch[2].trim();
        
        // Skip :key bindings - they're not visual elements, just React/Vue keys for reconciliation
        if (attribute === 'key') {
          continue;
        }
        
        // Extract variable name
        const variable = this.extractVariableName(expression);
        
        if (variable) {
          const line = this.getLineNumber(template, elementIndex);
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
   * Extract elements with v-model directive
   * Returns information about the element and its bound variable
   */
  extractElementsWithVModel(template: string): Array<{
    tagName: string;
    variable: string;
    line?: number;
    column?: number;
  }> {
    const elements: Array<{
      tagName: string;
      variable: string;
      line?: number;
      column?: number;
    }> = [];
    
    // Match elements with v-model directive
    // Pattern: <tagName ...v-model="variable"...>
    const elementWithVModelRegex = /<([a-zA-Z0-9-]+)([^>]*?v-model(?:\.[a-zA-Z]+)?=["']([^"']+)["'][^>]*)>/g;
    
    let match: RegExpExecArray | null;
    while ((match = elementWithVModelRegex.exec(template)) !== null) {
      const tagName = match[1];
      const expression = match[3].trim();
      
      // Extract variable name
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(template, match.index);
        elements.push({
          tagName,
          variable,
          line,
          column: match.index,
        });
      }
    }
    
    return elements;
  }

  /**
   * Extract elements with v-show directive
   * Returns information about the element and its condition
   */
  extractElementsWithVShow(template: string): Array<{
    tagName: string;
    condition: string;
    variables: string[];
    line?: number;
    column?: number;
  }> {
    const elements: Array<{
      tagName: string;
      condition: string;
      variables: string[];
      line?: number;
      column?: number;
    }> = [];
    
    // Match elements with v-show directive
    // Pattern: <tagName ...v-show="condition"...>
    const elementWithVShowRegex = /<([a-zA-Z0-9-]+)([^>]*?v-show=["']([^"']+)["'][^>]*)>/g;
    
    let match: RegExpExecArray | null;
    while ((match = elementWithVShowRegex.exec(template)) !== null) {
      const tagName = match[1];
      const condition = match[3].trim();
      
      // Extract variables from condition
      const variables = this.extractVariablesFromExpression(condition);
      
      if (variables.length > 0) {
        const line = this.getLineNumber(template, match.index);
        elements.push({
          tagName,
          condition,
          variables,
          line,
          column: match.index,
        });
      }
    }
    
    return elements;
  }

  /**
   * Extract mustache bindings within specific elements
   * Maps bindings to their containing elements for display dependency tracking
   */
  extractElementBindings(template: string): Array<{
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
    
    // Match elements and their content
    // Pattern: <tagName ...>content</tagName>
    const elementRegex = /<([a-zA-Z0-9-]+)([^>]*)>(.*?)<\/\1>/gs;
    
    let match: RegExpExecArray | null;
    while ((match = elementRegex.exec(template)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const content = match[3];
      
      // Extract mustache bindings from content
      const bindings: string[] = [];
      const mustacheRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
      
      let mustacheMatch: RegExpExecArray | null;
      while ((mustacheMatch = mustacheRegex.exec(content)) !== null) {
        const expression = mustacheMatch[1].trim();
        const variable = this.extractVariableName(expression);
        
        if (variable && !bindings.includes(variable)) {
          bindings.push(variable);
        }
      }
      
      // Also extract v-bind bindings from attributes
      const vBindRegex = /(?:v-bind:|\:)([a-zA-Z0-9-]+)=["']([^"']+)["']/g;
      let vBindMatch: RegExpExecArray | null;
      while ((vBindMatch = vBindRegex.exec(attributes)) !== null) {
        const expression = vBindMatch[2].trim();
        const variable = this.extractVariableName(expression);
        
        if (variable && !bindings.includes(variable)) {
          bindings.push(variable);
        }
      }
      
      if (bindings.length > 0) {
        const line = this.getLineNumber(template, match.index);
        elementBindings.push({
          tagName,
          bindings,
          line,
          column: match.index,
        });
      }
    }
    
    return elementBindings;
  }

  /**
   * Extract v-model bindings
   */
  private extractVModelBindings(template: string): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];
    
    // Match v-model="variable"
    const vModelRegex = /v-model(?:\.[a-zA-Z]+)?=["']([^"']+)["']/g;
    
    let match: RegExpExecArray | null;
    while ((match = vModelRegex.exec(template)) !== null) {
      const expression = match[1].trim();
      
      // Extract variable name
      const variable = this.extractVariableName(expression);
      
      if (variable) {
        const line = this.getLineNumber(template, match.index);
        bindings.push({
          type: 'v-model',
          variable,
          line,
          column: match.index,
        });
      }
    }

    return bindings;
  }

  /**
   * Extract conditional bindings (v-if, v-for, v-show)
   */
  private extractConditionalBindings(template: string): TemplateBinding[] {
    const bindings: TemplateBinding[] = [];
    
    // Match v-if, v-else-if, v-show
    const conditionalRegex = /v-(if|else-if|show)=["']([^"']+)["']/g;
    
    let match: RegExpExecArray | null;
    while ((match = conditionalRegex.exec(template)) !== null) {
      const directive = match[1];
      const expression = match[2].trim();
      
      // Extract variable names from expression
      const variables = this.extractVariablesFromExpression(expression);
      
      for (const variable of variables) {
        const line = this.getLineNumber(template, match.index);
        bindings.push({
          type: directive === 'show' ? 'v-show' : 'v-if',
          variable,
          line,
          column: match.index,
        });
      }
    }

    // Match v-for
    const vForRegex = /v-for=["']([^"']+)["']/g;
    
    while ((match = vForRegex.exec(template)) !== null) {
      const expression = match[1].trim();
      
      // Extract the source array from "item in items" or "(item, index) in items"
      const inMatch = expression.match(/\s+in\s+([a-zA-Z0-9_.]+)/);
      if (inMatch) {
        const variable = inMatch[1];
        const line = this.getLineNumber(template, match.index);
        bindings.push({
          type: 'v-for',
          variable,
          line,
          column: match.index,
        });
      }
    }

    return bindings;
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
   * Get line number for a given position in the template
   */
  /**
   * Calculate the file-relative line number for a position within the template string
   * 
   * The template string is trimmed, so it doesn't include leading whitespace from the SFC file.
   * However, the templateLineOffset is set to the line number of the first character of the
   * trimmed template in the original SFC file.
   * 
   * Example:
   * - SFC file line 10: <template>
   * - SFC file line 11:   <div>
   * - Template string: "<div>..."
   * - Position of <div> in template: 0
   * - lines.length = 1 (because template.substring(0, 0).split('\n') = [''])
   * - templateLineOffset = 11 (the line where <div> appears in the SFC file)
   * - fileLineNumber = 1 + 11 - 1 = 11 ✓ Correct!
   * 
   * @param template - The template string (trimmed)
   * @param position - The position within the template string
   * @returns The file-relative line number (1-based)
   */
  private getLineNumber(template: string, position: number): number {
    const lines = template.substring(0, position).split('\n');
    // lines.length gives us the number of lines up to position (1-based)
    // templateLineOffset is the line where the template tag's > is (1-based)
    // The actual template content starts on the next line
    // So: lines.length + templateLineOffset
    return lines.length + this.templateLineOffset;
  }
}
