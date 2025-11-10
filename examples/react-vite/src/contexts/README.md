# React Context Examples

This directory contains example contexts for testing the web-component-analyzer extension's type-based classification for `useContext`.

## AuthContext

The `AuthContext` demonstrates a context with both data and function values:

### Data Values (should appear in data-store node)
- `user`: User object or null
- `isAuthenticated`: Boolean flag
- `isLoading`: Boolean flag

### Function Values (should be stored as write methods for edge inference)
- `login(email, password)`: Async function to log in
- `logout()`: Function to log out
- `updateProfile(data)`: Function to update user profile

## Expected DFD Behavior

When analyzing a component that uses `AuthContext`:

```tsx
const { user, isAuthenticated, isLoading, login, logout, updateProfile } = useContext(AuthContext);
```

The parser should:

1. **Create a single data-store node** with label: `"user, isAuthenticated, isLoading"`
2. **Store function names** as write methods: `["login", "logout", "updateProfile"]`
3. **Create edges** from processes to the data-store when functions are called:
   - `handleLogin` → context data-store (via `login`)
   - `handleLogout` → context data-store (via `logout`)
   - `handleUpdateProfile` → context data-store (via `updateProfile`)
4. **Create edges** from data-store to JSX when data values are displayed

## Type Classification

The TypeResolver uses VS Code's TypeScript Language Server to determine whether each destructured value is a function or data:

- **Functions**: Identified by type signatures like `(email: string, password: string) => Promise<void>`
- **Data**: Identified by type signatures like `User | null`, `boolean`, etc.

This approach is more accurate than heuristic-based classification and works with any TypeScript-typed context.
