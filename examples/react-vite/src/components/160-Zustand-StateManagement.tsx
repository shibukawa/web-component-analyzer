/*
ACCEPTANCE_TEST:
  description: "Component using Zustand store hook with state and actions"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "subgraph-useBearStore-input"
      type: "subgraph"
      label: "useBearStore Input"
    - name: "bears"
      type: "custom-hook"
      dataType: "number"
      source: "useBearStore"
      parent: "subgraph-useBearStore-input"
  
  external_entities_output:
    - name: "subgraph-useBearStore-output"
      type: "subgraph"
      label: "useBearStore Output"
    - name: "increasePopulation"
      type: "custom-hook"
      source: "useBearStore"
      parent: "subgraph-useBearStore-output"
    - name: "removeAllBears"
      type: "custom-hook"
      source: "useBearStore"
      parent: "subgraph-useBearStore-output"
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
    - from: "bears"
      to: "jsx-p-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display bear count"
    - from: "increasePopulation"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
    - from: "removeAllBears"
      to: "jsx-button-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
*/

import { create } from 'zustand';

interface BearState {
  bears: number;
  increasePopulation: () => void;
  removeAllBears: () => void;
}

const useBearStore = create<BearState>((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}));

export default function ZustandStateManagement() {
  const { bears, increasePopulation, removeAllBears } = useBearStore();

  return (
    <div>
      <h1>Zustand State Management Test</h1>
      <p>Bears: {bears}</p>
      <button onClick={increasePopulation}>Add Bear</button>
      <button onClick={removeAllBears}>Remove All Bears</button>
    </div>
  );
}
