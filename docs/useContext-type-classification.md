# useContext Type-Based Classification

## Overview

Task 24 enhances the web-component-analyzer to use TypeScript type information for classifying `useContext` return values. This provides more accurate DFD generation by distinguishing between data values and function values in context objects.

## Implementation Summary

### 1. TypeResolver Integration (Task 24.1)

Added `classifyUseContextReturnValues` method to `SWCHooksAnalyzer` that:
- Uses the TypeResolver to query type information for each destructured context property
- Classifies each property as either 'function' or 'data' based on TypeScript types
- Falls back to heuristic-based classification when type information is unavailable
- Stores classification results in `HookInfo.variableTypes` map

### 2. Hooks Analyzer Updates (Task 24.2)

Modified the `analyzeHooks` method to:
- Detect `useContext` calls during hook analysis
- Call `classifyUseContextReturnValues` for each useContext hook
- Store type classification metadata with the hook information

### 3. Unified Node Creation (Task 24.3)

Updated `createContextNode` in DFD Builder to:
- Create a single data-store node containing only data values
- Exclude function values from the node label
- Store function names as `writeMethods` in node metadata for edge inference
- Fall back to legacy classification when type information is unavailable

### 4. Edge Inference (Task 24.4)

Enhanced `inferProcessesToDataStores` to:
- Check for context write methods in process references
- Create edges from processes to context data-store when context functions are called
- Handle patterns like `login(credentials)`, `logout()`, `updateProfile(data)`

### 5. Sample Components (Task 24.5)

Created example components demonstrating the feature:
- `examples/react-vite/src/contexts/AuthContext.tsx`: Context with both data and function values
- `examples/react-vite/src/components/AuthConsumer.tsx`: Component using the context
- `examples/react-vite/src/contexts/README.md`: Documentation of expected behavior

## Example

### Context Definition

```typescript
interface AuthContextType {
  // Data values
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Function values
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}
```

### Component Usage

```typescript
const { user, isAuthenticated, isLoading, login, logout, updateProfile } = useContext(AuthContext);

const handleLogin = async () => {
  await login(email, password);
};
```

### Expected DFD Structure

1. **Data-store node**: `"user, isAuthenticated, isLoading"`
   - Type: `data-store`
   - Contains only data values

2. **Write methods**: `["login", "logout", "updateProfile"]`
   - Stored in node metadata
   - Used for edge inference

3. **Edges**:
   - `handleLogin` → context data-store (via `login` function)
   - `handleLogout` → context data-store (via `logout` function)
   - `handleUpdateProfile` → context data-store (via `updateProfile` function)
   - context data-store → JSX (displaying `user`, `isAuthenticated`, `isLoading`)

## Benefits

1. **Accuracy**: Uses TypeScript type information instead of heuristics
2. **Consistency**: Treats useContext similar to custom hooks and useState
3. **Clarity**: Single unified node for context data makes DFDs easier to understand
4. **Flexibility**: Falls back to legacy behavior when type information is unavailable

## Technical Details

### Type Classification Process

1. Parser encounters `useContext` call with destructuring
2. Hooks Analyzer extracts variable names from destructuring pattern
3. TypeResolver queries VS Code's TypeScript Language Server for each property
4. TypeClassifier determines if each property is a function based on type signature
5. Results stored in `HookInfo.variableTypes` map

### Fallback Behavior

When TypeResolver is unavailable or type information cannot be determined:
- Falls back to heuristic-based classification using naming patterns
- Uses legacy `createContextNodeLegacy` method
- Maintains backward compatibility with existing behavior

## Testing

To test the implementation:

1. Open `examples/react-vite/src/components/AuthConsumer.tsx` in VS Code
2. Run the "Show Component Structure" command
3. Verify the DFD shows:
   - Single data-store node for context data values
   - Edges from event handlers to context data-store
   - Edges from context data-store to JSX output

## Future Enhancements

- Support for array destructuring patterns: `const [state, dispatch] = useContext(StateContext)`
- Better handling of nested context objects
- Performance optimization for large context objects
- Integration with other state management patterns (Redux, MobX, etc.)
