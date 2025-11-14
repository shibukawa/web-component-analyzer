# Theme System

This directory contains the theme management system for the Web Component Analyzer application.

## Features

- **Automatic theme detection**: Detects system color scheme preference using `prefers-color-scheme` media query
- **Manual theme toggle**: Users can manually switch between light and dark themes
- **LocalStorage persistence**: Theme preference is saved and restored across sessions
- **Seasonal decorations**: 
  - Light mode: Easter-themed decorations (eggs, bunnies)
  - Dark mode: Halloween-themed decorations (bats, pumpkins, mummies, zombies, vampires)
- **CSS custom properties**: Theme colors are exposed as CSS variables for easy styling
- **Smooth transitions**: Theme changes animate smoothly
- **Accessibility**: Respects `prefers-reduced-motion` for users who prefer reduced animations

## Usage

### Basic Setup

Wrap your app with the `ThemeProvider`:

```tsx
import { ThemeProvider } from './theme';

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Using Theme in Components

Use the `useTheme` hook to access theme data:

```tsx
import { useTheme } from './theme';

function MyComponent() {
  const { theme, themeMode, toggleTheme } = useTheme();
  
  return (
    <div style={{ color: theme.colors.primary }}>
      Current theme: {themeMode}
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

### Adding Decorations

Include the `ThemeDecorations` component in your layout:

```tsx
import { ThemeDecorations } from './theme';

function Layout() {
  return (
    <>
      <ThemeDecorations />
      <YourContent />
    </>
  );
}
```

### Theme Toggle Button

Use the pre-built `ThemeToggle` component:

```tsx
import { ThemeToggle } from './theme';

function Header() {
  return (
    <header>
      <h1>My App</h1>
      <ThemeToggle />
    </header>
  );
}
```

## CSS Custom Properties

The following CSS variables are available throughout your app:

- `--color-background`: Main background color
- `--color-foreground`: Main text color
- `--color-primary`: Primary accent color
- `--color-secondary`: Secondary accent color
- `--color-border`: Border color
- `--color-error`: Error state color

Example usage:

```css
.my-component {
  background: var(--color-background);
  color: var(--color-foreground);
  border: 1px solid var(--color-border);
}
```

## Theme Configuration

Themes are defined in `config/themes.ts`. Each theme includes:

- **colors**: Color palette for the theme
- **decorations**: Seasonal decorative elements with positions and sizes

### Light Theme (Easter)
- Orange and green color scheme
- Easter eggs and bunnies decorations
- Bright, cheerful appearance

### Dark Theme (Halloween)
- Orange and purple color scheme
- Bats, pumpkins, mummies, zombies, and vampires decorations
- Spooky, atmospheric appearance

## Customization

To customize themes, edit `packages/web/src/config/themes.ts`:

```typescript
export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#ffffff',
    foreground: '#1e1e1e',
    primary: '#ff9800',
    secondary: '#4caf50',
    border: '#e0e0e0',
    error: '#f44336'
  },
  decorations: {
    enabled: true,
    elements: [
      { type: 'egg', position: { x: 5, y: 10 }, size: 'small' },
      // Add more decorations...
    ]
  }
};
```

## Animation Details

Decorations include various animations:

- **Bats**: Flying animation with horizontal and vertical movement
- **Bunnies**: Hopping animation
- **Pumpkins**: Gentle swaying animation
- **Others**: Floating animation with rotation

All animations respect the `prefers-reduced-motion` media query for accessibility.
