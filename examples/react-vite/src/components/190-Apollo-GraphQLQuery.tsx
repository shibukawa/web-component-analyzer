/*
ACCEPTANCE_TEST:
  description: "Component using useQuery from Apollo Client for GraphQL data fetching with consolidated library-hook node"
  
  external_entities_input:
    - name: "Server: GraphQL"
      type: "server"
      dataType: "external"
      endpoint: "GraphQL"
  
  data_stores:
    - name: "useQuery"
      type: "library-hook"
      dataType: "object"
      source: "@apollo/client"
  
  processes: []
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
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
    - name: "jsx-div-1"
      type: "template"
      target: "div"
      parent: "subgraph-condition-3"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "Server: GraphQL"
      to: "useQuery"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "fetches data from GraphQL API"
    - from: "useQuery"
      to: "subgraph-condition-1"
      fromType: "data_store"
      toType: "subgraph"
      label: "loading"
      description: "controls loading display"
    - from: "useQuery"
      to: "subgraph-condition-2"
      fromType: "data_store"
      toType: "subgraph"
      label: "error"
      description: "controls error display"
    - from: "useQuery"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      label: "error"
      description: "display error message"
    - from: "useQuery"
      to: "subgraph-condition-3"
      fromType: "data_store"
      toType: "subgraph"
      label: "data"
      description: "controls data display"
    - from: "useQuery"
      to: "jsx-div-1"
      fromType: "data_store"
      toType: "external_entity_output"
      label: "data"
      description: "display users"
    - from: "jsx-button-1"
      to: "useQuery"
      fromType: "external_entity_output"
      toType: "data_store"
      label: "onClick: refetch"
      description: "refetch button triggers query"
*/

import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users {
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

interface GetUsersData {
  users: User[];
}

export default function ApolloGraphQLQuery() {
  const { data, loading, error, refetch } = useQuery<GetUsersData>(GET_USERS);

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p>Error loading users: {error.message}</p>;
  }

  return (
    <div>
      <h1>Apollo Client GraphQL Query Test</h1>
      {data && (
        <div>
          {data.users.map((user: User) => (
            <div key={user.id}>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
          ))}
        </div>
      )}
      <button onClick={() => refetch()}>Refresh Users</button>
    </div>
  );
}
