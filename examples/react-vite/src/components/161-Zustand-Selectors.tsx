/*
ACCEPTANCE_TEST:
  description: "Component using multiple selectors from the same Zustand store - single data-store pattern"
  
  external_entities_input: []
  
  processes: []
  
  data_stores:
    - name: "useUserStore"
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
    - name: "jsx-div-2"
      type: "template"
      target: "div"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
    - name: "jsx-input-2"
      type: "template"
      target: "input"
    - name: "jsx-input-3"
      type: "template"
      target: "input"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
  
  data_flows:
    - from: "useUserStore"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "value: firstName"
    - from: "useUserStore"
      to: "jsx-input-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "value: lastName"
    - from: "useUserStore"
      to: "jsx-input-3"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "value: email"
    - from: "useUserStore"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display: firstName, lastName"
    - from: "jsx-input-1"
      to: "useUserStore"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onChange: setFirstName"
    - from: "jsx-input-2"
      to: "useUserStore"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onChange: setLastName"
    - from: "jsx-input-3"
      to: "useUserStore"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onChange: setEmail"
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
