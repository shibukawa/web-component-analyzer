/*
ACCEPTANCE_TEST:
  description: "Component using useSWR for data fetching with data, error, and isLoading states"
  
  external_entities_input:
    - name: "Server: /api/user"
      type: "server"
      dataType: "external"
      endpoint: "/api/user"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "useSWR"
  
  data_stores:
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "useSWR"
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "useSWR"
  
  processes:
    - name: "mutate"
      type: "library-hook"
      source: "useSWR"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "subgraph-condition-1"
      type: "subgraph"
      label: "{isLoading}"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
      parent: "subgraph-condition-1"
    - name: "subgraph-condition-2"
      type: "subgraph"
      label: "{error}"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-2"
      type: "template"
      target: "p"
      parent: "subgraph-condition-2"
    - name: "subgraph-condition-3"
      type: "subgraph"
      label: "{data}"
      parent: "subgraph-jsx-output"
    - name: "jsx-div-1"
      type: "template"
      target: "div"
      parent: "subgraph-condition-3"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "Server: /api/user"
      to: "useSWR"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "fetches data from API"
    - from: "isLoading"
      to: "subgraph-condition-1"
      fromType: "data_store"
      toType: "subgraph"
      description: "controls loading display"
    - from: "error"
      to: "subgraph-condition-2"
      fromType: "data_store"
      toType: "subgraph"
      description: "controls error display"
    - from: "error"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display error message"
    - from: "data"
      to: "subgraph-condition-3"
      fromType: "external_entity_input"
      toType: "subgraph"
      description: "controls data display"
    - from: "data"
      to: "jsx-div-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display user data"
    - from: "mutate"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
*/

import useSWR from 'swr';

interface User {
  id: number;
  name: string;
  email: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Props {
  url: string;
}

export default function SWRBasicFetch({ url }: Props) {
  const { data, error, isLoading, mutate } = useSWR<User>(url, fetcher);

  if (isLoading) {
    return <p>Loading user data...</p>;
  }

  if (error) {
    return <p>Error loading user: {error.message}</p>;
  }

  return (
    <div>
      <h1>SWR Basic Fetch Test</h1>
      {data && (
        <div>
          <p>Name: {data.name}</p>
          <p>Email: {data.email}</p>
        </div>
      )}
      <button onClick={() => mutate()}>Refresh Data</button>
    </div>
  );
}
