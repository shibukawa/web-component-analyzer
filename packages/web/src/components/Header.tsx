import { ReactNode } from 'react';
import './Header.css';

interface HeaderProps {
  children?: ReactNode;
}

/**
 * Header component with application title and slots for controls
 * Fixed at the top of the viewport with theme-aware styling
 */
export function Header({ children }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1 title="Analyze and visualize component data flow diagrams">Web Component Analyzer</h1>
          <span className="header-subtitle" title="Supports React, Vue.js, and Svelte components">Visualize Component Data Flow</span>
        </div>
        <div className="header-controls">
          {children}
        </div>
      </div>
    </header>
  );
}
