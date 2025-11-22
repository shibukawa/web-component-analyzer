/**
 * Shared Single File Component (SFC) Parser
 * 
 * Framework-agnostic SFC parser that extracts script, template/markup, and style sections.
 * Used by both Vue and Svelte parsers to maximize code reuse.
 */

import type { ParseError } from './types';

/**
 * Represents a section of an SFC file
 */
export interface SFCSection {
  content: string;
  lang?: string;
  line: number;
  column: number;
}

/**
 * Parsed SFC structure
 */
export interface ParsedSFC {
  script?: SFCSection;
  template?: SFCSection;
  styles?: SFCSection[];
}

/**
 * Options for SFC parsing
 */
export interface SFCParserOptions {
  /**
   * Script tag name to look for
   * @default 'script'
   * @example 'script setup' for Vue, 'script' for Svelte
   */
  scriptTag?: string;
  
  /**
   * Template tag name to look for
   * @default 'template'
   * @example 'template' for Vue, 'markup' for Svelte (not used in Svelte 5)
   */
  templateTag?: string;
  
  /**
   * Whether to require the 'setup' attribute on script tags
   * @default false
   */
  requireSetup?: boolean;
  
  /**
   * Whether to extract style sections
   * @default true
   */
  extractStyles?: boolean;
  
  /**
   * Whether to extract markup without template tags (Svelte structure)
   * When true, extracts all content after the script section as markup
   * @default false
   */
  extractMarkupWithoutTag?: boolean;
}

/**
 * SFC parsing error
 */
export class SFCParseError extends Error {
  constructor(
    message: string,
    public line?: number,
    public column?: number
  ) {
    super(message);
    this.name = 'SFCParseError';
  }
}

/**
 * Shared SFC Parser
 * 
 * Parses Single File Components and extracts sections.
 * Framework-agnostic implementation used by Vue and Svelte parsers.
 */
export class SFCParser {
  /**
   * Parse an SFC file and extract sections
   * @param source - SFC source code
   * @param options - Parser options for framework-specific behavior
   * @returns Parsed sections
   * @throws SFCParseError if parsing fails
   */
  parse(source: string, options: SFCParserOptions = {}): ParsedSFC {
    const result: ParsedSFC = {};

    try {
      // Validate basic structure first
      if (!source || source.trim().length === 0) {
        throw new SFCParseError('Empty SFC file');
      }

      const {
        scriptTag = 'script',
        templateTag = 'template',
        requireSetup = false,
        extractStyles = true,
        extractMarkupWithoutTag = false,
      } = options;

      // Extract script section
      const script = this.extractScript(source, scriptTag, requireSetup);
      if (script) {
        result.script = script;
      }

      // Extract template section
      if (extractMarkupWithoutTag) {
        // For Svelte: extract markup after script section without template tags
        const template = this.extractMarkupAfterScript(source);
        if (template) {
          result.template = template;
        }
      } else {
        // For Vue: extract template with template tags
        const template = this.extractTemplate(source, templateTag);
        if (template) {
          result.template = template;
        }
      }

      // Extract style sections (optional)
      if (extractStyles) {
        const styles = this.extractStyles(source);
        if (styles.length > 0) {
          result.styles = styles;
        }
      }

      return result;
    } catch (error) {
      if (error instanceof SFCParseError) {
        throw error;
      }
      throw new SFCParseError(
        `Failed to parse SFC: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract script content from SFC
   * @param source - SFC source code
   * @param scriptTag - Script tag name (e.g., 'script', 'script setup')
   * @param requireSetup - Whether to require 'setup' attribute
   * @returns Script section or null if not found
   */
  private extractScript(
    source: string,
    scriptTag: string,
    requireSetup: boolean
  ): SFCSection | null {
    try {
      // Handle 'script setup' as a special case
      if (scriptTag === 'script setup' || requireSetup) {
        return this.extractScriptSetup(source);
      }

      // Match regular <script> with optional lang attribute
      const scriptRegex = /<script(?:\s+lang=["']?(ts|js|typescript|javascript)["']?)?\s*>([\s\S]*?)<\/script>/i;
      const match = source.match(scriptRegex);

      if (!match) {
        return null;
      }

      const lang = match[1] || 'js';
      const content = match[2];
      const matchIndex = match.index || 0;
      const trimmedContent = content.trim();

      // Calculate line and column of the FIRST CHARACTER of the trimmed content
      // We need to find where the trimmed content starts in the original source
      const trimStartOffset = content.indexOf(trimmedContent);
      const scriptStartIndex = matchIndex + match[0].indexOf('>') + 1 + trimStartOffset;
      const { line, column } = this.getLineColumn(source, scriptStartIndex);

      return {
        content: trimmedContent,
        lang: this.normalizeLang(lang),
        line,
        column,
      };
    } catch (error) {
      throw new SFCParseError(
        `Failed to extract script: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract script setup content (Vue-specific)
   * @param source - SFC source code
   * @returns Script section or null if not found
   */
  private extractScriptSetup(source: string): SFCSection | null {
    try {
      // Match <script setup> with optional lang attribute
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
        return null;
      }

      const lang = match[1] || 'js';
      const content = match[2];
      const matchIndex = match.index || 0;
      const trimmedContent = content.trim();

      // Calculate line and column of the FIRST CHARACTER of the trimmed content
      // We need to find where the trimmed content starts in the original source
      const trimStartOffset = content.indexOf(trimmedContent);
      const scriptStartIndex = matchIndex + match[0].indexOf('>') + 1 + trimStartOffset;
      const { line, column } = this.getLineColumn(source, scriptStartIndex);

      return {
        content: trimmedContent,
        lang: this.normalizeLang(lang),
        line,
        column,
      };
    } catch (error) {
      throw new SFCParseError(
        `Failed to extract script setup: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract template content from SFC
   * @param source - SFC source code
   * @param templateTag - Template tag name (e.g., 'template', 'markup')
   * @returns Template section or null if not found
   */
  private extractTemplate(source: string, templateTag: string): SFCSection | null {
    try {
      // Match template tag
      const templateRegex = new RegExp(
        `<${templateTag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${templateTag}>`,
        'i'
      );
      const match = source.match(templateRegex);

      if (!match) {
        return null;
      }

      const content = match[1];
      const matchIndex = match.index || 0;
      const trimmedContent = content.trim();

      // Calculate line and column of the FIRST CHARACTER of the trimmed template content
      // We need to find where the trimmed content starts in the original source
      const trimStartOffset = content.indexOf(trimmedContent);
      const templateStartIndex = matchIndex + match[0].indexOf('>') + 1 + trimStartOffset;
      const { line, column } = this.getLineColumn(source, templateStartIndex);

      return {
        content: trimmedContent,
        line,
        column,
      };
    } catch (error) {
      throw new SFCParseError(
        `Failed to extract template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract markup content after script section (Svelte structure)
   * 
   * In Svelte, markup is not wrapped in a <template> tag but appears directly
   * after the <script> section. This method extracts all content between the
   * closing </script> tag and the first <style> tag (or end of file).
   * 
   * @param source - SFC source code
   * @returns Markup section or null if not found
   */
  private extractMarkupAfterScript(source: string): SFCSection | null {
    try {
      // Find the closing </script> tag
      const scriptCloseRegex = /<\/script>/i;
      const scriptCloseMatch = scriptCloseRegex.exec(source);

      if (!scriptCloseMatch) {
        // No script section, no markup to extract
        return null;
      }

      const scriptCloseIndex = scriptCloseMatch.index + scriptCloseMatch[0].length;

      // Find the first <style> tag (if any)
      const styleOpenRegex = /<style(?:\s+[^>]*)?\s*>/i;
      const styleOpenMatch = styleOpenRegex.exec(source.substring(scriptCloseIndex));

      let markupEndIndex: number;
      if (styleOpenMatch) {
        // Markup ends where the first <style> tag begins
        markupEndIndex = scriptCloseIndex + styleOpenMatch.index;
      } else {
        // No style section, markup goes to end of file
        markupEndIndex = source.length;
      }

      // Extract markup content
      const markupContent = source.substring(scriptCloseIndex, markupEndIndex);
      const trimmedContent = markupContent.trim();

      if (!trimmedContent) {
        // No markup content found
        return null;
      }

      // Calculate line and column of the FIRST CHARACTER of the trimmed markup content
      // We need to find where the trimmed content starts in the original source
      const trimStartOffset = markupContent.indexOf(trimmedContent);
      const markupStartIndex = scriptCloseIndex + trimStartOffset;
      const { line, column } = this.getLineColumn(source, markupStartIndex);

      return {
        content: trimmedContent,
        line,
        column,
      };
    } catch (error) {
      throw new SFCParseError(
        `Failed to extract markup after script: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract style sections from SFC
   * @param source - SFC source code
   * @returns Array of style sections
   */
  private extractStyles(source: string): SFCSection[] {
    const styles: SFCSection[] = [];
    
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
   * Validate SFC structure
   * @param source - SFC source code
   * @param options - Parser options
   * @returns Array of validation errors
   */
  validateStructure(source: string, options: SFCParserOptions = {}): ParseError[] {
    const errors: ParseError[] = [];
    const { scriptTag = 'script', templateTag = 'template', requireSetup = false } = options;

    // Check for script section
    const scriptPattern = requireSetup ? '<script setup' : '<script';
    if (!source.includes(scriptPattern)) {
      errors.push({
        message: `No <${scriptTag}> section found.`,
      });
    }

    // Check for template section
    if (!source.includes(`<${templateTag}>`)) {
      errors.push({
        message: `No <${templateTag}> section found.`,
      });
    }

    // Check for malformed script tags
    const scriptOpenCount = (source.match(/<script/gi) || []).length;
    const scriptCloseCount = (source.match(/<\/script>/gi) || []).length;
    
    if (scriptOpenCount !== scriptCloseCount) {
      errors.push({
        message: 'Malformed <script> tags. Opening and closing tags do not match.',
      });
    }

    // Check for malformed template tags
    const templatePattern = new RegExp(`<${templateTag}`, 'gi');
    const templateClosePattern = new RegExp(`<\\/${templateTag}>`, 'gi');
    const templateOpenCount = (source.match(templatePattern) || []).length;
    const templateCloseCount = (source.match(templateClosePattern) || []).length;
    
    if (templateOpenCount !== templateCloseCount) {
      errors.push({
        message: `Malformed <${templateTag}> tags. Opening and closing tags do not match.`,
      });
    }

    return errors;
  }

  /**
   * Create a ParseError from an SFCParseError
   * @param error - The error to convert
   * @returns ParseError object
   */
  static createParseError(error: unknown): ParseError {
    if (error instanceof SFCParseError) {
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
