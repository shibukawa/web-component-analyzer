import { useState, useEffect } from 'react';

interface SearchBoxProps {
  placeholder?: string;
  debounceMs?: number;
  onSearch: (query: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * SearchBox component with props and custom event handlers
 * This component demonstrates:
 * - Props with function types
 * - useEffect hook for debouncing
 * - Multiple event handlers (onSearch, onClear, onFocus, onBlur)
 * - Inline callbacks for DOM events
 * - State management with derived values
 */
export default function SearchBox({ 
  placeholder = 'Search...', 
  debounceMs = 300,
  onSearch,
  onClear,
  onFocus,
  onBlur
}: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        onSearch(query);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  const handleClear = () => {
    setQuery('');
    if (onClear) {
      onClear();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (onFocus) {
      onFocus();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  };

  return (
    <div className={`search-box ${isFocused ? 'focused' : ''}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="search-input"
      />
      {query && (
        <button 
          onClick={handleClear}
          className="clear-button"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
      <div className="search-info">
        {query && <small>Searching for: {query}</small>}
      </div>
    </div>
  );
}
