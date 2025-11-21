/**
 * Vue Single File Component (SFC) Parser
 * 
 * Extracts script setup and template sections from Vue SFC files.
 * Handles TypeScript and JavaScript variants with line/column tracking.
 * 
 * This is a Vue-specific wrapper around the shared SFC parser.
 */

import type { ParseError } from './types';
import { SFCParser, SFCParseError } from './sfc-parser';

/**
 * Represents a section of a Vue SFC file
 * (Re-exported from shared SFC parser for backward compatibility)
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
  private sfcParser: SFCParser;

  constructor() {
    this.sfcParser = new SFCParser();
  }

  /**
   * Parse a Vue SFC file and extract sections
   * @param source - Vue SFC source code
   * @returns Parsed sections
   * @throws VueSFCParseError if parsing fails
   */
  parse(source: string): ParsedVueSFC {
    try {
      // Use shared SFC parser with Vue-specific options
      const parsed = this.sfcParser.parse(source, {
        scriptTag: 'script setup',
        templateTag: 'template',
        requireSetup: true,
        extractStyles: true,
      });

      // Convert to Vue-specific format
      return {
        script: parsed.script,
        template: parsed.template,
        styles: parsed.styles,
      };
    } catch (error) {
      if (error instanceof SFCParseError) {
        throw new VueSFCParseError(error.message, error.line, error.column);
      }
      throw new VueSFCParseError(
        `Failed to parse Vue SFC: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate Vue SFC structure
   * @param source - Vue SFC source code
   * @returns Array of validation errors
   */
  validateStructure(source: string): ParseError[] {
    return this.sfcParser.validateStructure(source, {
      scriptTag: 'script setup',
      templateTag: 'template',
      requireSetup: true,
    });
  }

  /**
   * Create a ParseError from a VueSFCParseError
   * @param error - The error to convert
   * @returns ParseError object
   */
  static createParseError(error: unknown): ParseError {
    return SFCParser.createParseError(error);
  }
}
