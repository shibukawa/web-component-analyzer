/*
ACCEPTANCE_TEST:
  description: "Component using MobX observer HOC with observable state"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "store"
      type: "mobx-observable"
      dataType: "object"
      source: "useLocalObservable"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
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
    - name: "jsx-button-3"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "store"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "binds: count"
    - from: "jsx-button-1"
      to: "store"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onClick: increment"
    - from: "jsx-button-2"
      to: "store"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onClick: decrement"
    - from: "jsx-button-3"
      to: "store"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onClick: reset"
*/

import { observer, useLocalObservable } from 'mobx-react-lite';

function MobXObservableState() {
  const store = useLocalObservable(() => ({
    count: 0,
    increment() {
      store.count++;
    },
    decrement() {
      store.count--;
    },
    reset() {
      store.count = 0;
    }
  }));

  return (
    <div>
      <h1>MobX Observable State Test</h1>
      <p>Count: {store.count}</p>
      <button onClick={store.increment}>Increment</button>
      <button onClick={store.decrement}>Decrement</button>
      <button onClick={store.reset}>Reset</button>
    </div>
  );
}

export default observer(MobXObservableState);
