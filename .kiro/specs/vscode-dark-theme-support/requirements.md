# Requirements Document: VS Code Dark Theme Support

## Introduction

The VS Code extension currently renders Mermaid diagrams with a hardcoded light theme, regardless of the user's VS Code theme preference. The web version of the analyzer already supports dark theme with proper color schemes and Mermaid theme variables. This feature aims to bring dark theme support to the VS Code extension by detecting the user's theme preference and applying appropriate Mermaid theme variables, similar to the web implementation.

## Glossary

- **VS Code Theme**: The color scheme preference set by the user in VS Code (light, dark, or high-contrast)
- **Mermaid Theme**: The visual theme applied to Mermaid diagrams (base theme with customizable theme variables)
- **Theme Variables**: CSS custom properties and Mermaid-specific configuration values that control diagram colors
- **Webview**: The VS Code API component that displays the diagram in a panel
- **DFD (Data Flow Diagram)**: The diagram type being visualized in the extension

## Requirements

### Requirement 1

**User Story:** As a VS Code user with a dark theme preference, I want the component DFD diagrams to render with a dark color scheme, so that the diagrams are readable and visually consistent with my editor theme.

#### Acceptance Criteria

1. WHEN the extension webview is loaded in VS Code with a dark theme active THEN the Mermaid diagram SHALL render with dark-mode colors for all node types (input props, processes, data stores, output elements)

2. WHEN the user switches VS Code theme from light to dark THEN the diagram SHALL automatically re-render with the appropriate dark theme colors without requiring a manual refresh

3. WHEN the extension webview is loaded in VS Code with a light theme active THEN the Mermaid diagram SHALL render with light-mode colors matching the current web version implementation

4. WHEN the user switches VS Code theme from dark to light THEN the diagram SHALL automatically re-render with the appropriate light theme colors

5. WHEN the extension is used in high-contrast mode THEN the diagram SHALL render with high-contrast colors that maintain readability and accessibility

### Requirement 2

**User Story:** As a developer, I want the theme detection and application to be consistent between the web version and VS Code extension, so that the visual experience is unified across both platforms.

#### Acceptance Criteria

1. WHEN comparing the Mermaid theme variables between web and extension implementations THEN the color schemes for all node types (input props, processes, data stores, context data, functions, handlers) SHALL match between platforms

2. WHEN the extension renders a diagram THEN the theme variables for primary, secondary, and tertiary colors SHALL use the same dark/light mode color values as the web version

3. WHEN the extension renders a diagram THEN the flowchart configuration (curve, padding, nodeSpacing, rankSpacing) SHALL match the web version settings

4. WHEN the extension renders a diagram THEN the edge colors, label backgrounds, and cluster styling SHALL match the web version for both light and dark modes

### Requirement 3

**User Story:** As a VS Code extension user, I want the theme to be detected automatically and updated dynamically, so that I don't need to manually configure theme settings.

#### Acceptance Criteria

1. WHEN the webview initializes THEN the extension SHALL automatically detect the current VS Code theme (light, dark, or high-contrast) without user intervention

2. WHEN VS Code's theme changes THEN the extension SHALL receive a notification and update the diagram theme automatically

3. WHEN the diagram is re-rendered with a new theme THEN the Mermaid configuration SHALL be updated with the appropriate theme variables before rendering

4. WHEN the user opens the extension panel THEN the diagram SHALL render with the correct theme on first load, without any visual flashing or theme switching

### Requirement 4

**User Story:** As a developer maintaining the extension, I want the theme configuration to be centralized and reusable, so that theme changes can be made in one place and applied consistently.

#### Acceptance Criteria

1. WHEN the extension needs to apply theme variables THEN the theme configuration logic SHALL be extracted into a reusable utility or configuration module

2. WHEN the theme configuration is updated THEN the changes SHALL apply to all diagram renderings without requiring modifications to multiple files

3. WHEN comparing the extension theme configuration with the web version THEN the color definitions and theme variables SHALL be easily maintainable and synchronized

4. WHEN the extension renders a diagram THEN the theme variables SHALL be passed to Mermaid in a structured format that matches the web version's approach

