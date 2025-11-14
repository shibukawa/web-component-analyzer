import type { Theme } from '../types/theme';

export const lightTheme: Theme = {
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
      { type: 'egg', position: { x: 5, y: 10 }, size: 'small' },
      { type: 'egg', position: { x: 15, y: 5 }, size: 'medium' },
      { type: 'bunny', position: { x: 90, y: 8 }, size: 'medium' },
      { type: 'egg', position: { x: 85, y: 15 }, size: 'small' },
      { type: 'bunny', position: { x: 50, y: 3 }, size: 'small' },
      { type: 'egg', position: { x: 95, y: 20 }, size: 'small' },
    ]
  }
};

export const darkTheme: Theme = {
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
      { type: 'bat', position: { x: 10, y: 8 }, size: 'small' },
      { type: 'bat', position: { x: 20, y: 12 }, size: 'small' },
      { type: 'pumpkin', position: { x: 85, y: 10 }, size: 'medium' },
      { type: 'mummy', position: { x: 5, y: 18 }, size: 'medium' },
      { type: 'zombie', position: { x: 92, y: 5 }, size: 'small' },
      { type: 'vampire', position: { x: 50, y: 4 }, size: 'medium' },
      { type: 'bat', position: { x: 95, y: 15 }, size: 'small' },
    ]
  }
};

export const themes = {
  light: lightTheme,
  dark: darkTheme
};
