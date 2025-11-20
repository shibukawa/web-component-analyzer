/**
 * Vue Single File Component (SFC) Parser
 * 
 * Extracts script setup and template sections from Vue SFC files.
 * Handles TypeScript and JavaScript variants with line/column tracking.
 */

import type { ParseError } from './types';

/**
 * Represents a section of a Vue SFC file
 */
export interface VueSFCSection {
  content: string;
  lang?: string;
  line: number;
  column: number;
}

/**
 * Parsed Vue SFC structure
 */
export interface ParsedVueSFC {
  script?: VueSFCSection;
  template?: VueSFCSection;
  styles?: VueSFCSection[];
}

/**
 * Vue SFC parsing error
 */
export class VueSFCParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'VueSFCParseError';
  }
}

/**
 * Vue SFC Parser
 * 
 * Parses Vue Single File Components and extracts sections.
 * Supports script setup syntax with TypeScript and JavaScript.
 */
export class VueSFCParser {
  /**
   * Parse a Vue SFC file and extract sections
   * @param source - Vue SFC source code
   * @returns Parsed sections
   * @throws VueSFCParseError if parsing fails
   */
  parse(source: string): ParsedVueSFC {
    const result: ParsedVueSFC = {};

    try {
      // Validate basic structure first
      if (!source || source.trim().length === 0) {
        throw new VueSFCParseError('Empty Vue SFC file');
      }

      // Extract script setup section
      const script = this.extractScriptSetup(source);
      if (script) {
        result.script = script;
      }

      // Extract template section
      const template = this.extractTemplate(source);
      if (template) {
        result.template = template;
      }

      // Extract style sections (optional, for completeness)
      const styles = this.extractStyles(source);
      if (styles.length > 0) {
        result.styles = styles;
      }

      return result;
    } catch (error) {
      if (error instanceof VueSFCParseError) {
        throw error;
      }
      throw new VueSFCParseError(
        `Failed to parse Vue SFC: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract script setup content from Vue SFC
   * @param source - Vue SFC source code
   * @returns Script section or null if not found
   */
  private extractScriptSetup(source: string): VueSFCSection | null {
    try {
      // Match <script setup> with optional lang attribute
      // Supports: <script setup>, <script setup lang="ts">, <script setup lang="js">
      const scriptRegex = /<script\s+setup(?:\s+lang=["']?(ts|js|typescript|javascript)["']?)?\s*>([\s\S]*?)<\/script>/i;
      const match = source.match(scriptRegex);

      if (!match) {
        // Try without setup attribute (fallback to regular script)
        const regularScriptRegex = /<script(?:\s+lang=["']?(ts|js|typescript|javascript)["']?)?\s*>([\s\S]*?)<\/script>/i;
        const regularMatch = source.match(regularScriptRegex);
        
        if (!regularMatch) {
          return null;
        }

        // Found regular script, but we prefer script setup
        // Return null to indicate no script setup found
        return null;
      }

      const lang = match[1] || 'js';
      const content = match[2];
      const matchIndex = match.index || 0;

      // Calculate line and column of the script content start
      const { line, column } = this.getLineColumn(source, matchIndex + match[0].indexOf('>') + 1);

      return {
        content: content.trim(),
        lang: this.normalizeLang(lang),
        line,
        column,
      };
    } catch (error) {
      throw new VueSFCParseError(
        `Failed to extract script setup: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract template content from Vue SFC
   * @param source - Vue SFC source code
   * @returns Template section or null if not found
   */
  private extractTemplate(source: string): VueSFCSection | null {
    try {
      // Match <template> tag
      const templateRegex = /<template(?:\s+[^>]*)?\s*>([\s\S]*?)<\/template>/i;
      const match = source.match(templateRegex);

      if (!match) {
        return null;
      }

      const content = match[1];
      const matchIndex = match.index || 0;

      // Calculate line and column of the template content start
      const { line, column } = this.getLineColumn(source, matchIndex + match[0].indexOf('>') + 1);

      return {
        content: content.trim(),
        line,
        column,
      };
    } catch (error) {
      throw new VueSFCParseError(
        `Failed to extract template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract style sections from Vue SFC
   * @param source - Vue SFC source code
   * @returns Array of style sections
   */
  private extractStyles(source: string): VueSFCSection[] {
    const styles: VueSFCSection[] = [];
    
    // Match all <style> tags
    const styleRegex = /<style(?:\s+[^>]*)?\s*>([\s\S]*?)<\/style>/gi;
    let match: RegExpExecArray | null;

    while ((match = styleRegex.exec(source)) !== null) {
      const content = match[1];
      const matchIndex = match.index;

      // Calculate line and column of the style content start
      const { line, column } = this.getLineColumn(source, matchIndex + match[0].indexOf('>') + 1);

      styles.push({
        content: content.trim(),
        line,
        column,
      });
    }

    return styles;
  }

  /**
   * Calculate line and column number from string index
   * @param source - Source code
   * @param index - Character index
   * @returns Line and column numbers (1-based)
   */
  private getLineColumn(source: string, index: number): { line: number; column: number } {
    const lines = source.substring(0, index).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    return { line, column };
  }

  /**
   * Normalize language attribute to standard format
   * @param lang - Language attribute value
   * @returns Normalized language ('ts' or 'js')
   */
  private normalizeLang(lang: string): string {
    const normalized = lang.toLowerCase();
    
    if (normalized === 'typescript' || normalized === 'ts') {
      return 'ts';
    }
    
    if (normalized === 'javascript' || normalized === 'js') {
      return 'js';
    }

    // Default to JavaScript for unknown languages
    return 'js';
  }

  /**
   * Validate Vue SFC structure
   * @param source - Vue SFC source code
   * @returns Array of validation errors
   */
  validateStructure(source: string): ParseError[] {
    const errors: ParseError[] = [];

    // Check for script setup section
    if (!source.includes('<script setup')) {
      errors.push({
        message: 'No <script setup> section found. Vue 3 script setup syntax is required.',
      });
    }

    // Check for template section
    if (!source.includes('<template>')) {
      errors.push({
        message: 'No <template> section found. Vue components require a template.',
      });
    }

    // Check for malformed tags
    const scriptOpenCount = (source.match(/<script/gi) || []).length;
    const scriptCloseCount = (source.match(/<\/script>/gi) || []).length;
    
    if (scriptOpenCount !== scriptCloseCount) {
      errors.push({
        message: 'Malformed <script> tags. Opening and closing tags do not match.',
      });
    }

    const templateOpenCount = (source.match(/<template/gi) || []).length;
    const templateCloseCount = (source.match(/<\/template>/gi) || []).length;
    
    if (templateOpenCount !== templateCloseCount) {
      errors.push({
        message: 'Malformed <template> tags. Opening and closing tags do not match.',
      });
    }

    return errors;
  }

  /**
   * Create a ParseError from a VueSFCParseError
   * @param error - The error to convert
   * @returns ParseError object
   */
  static createParseError(error: unknown): ParseError {
    if (error instanceof VueSFCParseError) {
      return {
        message: error.message,
        line: error.line,
        column: error.column,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
      };
    }

    return {
      message: String(error),
    };
  }
}
