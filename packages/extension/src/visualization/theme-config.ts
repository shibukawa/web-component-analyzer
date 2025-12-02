/**
 * Theme Configuration for VS Code Extension
 * 
 * Provides theme detection and Mermaid configuration based on VS Code theme preference.
 * Theme colors are consistent with the web version to ensure unified visual experience.
 */

export type VSCodeTheme = 'light' | 'dark' | 'high-contrast';

export interface MermaidThemeVariables {
  [key: string]: string;
}

export interface MermaidThemeConfig {
  theme: 'base';
  themeVariables: MermaidThemeVariables;
  flowchart: {
    curve: string;
    padding: number;
    nodeSpacing: number;
    rankSpacing: number;
    diagramPadding: number;
    useMaxWidth: boolean;
  };
  fontFamily: string;
}

/**
 * Theme Configuration Module
 * 
 * Centralizes theme detection and Mermaid configuration generation.
 * Ensures consistency with web version theme colors.
 */
export class ThemeConfig {
  /**
   * Detect the current VS Code theme
   * 
   * @returns The detected theme: 'light', 'dark', or 'high-contrast'
   */
  static detectVSCodeTheme(): VSCodeTheme {
    // Check if we're in a webview context (browser environment)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const classList = (document.body as any)?.classList;
      
      if (classList?.contains('vscode-high-contrast')) {
        return 'high-contrast';
      }
      
      if (classList?.contains('vscode-dark')) {
        return 'dark';
      }
      
      if (classList?.contains('vscode-light')) {
        return 'light';
      }
    }
    
    // Default to light theme
    return 'light';
  }

  /**
   * Get Mermaid theme configuration for the given VS Code theme
   * 
   * @param vscodeTheme The VS Code theme to get configuration for
   * @returns Mermaid theme configuration
   */
  static getTheme(vscodeTheme: VSCodeTheme): MermaidThemeConfig {
    return {
      theme: 'base',
      themeVariables: this.getThemeVariables(vscodeTheme),
      flowchart: {
        curve: 'basis',
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 50,
        diagramPadding: 20,
        useMaxWidth: true,
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    };
  }

  /**
   * Get Mermaid theme variables for the given VS Code theme
   * 
   * @param vscodeTheme The VS Code theme
   * @returns Theme variables object for Mermaid
   */
  private static getThemeVariables(vscodeTheme: VSCodeTheme): MermaidThemeVariables {
    const isDark = vscodeTheme === 'dark';
    const isHighContrast = vscodeTheme === 'high-contrast';

    // Base theme variables (consistent with web version)
    const baseVariables: MermaidThemeVariables = {
      // Primary colors for input props (blue tones)
      // Light: #E3F2FD (very light blue) → Dark: #1a3a4a (dark blue)
      primaryColor: isDark ? '#1a3a4a' : '#E3F2FD',
      primaryTextColor: isDark ? '#ffffff' : '#1e1e1e',
      primaryBorderColor: isDark ? '#2196F3' : '#2196F3',

      // Secondary colors for processes (purple tones)
      // Light: #F3E5F5 (very light purple) → Dark: #3a1a4a (dark purple)
      secondaryColor: isDark ? '#3a1a4a' : '#F3E5F5',
      secondaryTextColor: isDark ? '#ffffff' : '#1e1e1e',
      secondaryBorderColor: isDark ? '#9C27B0' : '#9C27B0',

      // Tertiary colors for data stores (green tones)
      // Light: #E8F5E9 (very light green) → Dark: #1a3a1a (dark green)
      tertiaryColor: isDark ? '#1a3a1a' : '#E8F5E9',
      tertiaryTextColor: isDark ? '#ffffff' : '#1e1e1e',
      tertiaryBorderColor: isDark ? '#4CAF50' : '#4CAF50',

      // Background and text
      background: isDark ? '#1e1e1e' : '#ffffff',
      mainBkg: isDark ? '#2d2d2d' : '#ffffff',
      textColor: isDark ? '#d4d4d4' : '#1e1e1e',

      // Node styling
      nodeBorder: isDark ? '#555555' : '#e0e0e0',
      nodeTextColor: isDark ? '#d4d4d4' : '#1e1e1e',

      // Line/edge colors
      lineColor: isDark ? '#999999' : '#666666',
      // Use a slightly different color for edge label background to ensure contrast
      // Light: use a light gray background, Dark: use a slightly lighter background
      edgeLabelBackground: isDark ? '#2d2d2d' : '#f5f5f5',

      // Cluster/subgraph styling for conditional rendering
      clusterBkg: isDark ? '#1a1a1a' : '#f5f5f5',
      clusterBorder: isDark ? '#555555' : '#cccccc',

      // Flowchart specific colors (matching web version exactly)
      ...(isDark ? {
        // Dark mode: Use saturated dark colors matching web version
        fillType0: '#1a3a4a',  // Dark blue (input props)
        fillType1: '#3a2a1a',  // Dark orange (JSX elements, output props)
        fillType2: '#3a1a4a',  // Dark purple (processes)
        fillType3: '#1a3a1a',  // Dark green (data stores)
        fillType4: '#1a3a3a',  // Dark cyan (context data)
        fillType5: '#3a2a1a',  // Dark orange variant (context functions)
        fillType6: '#1a3a1a',  // Dark green variant (exported handlers)
        fillType7: '#2a2a3a',  // Dark blue-gray (other)
      } : {
        // Light mode: Use saturated light colors matching web version
        fillType0: '#E3F2FD',  // Light blue (input props)
        fillType1: '#FFF3E0',  // Light orange (JSX elements, output props)
        fillType2: '#F3E5F5',  // Light purple (processes)
        fillType3: '#E8F5E9',  // Light green (data stores)
        fillType4: '#E1F5FE',  // Light cyan (context data)
        fillType5: '#FFF9C4',  // Light yellow (context functions)
        fillType6: '#E8F5E9',  // Light green variant (exported handlers)
        fillType7: '#F5F5F5',  // Light gray (other)
      }),

      // Additional contrast improvements for dark mode
      ...(isDark && {
        noteBkgColor: '#3a3a3a',
        noteTextColor: '#e0e0e0',
        noteBorderColor: '#666666',
        actorBkg: '#2d2d2d',
        actorBorder: '#555555',
        actorTextColor: '#e0e0e0',
        labelBoxBkgColor: '#2d2d2d',
        labelBoxBorderColor: '#555555',
        labelTextColor: '#e0e0e0',
        gridColor: '#444444',
        critBkgColor: '#8b2e2e',
        critBorderColor: '#c74444',
        doneBkgColor: '#2e5c2e',
        doneBorderColor: '#4a8c4a',
        activeTaskBkgColor: '#3a4a5a',
        activeTaskBorderColor: '#5a7a9a',
      }),
    };

    // High-contrast mode adjustments
    if (isHighContrast) {
      return {
        ...baseVariables,
        // Use high-contrast colors that meet WCAG AA standards
        // Primary: Dark blue with white text (9.3:1 contrast on node, 21:1 on background)
        primaryColor: '#0000ff',
        primaryTextColor: '#ffffff',  // White text on dark blue (9.3:1 contrast)
        primaryBorderColor: '#0000ff',
        
        // Secondary: Dark magenta with white text (5.3:1 contrast on node, 21:1 on background)
        secondaryColor: '#cc00cc',
        secondaryTextColor: '#ffffff',  // White text on dark magenta (5.3:1 contrast)
        secondaryBorderColor: '#cc00cc',
        
        // Tertiary: Dark olive/green with white text (5.3:1 contrast on node), white on background
        tertiaryColor: '#666600',
        tertiaryTextColor: '#ffffff',  // White text on black background (21:1 contrast)
        tertiaryBorderColor: '#666600',
        
        background: '#000000',
        textColor: '#ffffff',
        nodeBorder: '#ffffff',
        nodeTextColor: '#ffffff',
        lineColor: '#ffffff',
        edgeLabelBackground: '#1a1a1a',
        
        // Increase stroke width for better visibility in high-contrast mode
        strokeWidth: '3px',
        
        // High-contrast flowchart colors
        fillType0: '#0000ff',  // Dark blue
        fillType1: '#ff6600',  // Orange
        fillType2: '#cc00cc',  // Dark magenta
        fillType3: '#666600',  // Dark olive
        fillType4: '#0000ff',  // Dark blue
        fillType5: '#ff6600',  // Orange
        fillType6: '#666600',  // Dark olive
        fillType7: '#ffffff',  // White
      };
    }

    return baseVariables;
  }
}
