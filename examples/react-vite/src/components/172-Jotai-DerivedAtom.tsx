/*
ACCEPTANCE_TEST:
  description: "Component using Jotai derived atom (atom that reads from other atoms)"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "countAtom"
      type: "jotai-atom"
      dataType: "atom"
      source: "jotai"
    - name: "doubleCountAtom"
      type: "jotai-atom"
      dataType: "derived-atom"
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
    - name: "jsx-p-2"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "countAtom"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display count value (reads edge)"
    - from: "countAtom"
      to: "doubleCountAtom"
      fromType: "data_store"
      toType: "data_store"
      description: "derived atom reads from base atom"
    - from: "doubleCountAtom"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display doubleCount value (reads edge)"
    - from: "jsx-button-1"
      to: "countAtom"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "setCount setter (set edge)"
*/

import { atom, useAtom, useAtomValue } from 'jotai';

// Base atom
const countAtom = atom(0);

// Derived atom that reads from countAtom
const doubleCountAtom = atom((get) => get(countAtom) * 2);

export default function JotaiDerivedAtom() {
  const [count, setCount] = useAtom(countAtom);
  const doubleCount = useAtomValue(doubleCountAtom);

  return (
    <div>
      <h1>Jotai Derived Atom Test</h1>
      <p>Count: {count}</p>
      <p>Double Count: {doubleCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
