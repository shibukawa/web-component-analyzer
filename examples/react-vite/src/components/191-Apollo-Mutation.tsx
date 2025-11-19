/*
ACCEPTANCE_TEST:
  description: "Component using useMutation from Apollo Client with consolidated library-hook node"
  
  external_entities_input:
    - name: "Server: GraphQL"
      type: "server"
      dataType: "external"
      endpoint: "GraphQL"
  
  data_stores:
    - name: "name"
      type: "state"
      dataType: "string"
    - name: "email"
      type: "state"
      dataType: "string"
    - name: "useMutation"
      type: "library-hook"
      dataType: "object"
      source: "@apollo/client"
  
  processes:
    - name: "handleSubmit"
      type: "event_handler"
  
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
    - name: "jsx-form-1"
      type: "template"
      target: "form"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-2"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
    - name: "subgraph-condition-1"
      type: "subgraph"
      label: "{loading}"
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
    - from: "name"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display name input value"
    - from: "email"
      to: "jsx-input-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display email input value"
    - from: "handleSubmit"
      to: "jsx-form-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onSubmit handler"
    - from: "handleSubmit"
      to: "useMutation"
      fromType: "process"
      toType: "data_store"
      label: "calls: mutate"
      description: "calls mutate with form data"
    - from: "useMutation"
      to: "Server: GraphQL"
      fromType: "data_store"
      toType: "external_entity_input"
      description: "sends mutation to GraphQL API"
    - from: "useMutation"
      to: "subgraph-condition-1"
      fromType: "data_store"
      toType: "subgraph"
      label: "loading"
      description: "controls loading display"
    - from: "useMutation"
      to: "jsx-button-1"
      fromType: "data_store"
      toType: "external_entity_output"
      label: "loading"
      description: "disables button when loading"
    - from: "useMutation"
      to: "subgraph-condition-2"
      fromType: "data_store"
      toType: "subgraph"
      label: "error"
      description: "controls error display"
    - from: "useMutation"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      label: "error"
      description: "display error message"
    - from: "useMutation"
      to: "subgraph-condition-3"
      fromType: "data_store"
      toType: "subgraph"
      label: "data"
      description: "controls success message display"
    - from: "useMutation"
      to: "jsx-p-3"
      fromType: "data_store"
      toType: "external_entity_output"
      label: "data"
      description: "display success message"
*/

import { useMutation, gql } from '@apollo/client';
import { useState } from 'react';

const CREATE_USER = gql`
  mutation CreateUser($name: String!, $email: String!) {
    createUser(name: $name, email: $email) {
      id
      name
      email
    }
  }
`;

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserData {
  createUser: User;
}

interface CreateUserVariables {
  name: string;
  email: string;
}

export default function ApolloMutation() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [mutate, { data, loading, error }] = useMutation<CreateUserData, CreateUserVariables>(
    CREATE_USER
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ variables: { name, email } });
  };

  return (
    <div>
      <h1>Apollo Client Mutation Test</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="User name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="email"
          placeholder="User email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>

      {loading && <p>Creating user...</p>}
      {error && <p>Error creating user: {error.message}</p>}
      {data && <p>User created successfully: {data.createUser.name}</p>}
    </div>
  );
}
