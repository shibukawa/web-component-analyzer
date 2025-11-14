import { ReactNode } from 'react';
import './VisualizationPane.css';

interface VisualizationPaneProps {
  children: ReactNode;
}

export function VisualizationPane({ children }: VisualizationPaneProps) {
  return (
    <div className="visualization-pane">
      {children}
    </div>
  );
}
