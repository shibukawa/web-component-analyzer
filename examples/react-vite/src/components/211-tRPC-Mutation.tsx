/*
ACCEPTANCE_TEST:
  description: "Component using trpc.post.create.useMutation for type-safe mutation operations with mutate, data, isLoading, and isError states"
  
  external_entities_input:
    - name: "Server: post.create"
      type: "server"
      dataType: "external"
      endpoint: "post.create"
    - name: "data"
      type: "library-hook"
      dataType: "object"
      source: "trpc.post.create.useMutation"
    - name: "title"
      type: "prop"
      dataType: "string"
  
  data_stores:
    - name: "isLoading"
      type: "library-hook"
      dataType: "boolean"
      source: "trpc.post.create.useMutation"
    - name: "isError"
      type: "library-hook"
      dataType: "boolean"
      source: "trpc.post.create.useMutation"
    - name: "error"
      type: "library-hook"
      dataType: "object"
      source: "trpc.post.create.useMutation"
  
  processes:
    - name: "mutate"
      type: "library-hook"
      source: "trpc.post.create.useMutation"
    - name: "handleSubmit"
      type: "event_handler"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "jsx-form-1"
      type: "template"
      target: "form"
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
    - from: "trpc.post.create.useMutation"
      to: "Server: post.create"
      fromType: "data_store"
      toType: "external_entity_input"
      description: "sends mutation to tRPC procedure"
    - from: "jsx-form-1"
      to: "handleSubmit"
      fromType: "external_entity_output"
      toType: "process"
      description: "onSubmit handler"
    - from: "title"
      to: "handleSubmit"
      fromType: "external_entity_input"
      toType: "process"
      description: "uses title prop"
    - from: "handleSubmit"
      to: "mutate"
      fromType: "process"
      toType: "process"
      description: "calls mutate function"
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
      description: "display created post"
    - from: "jsx-button-1"
      to: "handleSubmit"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick handler"
*/

// Mock tRPC client for demonstration
// In a real app, this would be imported from your tRPC setup
const trpc = {
  post: {
    create: {
      useMutation: () => {
        // This is a mock implementation
        // Real tRPC would return actual mutation results
        return {
          mutate: (input: { title: string; body: string }) => {
            console.log('Creating post:', input);
          },
          data: null,
          isLoading: false,
          isError: false,
          error: null
        };
      }
    }
  }
};

interface Post {
  id: string;
  title: string;
  body: string;
}

interface TRPCMutationProps {
  title: string;
}

export default function TRPCMutation({ title }: TRPCMutationProps) {
  const { mutate, data, isLoading, isError, error } = trpc.post.create.useMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      title: title,
      body: 'This is a test post created via tRPC mutation'
    });
  };

  return (
    <div>
      <h1>tRPC Mutation Test</h1>
      <form onSubmit={handleSubmit}>
        <button type="submit">Create Post</button>
      </form>
      <button onClick={handleSubmit}>Create Post (Button)</button>
      
      {isLoading && <p>Creating post...</p>}
      {isError && <p>Error creating post: {error?.message}</p>}
      {data && <p>Post created successfully: {data.title}</p>}
    </div>
  );
}
