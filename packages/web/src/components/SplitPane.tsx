import { ReactNode } from 'react';
import './SplitPane.css';

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
}

export function SplitPane({ left, right }: SplitPaneProps) {
  return (
    <div className="split-pane">
      <div className="split-pane__left">
        {left}
      </div>
      <div className="split-pane__right">
        {right}
      </div>
    </div>
  );
}
