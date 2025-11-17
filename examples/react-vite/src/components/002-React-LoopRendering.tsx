/*
ACCEPTANCE_TEST:
  description: "Component with .map() loop rendering and nested loops"
  
  data_stores:
    - name: "items"
      type: "state"
      dataType: "array"
    - name: "matrix"
      type: "state"
      dataType: "array"
  
  processes:
    - name: "handleAddItem"
      type: "event-handler"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "subgraph-loop-1"
      type: "subgraph"
      label: "{loop}"
      parent: "subgraph-jsx-output"
    - name: "jsx-li-1"
      type: "template"
      target: "li"
      parent: "subgraph-loop-1"
    - name: "subgraph-loop-2"
      type: "subgraph"
      label: "{loop}"
      parent: "subgraph-jsx-output"
    - name: "jsx-span-1"
      type: "template"
      target: "span"
      parent: "subgraph-loop-2"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "items"
      to: "subgraph-loop-1"
      fromType: "data_store"
      toType: "subgraph"
      description: "iterates over"
    - from: "matrix"
      to: "subgraph-loop-2"
      fromType: "data_store"
      toType: "subgraph"
      description: "iterates over"
    - from: "handleAddItem"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick"
*/

import { useState } from 'react';

export default function LoopRendering() {
  const [items, setItems] = useState(['Apple', 'Banana', 'Cherry']);
  const [matrix] = useState([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
  ]);

  const handleAddItem = () => {
    setItems([...items, `Item ${items.length + 1}`]);
  };

  return (
    <div>
      <h1>Loop Rendering Test</h1>
      
      <h2>Simple List</h2>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      
      <h2>Nested Loops (Should Merge)</h2>
      <div>
        {matrix.map((row, rowIndex) => 
          row.map((cell, colIndex) => (
            <span key={`${rowIndex}-${colIndex}`}>{cell} </span>
          ))
        )}
      </div>
      
      <button onClick={handleAddItem}>Add Item</button>
    </div>
  );
}
