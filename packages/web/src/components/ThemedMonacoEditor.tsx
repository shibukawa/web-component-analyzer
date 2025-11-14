import { useState, useEffect } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { useTheme } from '../contexts/ThemeContext';
import { useDebounce } from '../hooks/useDebounce';

interface ThemedMonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'typescript' | 'vue' | 'svelte';
  debounceMs?: number;
}

export function ThemedMonacoEditor({ 
  value, 
  onChange, 
  language,
  debounceMs = 300 
}: ThemedMonacoEditorProps) {
  const { themeMode } = useTheme();
  
  // Map theme mode to Monaco theme
  const monacoTheme = themeMode === 'dark' ? 'vs-dark' : 'vs-light';

  // Debounced onChange handler
  const debouncedOnChange = useDebounce(onChange, debounceMs);

  return (
    <MonacoEditor
      value={value}
      onChange={debouncedOnChange}
      language={language}
      theme={monacoTheme}
    />
  );
}
