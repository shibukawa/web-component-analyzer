/**
 * Accessibility Utilities for Theme Color Validation
 * 
 * Provides functions to verify WCAG color contrast ratios and validate
 * accessibility compliance for theme colors.
 */

/**
 * Convert hex color to RGB
 * @param hex Hex color string (e.g., '#ffffff')
 * @returns RGB object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.0 formula: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 * @param hex Hex color string
 * @returns Relative luminance value (0-1)
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  // Convert RGB to sRGB
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate WCAG contrast ratio between two colors
 * Based on WCAG 2.0 formula: https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 * @param foreground Foreground color (hex)
 * @param background Background color (hex)
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(foreground: string, background: string): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 * @param foreground Foreground color (hex)
 * @param background Background color (hex)
 * @returns true if contrast ratio >= 4.5
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard (7:1 for normal text)
 * @param foreground Foreground color (hex)
 * @param background Background color (hex)
 * @returns true if contrast ratio >= 7
 */
export function meetsWCAGAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

/**
 * Validate all color combinations in a theme
 * @param theme Theme object with color properties
 * @param backgroundColor Background color for contrast calculation
 * @returns Array of validation results
 */
export interface ContrastValidationResult {
  colorPair: string;
  foreground: string;
  background: string;
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
}

export function validateThemeContrast(
  theme: Record<string, string>,
  backgroundColor: string
): ContrastValidationResult[] {
  const results: ContrastValidationResult[] = [];

  // Text colors to validate against background (general text colors)
  const generalTextColorKeys = [
    'textColor',
    'nodeTextColor',
    'labelTextColor',
    'noteTextColor',
    'actorTextColor'
  ];

  for (const key of generalTextColorKeys) {
    const color = theme[key];
    if (color && color.startsWith('#')) {
      try {
        const ratio = getContrastRatio(color, backgroundColor);
        results.push({
          colorPair: `${key} on background`,
          foreground: color,
          background: backgroundColor,
          ratio: parseFloat(ratio.toFixed(2)),
          meetsAA: ratio >= 4.5,
          meetsAAA: ratio >= 7
        });
      } catch (error) {
        console.error(`Failed to validate contrast for ${key}:`, error);
      }
    }
  }

  // Node colors to validate against background
  const nodeColorKeys = [
    'primaryColor',
    'secondaryColor',
    'tertiaryColor',
    'clusterBkg'
  ];

  for (const key of nodeColorKeys) {
    const color = theme[key];
    if (color && color.startsWith('#')) {
      try {
        // For node backgrounds, check if text on them would be readable
        // We'll check with white and black text
        const whiteContrast = getContrastRatio('#ffffff', color);
        const blackContrast = getContrastRatio('#000000', color);
        
        const betterContrast = Math.max(whiteContrast, blackContrast);
        const textColor = whiteContrast > blackContrast ? '#ffffff' : '#000000';

        results.push({
          colorPair: `${key} (node background)`,
          foreground: textColor,
          background: color,
          ratio: parseFloat(betterContrast.toFixed(2)),
          meetsAA: betterContrast >= 4.5,
          meetsAAA: betterContrast >= 7
        });
      } catch (error) {
        console.error(`Failed to validate contrast for ${key}:`, error);
      }
    }
  }

  // Specific text color to node color mappings
  const textNodeMappings = [
    { textKey: 'primaryTextColor', nodeKey: 'primaryColor' },
    { textKey: 'secondaryTextColor', nodeKey: 'secondaryColor' },
    { textKey: 'tertiaryTextColor', nodeKey: 'tertiaryColor' }
  ];

  for (const mapping of textNodeMappings) {
    const textColor = theme[mapping.textKey];
    const nodeColor = theme[mapping.nodeKey];
    
    if (textColor && nodeColor && textColor.startsWith('#') && nodeColor.startsWith('#')) {
      try {
        const ratio = getContrastRatio(textColor, nodeColor);
        results.push({
          colorPair: `${mapping.textKey} on ${mapping.nodeKey}`,
          foreground: textColor,
          background: nodeColor,
          ratio: parseFloat(ratio.toFixed(2)),
          meetsAA: ratio >= 4.5,
          meetsAAA: ratio >= 7
        });
      } catch (error) {
        console.error(`Failed to validate contrast for ${mapping.textKey} on ${mapping.nodeKey}:`, error);
      }
    }
  }

  return results;
}

/**
 * Generate a contrast validation report
 * @param theme Theme object
 * @param backgroundColor Background color
 * @returns Formatted report string
 */
export function generateContrastReport(
  theme: Record<string, string>,
  backgroundColor: string
): string {
  const results = validateThemeContrast(theme, backgroundColor);
  
  let report = 'Color Contrast Validation Report\n';
  report += '================================\n\n';

  const aaFailures = results.filter(r => !r.meetsAA);
  const aaaFailures = results.filter(r => !r.meetsAAA);

  report += `Total color pairs validated: ${results.length}\n`;
  report += `WCAG AA compliant (4.5:1): ${results.length - aaFailures.length}/${results.length}\n`;
  report += `WCAG AAA compliant (7:1): ${results.length - aaaFailures.length}/${results.length}\n\n`;

  if (aaFailures.length > 0) {
    report += 'WCAG AA Failures (< 4.5:1):\n';
    report += '----------------------------\n';
    for (const failure of aaFailures) {
      report += `${failure.colorPair}: ${failure.ratio}:1 (${failure.foreground} on ${failure.background})\n`;
    }
    report += '\n';
  }

  if (aaaFailures.length > 0) {
    report += 'WCAG AAA Failures (< 7:1):\n';
    report += '----------------------------\n';
    for (const failure of aaaFailures) {
      report += `${failure.colorPair}: ${failure.ratio}:1 (${failure.foreground} on ${failure.background})\n`;
    }
    report += '\n';
  }

  report += 'All Color Pairs:\n';
  report += '----------------\n';
  for (const result of results) {
    const aaStatus = result.meetsAA ? '✓' : '✗';
    const aaaStatus = result.meetsAAA ? '✓' : '✗';
    report += `${aaStatus} AA ${aaaStatus} AAA | ${result.colorPair}: ${result.ratio}:1\n`;
  }

  return report;
}
