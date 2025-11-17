/*
ACCEPTANCE_TEST:
  description: "Component using useMutation from TanStack Query for creating posts with module-level createPost function"
  
  external_entities_input:
    - name: "Server: /api/posts"
      type: "server"
      dataType: "external"
      endpoint: "/api/posts"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "useMutation"
  
  data_stores:
    - name: "title"
      type: "state"
      dataType: "string"
    - name: "body"
      type: "state"
      dataType: "string"
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "useMutation"
    - name: "isError"
      type: "library-hook"
      dataType: "boolean"
      source: "useMutation"
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "useMutation"
  
  processes:
    - name: "mutate"
      type: "library-hook"
      source: "useMutation"
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
    - name: "jsx-textarea-1"
      type: "template"
      target: "textarea"
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
    - from: "title"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display title input value"
    - from: "body"
      to: "jsx-textarea-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display body textarea value"
    - from: "handleSubmit"
      to: "jsx-form-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onSubmit handler"
    - from: "handleSubmit"
      to: "mutate"
      fromType: "process"
      toType: "process"
      description: "calls mutate with form data"
    - from: "mutate"
      to: "Server: /api/posts"
      fromType: "process"
      toType: "external_entity_input"
      description: "sends mutation to API"
    - from: "isLoading"
      to: "subgraph-condition-1"
      fromType: "data_store"
      toType: "subgraph"
      description: "controls loading display"
    - from: "isLoading"
      to: "jsx-button-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "disables button when loading"
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
      description: "controls success message display"
    - from: "data"
      to: "jsx-p-3"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display success message"
*/

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

interface Post {
  id: number;
  title: string;
  body: string;
}

const createPost = (post: Omit<Post, 'id'>) =>
  fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(post)
  }).then(res => res.json());

export default function TanStackQueryMutation() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const { mutate, isLoading, isError, error, data } = useMutation({
    mutationFn: (newPost: Omit<Post, 'id'>) => createPost(newPost)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ title, body });
  };

  return (
    <div>
      <h1>TanStack Query Mutation Test</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Post body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Post'}
        </button>
      </form>

      {isLoading && <p>Creating post...</p>}
      {isError && <p>Error creating post: {error?.message}</p>}
      {data && <p>Post created successfully!</p>}
    </div>
  );
}
