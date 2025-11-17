/*
ACCEPTANCE_TEST:
  description: "Component using useRouterState from TanStack Router for accessing router state information"
  
  external_entities_input:
    - name: "URL: Input"
      type: "external-entity"
      dataType: "object"
  
  data_stores:
    - name: "useRouterState"
      type: "library-hook"
      source: "@tanstack/react-router"
  
  processes: []
  
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
    - name: "jsx-p-1"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-2"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-3"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "URL: Input"
      to: "useRouterState"
      fromType: "external_entity_input"
      toType: "data_store"
      description: "provides router state"
    - from: "useRouterState"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display current pathname"
    - from: "useRouterState"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display router status"
    - from: "useRouterState"
      to: "jsx-p-3"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display pending state"
*/

import { useRouterState } from '@tanstack/react-router';

export default function TanStackRouterState() {
  const routerState = useRouterState();

  return (
    <div>
      <h1>TanStack Router State Test</h1>
      <p>Current Pathname: {routerState.location.pathname}</p>
      <p>Router Status: {routerState.status}</p>
      <p>Is Pending: {routerState.isTransitioning ? 'Yes' : 'No'}</p>
    </div>
  );
}
