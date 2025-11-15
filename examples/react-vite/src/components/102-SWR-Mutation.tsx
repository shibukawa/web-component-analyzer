/*
ACCEPTANCE_TEST:
  description: "Component using useSWRMutation for data mutation with trigger, data, error, and isMutating states"
  
  data_stores:
    - name: "username"
      type: "state"
      dataType: "string"
  
  external_entities_input:
    - name: "Server: /api/user"
      type: "server"
      dataType: "external"
      endpoint: "/api/user"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "useSWRMutation"
  
  data_stores:
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "useSWRMutation"
    - name: "isMutating"
      type: "library-hook"
      dataType: "boolean"
      source: "useSWRMutation"
  
  processes:
    - name: "trigger"
      type: "library-hook"
      source: "useSWRMutation"
    - name: "handleSubmit"
      type: "event-handler"
  
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
      label: "{isMutating}"
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
    - name: "jsx-p-3"
      type: "template"
      target: "p"
      parent: "subgraph-condition-3"
  
  data_flows:
    - from: "Server: /api/user"
      to: "useSWRMutation"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "fetches data from API"
    - from: "username"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "input value"
    - from: "handleSubmit"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
    - from: "username"
      to: "handleSubmit"
      fromType: "data_store"
      toType: "process"
      description: "form data"
    - from: "trigger"
      to: "handleSubmit"
      fromType: "process"
      toType: "process"
      description: "mutation trigger"
    - from: "isMutating"
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
      description: "controls success display"
    - from: "data"
      to: "jsx-p-3"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display success message"
*/

import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

interface UpdateUserRequest {
  username: string;
}

interface UpdateUserResponse {
  success: boolean;
  message: string;
}

async function updateUser(url: string, { arg }: { arg: UpdateUserRequest }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  });
  return response.json();
}

export default function SWRMutation() {
  const [username, setUsername] = useState('');
  const { data, error, trigger, isMutating } = useSWRMutation<UpdateUserResponse, Error, string, UpdateUserRequest>(
    '/api/user',
    updateUser
  );

  const handleSubmit = async () => {
    await trigger({ username });
  };

  return (
    <div>
      <h1>SWR Mutation Test</h1>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username"
      />
      <button onClick={handleSubmit} disabled={isMutating}>
        Update User
      </button>
      {isMutating && <p>Updating user...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <p>Success: {data.message}</p>}
    </div>
  );
}
