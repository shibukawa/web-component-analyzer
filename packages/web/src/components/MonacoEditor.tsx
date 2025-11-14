import { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'typescript' | 'vue' | 'svelte';
  theme: 'vs-light' | 'vs-dark';
}

export function MonacoEditor({ value, onChange, language, theme }: MonacoEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    // Create editor instance
    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language: language === 'typescript' ? 'typescript' : language,
      theme,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'indent',
      tabSize: 2,
      insertSpaces: true,
    });

    // Set up change listener
    const disposable = editorRef.current.onDidChangeModelContent(() => {
      if (isUpdatingRef.current) {
        return; // Skip onChange when we're updating from props
      }
      const newValue = editorRef.current?.getValue() ?? '';
      onChange(newValue);
    });

    // Cleanup
    return () => {
      disposable.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []); // Only run once on mount

  // Update editor value when prop changes externally
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        isUpdatingRef.current = true;
        editorRef.current.setValue(value);
        // Reset flag after a short delay to allow the change event to fire
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);
      }
    }
  }, [value]);

  // Update editor language
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoLanguage = language === 'typescript' ? 'typescript' : language;
        monaco.editor.setModelLanguage(model, monacoLanguage);
      }
    }
  }, [language]);

  // Update editor theme
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  return <div ref={containerRef} style={{ height: '100%', width: '100%' }} />;
}
