import { ReactNode } from 'react';
import './EditorPane.css';

interface EditorPaneProps {
  children: ReactNode;
}

export function EditorPane({ children }: EditorPaneProps) {
  return (
    <div className="editor-pane">
      {children}
    </div>
  );
}
