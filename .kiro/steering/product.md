# Product Overview

web-component-analyzer is a VS Code extension that visualizes the internal structure of frontend components through Data Flow Diagrams (DFD).

## Purpose

Analyze and visualize component architecture by parsing code and displaying data flow between props, context/state, and output.

## Core Features

### Visual Component Preview

- Trigger via Command Palette on `.tsx`, `.jsx`, `.vue` files
- Display visual structure preview in a webview panel
- Show component data flow diagram using vis.js

### Code Analysis

The extension analyzes and visualizes:

1. **Props/Properties**: Input parameters to the component
2. **Context/State**: Internal state management and context usage
3. **Output**: Rendered output and emitted events

### Visualization

- **Library**: vis.js for network diagram layout
- **Format**: Data Flow Diagram (DFD)
- **Display**: VS Code webview panel

## Supported File Types

- React: `.tsx`, `.jsx`
- Vue: `.vue`
- (Extensible to other frameworks)

## Extension Details

- Extension ID: `web-component-analyzer`
- Activation: File-based activation for component files
- Primary Command: Show component structure preview
