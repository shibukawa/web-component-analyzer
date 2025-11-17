/*
ACCEPTANCE_TEST:
  description: "Component using multiple selectors from the same Zustand store"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "subgraph-useUserStore-input"
      type: "subgraph"
      label: "useUserStore Input"
    - name: "firstName"
      type: "custom-hook"
      dataType: "string"
      source: "useUserStore"
      parent: "subgraph-useUserStore-input"
    - name: "lastName"
      type: "custom-hook"
      dataType: "string"
      source: "useUserStore"
      parent: "subgraph-useUserStore-input"
    - name: "email"
      type: "custom-hook"
      dataType: "string"
      source: "useUserStore"
      parent: "subgraph-useUserStore-input"
  
  external_entities_output:
    - name: "subgraph-useUserStore-output"
      type: "subgraph"
      label: "useUserStore Output"
    - name: "setFirstName"
      type: "custom-hook"
      source: "useUserStore"
      parent: "subgraph-useUserStore-output"
    - name: "setLastName"
      type: "custom-hook"
      source: "useUserStore"
      parent: "subgraph-useUserStore-output"
    - name: "setEmail"
      type: "custom-hook"
      source: "useUserStore"
      parent: "subgraph-useUserStore-output"
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
    - name: "jsx-div-2"
      type: "template"
      target: "div"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-2"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-3"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "firstName"
      to: "jsx-input-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "value attribute"
    - from: "lastName"
      to: "jsx-input-2"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "value attribute"
    - from: "email"
      to: "jsx-input-3"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "value attribute"
    - from: "firstName"
      to: "jsx-p-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display full name"
    - from: "lastName"
      to: "jsx-p-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display full name"
    - from: "setFirstName"
      to: "jsx-input-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onChange handler"
    - from: "setLastName"
      to: "jsx-input-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "onChange handler"
    - from: "setEmail"
      to: "jsx-input-3"
      fromType: "process"
      toType: "external_entity_output"
      description: "onChange handler"
*/

import { create } from 'zustand';

interface UserState {
  firstName: string;
  lastName: string;
  email: string;
  setFirstName: (firstName: string) => void;
  setLastName: (lastName: string) => void;
  setEmail: (email: string) => void;
}

const useUserStore = create<UserState>((set) => ({
  firstName: '',
  lastName: '',
  email: '',
  setFirstName: (firstName) => set({ firstName }),
  setLastName: (lastName) => set({ lastName }),
  setEmail: (email) => set({ email }),
}));

export default function ZustandSelectors() {
  // Using multiple selectors from the same store
  const firstName = useUserStore((state) => state.firstName);
  const lastName = useUserStore((state) => state.lastName);
  const email = useUserStore((state) => state.email);
  const setFirstName = useUserStore((state) => state.setFirstName);
  const setLastName = useUserStore((state) => state.setLastName);
  const setEmail = useUserStore((state) => state.setEmail);

  return (
    <div>
      <h1>Zustand Selectors Test</h1>
      <div>
        <input
          type="text"
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <p>Full Name: {firstName} {lastName}</p>
    </div>
  );
}
