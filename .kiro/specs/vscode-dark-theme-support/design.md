# Design Document: VS Code Dark Theme Support

## Overview

This design document outlines the technical approach for implementing dark theme support in the VS Code extension. The implementation will detect the user's VS Code theme preference and apply appropriate Mermaid theme variables to render diagrams with colors that match the editor's theme. The design leverages the existing web version's theme configuration while adapting it for the VS Code extension environment.

## Architecture

### High-Level Flow

```
VS Code Theme Change Event
        ↓
Theme Detection Service
        ↓
Theme Configuration Module
        ↓
HTML Content Generator
        ↓
Webview Script (Mermaid Initialization)
        ↓
Diagram Rendering with Theme Variables
```

### Component Interaction

1. **Extension Host** (packages/extension/src/extension.ts)
   - Listens for VS Code theme changes via `onDidChangeConfiguration` event
   - Notifies webview of theme changes

2. **Webview Panel Manager** (packages/extension/src/visualization/webview-panel-manager.ts)
   - Manages webview lifecycle
   - Sends theme information to webview on initialization and updates

3. **HTML Content Generator** (packages/extension/src/visualization/html-content-generator.ts)
   - Generates HTML with theme-aware CSS variables
   - Injects theme configuration into Mermaid initialization script

4. **Theme Configuration Module** (NEW: packages/extension/src/visualization/theme-config.ts)
   - Centralizes theme variable definitions
   - Provides theme detection logic
   - Returns appropriate Mermaid theme variables based on VS Code theme

5. **Webview Script** (inline in HTML)
   - Detects initial theme on load
   - Listens for theme change messages from extension
   - Re-initializes Mermaid with new theme variables
   - Re-renders diagram with new theme

## Components and Interfaces

### Theme Configuration Module

**File:** `packages/extension/src/visualization/theme-config.ts`

```typescript
interface ThemeColors {
  // Input props (blue tones)
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  
  // Processes (purple tones)
  secondaryColor: string;
  secondaryTextColor: string;
  secondaryBorderColor: string;
  
  // Data stores (green tones)
  tertiaryColor: string;
  tertiaryTextColor: string;
  tertiaryBorderColor: string;
  
  // General colors
  background: string;
  foreground: string;
  border: string;
  lineColor: string;
  edgeLabelBackground: string;
  clusterBkg: string;
  clusterBorder: string;
}

interface MermaidThemeConfig {
  theme: 'base';
  themeVariables: Record<string, string>;
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

type VSCodeTheme = 'light' | 'dark' | 'high-contrast';

export class ThemeConfig {
  static getTheme(vscodeTheme: VSCodeTheme): MermaidThemeConfig;
  static detectVSCodeTheme(): VSCodeTheme;
  static getThemeColors(vscodeTheme: VSCodeTheme): ThemeColors;
}
```

### Theme Detection Logic

**Location:** `packages/extension/src/visualization/theme-config.ts`

The theme detection will:
1. Check VS Code's `workbench.colorTheme` configuration
2. Detect if the theme contains 'dark' or 'high-contrast' keywords
3. Fall back to CSS class detection in webview (`vscode-dark`, `vscode-high-contrast`)
4. Default to 'light' if detection fails

### Mermaid Theme Variables

Theme variables will be imported directly from the web version (`packages/web/src/config/themes.ts`) to ensure consistency across platforms.

**Light Mode Colors (from web version):**
- Primary (Input Props): `#E3F2FD` (light blue)
- Secondary (Processes): `#F3E5F5` (light purple)
- Tertiary (Data Stores): `#E8F5E9` (light green)
- Background: `#ffffff`
- Foreground: `#1e1e1e`
- Border: `#e0e0e0`

**Dark Mode Colors (from web version):**
- Primary (Input Props): `#1a3a4a` (dark blue)
- Secondary (Processes): `#3a1a4a` (dark purple)
- Tertiary (Data Stores): `#1a3a1a` (dark green)
- Background: `#1e1e1e`
- Foreground: `#d4d4d4`
- Border: `#3e3e3e`

**High-Contrast Mode:**
- Uses high-contrast versions of the above colors
- Increased border width and saturation
- Enhanced text contrast ratios

**Implementation Note:**
The theme configuration will be extracted from the web version's theme definitions to maintain consistency and avoid duplication. The extension will import the theme colors and apply them to Mermaid's theme variables.

## Data Models

### Theme State

```typescript
interface ThemeState {
  currentTheme: VSCodeTheme;
  mermaidConfig: MermaidThemeConfig;
  cssVariables: Record<string, string>;
}
```

### Theme Change Message

```typescript
interface ThemeChangeMessage {
  type: 'themeChanged';
  theme: VSCodeTheme;
  mermaidConfig: MermaidThemeConfig;
}
```

## Error Handling

1. **Theme Detection Failure**
   - Default to 'light' theme
   - Log warning to extension output channel
   - Continue with default theme

2. **Mermaid Re-render Failure**
   - Catch rendering errors in webview script
   - Display error message to user
   - Preserve previous diagram state

3. **Configuration Mismatch**
   - Validate theme configuration before sending to webview
   - Ensure all required theme variables are present
   - Provide fallback values for missing variables

## Testing Strategy

### Unit Tests

1. **Theme Detection**
   - Test detection of light, dark, and high-contrast themes
   - Test fallback behavior when theme cannot be detected
   - Test theme configuration generation

2. **Theme Configuration**
   - Verify all required Mermaid theme variables are present
   - Verify color values match web version
   - Verify flowchart configuration matches web version

3. **Theme Switching**
   - Test theme change message handling
   - Test Mermaid re-initialization with new theme
   - Test diagram re-rendering with new colors

### Integration Tests

1. **Extension-Webview Communication**
   - Test theme change messages are sent correctly
   - Test webview receives and processes theme changes
   - Test diagram updates with new theme

2. **VS Code Theme Integration**
   - Test detection of VS Code theme changes
   - Test extension responds to configuration changes
   - Test webview updates when VS Code theme changes

### Property-Based Tests

1. **Theme Consistency**
   - For any valid VS Code theme, the extension SHALL generate valid Mermaid theme configuration
   - For any theme change, the diagram SHALL re-render without errors
   - For any diagram code, the theme variables SHALL not affect diagram structure

2. **Color Accessibility**
   - For any theme, text color contrast SHALL meet WCAG AA standards
   - For any theme, node colors SHALL be distinguishable from background
   - For any theme, edge colors SHALL be visible against background

## Implementation Phases

### Phase 1: Theme Configuration Module
- Create `theme-config.ts` with theme detection and configuration logic
- Define theme colors for light, dark, and high-contrast modes
- Implement Mermaid theme variable generation

### Phase 2: Extension Integration
- Update `webview-panel-manager.ts` to detect and send theme information
- Update `extension.ts` to listen for VS Code theme changes
- Implement theme change notification to webview

### Phase 3: HTML Content Generator Updates
- Update `html-content-generator.ts` to use theme configuration
- Inject theme variables into Mermaid initialization
- Add CSS variables for theme colors

### Phase 4: Webview Script Updates
- Update webview script to handle theme change messages
- Implement Mermaid re-initialization with new theme
- Implement diagram re-rendering with new colors

### Phase 5: Testing and Validation
- Write unit tests for theme detection and configuration
- Write integration tests for extension-webview communication
- Write property-based tests for theme consistency
- Manual testing with different VS Code themes

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Dark Theme Rendering

*For any* diagram code and when the extension is loaded with a dark theme active, the Mermaid diagram **SHALL** render with dark-mode colors for all node types (input props: #1a3a4a, processes: #3a1a4a, data stores: #1a3a1a).

**Validates:** Requirements 1.1

### Property 2: Light Theme Rendering

*For any* diagram code and when the extension is loaded with a light theme active, the Mermaid diagram **SHALL** render with light-mode colors matching the web version (input props: #E3F2FD, processes: #F3E5F5, data stores: #E8F5E9).

**Validates:** Requirements 1.3

### Property 3: Theme Change Idempotence

*For any* diagram and any valid theme, applying the same theme twice in succession **SHALL** result in the same diagram appearance as applying it once.

**Validates:** Requirements 1.2, 1.4, 3.2

### Property 4: Theme Consistency Across Platforms

*For any* diagram rendered in the extension with a given theme, the Mermaid theme variables (primary, secondary, tertiary colors, flowchart configuration) **SHALL** match the corresponding theme variables used in the web version for the same theme mode.

**Validates:** Requirements 2.1, 2.2, 2.3, 2.4

### Property 5: Diagram Structure Preservation

*For any* diagram code and any theme, the diagram structure (nodes, edges, relationships) **SHALL** remain unchanged when the theme is switched.

**Validates:** Requirements 1.1, 1.3, 1.5

### Property 6: Automatic Theme Detection

*For any* valid VS Code theme setting (light, dark, or high-contrast), the extension **SHALL** automatically detect the theme on webview initialization and generate a valid Mermaid configuration without errors.

**Validates:** Requirements 3.1

### Property 7: Theme Change Propagation

*For any* theme change event in VS Code, the extension **SHALL** receive the notification and update the diagram theme automatically, resulting in a re-rendered diagram with the new theme colors.

**Validates:** Requirements 3.2, 3.3

### Property 8: No Visual Flashing on Theme Change

*For any* theme change event, the diagram **SHALL** update to the new theme without displaying intermediate states or visual flashing.

**Validates:** Requirements 3.4

### Property 9: Color Accessibility

*For any* theme (light, dark, or high-contrast), all text elements **SHALL** have a contrast ratio of at least 4.5:1 against their background colors (WCAG AA standard).

**Validates:** Requirements 1.1, 1.3, 1.5

### Property 10: High-Contrast Mode Support

*For any* diagram rendered in high-contrast mode, the colors **SHALL** use high-contrast versions with increased saturation and border width, maintaining readability and accessibility.

**Validates:** Requirements 1.5

### Property 11: Theme Variable Format Consistency

*For any* diagram rendering, the theme variables **SHALL** be passed to Mermaid in a structured format that matches the web version's approach (object with themeVariables property).

**Validates:** Requirements 4.4

## Dependencies

### External Libraries
- `vscode`: VS Code API for theme detection and configuration
- `mermaid`: Diagram rendering library (already in use)

### Internal Modules
- `html-content-generator.ts`: For HTML generation
- `webview-panel-manager.ts`: For webview management
- `extension.ts`: For extension lifecycle management

## Performance Considerations

1. **Theme Detection**: Minimal overhead, performed once on initialization
2. **Theme Change Handling**: Efficient message passing between extension and webview
3. **Mermaid Re-initialization**: Only performed when theme changes, not on every render
4. **CSS Variables**: Efficient browser rendering with CSS custom properties

## Accessibility Considerations

1. **Color Contrast**: All theme colors meet WCAG AA standards
2. **High-Contrast Mode**: Special handling for users with visual impairments
3. **Keyboard Navigation**: No changes to keyboard navigation behavior
4. **Screen Readers**: No impact on screen reader functionality

## Future Enhancements

1. **Custom Theme Support**: Allow users to define custom theme colors
2. **Theme Persistence**: Remember user's theme preference across sessions
3. **Animated Theme Transitions**: Smooth color transitions when theme changes
4. **Theme Preview**: Show preview of diagram with different themes

