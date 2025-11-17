/*
ACCEPTANCE_TEST:
  description: "Component with conditional rendering using ternary and logical AND operators"
  
  external_entities_input:
    - name: "isLoggedIn"
      type: "prop"
      dataType: "boolean"
  
  data_stores:
    - name: "count"
      type: "state"
      dataType: "number"
  
  processes:
    - name: "handleIncrement"
      type: "event-handler"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "subgraph-condition-1"
      type: "subgraph"
      label: "{isLoggedIn}"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-condition-1"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
      parent: "subgraph-condition-1"
    - name: "subgraph-condition-2"
      type: "subgraph"
      label: "{count > 5}"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-2"
      type: "template"
      target: "p"
      parent: "subgraph-condition-2"
  
  data_flows:
    - from: "isLoggedIn"
      to: "subgraph-condition-1"
      fromType: "external_entity_input"
      toType: "subgraph"
      description: "controls visibility"
    - from: "count"
      to: "subgraph-condition-2"
      fromType: "data_store"
      toType: "subgraph"
      description: "controls visibility"
    - from: "handleIncrement"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick"
    - from: "count"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
    - from: "count"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
*/

import { useState } from 'react';

interface Props {
  isLoggedIn: boolean;
}

export default function ConditionalRendering({ isLoggedIn }: Props) {
  const [count, setCount] = useState(0);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>Conditional Rendering Test</h1>
      {isLoggedIn && (
        <div>
          <p>Count: {count}</p>
          <button onClick={handleIncrement}>Increment</button>
        </div>
      )}
      {count > 5 ? <p>High count: {count}</p> : null}
    </div>
  );
}
