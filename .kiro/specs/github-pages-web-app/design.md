# Design Document

## Overview

The GitHub Pages web application provides an interactive, browser-based interface for analyzing React, Vue.js, and Svelte components. Users can select from sample components or paste their own code into a syntax-highlighted editor, with real-time visualization of component data flow diagrams rendered using Mermaid.js. The application features a split-pane layout, theme support with seasonal decorations, and URL-based code sharing.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Application                       │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │   Code Editor Pane   │  │  Visualization Pane      │ │
│  │  - Sample Selector   │  │  - Mermaid Renderer      │ │
│  │  - Syntax Highlight  │  │  - Theme-aware styling   │ │
│  │  - Share Button      │  │                          │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│              │                        ▲                  │
│              │                        │                  │
│              ▼                        │                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Analyzer Engine                          │   │
│  │  - AST Parser                                    │   │
│  │  - DFD Builder                                   │   │
│  │  - Mermaid Transformer                           │   │
│  └─────────────────────────────────────────────────┘   │
│              ▲                                           │
│              │                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │         URL State Manager                        │   │
│  │  - Compression/Decompression                     │   │
│  │  - Base64 Encoding/Decoding                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Theme Manager                            │   │
│  │  - System preference detection                   │   │
│  │  - Manual toggle                                 │   │
│  │  - Local storage persistence                     │   │
│  │  - Seasonal decorations                          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 6.0+
- **Code Editor**: Monaco Editor (VS Code's editor component)
- **Syntax Highlighting**: Monaco Editor built-in language support
- **Diagram Rendering**: Mermaid.js 11.12+
- **Styling**: CSS Modules with CSS custom properties for theming
- **Analyzer**: @web-component-analyzer/analyzer package
- **Deployment**: GitHub Pages (static site)



## Components and Interfaces

### Component Hierarchy

```
App
├── ThemeProvider
│   └── ThemeDecorations (Halloween/Easter elements)
├── Header
│   ├── Logo
│   ├── ThemeToggle
│   └── ShareButton
└── SplitPane
    ├── EditorPane
    │   ├── SampleSelector
    │   └── MonacoEditor
    └── VisualizationPane
        ├── ErrorDisplay
        └── MermaidDiagram
```

### Core Interfaces

```typescript
// Sample component definition
interface SampleComponent {
  id: string;
  name: string;
  framework: 'react' | 'vue' | 'svelte';
  code: string;
  description: string;
}

// Theme configuration
interface Theme {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    border: string;
    error: string;
  };
  decorations: {
    enabled: boolean;
    elements: DecorationElement[];
  };
}

interface DecorationElement {
  type: 'bat' | 'pumpkin' | 'mummy' | 'zombie' | 'vampire' | 'egg' | 'bunny';
  position: { x: number; y: number };
  size: 'small' | 'medium' | 'large';
}

// URL state for sharing
interface SharedState {
  code: string;
  framework?: 'react' | 'vue' | 'svelte';
}

// Analysis result
interface AnalysisResult {
  success: boolean;
  mermaidCode?: string;
  error?: string;
}
```



### Component Specifications

#### App Component
- Root component managing global state
- Coordinates theme, code analysis, and URL state
- Renders layout structure

#### ThemeProvider
- Detects system color scheme preference
- Manages theme state (light/dark)
- Provides theme context to child components
- Handles local storage persistence
- Triggers decoration rendering based on theme

#### Header Component
- Displays application title and logo
- Contains theme toggle button
- Contains share button
- Fixed position at top of viewport

#### SampleSelector Component
- Dropdown menu for selecting example components
- Groups samples by framework (React, Vue, Svelte)
- Triggers code editor update on selection
- Props:
  - `samples: SampleComponent[]`
  - `onSelect: (sample: SampleComponent) => void`
  - `currentFramework?: string`

#### MonacoEditor Component
- Wraps Monaco Editor with React
- Configures language mode based on framework
- Handles code changes with debouncing (300ms)
- Props:
  - `value: string`
  - `onChange: (value: string) => void`
  - `language: 'typescript' | 'vue' | 'svelte'`
  - `theme: 'vs-light' | 'vs-dark'`

#### VisualizationPane Component
- Container for diagram rendering
- Displays loading state during analysis
- Shows error messages when parsing fails
- Props:
  - `mermaidCode: string | null`
  - `error: string | null`
  - `loading: boolean`

#### MermaidDiagram Component
- Renders Mermaid.js diagrams
- Applies theme-appropriate styling
- Handles diagram initialization and updates
- Props:
  - `code: string`
  - `theme: Theme`

#### ShareButton Component
- Compresses and encodes current code
- Generates shareable URL
- Copies URL to clipboard
- Shows success/error feedback
- Props:
  - `code: string`
  - `framework: string`

#### ThemeDecorations Component
- Renders seasonal decorative elements
- Positions elements using absolute positioning
- Animates elements (floating, rotating)
- Props:
  - `theme: Theme`



## Data Models

### Sample Components Data

Sample components will be stored as a static JSON file loaded at application startup:

```typescript
const sampleComponents: SampleComponent[] = [
  {
    id: 'react-simple-props',
    name: 'Simple Props',
    framework: 'react',
    code: '// React component code...',
    description: 'Basic component with props'
  },
  // ... more samples
];
```

Sample categories:
- **React**: 5+ examples covering props, state, hooks, context, effects
- **Vue**: 3+ examples covering props, reactive state, computed, watchers
- **Svelte**: 3+ examples covering props, reactive declarations, stores

### Theme Data Model

```typescript
const themes = {
  light: {
    mode: 'light',
    colors: {
      background: '#ffffff',
      foreground: '#1e1e1e',
      primary: '#ff9800',      // Easter orange
      secondary: '#4caf50',     // Easter green
      border: '#e0e0e0',
      error: '#f44336'
    },
    decorations: {
      enabled: true,
      elements: [
        { type: 'egg', position: { x: 10, y: 10 }, size: 'small' },
        { type: 'bunny', position: { x: 90, y: 5 }, size: 'medium' },
        // ... more Easter decorations
      ]
    }
  },
  dark: {
    mode: 'dark',
    colors: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      primary: '#ff6b35',       // Halloween orange
      secondary: '#9b59b6',     // Halloween purple
      border: '#3e3e3e',
      error: '#f44336'
    },
    decorations: {
      enabled: true,
      elements: [
        { type: 'bat', position: { x: 15, y: 8 }, size: 'small' },
        { type: 'pumpkin', position: { x: 85, y: 12 }, size: 'medium' },
        // ... more Halloween decorations
      ]
    }
  }
};
```

### URL State Encoding

The URL query parameter format:
```
?code=<base64-encoded-compressed-data>&framework=<react|vue|svelte>
```

Compression/decompression flow:
1. **Encoding**: code → UTF-8 bytes → CompressionStream (gzip) → base64 → URL parameter
2. **Decoding**: URL parameter → base64 decode → DecompressionStream (gzip) → UTF-8 string → code



## Error Handling

### Error Categories

1. **Parse Errors**: Invalid component syntax
   - Display error message in visualization pane
   - Highlight error location if available
   - Provide helpful suggestions

2. **Compression/Decompression Errors**: Invalid shared URL
   - Show error notification
   - Fall back to empty editor
   - Log error details to console

3. **Mermaid Rendering Errors**: Invalid diagram syntax
   - Display error message
   - Show raw Mermaid code for debugging
   - Provide fallback visualization

4. **Network Errors**: Failed to load resources
   - Show loading state
   - Retry mechanism for critical resources
   - Graceful degradation

### Error Display Strategy

```typescript
interface ErrorState {
  type: 'parse' | 'compression' | 'rendering' | 'network';
  message: string;
  details?: string;
  recoverable: boolean;
}
```

- **Parse errors**: Display in visualization pane with code context
- **Compression errors**: Toast notification at top of screen
- **Rendering errors**: Fallback to text display of Mermaid code
- **Network errors**: Retry button with error message



## Testing Strategy

### Unit Tests

**Components to Test:**
- URL state encoding/decoding utilities
- Theme detection and persistence logic
- Sample component data loading
- Mermaid code generation from DFD data

**Testing Framework:** Vitest with React Testing Library

**Key Test Cases:**
```typescript
describe('URL State Manager', () => {
  test('compresses and encodes code correctly');
  test('decompresses and decodes URL parameter');
  test('handles invalid base64 data gracefully');
  test('handles decompression errors');
});

describe('Theme Manager', () => {
  test('detects system color scheme preference');
  test('persists theme selection to localStorage');
  test('loads persisted theme on mount');
  test('applies correct decoration set for theme');
});

describe('Analyzer Integration', () => {
  test('parses React component and generates Mermaid');
  test('parses Vue component and generates Mermaid');
  test('parses Svelte component and generates Mermaid');
  test('handles syntax errors gracefully');
});
```

### Integration Tests

**Scenarios:**
1. Load application → Select sample → Verify diagram renders
2. Paste code → Verify analysis → Verify diagram updates
3. Click share → Verify URL generated → Open URL → Verify code restored
4. Toggle theme → Verify colors change → Verify decorations change
5. Resize window → Verify responsive layout

### Manual Testing

**Browser Compatibility:**
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

**Responsive Testing:**
- Desktop: 1920x1080, 1366x768
- Tablet: 768x1024
- Mobile: 375x667 (stacked layout)

**Theme Testing:**
- Light mode with Easter decorations
- Dark mode with Halloween decorations
- Theme toggle functionality
- System preference detection



## Implementation Details

### Monaco Editor Integration

```typescript
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

function MonacoEditor({ value, onChange, language, theme }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      editorRef.current = monaco.editor.create(containerRef.current, {
        value,
        language,
        theme,
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
      });

      editorRef.current.onDidChangeModelContent(() => {
        onChange(editorRef.current.getValue());
      });
    }

    return () => editorRef.current?.dispose();
  }, []);

  return <div ref={containerRef} style={{ height: '100%' }} />;
}
```

### Compression Utilities

```typescript
async function compressAndEncode(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    }
  });

  const compressedStream = stream.pipeThrough(
    new CompressionStream('gzip')
  );

  const chunks: Uint8Array[] = [];
  const reader = compressedStream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const compressed = new Uint8Array(
    chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  );
  
  let offset = 0;
  for (const chunk of chunks) {
    compressed.set(chunk, offset);
    offset += chunk.length;
  }

  return btoa(String.fromCharCode(...compressed));
}

async function decodeAndDecompress(encoded: string): Promise<string> {
  const compressed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    }
  });

  const decompressedStream = stream.pipeThrough(
    new DecompressionStream('gzip')
  );

  const chunks: Uint8Array[] = [];
  const reader = decompressedStream.getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const decompressed = new Uint8Array(
    chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  );
  
  let offset = 0;
  for (const chunk of chunks) {
    decompressed.set(chunk, offset);
    offset += chunk.length;
  }

  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}
```

### Mermaid Integration

```typescript
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

function MermaidDiagram({ code, theme }) {
  const containerRef = useRef(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme.mode === 'dark' ? 'dark' : 'default',
      themeVariables: {
        primaryColor: theme.colors.primary,
        primaryTextColor: theme.colors.foreground,
        primaryBorderColor: theme.colors.border,
        lineColor: theme.colors.secondary,
        secondaryColor: theme.colors.secondary,
        tertiaryColor: theme.colors.background,
      },
    });
  }, [theme]);

  useEffect(() => {
    if (containerRef.current && code) {
      const id = `mermaid-${Date.now()}`;
      mermaid.render(id, code).then(({ svg }) => {
        containerRef.current.innerHTML = svg;
      }).catch(error => {
        containerRef.current.innerHTML = `
          <div style="color: ${theme.colors.error}">
            <h3>Rendering Error</h3>
            <pre>${error.message}</pre>
          </div>
        `;
      });
    }
  }, [code, theme]);

  return <div ref={containerRef} />;
}
```

### Analyzer Integration

```typescript
import { parseComponent, buildDFD } from '@web-component-analyzer/analyzer';

async function analyzeComponent(
  code: string,
  framework: 'react' | 'vue' | 'svelte'
): Promise<AnalysisResult> {
  try {
    // Parse the component code
    const ast = parseComponent(code, framework);
    
    // Build DFD from AST
    const dfd = buildDFD(ast);
    
    // Transform to Mermaid syntax
    const mermaidCode = transformToMermaid(dfd);
    
    return {
      success: true,
      mermaidCode
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function transformToMermaid(dfd: DFDData): string {
  // Convert DFD data structure to Mermaid flowchart syntax
  // This will use the existing mermaid-transformer from the extension
  // but adapted for web use
}
```

### Responsive Layout

```css
.split-pane {
  display: flex;
  height: calc(100vh - 60px); /* Account for header */
}

.editor-pane,
.visualization-pane {
  flex: 1;
  overflow: auto;
}

@media (max-width: 768px) {
  .split-pane {
    flex-direction: column;
  }
  
  .editor-pane {
    height: 50vh;
  }
  
  .visualization-pane {
    height: 50vh;
  }
}
```

### Theme Decorations

```typescript
function ThemeDecorations({ theme }: { theme: Theme }) {
  if (!theme.decorations.enabled) return null;

  return (
    <div className="decorations">
      {theme.decorations.elements.map((element, index) => (
        <div
          key={index}
          className={`decoration decoration-${element.type} decoration-${element.size}`}
          style={{
            left: `${element.position.x}%`,
            top: `${element.position.y}%`,
          }}
        >
          {getDecorationIcon(element.type)}
        </div>
      ))}
    </div>
  );
}

function getDecorationIcon(type: string): string {
  const icons = {
    bat: '🦇',
    pumpkin: '🎃',
    mummy: '🧟',
    zombie: '🧟‍♂️',
    vampire: '🧛',
    egg: '🥚',
    bunny: '🐰',
  };
  return icons[type] || '';
}
```

### GitHub Pages Deployment

**Build Configuration (vite.config.ts):**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/web-component-analyzer/', // GitHub repo name
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['monaco-editor', 'mermaid'],
  },
});
```

**GitHub Actions Workflow (.github/workflows/deploy.yml):**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'npm'
      - run: npm install --workspaces --include-workspace-root
      - run: npm run --workspace @web-component-analyzer/web build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./packages/web/dist
```

