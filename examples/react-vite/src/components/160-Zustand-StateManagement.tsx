/*
ACCEPTANCE_TEST:
  description: "Component using Zustand store hook with state and actions - single data-store pattern"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "useBearStore"
      type: "library-hook"
      dataType: "zustand-store"
      libraryName: "zustand"
  
  external_entities_output:
    - name: "jsx-div-1"
      type: "template"
      target: "div"
    - name: "jsx-h1-1"
      type: "template"
      target: "h1"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
    - name: "jsx-button-2"
      type: "template"
      target: "button"
  
  data_flows:
    - from: "useBearStore"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display: bears"
    - from: "jsx-button-1"
      to: "useBearStore"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onClick: increasePopulation"
    - from: "jsx-button-2"
      to: "useBearStore"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onClick: removeAllBears"
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
