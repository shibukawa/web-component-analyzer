# Design Document

## Overview

The DFD Visualization feature provides an interactive visual representation of component data flow diagrams in VS Code. It uses vis.js for network visualization and VS Code's webview API for rendering.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension                        │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │   Extension    │────────▶│  DFD Visualizer  │           │
│  │   Activation   │         │     Service      │           │
│  └────────────────┘         └──────────────────┘           │
│                                      │                       │
│                                      ▼                       │
│                             ┌──────────────────┐            │
│                             │  Webview Panel   │            │
│                             │    Manager       │            │
│                             └──────────────────┘            │
│                                      │                       │
└──────────────────────────────────────┼───────────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  Webview Panel   │
                              │   (HTML + JS)    │
                              │                  │
                              │  ┌────────────┐  │
                              │  │  vis.js    │  │
                              │  │  Network   │  │
                              │  └────────────┘  │
                              └──────────────────┘
```

### Component Interaction Flow

```
User Action (Command Palette)
        │
        ▼
Extension Command Handler
        │
        ├─▶ Get Active Editor
        ├─▶ Validate File Type
        ├─▶ Parse Component (React Parser)
        │
        ▼
DFD Visualizer Service
        │
        ├─▶ Get/Create Webview Panel
        ├─▶ Generate HTML Content
        ├─▶ Send DFD Data to Webview
        │
        ▼
Webview Panel
        │
        ├─▶ Load vis.js
        ├─▶ Create Network
        ├─▶ Apply Styling
        ├─▶ Enable Interactions
        │
        ▼
User Interaction (Zoom, Pan, Select)
```

## Components and Interfaces

### 1. Extension Command Handler

**Responsibility**: Register and handle the "Show Component DFD" command

**Interface**:
```typescript
interface CommandHandler {
  register(context: vscode.ExtensionContext): void;
  execute(): Promise<void>;
}
```

**Key Methods**:
- `register()`: Register command with VS Code
- `execute()`: Handle command execution
  - Get active editor
  - Validate file type
  - Call DFD Visualizer Service

### 2. DFD Visualizer Service

**Responsibility**: Orchestrate DFD generation and webview management

**Interface**:
```typescript
interface DFDVisualizerService {
  showDFD(document: vscode.TextDocument): Promise<void>;
  refresh(document: vscode.TextDocument): Promise<void>;
  dispose(): void;
}
```

**Key Methods**:
- `showDFD()`: Generate and display DFD for a document
  - Parse component using React Parser
  - Get or create webview panel
  - Send DFD data to webview
- `refresh()`: Update existing DFD
- `dispose()`: Clean up resources

### 3. Webview Panel Manager

**Responsibility**: Manage webview panel lifecycle and communication

**Interface**:
```typescript
interface WebviewPanelManager {
  getOrCreatePanel(
    document: vscode.TextDocument,
    componentName: string
  ): vscode.WebviewPanel;
  
  updatePanel(
    panel: vscode.WebviewPanel,
    dfdData: DFDSourceData
  ): void;
  
  dispose(): void;
}
```

**Key Methods**:
- `getOrCreatePanel()`: Get existing or create new webview panel
- `updatePanel()`: Send updated DFD data to webview
- `dispose()`: Clean up all panels

### 4. HTML Content Generator

**Responsibility**: Generate HTML content for webview

**Interface**:
```typescript
interface HTMLContentGenerator {
  generateHTML(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string;
}
```

**Key Methods**:
- `generateHTML()`: Generate complete HTML with vis.js integration
  - Include vis.js library
  - Include custom CSS
  - Include JavaScript for network rendering
  - Set up message handling

### 5. Webview Message Handler

**Responsibility**: Handle messages between extension and webview

**Interface**:
```typescript
interface WebviewMessage {
  type: 'ready' | 'error' | 'nodeSelected' | 'layoutComplete' | 'navigateToCode';
  data?: any;
}

interface MessageHandler {
  handleMessage(message: WebviewMessage): void;
  sendMessage(panel: vscode.WebviewPanel, message: WebviewMessage): void;
}
```

**Message Types**:
- `ready`: Webview is ready to receive data
- `error`: Error occurred in webview
- `nodeSelected`: User selected a node
- `layoutComplete`: Layout calculation finished
- `navigateToCode`: User double-clicked node to navigate to code

### 6. Code Navigation Service

**Responsibility**: Navigate to code locations from DFD nodes

**Interface**:
```typescript
interface CodeNavigationService {
  navigateToNode(
    document: vscode.TextDocument,
    nodeId: string,
    nodeMetadata: any
  ): Promise<void>;
}
```

**Key Methods**:
- `navigateToNode()`: Navigate to code location
  - Extract line/column from node metadata
  - Open document in editor
  - Move cursor to location
  - Highlight line

## Data Models

### DFD Source Data (from React Parser)

```typescript
interface DFDSourceData {
  nodes: DFDNode[];
  edges: DFDEdge[];
  errors?: ParseError[];
}

interface DFDNode {
  id: string;
  label: string;
  type: 'external-entity-input' | 'external-entity-output' | 'process' | 'data-store';
  metadata?: Record<string, any>;
}

interface DFDEdge {
  from: string;
  to: string;
  label?: string;
  isCleanup?: boolean;
}
```

### vis.js Network Data

```typescript
interface VisNode {
  id: string;
  label: string;
  shape: 'box' | 'ellipse';
  color: {
    background: string;
    border: string;
  };
  font: {
    size: number;
    color: string;
  };
}

interface VisEdge {
  from: string;
  to: string;
  label?: string;
  arrows: 'to';
  dashes?: boolean;
  smooth: {
    type: 'cubicBezier';
  };
}

interface VisNetworkData {
  nodes: VisNode[];
  edges: VisEdge[];
}
```

## Error Handling

### Error Types and Handling

1. **No Active Editor**
   - Detection: Check `vscode.window.activeTextEditor`
   - Response: Show error message "No active editor found"
   - Recovery: None (user must open a file)

2. **Unsupported File Type**
   - Detection: Check file extension against supported types
   - Response: Show error message "Unsupported file type. Supported: .tsx, .jsx, .vue"
   - Recovery: None (user must open supported file)

3. **Parse Error**
   - Detection: React Parser returns error
   - Response: Display error in webview with details
   - Recovery: Show partial DFD if available

4. **Timeout Error**
   - Detection: React Parser times out
   - Response: Display timeout message in webview
   - Recovery: Suggest simplifying component

5. **vis.js Load Error**
   - Detection: vis.js script fails to load
   - Response: Display error message in webview
   - Recovery: None (requires extension reinstall)

### Error Display in Webview

```html
<div class="error-container">
  <div class="error-icon">⚠️</div>
  <div class="error-title">Failed to Generate DFD</div>
  <div class="error-message">[Error details]</div>
  <div class="error-actions">
    <button onclick="retry()">Retry</button>
  </div>
</div>
```

## Testing Strategy

### Unit Tests

1. **Command Handler Tests**
   - Test command registration
   - Test command execution with valid file
   - Test command execution with no active editor
   - Test command execution with unsupported file

2. **DFD Visualizer Service Tests**
   - Test showDFD with valid component
   - Test showDFD with parse error
   - Test refresh functionality
   - Test resource disposal

3. **Webview Panel Manager Tests**
   - Test panel creation
   - Test panel reuse
   - Test panel disposal
   - Test message handling

4. **HTML Content Generator Tests**
   - Test HTML generation
   - Test CSP headers
   - Test resource URI generation

### Integration Tests

1. **End-to-End Visualization**
   - Open sample component file
   - Execute show DFD command
   - Verify webview panel appears
   - Verify DFD renders correctly

2. **Update Flow**
   - Show DFD for component
   - Modify component file
   - Save file
   - Verify DFD updates

3. **Error Scenarios**
   - Test with syntax error in component
   - Test with no component in file
   - Test with very large component

### Manual Testing

1. **Visual Verification**
   - Verify node colors match design
   - Verify edge arrows point correctly
   - Verify layout is readable

2. **Interaction Testing**
   - Test zoom with mouse wheel
   - Test pan with drag
   - Test node selection
   - Test double-click to fit

3. **Performance Testing**
   - Test with small component (< 10 nodes)
   - Test with medium component (10-50 nodes)
   - Test with large component (50-100 nodes)

## Visual Design

### Color Scheme

#### Light Theme

| Node Type | Background Color | Border Color | Text Color | Description |
|-----------|-----------------|--------------|------------|-------------|
| external-entity-input | #E3F2FD | #2196F3 | #1565C0 | Light blue for inputs |
| external-entity-output | #FFF3E0 | #FF9800 | #E65100 | Light orange for outputs |
| process | #F3E5F5 | #9C27B0 | #6A1B9A | Light purple for processes |
| data-store | #E8F5E9 | #4CAF50 | #2E7D32 | Light green for state |

**Background**: #FFFFFF  
**Edge Color**: #757575

#### Dark Theme

| Node Type | Background Color | Border Color | Text Color | Description |
|-----------|-----------------|--------------|------------|-------------|
| external-entity-input | #1E3A5F | #42A5F5 | #90CAF9 | Dark blue for inputs |
| external-entity-output | #4A3A2A | #FFB74D | #FFD54F | Dark orange for outputs |
| process | #3A2A4A | #BA68C8 | #CE93D8 | Dark purple for processes |
| data-store | #2A4A2A | #66BB6A | #A5D6A7 | Dark green for state |

**Background**: #1E1E1E  
**Edge Color**: #CCCCCC

### Typography

#### Light Theme
- **Node Labels**: 14px, sans-serif, #333333
- **Edge Labels**: 12px, sans-serif, #666666
- **Error Messages**: 14px, sans-serif, #D32F2F

#### Dark Theme
- **Node Labels**: 14px, sans-serif, #E0E0E0
- **Edge Labels**: 12px, sans-serif, #AAAAAA
- **Error Messages**: 14px, sans-serif, #EF5350

### Layout

- **Direction**: Left to right (inputs → processes → outputs)
- **Node Spacing**: 150px horizontal, 100px vertical
- **Edge Style**: Smooth cubic bezier curves
- **Cleanup Edges**: Dashed lines

### Webview Panel

- **Title**: "Component DFD: [ComponentName]"
- **Position**: Beside active editor
- **Background**: Theme-dependent (#FFFFFF for light, #1E1E1E for dark)
- **Padding**: 20px

### Theme Detection

The webview will detect the current VS Code theme using:

```javascript
// Detect theme from VS Code CSS variables
const isDarkTheme = document.body.classList.contains('vscode-dark') || 
                    document.body.classList.contains('vscode-high-contrast');

// Or use CSS variables
const backgroundColor = getComputedStyle(document.body)
  .getPropertyValue('--vscode-editor-background');
```

Theme changes will be detected via:
- Initial load: Check theme on webview creation
- Runtime: Listen for VS Code theme change events via message passing

## Implementation Notes

### Theme Detection and Application

#### Extension Side (TypeScript)

```typescript
// Detect current theme
function getCurrentTheme(): 'light' | 'dark' {
  const theme = vscode.window.activeColorTheme.kind;
  return theme === vscode.ColorThemeKind.Dark || 
         theme === vscode.ColorThemeKind.HighContrast
    ? 'dark'
    : 'light';
}

// Listen for theme changes
vscode.window.onDidChangeActiveColorTheme((theme) => {
  const newTheme = theme.kind === vscode.ColorThemeKind.Dark || 
                   theme.kind === vscode.ColorThemeKind.HighContrast
    ? 'dark'
    : 'light';
  
  // Send theme update to all active webview panels
  webviewPanels.forEach(panel => {
    panel.webview.postMessage({
      type: 'themeChanged',
      theme: newTheme
    });
  });
});
```

#### Webview Side (JavaScript)

```javascript
// Receive theme from extension
window.addEventListener('message', event => {
  const message = event.data;
  if (message.type === 'themeChanged') {
    applyTheme(message.theme);
    updateNetworkColors(message.theme);
  }
});

// Apply theme colors
function applyTheme(theme) {
  document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  
  // Update CSS variables
  if (theme === 'dark') {
    document.documentElement.style.setProperty('--bg-color', '#1E1E1E');
    document.documentElement.style.setProperty('--text-color', '#E0E0E0');
    document.documentElement.style.setProperty('--edge-color', '#CCCCCC');
  } else {
    document.documentElement.style.setProperty('--bg-color', '#FFFFFF');
    document.documentElement.style.setProperty('--text-color', '#333333');
    document.documentElement.style.setProperty('--edge-color', '#757575');
  }
}

// Update network node colors
function updateNetworkColors(theme) {
  const nodes = network.body.data.nodes;
  nodes.forEach(node => {
    const colors = getNodeColors(node.type, theme);
    nodes.update({
      id: node.id,
      color: colors
    });
  });
}
```

### vis.js Configuration

```javascript
const options = {
  layout: {
    hierarchical: {
      direction: 'LR',
      sortMethod: 'directed',
      nodeSpacing: 150,
      levelSeparation: 200
    }
  },
  physics: {
    enabled: true,
    hierarchicalRepulsion: {
      nodeDistance: 150
    },
    stabilization: {
      enabled: true,
      iterations: 100,
      onlyDynamicEdges: false
    }
  },
  interaction: {
    zoomView: true,
    dragView: true,
    hover: true,
    selectConnectedEdges: true
  },
  edges: {
    arrows: {
      to: { enabled: true, scaleFactor: 1 }
    },
    smooth: {
      type: 'cubicBezier',
      roundness: 0.5
    }
  }
};
```

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               script-src ${webview.cspSource}; 
               style-src ${webview.cspSource} 'unsafe-inline'; 
               img-src ${webview.cspSource} https:;">
```

### Resource Management

- Store webview panels in a Map keyed by file URI
- Dispose panels when file is closed
- Reuse panels when command is executed multiple times
- Clean up event listeners on panel disposal

### File Watching

```typescript
const watcher = vscode.workspace.createFileSystemWatcher('**/*.{tsx,jsx,vue}');
watcher.onDidChange((uri) => {
  // Debounce and refresh DFD if panel exists
});
```

### Code Navigation

#### Extension Side

```typescript
class CodeNavigationService {
  async navigateToNode(
    document: vscode.TextDocument,
    nodeId: string,
    nodeMetadata: any
  ): Promise<void> {
    // Extract line and column from metadata
    const line = nodeMetadata?.line;
    const column = nodeMetadata?.column || 0;
    
    if (line === undefined) {
      vscode.window.showInformationMessage(
        'Code location not available for this element'
      );
      return;
    }
    
    // Open document and navigate
    const editor = await vscode.window.showTextDocument(document);
    const position = new vscode.Position(line - 1, column); // Convert to 0-based
    const range = new vscode.Range(position, position);
    
    // Move cursor and reveal
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    
    // Highlight the line temporarily
    const decoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
      isWholeLine: true
    });
    editor.setDecorations(decoration, [range]);
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      decoration.dispose();
    }, 2000);
  }
}
```

#### Webview Side

```javascript
// Listen for double-click on nodes
network.on('doubleClick', function(params) {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    const node = network.body.data.nodes.get(nodeId);
    
    // Send navigation message to extension
    vscode.postMessage({
      type: 'navigateToCode',
      data: {
        nodeId: nodeId,
        metadata: node.metadata
      }
    });
  }
});
```

## Performance Considerations

1. **Lazy Loading**: Load vis.js only when webview is created
2. **Debouncing**: Debounce file save events (500ms)
3. **Physics Disable**: Disable physics after initial layout
4. **Resource Cleanup**: Dispose panels and listeners promptly
5. **Data Optimization**: Minimize data sent to webview

## Security Considerations

1. **CSP**: Strict Content Security Policy
2. **Local Resources**: Bundle vis.js locally, no CDN
3. **Input Sanitization**: Sanitize all user-provided content
4. **No eval()**: Avoid eval() and Function() constructor
5. **Message Validation**: Validate all messages from webview

