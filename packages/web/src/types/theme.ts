export type ThemeMode = 'light' | 'dark';

export type DecorationType = 
  | 'bat' 
  | 'pumpkin' 
  | 'mummy' 
  | 'zombie' 
  | 'vampire' 
  | 'egg' 
  | 'bunny';

export type DecorationSize = 'small' | 'medium' | 'large';

export interface DecorationElement {
  type: DecorationType;
  position: { x: number; y: number };
  size: DecorationSize;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  border: string;
  error: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  decorations: {
    enabled: boolean;
    elements: DecorationElement[];
  };
}
