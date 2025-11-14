/*
ACCEPTANCE_TEST:
  description: "Component with various attribute references including event handlers, data attributes, and custom component props"
  
  data_stores:
    - name: "email"
      type: "state"
      dataType: "string"
    - name: "password"
      type: "state"
      dataType: "string"
    - name: "isEnabled"
      type: "state"
      dataType: "boolean"
  
  processes:
    - name: "handleEmailChange"
      type: "event-handler"
    - name: "handlePasswordChange"
      type: "event-handler"
    - name: "handleSubmit"
      type: "event-handler"
    - name: "handleToggle"
      type: "event-handler"
  
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
    - name: "jsx-button-1"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
    - name: "jsx-button-2"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "email"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
    - from: "handleEmailChange"
      to: "jsx-input-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onChange"
    - from: "password"
      to: "jsx-input-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
    - from: "handlePasswordChange"
      to: "jsx-input-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "onChange"
    - from: "handleSubmit"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick"
    - from: "isEnabled"
      to: "jsx-button-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display"
    - from: "handleToggle"
      to: "jsx-button-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick"
*/

import { useState } from 'react';

export default function AttributeReferences() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleSubmit = () => {
    console.log('Submitting:', { email, password });
  };

  const handleToggle = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <div>
      <h1>Attribute References Test</h1>
      
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="Enter email"
        />
      </div>
      
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder="Enter password"
        />
      </div>
      
      <button onClick={handleSubmit} disabled={!isEnabled}>
        Submit
      </button>
      
      <button onClick={handleToggle}>
        Toggle Enable
      </button>
    </div>
  );
}
