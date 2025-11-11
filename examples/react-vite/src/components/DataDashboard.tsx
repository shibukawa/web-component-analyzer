/*
ACCEPTANCE_TEST:
  description: "Complex component with many states, effects, computations, and handlers (50+ nodes)"
  test_category: "performance"
  
  external_entities_input:
    - name: "apiEndpoint"
      type: "prop"
      dataType: "string"
    - name: "refreshInterval"
      type: "prop"
      dataType: "number"
    - name: "onDataUpdate"
      type: "prop"
      dataType: "function"
    - name: "onError"
      type: "prop"
      dataType: "function"
    - name: "filters"
      type: "prop"
      dataType: "object"
  
  processes:
    - name: "fetchData"
      description: "Fetches data from API"
      type: "effect"
    - name: "handleRefresh"
      description: "Manually refreshes data"
      type: "event_handler"
    - name: "handleSort"
      description: "Changes sort configuration"
      type: "event_handler"
    - name: "handleFilterChange"
      description: "Updates filter values"
      type: "event_handler"
    - name: "handlePageChange"
      description: "Changes current page"
      type: "event_handler"
    - name: "handleSearch"
      description: "Updates search query"
      type: "event_handler"
    - name: "handleExport"
      description: "Exports data to CSV"
      type: "event_handler"
    - name: "handleSelectItem"
      description: "Selects/deselects items"
      type: "event_handler"
    - name: "handleBulkAction"
      description: "Performs bulk action on selected items"
      type: "event_handler"
    - name: "handleChartTypeChange"
      description: "Changes chart visualization type"
      type: "event_handler"
    - name: "filterData"
      description: "Filters data based on criteria"
      type: "computation"
    - name: "sortData"
      description: "Sorts filtered data"
      type: "computation"
    - name: "paginateData"
      description: "Paginates sorted data"
      type: "computation"
    - name: "calculateStats"
      description: "Calculates summary statistics"
      type: "computation"
    - name: "prepareChartData"
      description: "Transforms data for chart display"
      type: "computation"
    - name: "validateFilters"
      description: "Validates filter configuration"
      type: "computation"
    - name: "formatExportData"
      description: "Formats data for export"
      type: "computation"
    - name: "autoRefresh"
      description: "Automatically refreshes data on interval"
      type: "effect"
    - name: "notifyDataUpdate"
      description: "Notifies parent of data changes"
      type: "effect"
    - name: "persistFilters"
      description: "Saves filters to localStorage"
      type: "effect"
  
  data_stores:
    - name: "data"
      type: "state"
      dataType: "array"
    - name: "loading"
      type: "state"
      dataType: "boolean"
    - name: "error"
      type: "state"
      dataType: "string"
    - name: "searchQuery"
      type: "state"
      dataType: "string"
    - name: "sortConfig"
      type: "state"
      dataType: "object"
    - name: "filterValues"
      type: "state"
      dataType: "object"
    - name: "currentPage"
      type: "state"
      dataType: "number"
    - name: "pageSize"
      type: "state"
      dataType: "number"
    - name: "selectedItems"
      type: "state"
      dataType: "array"
    - name: "chartType"
      type: "state"
      dataType: "string"
    - name: "lastRefresh"
      type: "state"
      dataType: "number"
    - name: "filteredData"
      type: "computed"
      dataType: "array"
    - name: "sortedData"
      type: "computed"
      dataType: "array"
    - name: "paginatedData"
      type: "computed"
      dataType: "array"
    - name: "stats"
      type: "computed"
      dataType: "object"
    - name: "chartData"
      type: "computed"
      dataType: "object"
    - name: "totalPages"
      type: "computed"
      dataType: "number"
    - name: "hasSelection"
      type: "computed"
      dataType: "boolean"
    - name: "validFilters"
      type: "computed"
      dataType: "object"
*/

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface DataItem {
  id: number;
  name: string;
  value: number;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  timestamp: number;
}

interface SortConfig {
  field: keyof DataItem;
  direction: 'asc' | 'desc';
}

interface FilterValues {
  category?: string;
  status?: string;
  minValue?: number;
  maxValue?: number;
}

interface DataDashboardProps {
  apiEndpoint: string;
  refreshInterval?: number;
  onDataUpdate?: (data: DataItem[]) => void;
  onError?: (error: string) => void;
  filters?: FilterValues;
}

type ChartType = 'bar' | 'line' | 'pie' | 'table';

/**
 * Complex component for testing DFD visualization performance
 * Expected nodes: 50+
 * - 5 input props
 * - 18 states/computed values
 * - 20 processes (10 handlers, 7 computations, 3 effects)
 * - 15+ outputs
 */
export default function DataDashboard({
  apiEndpoint,
  refreshInterval = 30000,
  onDataUpdate,
  onError,
  filters: propFilters = {}
}: DataDashboardProps) {
  // State management
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'id', direction: 'asc' });
  const [filterValues, setFilterValues] = useState<FilterValues>(propFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [chartType, setChartType] = useState<ChartType>('table');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  const intervalRef = useRef<number | undefined>(undefined);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const result = await response.json();
      setData(result);
      setLastRefresh(Date.now());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, onError]);

  // Event handlers
  const handleRefresh = () => {
    fetchData();
  };

  const handleSort = (field: keyof DataItem) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (key: keyof FilterValues, value: string | number | undefined) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const csv = formatExportData(sortedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-export-${Date.now()}.csv`;
    a.click();
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on items:`, selectedItems);
    setSelectedItems([]);
  };

  const handleChartTypeChange = (type: ChartType) => {
    setChartType(type);
  };

  // Computed: Validate filters
  const validFilters = useMemo(() => {
    return Object.entries(filterValues).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key as keyof FilterValues] = value;
      }
      return acc;
    }, {} as FilterValues);
  }, [filterValues]);

  // Computed: Filter data
  const filteredData = useMemo(() => {
    let result = data;

    // Apply search
    if (searchQuery) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (validFilters.category) {
      result = result.filter(item => item.category === validFilters.category);
    }
    if (validFilters.status) {
      result = result.filter(item => item.status === validFilters.status);
    }
    if (validFilters.minValue !== undefined) {
      result = result.filter(item => item.value >= validFilters.minValue!);
    }
    if (validFilters.maxValue !== undefined) {
      result = result.filter(item => item.value <= validFilters.maxValue!);
    }

    return result;
  }, [data, searchQuery, validFilters]);

  // Computed: Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];
      const modifier = sortConfig.direction === 'asc' ? 1 : -1;
      return aVal < bVal ? -modifier : aVal > bVal ? modifier : 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  // Computed: Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Computed: Calculate statistics
  const stats = useMemo(() => {
    const total = filteredData.length;
    const sum = filteredData.reduce((acc, item) => acc + item.value, 0);
    const avg = total > 0 ? sum / total : 0;
    const max = Math.max(...filteredData.map(i => i.value), 0);
    const min = Math.min(...filteredData.map(i => i.value), 0);
    
    const byCategory = filteredData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = filteredData.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, sum, avg, max, min, byCategory, byStatus };
  }, [filteredData]);

  // Computed: Prepare chart data
  const chartData = useMemo(() => {
    switch (chartType) {
      case 'bar':
      case 'line':
        return {
          labels: paginatedData.map(item => item.name),
          values: paginatedData.map(item => item.value)
        };
      case 'pie':
        return {
          labels: Object.keys(stats.byCategory),
          values: Object.values(stats.byCategory)
        };
      default:
        return null;
    }
  }, [chartType, paginatedData, stats]);

  // Computed: Total pages
  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / pageSize);
  }, [sortedData.length, pageSize]);

  // Computed: Has selection
  const hasSelection = useMemo(() => {
    return selectedItems.length > 0;
  }, [selectedItems]);

  // Helper: Format export data
  const formatExportData = (items: DataItem[]): string => {
    const headers = ['ID', 'Name', 'Value', 'Category', 'Status', 'Timestamp'];
    const rows = items.map(item => [
      item.id,
      item.name,
      item.value,
      item.category,
      item.status,
      new Date(item.timestamp).toISOString()
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  // Effect: Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Effect: Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = window.setInterval(() => {
        fetchData();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [refreshInterval, fetchData]);

  // Effect: Notify data update
  useEffect(() => {
    if (data.length > 0 && onDataUpdate) {
      onDataUpdate(data);
    }
  }, [data, onDataUpdate]);

  // Effect: Persist filters
  useEffect(() => {
    localStorage.setItem('dashboard-filters', JSON.stringify(filterValues));
  }, [filterValues]);

  return (
    <div className="data-dashboard">
      <header>
        <h1>Data Dashboard</h1>
        <button onClick={handleRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <span>Last updated: {new Date(lastRefresh).toLocaleTimeString()}</span>
      </header>

      {error && (
        <div className="error-banner">
          Error: {error}
        </div>
      )}

      <div className="controls">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <select
          value={filterValues.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
        >
          <option value="">All Categories</option>
          <option value="A">Category A</option>
          <option value="B">Category B</option>
          <option value="C">Category C</option>
        </select>

        <select
          value={filterValues.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
        </select>

        <input
          type="number"
          placeholder="Min value"
          value={filterValues.minValue || ''}
          onChange={(e) => handleFilterChange('minValue', e.target.value ? Number(e.target.value) : undefined)}
        />

        <input
          type="number"
          placeholder="Max value"
          value={filterValues.maxValue || ''}
          onChange={(e) => handleFilterChange('maxValue', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      <div className="chart-controls">
        <button onClick={() => handleChartTypeChange('table')}>Table</button>
        <button onClick={() => handleChartTypeChange('bar')}>Bar Chart</button>
        <button onClick={() => handleChartTypeChange('line')}>Line Chart</button>
        <button onClick={() => handleChartTypeChange('pie')}>Pie Chart</button>
      </div>

      <div className="stats-panel">
        <div>Total: {stats.total}</div>
        <div>Sum: {stats.sum}</div>
        <div>Average: {stats.avg.toFixed(2)}</div>
        <div>Max: {stats.max}</div>
        <div>Min: {stats.min}</div>
      </div>

      {hasSelection && (
        <div className="bulk-actions">
          <span>{selectedItems.length} items selected</span>
          <button onClick={() => handleBulkAction('delete')}>Delete</button>
          <button onClick={() => handleBulkAction('archive')}>Archive</button>
          <button onClick={() => setSelectedItems([])}>Clear</button>
        </div>
      )}

      {chartType === 'table' ? (
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedItems.length === paginatedData.length}
                  onChange={() => {
                    if (selectedItems.length === paginatedData.length) {
                      setSelectedItems([]);
                    } else {
                      setSelectedItems(paginatedData.map(item => item.id));
                    }
                  }}
                />
              </th>
              <th onClick={() => handleSort('id')}>ID</th>
              <th onClick={() => handleSort('name')}>Name</th>
              <th onClick={() => handleSort('value')}>Value</th>
              <th onClick={() => handleSort('category')}>Category</th>
              <th onClick={() => handleSort('status')}>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(item => (
              <tr key={item.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                  />
                </td>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.value}</td>
                <td>{item.category}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="chart-container">
          <p>Chart visualization: {chartType}</p>
          <pre>{JSON.stringify(chartData, null, 2)}</pre>
        </div>
      )}

      <div className="pagination">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>

      <div className="actions">
        <button onClick={handleExport}>Export to CSV</button>
      </div>
    </div>
  );
}
