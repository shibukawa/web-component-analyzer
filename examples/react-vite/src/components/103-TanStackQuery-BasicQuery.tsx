/*
ACCEPTANCE_TEST:
  description: "Component using useQuery from TanStack Query for data fetching with data, isLoading, and isError states"
  
  external_entities_input:
    - name: "Server: /api/posts"
      type: "server"
      dataType: "external"
      endpoint: "/api/posts"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "useQuery"
  
  data_stores:
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "useQuery"
    - name: "isError"
      type: "library-hook"
      dataType: "boolean"
      source: "useQuery"
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "useQuery"
  
  processes:
    - name: "refetch"
      type: "library-hook"
      source: "useQuery"
  
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
    - from: "Server: /api/posts"
      to: "useQuery"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "fetches data from API"
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
      description: "display posts"
    - from: "refetch"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
*/

import { useQuery } from '@tanstack/react-query';

interface Post {
  id: number;
  title: string;
  body: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function TanStackQueryBasicQuery() {
  const { data, isLoading, isError, error, refetch } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: () => fetcher('/api/posts')
  });

  if (isLoading) {
    return <p>Loading posts...</p>;
  }

  if (isError) {
    return <p>Error loading posts: {error?.message}</p>;
  }

  return (
    <div>
      <h1>TanStack Query Basic Query Test</h1>
      {data && (
        <div>
          {data.map((post: Post) => (
            <div key={post.id}>
              <h2>{post.title}</h2>
              <p>{post.body}</p>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => refetch()}>Refresh Posts</button>
    </div>
  );
}
