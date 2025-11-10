import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react';

interface ComplexProps {
  userId: string;
  config: {
    theme: string;
    locale: string;
  };
  onUpdate?: (data: any) => void;
}

interface State {
  data: any[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: any[] }
  | { type: 'FETCH_ERROR'; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export default function ComplexComponent({ userId, config, onUpdate }: ComplexProps) {
  const [state, dispatch] = useReducer(reducer, {
    data: [],
    loading: false,
    error: null
  });
  const [filter, setFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_START' });
      try {
        // Simulated API call
        const response = await fetch(`/api/users/${userId}/data`);
        const data = await response.json();
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        dispatch({ type: 'FETCH_ERROR', error: (error as Error).message });
      }
    };

    fetchData();
  }, [userId]);

  const filteredData = useMemo(() => {
    return state.data.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [state.data, filter]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      }
      return b.name.localeCompare(a.name);
    });
  }, [filteredData, sortOrder]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const handleItemSelect = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      }
      return [...prev, itemId];
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (onUpdate) {
      onUpdate({
        selectedItems,
        filter,
        sortOrder
      });
    }
  }, [selectedItems, filter, sortOrder, onUpdate]);

  const selectedCount = useMemo(() => selectedItems.length, [selectedItems]);

  if (state.loading) {
    return <div>Loading...</div>;
  }

  if (state.error) {
    return <div>Error: {state.error}</div>;
  }

  return (
    <div className={`theme-${config.theme}`}>
      <h1>Complex Component</h1>
      <div>
        <input
          type="text"
          value={filter}
          onChange={handleFilterChange}
          placeholder="Filter items..."
        />
        <button onClick={handleSortToggle}>
          Sort: {sortOrder}
        </button>
      </div>
      <p>Selected: {selectedCount} items</p>
      <ul>
        {sortedData.map(item => (
          <li key={item.id} onClick={() => handleItemSelect(item.id)}>
            {item.name}
            {selectedItems.includes(item.id) && ' ✓'}
          </li>
        ))}
      </ul>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
