/*
ACCEPTANCE_TEST:
  description: "Component using Jotai useAtomValue and useSetAtom hooks for read-only and write-only atom access"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "textAtom"
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
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "textAtom"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display text value (reads edge)"
    - from: "jsx-button-1"
      to: "textAtom"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "setText setter (set edge)"
*/

import { atom, useAtomValue, useSetAtom } from 'jotai';

// Define an atom for text state
const textAtom = atom('Hello Jotai');

export default function JotaiReadWrite() {
  // Read-only access to atom value
  const text = useAtomValue(textAtom);
  
  // Write-only access to atom setter
  const setText = useSetAtom(textAtom);

  return (
    <div>
      <h1>Jotai Read/Write Test</h1>
      <p>Text: {text}</p>
      <input 
        type="text" 
        placeholder="Enter new text"
        id="textInput"
      />
      <button onClick={() => {
        const input = document.getElementById('textInput') as HTMLInputElement;
        setText(input.value);
      }}>
        Update Text
      </button>
    </div>
  );
}
