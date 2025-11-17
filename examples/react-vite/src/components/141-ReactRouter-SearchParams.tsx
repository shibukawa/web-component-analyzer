/*
ACCEPTANCE_TEST:
  description: "Component using useSearchParams from React Router for search parameter access and manipulation"
  
  external_entities_input:
    - name: "useSearchParams"
      type: "library-hook"
      dataType: "object"
      source: "react-router-dom"
  
  data_stores: []
  
  processes:
    - name: "setSearchParams"
      type: "library-hook"
      source: "react-router-dom"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "jsx-div-1"
      type: "template"
      target: "div"
      parent: "subgraph-jsx-output"
    - name: "jsx-h1-1"
      type: "template"
      target: "h1"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-2"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "useSearchParams"
      to: "jsx-p-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display search query parameter"
    - from: "setSearchParams"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler to update search params"
    - from: "setSearchParams"
      to: "jsx-button-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler to clear search params"
*/

import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';

export default function ReactRouterSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');

  const query = searchParams.get('q') || '';

  const handleSearch = () => {
    setSearchParams({ q: inputValue });
  };

  const handleClear = () => {
    setSearchParams({});
  };

  return (
    <div>
      <h1>React Router Search Params Test</h1>
      <p>Current Search Query: {query}</p>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter search query"
      />
      <button onClick={handleSearch}>Search</button>
      <button onClick={handleClear}>Clear</button>
    </div>
  );
}
