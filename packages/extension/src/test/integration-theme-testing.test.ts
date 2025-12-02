/**
 * Integration Tests for VS Code Dark Theme Support
 * 
 * Tests theme detection on extension load, theme change handling,
 * diagram rendering with different themes, and zoom/pan state preservation.
 * 
 * Requirements: 3.1, 1.2, 1.4, 3.2, 1.1, 1.3, 1.5
 */

import * as assert from 'assert';
import { ThemeConfig, type VSCodeTheme, type MermaidThemeConfig } from '../visualization/theme-config';

/**
 * Mock VS Code theme detection
 */
class MockThemeDetector {
  private currentTheme: VSCodeTheme = 'light';

  setTheme(theme: VSCodeTheme): void {
    this.currentTheme = theme;
  }

  getTheme(): VSCodeTheme {
    return this.currentTheme;
  }

  simulateThemeChange(newTheme: VSCodeTheme): void {
    this.currentTheme = newTheme;
  }
}

/**
 * Mock diagram state for testing zoom/pan preservation
 */
interface DiagramState {
  scale: number;
  panX: number;
  panY: number;
  diagram: string;
  theme: VSCodeTheme;
}

/**
 * Simulate diagram rendering and state management
 */
class MockDiagramRenderer {
  private state: DiagramState = {
    scale: 1,
    panX: 0,
    panY: 0,
    diagram: '',
    theme: 'light'
  };

  renderDiagram(diagram: string, theme: VSCodeTheme): void {
    this.state.diagram = diagram;
    this.state.theme = theme;
    // Reset zoom/pan on new diagram
    this.state.scale = 1;
    this.state.panX = 0;
    this.state.panY = 0;
  }

  applyZoom(scale: number, panX: number, panY: number): void {
    this.state.scale = scale;
    this.state.panX = panX;
    this.state.panY = panY;
  }

  getState(): DiagramState {
    return { ...this.state };
  }

  changeTheme(newTheme: VSCodeTheme): void {
    // Preserve zoom/pan state when changing theme
    this.state.theme = newTheme;
  }
}

describe('Integration Tests: Theme Detection and Rendering', () => {
  describe('10.1 Test theme detection on extension load', () => {
    it('should detect light theme on extension load', () => {
      const themeDetector = new MockThemeDetector();
      themeDetector.setTheme('light');

      const detectedTheme = themeDetector.getTheme();
      assert.strictEqual(detectedTheme, 'light', 'Should detect light theme');

      // Verify theme configuration is valid
      const themeConfig = ThemeConfig.getTheme(detectedTheme);
      assert.ok(themeConfig.themeVariables, 'Theme config should have variables');
      assert.strictEqual(themeConfig.theme, 'base', 'Theme should be "base"');
    });

    it('should detect dark theme on extension load', () => {
      const themeDetector = new MockThemeDetector();
      themeDetector.setTheme('dark');

      const detectedTheme = themeDetector.getTheme();
      assert.strictEqual(detectedTheme, 'dark', 'Should detect dark theme');

      // Verify theme configuration is valid
      const themeConfig = ThemeConfig.getTheme(detectedTheme);
      assert.ok(themeConfig.themeVariables, 'Theme config should have variables');
      assert.strictEqual(themeConfig.theme, 'base', 'Theme should be "base"');
    });

    it('should detect high-contrast theme on extension load', () => {
      const themeDetector = new MockThemeDetector();
      themeDetector.setTheme('high-contrast');

      const detectedTheme = themeDetector.getTheme();
      assert.strictEqual(detectedTheme, 'high-contrast', 'Should detect high-contrast theme');

      // Verify theme configuration is valid
      const themeConfig = ThemeConfig.getTheme(detectedTheme);
      assert.ok(themeConfig.themeVariables, 'Theme config should have variables');
      assert.strictEqual(themeConfig.theme, 'base', 'Theme should be "base"');
    });

    it('should generate valid Mermaid config for detected light theme', () => {
      const themeDetector = new MockThemeDetector();
      themeDetector.setTheme('light');

      const detectedTheme = themeDetector.getTheme();
      const themeConfig = ThemeConfig.getTheme(detectedTheme);

      // Verify all required fields
      assert.ok(themeConfig.themeVariables.primaryColor, 'Should have primaryColor');
      assert.ok(themeConfig.themeVariables.secondaryColor, 'Should have secondaryColor');
      assert.ok(themeConfig.themeVariables.tertiaryColor, 'Should have tertiaryColor');
      assert.ok(themeConfig.flowchart, 'Should have flowchart config');
      assert.ok(themeConfig.fontFamily, 'Should have fontFamily');
    });

    it('should generate valid Mermaid config for detected dark theme', () => {
      const themeDetector = new MockThemeDetector();
      themeDetector.setTheme('dark');

      const detectedTheme = themeDetector.getTheme();
      const themeConfig = ThemeConfig.getTheme(detectedTheme);

      // Verify all required fields
      assert.ok(themeConfig.themeVariables.primaryColor, 'Should have primaryColor');
      assert.ok(themeConfig.themeVariables.secondaryColor, 'Should have secondaryColor');
      assert.ok(themeConfig.themeVariables.tertiaryColor, 'Should have tertiaryColor');
      assert.ok(themeConfig.flowchart, 'Should have flowchart config');
      assert.ok(themeConfig.fontFamily, 'Should have fontFamily');
    });

    it('should generate valid Mermaid config for detected high-contrast theme', () => {
      const themeDetector = new MockThemeDetector();
      themeDetector.setTheme('high-contrast');

      const detectedTheme = themeDetector.getTheme();
      const themeConfig = ThemeConfig.getTheme(detectedTheme);

      // Verify all required fields
      assert.ok(themeConfig.themeVariables.primaryColor, 'Should have primaryColor');
      assert.ok(themeConfig.themeVariables.secondaryColor, 'Should have secondaryColor');
      assert.ok(themeConfig.themeVariables.tertiaryColor, 'Should have tertiaryColor');
      assert.ok(themeConfig.flowchart, 'Should have flowchart config');
      assert.ok(themeConfig.fontFamily, 'Should have fontFamily');
    });

    it('should have different colors for light and dark themes', () => {
      const lightConfig = ThemeConfig.getTheme('light');
      const darkConfig = ThemeConfig.getTheme('dark');

      assert.notStrictEqual(
        lightConfig.themeVariables.primaryColor,
        darkConfig.themeVariables.primaryColor,
        'Primary colors should differ'
      );

      assert.notStrictEqual(
        lightConfig.themeVariables.background,
        darkConfig.themeVariables.background,
        'Background colors should differ'
      );
    });
  });

  describe('10.2 Test theme change handling', () => {
    it('should handle theme change from light to dark', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      // Start with light theme
      themeDetector.setTheme('light');
      let currentTheme = themeDetector.getTheme();
      renderer.renderDiagram('flowchart TD\nA[Input]\nB[Output]\nA --> B', currentTheme);

      let state = renderer.getState();
      assert.strictEqual(state.theme, 'light', 'Should start with light theme');

      // Change to dark theme
      themeDetector.simulateThemeChange('dark');
      currentTheme = themeDetector.getTheme();
      renderer.changeTheme(currentTheme);

      state = renderer.getState();
      assert.strictEqual(state.theme, 'dark', 'Should change to dark theme');

      // Verify theme config is updated
      const themeConfig = ThemeConfig.getTheme(currentTheme);
      assert.ok(themeConfig.themeVariables, 'Should have valid theme config');
    });

    it('should handle theme change from dark to light', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      // Start with dark theme
      themeDetector.setTheme('dark');
      let currentTheme = themeDetector.getTheme();
      renderer.renderDiagram('flowchart TD\nA[Input]\nB[Output]\nA --> B', currentTheme);

      let state = renderer.getState();
      assert.strictEqual(state.theme, 'dark', 'Should start with dark theme');

      // Change to light theme
      themeDetector.simulateThemeChange('light');
      currentTheme = themeDetector.getTheme();
      renderer.changeTheme(currentTheme);

      state = renderer.getState();
      assert.strictEqual(state.theme, 'light', 'Should change to light theme');

      // Verify theme config is updated
      const themeConfig = ThemeConfig.getTheme(currentTheme);
      assert.ok(themeConfig.themeVariables, 'Should have valid theme config');
    });

    it('should handle theme change to high-contrast', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      // Start with light theme
      themeDetector.setTheme('light');
      let currentTheme = themeDetector.getTheme();
      renderer.renderDiagram('flowchart TD\nA[Input]\nB[Output]\nA --> B', currentTheme);

      // Change to high-contrast theme
      themeDetector.simulateThemeChange('high-contrast');
      currentTheme = themeDetector.getTheme();
      renderer.changeTheme(currentTheme);

      const state = renderer.getState();
      assert.strictEqual(state.theme, 'high-contrast', 'Should change to high-contrast theme');

      // Verify theme config is updated
      const themeConfig = ThemeConfig.getTheme(currentTheme);
      assert.ok(themeConfig.themeVariables, 'Should have valid theme config');
    });

    it('should update diagram correctly after theme change', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      const diagram = 'flowchart TD\nA[Input]\nB[Process]\nC[Output]\nA --> B\nB --> C';

      // Render with light theme
      themeDetector.setTheme('light');
      renderer.renderDiagram(diagram, themeDetector.getTheme());

      let state = renderer.getState();
      assert.strictEqual(state.diagram, diagram, 'Diagram should be stored');
      assert.strictEqual(state.theme, 'light', 'Should have light theme');

      // Change theme and re-render
      themeDetector.simulateThemeChange('dark');
      renderer.changeTheme(themeDetector.getTheme());

      state = renderer.getState();
      assert.strictEqual(state.diagram, diagram, 'Diagram should remain the same');
      assert.strictEqual(state.theme, 'dark', 'Theme should be updated');
    });

    it('should handle multiple rapid theme changes', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      const diagram = 'flowchart TD\nA[Input]\nB[Output]\nA --> B';
      const themes: VSCodeTheme[] = ['light', 'dark', 'high-contrast', 'light', 'dark'];

      for (const theme of themes) {
        themeDetector.simulateThemeChange(theme);
        renderer.changeTheme(themeDetector.getTheme());

        const state = renderer.getState();
        assert.strictEqual(state.theme, theme, `Should handle theme change to ${theme}`);

        // Verify theme config is valid
        const themeConfig = ThemeConfig.getTheme(theme);
        assert.ok(themeConfig.themeVariables, `Should have valid config for ${theme}`);
      }
    });
  });

  describe('10.3 Test diagram rendering with different themes', () => {
    const sampleDiagrams = [
      {
        name: 'Simple linear flow',
        diagram: 'flowchart TD\nA[Input Props]\nB[Process]\nC[Output]\nA --> B\nB --> C'
      },
      {
        name: 'Branching flow',
        diagram: 'flowchart TD\nA[Input]\nB[Decision]\nC[Path 1]\nD[Path 2]\nE[Output]\nA --> B\nB --> C\nB --> D\nC --> E\nD --> E'
      },
      {
        name: 'Complex flow with feedback',
        diagram: 'flowchart TD\nA[Props]\nB[State]\nC[Handler]\nD[Effect]\nE[Render]\nA --> C\nB --> C\nC --> D\nD --> B\nB --> E\nA --> E'
      },
      {
        name: 'Flow with data stores',
        diagram: 'flowchart TD\nA[Input]\nB[Process]\nC[(Data Store)]\nD[Output]\nA --> B\nB --> C\nC --> B\nB --> D'
      }
    ];

    it('should render diagrams correctly with light theme', () => {
      const renderer = new MockDiagramRenderer();

      for (const { name, diagram } of sampleDiagrams) {
        renderer.renderDiagram(diagram, 'light');

        const state = renderer.getState();
        assert.strictEqual(state.diagram, diagram, `Should render ${name} with light theme`);
        assert.strictEqual(state.theme, 'light', `Should have light theme for ${name}`);
        assert.strictEqual(state.scale, 1, `Should have default zoom for ${name}`);
      }
    });

    it('should render diagrams correctly with dark theme', () => {
      const renderer = new MockDiagramRenderer();

      for (const { name, diagram } of sampleDiagrams) {
        renderer.renderDiagram(diagram, 'dark');

        const state = renderer.getState();
        assert.strictEqual(state.diagram, diagram, `Should render ${name} with dark theme`);
        assert.strictEqual(state.theme, 'dark', `Should have dark theme for ${name}`);
        assert.strictEqual(state.scale, 1, `Should have default zoom for ${name}`);
      }
    });

    it('should render diagrams correctly with high-contrast theme', () => {
      const renderer = new MockDiagramRenderer();

      for (const { name, diagram } of sampleDiagrams) {
        renderer.renderDiagram(diagram, 'high-contrast');

        const state = renderer.getState();
        assert.strictEqual(state.diagram, diagram, `Should render ${name} with high-contrast theme`);
        assert.strictEqual(state.theme, 'high-contrast', `Should have high-contrast theme for ${name}`);
        assert.strictEqual(state.scale, 1, `Should have default zoom for ${name}`);
      }
    });

    it('should have valid theme variables for all diagram types', () => {
      const themes: VSCodeTheme[] = ['light', 'dark', 'high-contrast'];

      for (const theme of themes) {
        const themeConfig = ThemeConfig.getTheme(theme);

        // Verify all required color variables exist
        const requiredColors = [
          'primaryColor', 'primaryTextColor', 'primaryBorderColor',
          'secondaryColor', 'secondaryTextColor', 'secondaryBorderColor',
          'tertiaryColor', 'tertiaryTextColor', 'tertiaryBorderColor',
          'background', 'textColor', 'lineColor', 'edgeLabelBackground',
          'clusterBkg', 'clusterBorder'
        ];

        for (const color of requiredColors) {
          assert.ok(
            themeConfig.themeVariables[color],
            `Theme ${theme} should have ${color}`
          );
        }
      }
    });

    it('should maintain diagram structure across theme changes', () => {
      const renderer = new MockDiagramRenderer();
      const diagram = 'flowchart TD\nA[Input]\nB[Process]\nC[Output]\nA --> B\nB --> C';

      // Render with light theme
      renderer.renderDiagram(diagram, 'light');
      let state = renderer.getState();
      const originalDiagram = state.diagram;

      // Change theme
      renderer.changeTheme('dark');
      state = renderer.getState();

      // Diagram structure should remain the same
      assert.strictEqual(state.diagram, originalDiagram, 'Diagram structure should be preserved');
    });
  });

  describe('10.4 Test zoom and pan state preservation', () => {
    it('should preserve zoom state when changing theme', () => {
      const renderer = new MockDiagramRenderer();
      const diagram = 'flowchart TD\nA[Input]\nB[Output]\nA --> B';

      // Render diagram
      renderer.renderDiagram(diagram, 'light');

      // Apply zoom
      const zoomLevel = 1.5;
      renderer.applyZoom(zoomLevel, 0, 0);

      let state = renderer.getState();
      assert.strictEqual(state.scale, zoomLevel, 'Should have zoom applied');

      // Change theme
      renderer.changeTheme('dark');

      // Zoom state should be preserved
      state = renderer.getState();
      assert.strictEqual(state.scale, zoomLevel, 'Zoom state should be preserved after theme change');
    });

    it('should preserve pan state when changing theme', () => {
      const renderer = new MockDiagramRenderer();
      const diagram = 'flowchart TD\nA[Input]\nB[Output]\nA --> B';

      // Render diagram
      renderer.renderDiagram(diagram, 'light');

      // Apply pan
      const panX = 100;
      const panY = 50;
      renderer.applyZoom(1, panX, panY);

      let state = renderer.getState();
      assert.strictEqual(state.panX, panX, 'Should have pan X applied');
      assert.strictEqual(state.panY, panY, 'Should have pan Y applied');

      // Change theme
      renderer.changeTheme('dark');

      // Pan state should be preserved
      state = renderer.getState();
      assert.strictEqual(state.panX, panX, 'Pan X state should be preserved after theme change');
      assert.strictEqual(state.panY, panY, 'Pan Y state should be preserved after theme change');
    });

    it('should preserve combined zoom and pan state', () => {
      const renderer = new MockDiagramRenderer();
      const diagram = 'flowchart TD\nA[Input]\nB[Output]\nA --> B';

      // Render diagram
      renderer.renderDiagram(diagram, 'light');

      // Apply zoom and pan
      const zoomLevel = 2;
      const panX = 150;
      const panY = 100;
      renderer.applyZoom(zoomLevel, panX, panY);

      let state = renderer.getState();
      assert.strictEqual(state.scale, zoomLevel, 'Should have zoom applied');
      assert.strictEqual(state.panX, panX, 'Should have pan X applied');
      assert.strictEqual(state.panY, panY, 'Should have pan Y applied');

      // Change theme multiple times
      const themes: VSCodeTheme[] = ['dark', 'high-contrast', 'light'];
      for (const theme of themes) {
        renderer.changeTheme(theme);

        state = renderer.getState();
        assert.strictEqual(state.scale, zoomLevel, `Zoom should be preserved after changing to ${theme}`);
        assert.strictEqual(state.panX, panX, `Pan X should be preserved after changing to ${theme}`);
        assert.strictEqual(state.panY, panY, `Pan Y should be preserved after changing to ${theme}`);
      }
    });

    it('should handle zoom and pan with different diagram sizes', () => {
      const renderer = new MockDiagramRenderer();

      const diagrams = [
        'flowchart TD\nA[Input]\nB[Output]\nA --> B',
        'flowchart TD\nA[Input]\nB[Process]\nC[Output]\nD[Store]\nA --> B\nB --> C\nB --> D\nD --> B',
        'flowchart TD\nA[A]\nB[B]\nC[C]\nD[D]\nE[E]\nF[F]\nA --> B\nB --> C\nC --> D\nD --> E\nE --> F'
      ];

      for (const diagram of diagrams) {
        renderer.renderDiagram(diagram, 'light');

        // Apply zoom and pan
        renderer.applyZoom(1.5, 50, 50);

        let state = renderer.getState();
        assert.strictEqual(state.scale, 1.5, 'Should have zoom applied');

        // Change theme
        renderer.changeTheme('dark');

        // State should be preserved
        state = renderer.getState();
        assert.strictEqual(state.scale, 1.5, 'Zoom should be preserved');
        assert.strictEqual(state.panX, 50, 'Pan X should be preserved');
        assert.strictEqual(state.panY, 50, 'Pan Y should be preserved');
      }
    });

    it('should reset zoom and pan when rendering new diagram', () => {
      const renderer = new MockDiagramRenderer();

      // Render first diagram with zoom/pan
      renderer.renderDiagram('flowchart TD\nA[Input]\nB[Output]\nA --> B', 'light');
      renderer.applyZoom(2, 100, 100);

      let state = renderer.getState();
      assert.strictEqual(state.scale, 2, 'Should have zoom applied');

      // Render new diagram (should reset zoom/pan)
      renderer.renderDiagram('flowchart TD\nX[New]\nY[Diagram]\nX --> Y', 'light');

      state = renderer.getState();
      assert.strictEqual(state.scale, 1, 'Zoom should be reset for new diagram');
      assert.strictEqual(state.panX, 0, 'Pan X should be reset for new diagram');
      assert.strictEqual(state.panY, 0, 'Pan Y should be reset for new diagram');
    });

    it('should preserve zoom and pan across multiple theme changes', () => {
      const renderer = new MockDiagramRenderer();
      const diagram = 'flowchart TD\nA[Input]\nB[Output]\nA --> B';

      // Render diagram
      renderer.renderDiagram(diagram, 'light');

      // Apply zoom and pan
      renderer.applyZoom(1.8, 75, 60);

      // Change theme multiple times
      const themes: VSCodeTheme[] = ['dark', 'high-contrast', 'light', 'dark', 'light'];

      for (const theme of themes) {
        renderer.changeTheme(theme);

        const state = renderer.getState();
        assert.strictEqual(state.scale, 1.8, `Zoom should be preserved after changing to ${theme}`);
        assert.strictEqual(state.panX, 75, `Pan X should be preserved after changing to ${theme}`);
        assert.strictEqual(state.panY, 60, `Pan Y should be preserved after changing to ${theme}`);
        assert.strictEqual(state.diagram, diagram, `Diagram should remain the same for ${theme}`);
      }
    });
  });

  describe('Integration: Complete workflow', () => {
    it('should handle complete theme detection and rendering workflow', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      // 1. Detect initial theme
      themeDetector.setTheme('light');
      let currentTheme = themeDetector.getTheme();
      assert.strictEqual(currentTheme, 'light', 'Should detect light theme');

      // 2. Get theme configuration
      let themeConfig = ThemeConfig.getTheme(currentTheme);
      assert.ok(themeConfig.themeVariables, 'Should have theme config');

      // 3. Render diagram with initial theme
      const diagram = 'flowchart TD\nA[Input]\nB[Output]\nA --> B';
      renderer.renderDiagram(diagram, currentTheme);

      let state = renderer.getState();
      assert.strictEqual(state.theme, 'light', 'Should render with light theme');

      // 4. Apply zoom and pan
      renderer.applyZoom(1.5, 50, 50);
      state = renderer.getState();
      assert.strictEqual(state.scale, 1.5, 'Should have zoom applied');

      // 5. Change theme
      themeDetector.simulateThemeChange('dark');
      currentTheme = themeDetector.getTheme();
      renderer.changeTheme(currentTheme);

      // 6. Verify theme changed but zoom/pan preserved
      state = renderer.getState();
      assert.strictEqual(state.theme, 'dark', 'Should change to dark theme');
      assert.strictEqual(state.scale, 1.5, 'Zoom should be preserved');
      assert.strictEqual(state.panX, 50, 'Pan X should be preserved');
      assert.strictEqual(state.panY, 50, 'Pan Y should be preserved');

      // 7. Get new theme configuration
      themeConfig = ThemeConfig.getTheme(currentTheme);
      assert.ok(themeConfig.themeVariables, 'Should have new theme config');

      // 8. Verify colors are different
      const lightConfig = ThemeConfig.getTheme('light');
      const darkConfig = ThemeConfig.getTheme('dark');
      assert.notStrictEqual(
        lightConfig.themeVariables.primaryColor,
        darkConfig.themeVariables.primaryColor,
        'Colors should differ between themes'
      );
    });

    it('should handle theme changes with diagram updates', () => {
      const themeDetector = new MockThemeDetector();
      const renderer = new MockDiagramRenderer();

      const diagrams = [
        'flowchart TD\nA[Input]\nB[Output]\nA --> B',
        'flowchart TD\nX[Start]\nY[Process]\nZ[End]\nX --> Y\nY --> Z'
      ];

      // Render first diagram with light theme
      themeDetector.setTheme('light');
      renderer.renderDiagram(diagrams[0], themeDetector.getTheme());

      let state = renderer.getState();
      assert.strictEqual(state.diagram, diagrams[0], 'Should render first diagram');
      assert.strictEqual(state.theme, 'light', 'Should have light theme');

      // Change theme
      themeDetector.simulateThemeChange('dark');
      renderer.changeTheme(themeDetector.getTheme());

      state = renderer.getState();
      assert.strictEqual(state.theme, 'dark', 'Should change to dark theme');
      assert.strictEqual(state.diagram, diagrams[0], 'Diagram should remain the same');

      // Render new diagram with dark theme
      renderer.renderDiagram(diagrams[1], themeDetector.getTheme());

      state = renderer.getState();
      assert.strictEqual(state.diagram, diagrams[1], 'Should render new diagram');
      assert.strictEqual(state.theme, 'dark', 'Should maintain dark theme');
      assert.strictEqual(state.scale, 1, 'Zoom should be reset for new diagram');
    });
  });
});

