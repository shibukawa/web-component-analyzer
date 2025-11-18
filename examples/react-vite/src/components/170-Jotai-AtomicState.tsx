/*
ACCEPTANCE_TEST:
  description: "Component using Jotai useAtom hook for atomic state management"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "countAtom"
      type: "jotai-atom"
      dataType: "atom"
      source: "jotai"
  
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
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-2"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "countAtom"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display count value (reads edge)"
    - from: "jsx-button-1"
      to: "countAtom"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "setCount setter (set edge)"
    - from: "jsx-button-2"
      to: "countAtom"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "setCount setter (set edge)"
*/

import { atom, useAtom } from 'jotai';

// Define an atom for count state
const countAtom = atom(0);

export default function JotaiAtomicState() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <div>
      <h1>Jotai Atomic State Test</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
