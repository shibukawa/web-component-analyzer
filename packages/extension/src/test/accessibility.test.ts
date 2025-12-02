import * as assert from 'assert';
import { ThemeConfig, type VSCodeTheme } from '../visualization/theme-config';
import {
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  validateThemeContrast,
  generateContrastReport
} from '../visualization/accessibility-utils';

describe('Accessibility Tests', () => {
  describe('Color Contrast Calculations', () => {
    it('should calculate contrast ratio correctly', () => {
      // White on black should be 21:1
      const ratio = getContrastRatio('#ffffff', '#000000');
      assert.strictEqual(Math.round(ratio), 21);
    });

    it('should identify WCAG AA compliant colors', () => {
      // White on black meets AA
      assert.strictEqual(meetsWCAGAA('#ffffff', '#000000'), true);
      
      // Light gray on white does not meet AA
      assert.strictEqual(meetsWCAGAA('#cccccc', '#ffffff'), false);
    });

    it('should identify WCAG AAA compliant colors', () => {
      // White on black meets AAA (21:1 contrast)
      assert.strictEqual(meetsWCAGAAA('#ffffff', '#000000'), true);
      
      // White on medium gray does not meet AAA (needs 7:1, this is ~3.5:1)
      assert.strictEqual(meetsWCAGAAA('#ffffff', '#888888'), false);
    });
  });

  describe('Light Theme Accessibility', () => {
    it('should have WCAG AA compliant text colors', () => {
      const theme = ThemeConfig.getTheme('light');
      const themeVars = theme.themeVariables;
      const backgroundColor = themeVars.background || '#ffffff';

      // Check primary text color
      const primaryTextContrast = getContrastRatio(
        themeVars.primaryTextColor || '#1e1e1e',
        backgroundColor
      );
      assert.ok(
        primaryTextContrast >= 4.5,
        `Primary text contrast ${primaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Check secondary text color
      const secondaryTextContrast = getContrastRatio(
        themeVars.secondaryTextColor || '#1e1e1e',
        backgroundColor
      );
      assert.ok(
        secondaryTextContrast >= 4.5,
        `Secondary text contrast ${secondaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Check tertiary text color
      const tertiaryTextContrast = getContrastRatio(
        themeVars.tertiaryTextColor || '#1e1e1e',
        backgroundColor
      );
      assert.ok(
        tertiaryTextContrast >= 4.5,
        `Tertiary text contrast ${tertiaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );
    });

    it('should have readable node colors', () => {
      const theme = ThemeConfig.getTheme('light');
      const themeVars = theme.themeVariables;

      // For light theme, check if nodes have sufficient contrast with white background
      const primaryNodeContrast = getContrastRatio('#000000', themeVars.primaryColor || '#E3F2FD');
      assert.ok(
        primaryNodeContrast >= 4.5,
        `Primary node contrast ${primaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      const secondaryNodeContrast = getContrastRatio('#000000', themeVars.secondaryColor || '#F3E5F5');
      assert.ok(
        secondaryNodeContrast >= 4.5,
        `Secondary node contrast ${secondaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      const tertiaryNodeContrast = getContrastRatio('#000000', themeVars.tertiaryColor || '#E8F5E9');
      assert.ok(
        tertiaryNodeContrast >= 4.5,
        `Tertiary node contrast ${tertiaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );
    });
  });

  describe('Dark Theme Accessibility', () => {
    it('should have WCAG AA compliant text colors', () => {
      const theme = ThemeConfig.getTheme('dark');
      const themeVars = theme.themeVariables;
      const backgroundColor = themeVars.background || '#1e1e1e';

      // Check primary text color
      const primaryTextContrast = getContrastRatio(
        themeVars.primaryTextColor || '#ffffff',
        backgroundColor
      );
      assert.ok(
        primaryTextContrast >= 4.5,
        `Primary text contrast ${primaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Check secondary text color
      const secondaryTextContrast = getContrastRatio(
        themeVars.secondaryTextColor || '#ffffff',
        backgroundColor
      );
      assert.ok(
        secondaryTextContrast >= 4.5,
        `Secondary text contrast ${secondaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Check tertiary text color
      const tertiaryTextContrast = getContrastRatio(
        themeVars.tertiaryTextColor || '#ffffff',
        backgroundColor
      );
      assert.ok(
        tertiaryTextContrast >= 4.5,
        `Tertiary text contrast ${tertiaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );
    });

    it('should have readable node colors', () => {
      const theme = ThemeConfig.getTheme('dark');
      const themeVars = theme.themeVariables;

      // For dark theme, check if nodes have sufficient contrast with dark background
      const primaryNodeContrast = getContrastRatio('#ffffff', themeVars.primaryColor || '#1a3a4a');
      assert.ok(
        primaryNodeContrast >= 4.5,
        `Primary node contrast ${primaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      const secondaryNodeContrast = getContrastRatio('#ffffff', themeVars.secondaryColor || '#3a1a4a');
      assert.ok(
        secondaryNodeContrast >= 4.5,
        `Secondary node contrast ${secondaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      const tertiaryNodeContrast = getContrastRatio('#ffffff', themeVars.tertiaryColor || '#1a3a1a');
      assert.ok(
        tertiaryNodeContrast >= 4.5,
        `Tertiary node contrast ${tertiaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );
    });
  });

  describe('High-Contrast Theme Accessibility', () => {
    it('should have WCAG AA compliant text colors', () => {
      const theme = ThemeConfig.getTheme('high-contrast');
      const themeVars = theme.themeVariables;
      const backgroundColor = themeVars.background || '#000000';

      // Check primary text color
      const primaryTextContrast = getContrastRatio(
        themeVars.primaryTextColor || '#ffffff',
        backgroundColor
      );
      assert.ok(
        primaryTextContrast >= 4.5,
        `Primary text contrast ${primaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Check secondary text color
      const secondaryTextContrast = getContrastRatio(
        themeVars.secondaryTextColor || '#ffffff',
        backgroundColor
      );
      assert.ok(
        secondaryTextContrast >= 4.5,
        `Secondary text contrast ${secondaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Check tertiary text color
      const tertiaryTextContrast = getContrastRatio(
        themeVars.tertiaryTextColor || '#ffffff',
        backgroundColor
      );
      assert.ok(
        tertiaryTextContrast >= 4.5,
        `Tertiary text contrast ${tertiaryTextContrast}:1 does not meet WCAG AA (4.5:1)`
      );
    });

    it('should have high contrast node colors', () => {
      const theme = ThemeConfig.getTheme('high-contrast');
      const themeVars = theme.themeVariables;

      // For high-contrast theme, check if nodes have very high contrast
      // Primary: Dark blue (#0000ff) - use white text for better contrast
      const primaryNodeContrast = getContrastRatio('#ffffff', themeVars.primaryColor || '#0000ff');
      assert.ok(
        primaryNodeContrast >= 4.5,
        `Primary node contrast ${primaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Secondary: Dark magenta (#cc00cc) - use white text for better contrast
      const secondaryNodeContrast = getContrastRatio('#ffffff', themeVars.secondaryColor || '#cc00cc');
      assert.ok(
        secondaryNodeContrast >= 4.5,
        `Secondary node contrast ${secondaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );

      // Tertiary: Dark olive (#666600) - use white text for better contrast
      const tertiaryNodeContrast = getContrastRatio('#ffffff', themeVars.tertiaryColor || '#666600');
      assert.ok(
        tertiaryNodeContrast >= 4.5,
        `Tertiary node contrast ${tertiaryNodeContrast}:1 does not meet WCAG AA (4.5:1)`
      );
    });
  });

  describe('Theme Contrast Validation', () => {
    it('should validate light theme contrast', () => {
      const theme = ThemeConfig.getTheme('light');
      const results = validateThemeContrast(theme.themeVariables, '#ffffff');
      
      // All results should meet WCAG AA
      const aaFailures = results.filter(r => !r.meetsAA);
      assert.strictEqual(
        aaFailures.length,
        0,
        `Light theme has ${aaFailures.length} WCAG AA failures:\n${aaFailures.map(f => `${f.colorPair}: ${f.ratio}:1`).join('\n')}`
      );
    });

    it('should validate dark theme contrast', () => {
      const theme = ThemeConfig.getTheme('dark');
      const results = validateThemeContrast(theme.themeVariables, '#1e1e1e');
      
      // All results should meet WCAG AA
      const aaFailures = results.filter(r => !r.meetsAA);
      assert.strictEqual(
        aaFailures.length,
        0,
        `Dark theme has ${aaFailures.length} WCAG AA failures:\n${aaFailures.map(f => `${f.colorPair}: ${f.ratio}:1`).join('\n')}`
      );
    });

    it('should validate high-contrast theme contrast', () => {
      const theme = ThemeConfig.getTheme('high-contrast');
      const results = validateThemeContrast(theme.themeVariables, '#000000');
      
      // All results should meet WCAG AA
      const aaFailures = results.filter(r => !r.meetsAA);
      assert.strictEqual(
        aaFailures.length,
        0,
        `High-contrast theme has ${aaFailures.length} WCAG AA failures:\n${aaFailures.map(f => `${f.colorPair}: ${f.ratio}:1`).join('\n')}`
      );
    });
  });

  describe('Contrast Report Generation', () => {
    it('should generate report for light theme', () => {
      const theme = ThemeConfig.getTheme('light');
      const report = generateContrastReport(theme.themeVariables, '#ffffff');
      
      assert.ok(report.includes('Color Contrast Validation Report'));
      assert.ok(report.includes('WCAG AA compliant'));
      assert.ok(report.includes('WCAG AAA compliant'));
    });

    it('should generate report for dark theme', () => {
      const theme = ThemeConfig.getTheme('dark');
      const report = generateContrastReport(theme.themeVariables, '#1e1e1e');
      
      assert.ok(report.includes('Color Contrast Validation Report'));
      assert.ok(report.includes('WCAG AA compliant'));
      assert.ok(report.includes('WCAG AAA compliant'));
    });

    it('should generate report for high-contrast theme', () => {
      const theme = ThemeConfig.getTheme('high-contrast');
      const report = generateContrastReport(theme.themeVariables, '#000000');
      
      assert.ok(report.includes('Color Contrast Validation Report'));
      assert.ok(report.includes('WCAG AA compliant'));
      assert.ok(report.includes('WCAG AAA compliant'));
    });
  });
});
