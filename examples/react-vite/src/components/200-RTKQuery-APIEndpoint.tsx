/*
ACCEPTANCE_TEST:
  description: "Component using RTK Query generated query hook (useGetUserQuery) for data fetching with data, isLoading, and isError states"
  
  external_entities_input:
    - name: "Server: getUser"
      type: "server"
      dataType: "external"
      endpoint: "getUser"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "useGetUserQuery"
  
  data_stores:
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "useGetUserQuery"
    - name: "isFetching"
      type: "library-hook"
      dataType: "boolean"
      source: "useGetUserQuery"
    - name: "isError"
      type: "library-hook"
      dataType: "boolean"
      source: "useGetUserQuery"
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "useGetUserQuery"
  
  processes:
    - name: "refetch"
      type: "library-hook"
      source: "useGetUserQuery"
  
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
      label: "{isError}"
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
    - from: "Server: getUser"
      to: "useGetUserQuery"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "fetches user data from API"
    - from: "isLoading"
      to: "subgraph-condition-1"
      fromType: "data_store"
      toType: "subgraph"
      description: "controls loading display"
    - from: "isError"
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
    - from: "refetch"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
*/

// Mock RTK Query API setup
// In a real app, this would be defined in a separate file
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface User {
  id: number;
  name: string;
  email: string;
}

const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    getUser: builder.query<User, number>({
      query: (id) => `/users/${id}`,
    }),
  }),
});

const { useGetUserQuery } = api;

export default function RTKQueryAPIEndpoint() {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetUserQuery(1);

  if (isLoading) {
    return <p>Loading user...</p>;
  }

  if (isError) {
    return <p>Error loading user: {error?.toString()}</p>;
  }

  return (
    <div>
      <h1>RTK Query API Endpoint Test</h1>
      {data && (
        <div>
          <h2>{data.name}</h2>
          <p>Email: {data.email}</p>
          <p>ID: {data.id}</p>
        </div>
      )}
      <button onClick={() => refetch()}>Refresh User</button>
    </div>
  );
}
