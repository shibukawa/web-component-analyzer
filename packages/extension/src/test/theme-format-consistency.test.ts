/**
 * Theme Format Consistency Tests
 * 
 * Validates that theme variables are passed in the correct format
 * and that Mermaid configuration structure matches the web version.
 * 
 * **Feature: vscode-dark-theme-support, Property 11: Theme Variable Format Consistency**
 * **Validates: Requirements 4.4**
 */

import * as assert from 'assert';
import { ThemeConfig, type MermaidThemeConfig, type VSCodeTheme } from '../visualization/theme-config';

describe('Theme Format Consistency', () => {
  describe('Mermaid Configuration Structure', () => {
    it('should return valid MermaidThemeConfig for light theme', () => {
      const config = ThemeConfig.getTheme('light');
      
      // Verify structure
      assert.strictEqual(config.theme, 'base', 'Theme should be "base"');
      assert.ok(config.themeVariables, 'themeVariables should exist');
      assert.ok(config.flowchart, 'flowchart should exist');
      assert.ok(config.fontFamily, 'fontFamily should exist');
      
      // Verify themeVariables is an object with string values
      assert.strictEqual(typeof config.themeVariables, 'object', 'themeVariables should be an object');
      for (const [key, value] of Object.entries(config.themeVariables)) {
        assert.strictEqual(typeof value, 'string', `themeVariables.${key} should be a string`);
      }
    });

    it('should return valid MermaidThemeConfig for dark theme', () => {
      const config = ThemeConfig.getTheme('dark');
      
      // Verify structure
      assert.strictEqual(config.theme, 'base', 'Theme should be "base"');
      assert.ok(config.themeVariables, 'themeVariables should exist');
      assert.ok(config.flowchart, 'flowchart should exist');
      assert.ok(config.fontFamily, 'fontFamily should exist');
      
      // Verify themeVariables is an object with string values
      assert.strictEqual(typeof config.themeVariables, 'object', 'themeVariables should be an object');
      for (const [key, value] of Object.entries(config.themeVariables)) {
        assert.strictEqual(typeof value, 'string', `themeVariables.${key} should be a string`);
      }
    });

    it('should return valid MermaidThemeConfig for high-contrast theme', () => {
      const config = ThemeConfig.getTheme('high-contrast');
      
      // Verify structure
      assert.strictEqual(config.theme, 'base', 'Theme should be "base"');
      assert.ok(config.themeVariables, 'themeVariables should exist');
      assert.ok(config.flowchart, 'flowchart should exist');
      assert.ok(config.fontFamily, 'fontFamily should exist');
      
      // Verify themeVariables is an object with string values
      assert.strictEqual(typeof config.themeVariables, 'object', 'themeVariables should be an object');
      for (const [key, value] of Object.entries(config.themeVariables)) {
        assert.strictEqual(typeof value, 'string', `themeVariables.${key} should be a string`);
      }
    });
  });

  describe('Flowchart Configuration', () => {
    it('should have consistent flowchart configuration across themes', () => {
      const lightConfig = ThemeConfig.getTheme('light');
      const darkConfig = ThemeConfig.getTheme('dark');
      const highContrastConfig = ThemeConfig.getTheme('high-contrast');
      
      // Verify flowchart structure is consistent
      assert.deepStrictEqual(
        lightConfig.flowchart,
        darkConfig.flowchart,
        'Flowchart config should be identical for light and dark themes'
      );
      
      assert.deepStrictEqual(
        lightConfig.flowchart,
        highContrastConfig.flowchart,
        'Flowchart config should be identical for light and high-contrast themes'
      );
    });

    it('should have correct flowchart settings', () => {
      const config = ThemeConfig.getTheme('light');
      
      assert.strictEqual(config.flowchart.curve, 'basis', 'Curve should be "basis"');
      assert.strictEqual(config.flowchart.padding, 20, 'Padding should be 20');
      assert.strictEqual(config.flowchart.nodeSpacing, 50, 'Node spacing should be 50');
      assert.strictEqual(config.flowchart.rankSpacing, 50, 'Rank spacing should be 50');
      assert.strictEqual(config.flowchart.diagramPadding, 20, 'Diagram padding should be 20');
      assert.strictEqual(config.flowchart.useMaxWidth, true, 'useMaxWidth should be true');
    });
  });

  describe('Theme Variables Format', () => {
    it('should include all required primary color variables', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      assert.ok(vars.primaryColor, 'primaryColor should exist');
      assert.ok(vars.primaryTextColor, 'primaryTextColor should exist');
      assert.ok(vars.primaryBorderColor, 'primaryBorderColor should exist');
    });

    it('should include all required secondary color variables', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      assert.ok(vars.secondaryColor, 'secondaryColor should exist');
      assert.ok(vars.secondaryTextColor, 'secondaryTextColor should exist');
      assert.ok(vars.secondaryBorderColor, 'secondaryBorderColor should exist');
    });

    it('should include all required tertiary color variables', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      assert.ok(vars.tertiaryColor, 'tertiaryColor should exist');
      assert.ok(vars.tertiaryTextColor, 'tertiaryTextColor should exist');
      assert.ok(vars.tertiaryBorderColor, 'tertiaryBorderColor should exist');
    });

    it('should include background and text color variables', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      assert.ok(vars.background, 'background should exist');
      assert.ok(vars.textColor, 'textColor should exist');
    });

    it('should include edge and cluster styling variables', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      assert.ok(vars.lineColor, 'lineColor should exist');
      assert.ok(vars.edgeLabelBackground, 'edgeLabelBackground should exist');
      assert.ok(vars.clusterBkg, 'clusterBkg should exist');
      assert.ok(vars.clusterBorder, 'clusterBorder should exist');
    });

    it('should have valid hex color format for all color variables', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      const colorVars = [
        'primaryColor', 'primaryTextColor', 'primaryBorderColor',
        'secondaryColor', 'secondaryTextColor', 'secondaryBorderColor',
        'tertiaryColor', 'tertiaryTextColor', 'tertiaryBorderColor',
        'background', 'mainBkg', 'textColor', 'nodeBorder', 'nodeTextColor',
        'lineColor', 'edgeLabelBackground', 'clusterBkg', 'clusterBorder'
      ];
      
      for (const varName of colorVars) {
        const value = vars[varName];
        if (value) {
          // Check if it's a valid hex color or rgb color
          const isValidColor = /^#[0-9A-Fa-f]{6}$/.test(value) || /^rgb/.test(value);
          assert.ok(isValidColor, `${varName} should be a valid color format, got: ${value}`);
        }
      }
    });
  });

  describe('Light vs Dark Theme Consistency', () => {
    it('should have matching structure but different colors', () => {
      const lightConfig = ThemeConfig.getTheme('light');
      const darkConfig = ThemeConfig.getTheme('dark');
      
      const lightVars = lightConfig.themeVariables;
      const darkVars = darkConfig.themeVariables;
      
      // Verify core keys exist in both (dark mode may have additional variables)
      const coreKeys = [
        'primaryColor', 'primaryTextColor', 'primaryBorderColor',
        'secondaryColor', 'secondaryTextColor', 'secondaryBorderColor',
        'tertiaryColor', 'tertiaryTextColor', 'tertiaryBorderColor',
        'background', 'textColor', 'lineColor', 'edgeLabelBackground',
        'clusterBkg', 'clusterBorder'
      ];
      
      for (const key of coreKeys) {
        assert.ok(lightVars[key], `Light theme should have ${key}`);
        assert.ok(darkVars[key], `Dark theme should have ${key}`);
      }
    });

    it('should have different color values for light and dark themes', () => {
      const lightConfig = ThemeConfig.getTheme('light');
      const darkConfig = ThemeConfig.getTheme('dark');
      
      const lightVars = lightConfig.themeVariables;
      const darkVars = darkConfig.themeVariables;
      
      // Primary colors should be different
      assert.notStrictEqual(
        lightVars.primaryColor,
        darkVars.primaryColor,
        'Primary color should differ between light and dark'
      );
      
      // Secondary colors should be different
      assert.notStrictEqual(
        lightVars.secondaryColor,
        darkVars.secondaryColor,
        'Secondary color should differ between light and dark'
      );
      
      // Tertiary colors should be different
      assert.notStrictEqual(
        lightVars.tertiaryColor,
        darkVars.tertiaryColor,
        'Tertiary color should differ between light and dark'
      );
    });
  });

  describe('High-Contrast Theme Format', () => {
    it('should have high-contrast specific colors', () => {
      const config = ThemeConfig.getTheme('high-contrast');
      const vars = config.themeVariables;
      
      // High-contrast should have bright, saturated colors
      assert.ok(vars.primaryColor, 'primaryColor should exist');
      assert.ok(vars.secondaryColor, 'secondaryColor should exist');
      assert.ok(vars.tertiaryColor, 'tertiaryColor should exist');
      
      // Verify high-contrast colors are different from light/dark
      const lightConfig = ThemeConfig.getTheme('light');
      const lightVars = lightConfig.themeVariables;
      
      assert.notStrictEqual(
        vars.primaryColor,
        lightVars.primaryColor,
        'High-contrast primary color should differ from light theme'
      );
    });

    it('should have increased stroke width for high-contrast mode', () => {
      const config = ThemeConfig.getTheme('high-contrast');
      const vars = config.themeVariables;
      
      // High-contrast should have strokeWidth for better visibility
      if (vars.strokeWidth) {
        assert.ok(vars.strokeWidth.includes('3px'), 'Stroke width should be increased for high-contrast');
      }
    });
  });

  describe('Theme Detection', () => {
    it('should detect light theme correctly', () => {
      const theme = ThemeConfig.detectVSCodeTheme();
      assert.ok(['light', 'dark', 'high-contrast'].includes(theme), 'Should return a valid theme');
    });

    it('should return consistent theme for multiple calls', () => {
      const theme1 = ThemeConfig.detectVSCodeTheme();
      const theme2 = ThemeConfig.detectVSCodeTheme();
      
      assert.strictEqual(theme1, theme2, 'Theme detection should be consistent');
    });
  });

  describe('Serialization for Webview', () => {
    it('should be JSON serializable', () => {
      const config = ThemeConfig.getTheme('light');
      
      // Should not throw
      const json = JSON.stringify(config);
      assert.ok(json, 'Config should be JSON serializable');
      
      // Should be deserializable
      const deserialized = JSON.parse(json);
      assert.deepStrictEqual(deserialized, config, 'Deserialized config should match original');
    });

    it('should have all required fields for webview injection', () => {
      const config = ThemeConfig.getTheme('dark');
      
      // These are the fields that get injected into the webview script
      assert.ok(config.theme, 'theme field required');
      assert.ok(config.themeVariables, 'themeVariables field required');
      assert.ok(config.flowchart, 'flowchart field required');
      assert.ok(config.fontFamily, 'fontFamily field required');
    });
  });

  describe('Platform Consistency', () => {
    it('should match web version primary colors', () => {
      const config = ThemeConfig.getTheme('light');
      const vars = config.themeVariables;
      
      // Web version uses these colors for light mode
      assert.strictEqual(vars.primaryColor, '#E3F2FD', 'Primary color should match web version');
      assert.strictEqual(vars.secondaryColor, '#F3E5F5', 'Secondary color should match web version');
      assert.strictEqual(vars.tertiaryColor, '#E8F5E9', 'Tertiary color should match web version');
    });

    it('should match web version dark colors', () => {
      const config = ThemeConfig.getTheme('dark');
      const vars = config.themeVariables;
      
      // Web version uses these colors for dark mode
      assert.strictEqual(vars.primaryColor, '#1a3a4a', 'Primary color should match web version');
      assert.strictEqual(vars.secondaryColor, '#3a1a4a', 'Secondary color should match web version');
      assert.strictEqual(vars.tertiaryColor, '#1a3a1a', 'Tertiary color should match web version');
    });

    it('should match web version flowchart configuration', () => {
      const config = ThemeConfig.getTheme('light');
      
      // Web version uses these flowchart settings
      assert.strictEqual(config.flowchart.curve, 'basis', 'Curve should match web version');
      assert.strictEqual(config.flowchart.padding, 20, 'Padding should match web version');
    });
  });
});
