# Test Components for DFD Analysis

This directory contains test components designed to demonstrate various React patterns for Data Flow Diagram (DFD) analysis.

## Components

### 1. UserProfile.tsx
**Purpose:** Demonstrates props and custom event handlers

**Features:**
- Props: `userId`, `userName`, `initialEmail`
- Custom event handlers: `onUpdate`, `onDelete`
- Internal state: `email`, `isEditing`
- Named event handlers: `handleSave`, `handleCancel`, `handleDelete`
- Inline callbacks in JSX

**DFD Elements:**
- External Entity Input: Props (userId, userName, initialEmail)
- Data Stores: State (email, isEditing)
- Processes: Event handlers (handleSave, handleCancel, handleDelete)
- External Entity Output: Custom event handlers (onUpdate, onDelete), JSX

### 2. TodoItem.tsx
**Purpose:** Demonstrates multiple props and event handlers with conditional rendering

**Features:**
- Props: `id`, `title`, `completed`, `onToggle`, `onEdit`, `onRemove`
- Internal state: `isEditing`, `editText`
- Named event handlers: `handleSaveEdit`, `handleCancelEdit`
- Inline callbacks with event parameters
- Conditional rendering based on state

**DFD Elements:**
- External Entity Input: Props (id, title, completed)
- Data Stores: State (isEditing, editText)
- Processes: Event handlers (handleSaveEdit, handleCancelEdit, inline callbacks)
- External Entity Output: Custom event handlers (onToggle, onEdit, onRemove), JSX

### 3. Counter.tsx
**Purpose:** Demonstrates optional props with default values and conditional event firing

**Features:**
- Optional props with defaults: `initialValue`, `step`, `min`, `max`
- Custom event handlers: `onChange`, `onLimitReached`
- Internal state: `count`
- Named event handlers with conditional logic
- Mix of inline and named callbacks

**DFD Elements:**
- External Entity Input: Props (initialValue, step, min, max)
- Data Stores: State (count)
- Processes: Event handlers with conditional logic (handleIncrement, handleDecrement, handleReset)
- External Entity Output: Custom event handlers (onChange, onLimitReached), JSX

### 4. SearchBox.tsx
**Purpose:** Demonstrates useEffect hook and debouncing pattern

**Features:**
- Props: `placeholder`, `debounceMs`, `onSearch`, `onClear`, `onFocus`, `onBlur`
- Internal state: `query`, `isFocused`
- useEffect hook for debouncing
- Multiple custom event handlers
- Inline callbacks for DOM events

**DFD Elements:**
- External Entity Input: Props (placeholder, debounceMs)
- Data Stores: State (query, isFocused)
- Processes: useEffect (debounce logic), event handlers (handleClear, handleFocus, handleBlur)
- External Entity Output: Custom event handlers (onSearch, onClear, onFocus, onBlur), JSX

### 5. Timer.tsx
**Purpose:** Demonstrates useEffect with cleanup function for timer management

**Features:**
- Internal state: `seconds`, `isRunning`
- useEffect hook with cleanup function
- Named event handlers: `handleStart`, `handleStop`, `handleReset`
- Cleanup function that clears interval

**DFD Elements:**
- Data Stores: State (seconds, isRunning)
- Processes: useEffect (timer logic), cleanup (clear interval), event handlers
- External Entity Output: JSX
- Data Flows: useEffect → cleanup (with "cleanup" label)

### 6. DataSubscription.tsx
**Purpose:** Demonstrates useEffect with cleanup function for API subscription management

**Features:**
- Props: `userId`
- Internal state: `data`, `isConnected`
- useEffect hook with cleanup function
- Cleanup function with multiple external calls (api.unsubscribe, logger.log)

**DFD Elements:**
- External Entity Input: Props (userId)
- Data Stores: State (data, isConnected)
- Processes: useEffect (subscription logic), cleanup (unsubscribe and logging)
- External Entity Output: External calls (api.subscribe, api.unsubscribe, logger.log), JSX
- Data Flows: useEffect → cleanup (with "cleanup" label), cleanup → external calls

### 7. Demo.tsx
**Purpose:** Parent component that uses all test components

**Features:**
- Demonstrates how components with props and custom event handlers work together
- Shows data flow between parent and child components
- Implements all custom event handlers
- Manages state for multiple child components

## Testing with the Extension

To test these components with the web-component-analyzer extension:

1. Open any component file (e.g., `UserProfile.tsx`)
2. Open the Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
3. Run "Show Component Structure Preview"
4. View the generated DFD in the webview panel

## Expected DFD Patterns

Each component should generate a DFD showing:

1. **External Entity Input (Props):**
   - All props should appear as input nodes
   - Props with function types (event handlers) should be distinguished

2. **Data Stores (State):**
   - All useState variables should appear as data store nodes
   - Read-write pairs should be represented as single nodes

3. **Processes:**
   - Named event handlers should appear as process nodes
   - Inline callbacks should appear as process nodes with generated names
   - useEffect hooks should appear as process nodes
   - Cleanup functions should appear as separate process nodes with "cleanup" label

4. **External Entity Output:**
   - Custom event handler calls (onUpdate, onDelete, etc.) should appear as output nodes
   - JSX output should appear as a single output node

5. **Data Flows:**
   - Props → Processes (when props are used in handlers)
   - Processes → Data Stores (when calling setState)
   - Data Stores → Processes (when reading state)
   - Data Stores → JSX (when displaying state)
   - Processes → External Outputs (when calling custom handlers)
   - JSX → Inline Callbacks (when using inline arrow functions)
   - useEffect → Cleanup (when useEffect returns a cleanup function, with "cleanup" label)

## Running the Demo

```bash
cd examples/react-vite
npm install
npm run dev
```

Then open http://localhost:5173 and click "Show Component Demo" to see all components in action.
