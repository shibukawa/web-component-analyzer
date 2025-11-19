/*
ACCEPTANCE_TEST:
  description: "Component using trpc.user.getById.useQuery for type-safe data fetching with data, isLoading, and isError states"
  
  external_entities_input:
    - name: "Server: user.getById"
      type: "server"
      dataType: "external"
      endpoint: "user.getById"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "trpc.user.getById.useQuery"
  
  data_stores:
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "trpc.user.getById.useQuery"
    - name: "isError"
      type: "library-hook"
      dataType: "boolean"
      source: "trpc.user.getById.useQuery"
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "trpc.user.getById.useQuery"
  
  processes:
    - name: "refetch"
      type: "library-hook"
      source: "trpc.user.getById.useQuery"
  
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
    - from: "Server: user.getById"
      to: "trpc.user.getById.useQuery"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "fetches user data from tRPC procedure"
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

// Mock tRPC client for demonstration
// In a real app, this would be imported from your tRPC setup
const trpc = {
  user: {
    getById: {
      useQuery: (input: { id: string }) => {
        // This is a mock implementation
        // Real tRPC would return actual query results
        return {
          data: { id: input.id, name: 'John Doe', email: 'john@example.com' },
          isLoading: false,
          isError: false,
          error: null,
          refetch: () => Promise.resolve()
        };
      }
    }
  }
};

interface User {
  id: string;
  name: string;
  email: string;
}

export default function TRPCTypeSafeProcedure() {
  const { data, isLoading, isError, error, refetch } = trpc.user.getById.useQuery({ id: '123' });

  if (isLoading) {
    return <p>Loading user...</p>;
  }

  if (isError) {
    return <p>Error loading user: {error?.message}</p>;
  }

  return (
    <div>
      <h1>tRPC Type-Safe Procedure Test</h1>
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
