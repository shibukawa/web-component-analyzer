/*
ACCEPTANCE_TEST:
  description: "Component using useSearch and useParams from TanStack Router for accessing search parameters and route parameters"
  
  external_entities_input:
    - name: "URL: Input"
      type: "external-entity"
      dataType: "object"
  
  data_stores:
    - name: "useSearch"
      type: "library-hook"
      source: "@tanstack/react-router"
    - name: "useParams"
      type: "library-hook"
      source: "@tanstack/react-router"
  
  processes: []
  
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
    - name: "jsx-p-2"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "URL: Input"
      to: "useSearch"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "provides search parameters"
    - from: "URL: Input"
      to: "useParams"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "provides route parameters"
    - from: "useSearch"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display search query"
    - from: "useParams"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display route parameter"
*/

import { useSearch, useParams } from '@tanstack/react-router';

interface RouteParams {
  id?: string;
}

interface SearchParams {
  query?: string;
  page?: number;
}

export default function TanStackRouterSearchParams() {
  const search = useSearch() as SearchParams;
  const params = useParams({ strict: false }) as RouteParams;

  return (
    <div>
      <h1>TanStack Router Search Params Test</h1>
      <p>Search Query: {search.query || 'none'}</p>
      <p>Route ID: {params.id || 'none'}</p>
    </div>
  );
}
