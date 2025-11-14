# Web Component Analyzer

A VS Code extension that visualizes the internal structure of frontend components through interactive Data Flow Diagrams (DFD).

## Features

### Interactive Component Visualization

Analyze and visualize component architecture by parsing code and displaying data flow between props, context/state, and output in an interactive network diagram.

![Component DFD Visualization](images/dfd-example.png)

### Supported Features

- **Visual Data Flow Diagrams**: See how data flows through your components
- **Conditional Subgraphs**: Visualize conditional rendering (ternary operators, logical AND/OR) as nested subgraphs
- **Loop Subgraphs**: See `.map()` loops represented as subgraphs with "iterates over" edges
- **Multiple Node Types**: Distinguish between inputs (props/context), processes (computations/handlers), state stores, and outputs
- **Attribute Reference Tracking**: See how event handlers and data flow to JSX elements through attributes
- **Interactive Navigation**: Double-click nodes to jump directly to the code location
- **Auto-refresh**: Diagrams automatically update when you save your component file
- **Theme Support**: Automatically adapts to your VS Code theme (light/dark)
- **Zoom & Pan**: Explore complex components with intuitive mouse controls

### Supported File Types

- React: `.tsx`, `.jsx`
- Vue: `.vue` (coming soon)

## Usage

### Show Component DFD

1. Open a React component file (`.tsx` or `.jsx`)
2. Use one of these methods:
   - **Context menu**: Right-click in the editor and select "Show Component DFD"
   - **Keyboard shortcut**: `Cmd+Shift+D` (macOS) or `Ctrl+Shift+D` (Windows/Linux)
   - **Command Palette**: Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux), type "Show Component DFD", and press Enter
3. The DFD will appear in a new panel beside your editor

### Navigate to Code

Double-click any node in the diagram to jump to its definition in your code. The extension will:
- Open the file (if not already open)
- Move the cursor to the exact line
- Highlight the line temporarily for easy identification

### Refresh Diagram

The diagram automatically refreshes when you save your file. You can also manually refresh:
- **Keyboard shortcut**: `Cmd+Shift+R` (macOS) or `Ctrl+Shift+R` (Windows/Linux)
- **Command Palette**: Type "Refresh Component DFD" and press Enter

### Interact with the Diagram

- **Zoom**: Scroll with mouse wheel or use pinch gesture on trackpad
- **Pan**: Click and drag on empty space
- **Select**: Click on a node to highlight it
- **Navigate**: Double-click a node to jump to its code location

## Keyboard Shortcuts

| Command | macOS | Windows/Linux |
|---------|-------|---------------|
| Show Component DFD | `Cmd+Shift+D` | `Ctrl+Shift+D` |
| Refresh Component DFD | `Cmd+Shift+R` | `Ctrl+Shift+R` |

Note: Keyboard shortcuts only work when a supported file type (`.tsx`, `.jsx`, `.vue`) is open and focused.

## Understanding the Diagram

### Node Types

The diagram uses different colors and shapes to represent different element types:

#### Light Theme
- **Blue boxes**: Input entities (props, context values)
- **Orange boxes**: Output entities (rendered elements, function calls)
- **Purple ellipses**: Processes (computations, event handlers, effects)
- **Green boxes**: Data stores (state, refs)

#### Dark Theme
- **Dark blue boxes**: Input entities
- **Dark orange boxes**: Output entities
- **Dark purple ellipses**: Processes
- **Dark green boxes**: Data stores

### Edge Types

- **Solid arrows**: Normal data flow
- **Dashed arrows**: Cleanup or teardown operations

### Subgraphs

The diagram organizes JSX output into hierarchical subgraphs to represent conditional rendering and loops:

#### Conditional Subgraphs

When your component uses conditional rendering (ternary operators or logical AND/OR), the diagram creates nested subgraphs to show which UI elements are conditionally displayed:

- **Label format**: `{condition}` - e.g., `{isLoggedIn}`, `{count > 5}`, `{!isAuthenticated}`
- **Condition edges**: Arrows labeled "controls visibility" connect state/props to conditional subgraphs
- **Nested structure**: Nested conditionals create multiple levels of subgraphs

**Example**: A component with `{isLoggedIn && <div>...</div>}` will show:
```
JSX Output
└── {isLoggedIn}
    └── div (with child elements)
```

**Edge**: `isLoggedIn` → `{isLoggedIn}` subgraph (labeled "controls visibility")

#### Loop Subgraphs

When your component uses `.map()` to render lists, the diagram creates loop subgraphs:

- **Label format**: `{loop}`
- **Loop edges**: Arrows labeled "iterates over" connect array variables to loop subgraphs
- **Nested loops**: Multiple nested `.map()` calls with no intermediate content are merged into a single `{loop}` subgraph

**Example**: A component with `{items.map(item => <li>{item}</li>)}` will show:
```
JSX Output
└── {loop}
    └── li
```

**Edge**: `items` → `{loop}` subgraph (labeled "iterates over")

#### Attribute Reference Edges

The diagram shows how data and event handlers flow to JSX elements through attributes:

- **Event handlers**: Edges labeled with the attribute name (e.g., "onClick", "onChange", "onSubmit")
- **Data attributes**: Edges labeled "display" for data passed to attributes like `value`, `disabled`, etc.

**Example**: `<button onClick={handleClick}>` creates an edge:
- `handleClick` → button (labeled "onClick")

**Example**: `<input value={email} onChange={setEmail}>` creates edges:
- `email` → input (labeled "display")
- `setEmail` → input (labeled "onChange")

### Complete Example

For a component like this:

```tsx
function LoginForm({ isLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const handleLogin = () => { /* ... */ };

  return (
    <div>
      {!isLoggedIn && (
        <div>
          <input value={email} onChange={setEmail} />
          <button onClick={handleLogin}>Login</button>
        </div>
      )}
    </div>
  );
}
```

The diagram will show:

**Nodes**:
- `isLoggedIn` (prop - blue box)
- `email` (state - green box)
- `setEmail` (state setter - green box)
- `handleLogin` (event handler - purple ellipse)

**Subgraphs**:
```
JSX Output
└── {!isLoggedIn}
    ├── input
    └── button
```

**Edges**:
- `isLoggedIn` → `{!isLoggedIn}` subgraph (labeled "controls visibility")
- `email` → input (labeled "display")
- `setEmail` → input (labeled "onChange")
- `handleLogin` → button (labeled "onClick")

## Requirements

- VS Code 1.105.0 or higher
- Node.js 22.x or higher (for development)

## Extension Settings

This extension does not currently add any VS Code settings.

## Known Issues

- Vue component support is planned but not yet implemented
- Very large components (100+ nodes) may take a few seconds to render
- Some complex TypeScript types may not be fully resolved

## Release Notes

### 0.1.0

Enhanced JSX visualization:
- **Conditional subgraphs**: Visualize conditional rendering (ternary, logical AND/OR) as nested subgraphs
- **Loop subgraphs**: Represent `.map()` loops with dedicated subgraphs
- **Attribute reference tracking**: Show event handlers and data flowing to JSX elements through attributes
- **Smart edge labeling**: Distinguish between "controls visibility", "iterates over", "onClick", "onChange", and "display" edges
- **Nested loop merging**: Automatically merge nested `.map()` calls into single subgraphs
- **Empty subgraph filtering**: Clean diagrams by omitting elements without data dependencies

### 0.0.1

Initial release:
- React component DFD visualization
- Interactive network diagrams with vis.js
- Code navigation from diagram nodes
- Auto-refresh on file save
- Light and dark theme support

## Development

### Building from Source

```bash
# Install dependencies
pnpm install

# Compile TypeScript
pnpm run compile

# Compile webview resources
pnpm run compile:webview

# Watch mode for development
pnpm run watch
```

### Running Tests

```bash
pnpm run test
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

[Add your license here]

---

**Enjoy visualizing your components!**
