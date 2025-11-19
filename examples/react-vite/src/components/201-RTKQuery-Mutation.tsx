/*
ACCEPTANCE_TEST:
  description: "Component using RTK Query generated mutation hook (useUpdateUserMutation) for data mutation with trigger, data, and loading states"
  
  external_entities_input:
    - name: "Server: updateUser"
      type: "server"
      dataType: "external"
      endpoint: "updateUser"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "useUpdateUserMutation"
    - name: "name"
      type: "state"
      dataType: "string"
      source: "useState"
  
  data_stores:
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "useUpdateUserMutation"
    - name: "isError"
      type: "library-hook"
      dataType: "boolean"
      source: "useUpdateUserMutation"
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "useUpdateUserMutation"
  
  processes:
    - name: "trigger"
      type: "library-hook"
      source: "useUpdateUserMutation"
    - name: "handleSubmit"
      type: "event_handler"
      description: "Form submission handler"
    - name: "setName"
      type: "state_setter"
      source: "useState"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
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
    - name: "jsx-p-3"
      type: "template"
      target: "p"
      parent: "subgraph-condition-3"
  
  data_flows:
    - from: "useUpdateUserMutation"
      to: "Server: updateUser"
      fromType: "data_store"
      toType: "external_entity_input"
      description: "sends mutation to API"
    - from: "name"
      to: "jsx-input-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "input value binding"
    - from: "setName"
      to: "jsx-input-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onChange handler"
    - from: "handleSubmit"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
    - from: "name"
      to: "handleSubmit"
      fromType: "external_entity_input"
      toType: "process"
      description: "used in submission"
    - from: "trigger"
      to: "handleSubmit"
      fromType: "process"
      toType: "process"
      description: "called in handler"
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
      description: "controls success display"
    - from: "data"
      to: "jsx-p-3"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display updated user"
*/

import { useState } from 'react';
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
    updateUser: builder.mutation<User, { id: number; name: string }>({
      query: ({ id, name }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: { name },
      }),
    }),
  }),
});

const { useUpdateUserMutation } = api;

export default function RTKQueryMutation() {
  const [name, setName] = useState('');
  const [trigger, { data, isLoading, isError, error }] = useUpdateUserMutation();

  const handleSubmit = () => {
    trigger({ id: 1, name });
  };

  return (
    <div>
      <h1>RTK Query Mutation Test</h1>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter new name"
      />
      <button onClick={handleSubmit}>Update User</button>
      
      {isLoading && <p>Updating user...</p>}
      {isError && <p>Error updating user: {error?.toString()}</p>}
      {data && <p>User updated successfully: {data.name}</p>}
    </div>
  );
}
