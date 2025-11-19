/*
ACCEPTANCE_TEST:
  description: "Component using useLocalObservable with multiple observable properties"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "user"
      type: "mobx-observable"
      dataType: "object"
      source: "useLocalObservable"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-2"
      type: "template"
      target: "input"
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
    - from: "user"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "binds"
    - from: "user"
      to: "jsx-input-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "binds"
    - from: "user"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
    - from: "user"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
    - from: "user"
      to: "jsx-button-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "binds"
*/

import { observer, useLocalObservable } from 'mobx-react-lite';

function MobXLocalObservable() {
  const user = useLocalObservable(() => ({
    firstName: 'John',
    lastName: 'Doe',
    age: 25,
    setFirstName(value: string) {
      user.firstName = value;
    },
    setLastName(value: string) {
      user.lastName = value;
    },
    incrementAge() {
      user.age++;
    }
  }));

  return (
    <div>
      <h1>MobX Local Observable Test</h1>
      <div>
        <input
          type="text"
          placeholder="First Name"
          value={user.firstName}
          onChange={(e) => user.setFirstName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Last Name"
          value={user.lastName}
          onChange={(e) => user.setLastName(e.target.value)}
        />
      </div>
      <p>Full Name: {user.firstName} {user.lastName}</p>
      <p>Age: {user.age}</p>
      <button onClick={user.incrementAge}>Increment Age</button>
    </div>
  );
}

export default observer(MobXLocalObservable);
