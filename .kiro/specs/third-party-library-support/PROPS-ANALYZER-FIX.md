# Props Analyzer Fix - Filtering Out Utility Functions

## Problem

The props analyzer was incorrectly extracting parameters from module-level utility functions (like `fetcher` and `createPost`) and treating them as component props. This caused:

- `url` parameter from `fetcher(url: string)` to be treated as a prop
- `post` parameter from `createPost(post: Omit<Post, 'id'>)` to be treated as a prop

## Root Cause

The props analyzer was processing ALL `FunctionDeclaration` and `VariableDeclaration` items in the module, not just exported ones. This meant that utility functions defined at the module level were being analyzed for props extraction.

### Code Flow That Was Broken

1. `analyzeProps()` iterates through all module items
2. For non-exported `FunctionDeclaration` items → extracted props from their parameters
3. For non-exported `VariableDeclaration` items → extracted props from their parameters
4. This caused utility functions to be treated as components

## Solution

Added filtering logic at two levels:

### Level 1: Module Item Filtering (analyzeProps method)

```typescript
} else if (item.type === 'FunctionDeclaration') {
  const funcName = (item as any).identifier?.value || 'unknown';
  console.log('[PropsAnalyzer] Found FunctionDeclaration:', funcName, '- SKIPPING (not exported)');
  // Skip non-exported function declarations (utility functions)
  continue;
} else if (item.type === 'VariableDeclaration') {
  // Only process variable declarations if they're exported
  // For now, skip all non-exported variable declarations
  console.log('[PropsAnalyzer] Found VariableDeclaration - SKIPPING (not exported)');
  continue;
}
```

**Effect**: Non-exported function and variable declarations are now skipped entirely.

### Level 2: Component Name Validation (extractPropsFromDeclaration method)

```typescript
if (declaration.type === 'VariableDeclaration') {
  const props: PropInfo[] = [];
  for (const decl of declaration.declarations) {
    if (decl.init && (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression')) {
      // Get the variable name to check if it's a component
      const varName = (decl.id as any)?.value || 'unknown';
      console.log('[PropsAnalyzer.extractPropsFromDeclaration] VariableDeclaration:', varName);
      
      // Only process if it looks like a React component (starts with uppercase)
      if (varName && varName[0] === varName[0].toUpperCase()) {
        console.log('[PropsAnalyzer.extractPropsFromDeclaration] Processing component:', varName);
        props.push(...this.extractPropsFromFunction(decl.init));
      } else {
        console.log('[PropsAnalyzer.extractPropsFromDeclaration] Skipping utility function:', varName);
      }
    }
  }
  return props;
}
```

**Effect**: Even if a variable declaration is exported, it's only processed if it starts with uppercase (React component naming convention).

### Level 3: Function Name Validation (extractPropsFromFunction method)

```typescript
if (func.type === 'FunctionDeclaration' && func.identifier) {
  const functionName = func.identifier.value;
  console.log('[PropsAnalyzer.extractPropsFromFunction] FunctionDeclaration:', functionName);
  // Skip functions that don't start with uppercase (not React components)
  if (functionName && functionName[0] !== functionName[0].toUpperCase()) {
    console.log('[PropsAnalyzer.extractPropsFromFunction] Skipping', functionName, '- does not start with uppercase');
    return props;
  }
}
```

**Effect**: Function declarations are only processed if they start with uppercase.

## Logging Added

Comprehensive logging has been added at each filtering point to help debug and trace where functions are being filtered:

1. **Module level**: Logs when each module item type is encountered
2. **Declaration level**: Logs when variable declarations are processed and whether they're skipped
3. **Function level**: Logs when functions are processed and whether they're skipped
4. **Object pattern level**: Logs when object patterns are being extracted

### Example Log Output

```
[PropsAnalyzer] Starting props analysis for file: examples/react-vite/src/components/103-TanStackQuery-BasicQuery.tsx
[PropsAnalyzer] Found ExportDefaultDeclaration
[PropsAnalyzer] Found VariableDeclaration - SKIPPING (not exported)
[PropsAnalyzer.extractPropsFromDeclaration] VariableDeclaration: TanStackQueryBasicQuery
[PropsAnalyzer.extractPropsFromDeclaration] Processing component: TanStackQueryBasicQuery
[PropsAnalyzer.extractPropsFromFunction] Processing ArrowFunctionExpression
[PropsAnalyzer.extractPropsFromObjectPattern] Processing object pattern with 0 properties
[PropsAnalyzer] Found 0 props after initial scan
```

## Files Modified

- `packages/analyzer/src/analyzers/props-analyzer.ts`
  - Added filtering logic to skip non-exported function and variable declarations
  - Added component name validation (uppercase check)
  - Added comprehensive logging at each filtering point

## Testing

The fix ensures that:

1. ✅ `fetcher(url: string)` is NOT extracted as a prop
2. ✅ `createPost(post: Omit<Post, 'id'>)` is NOT extracted as a prop
3. ✅ Only actual component props are extracted
4. ✅ Logging shows exactly where and why functions are being filtered

## Acceptance Tests Updated

- `examples/react-vite/src/components/103-TanStackQuery-BasicQuery.tsx` - YAML spec updated to remove `url` from props
- `examples/react-vite/src/components/104-TanStackQuery-Mutation.tsx` - YAML spec updated to remove `post` from props and add proper state/process definitions
