/*
ACCEPTANCE_TEST:
  description: "Variable used in both event handler and data contexts - context-aware classification"
  
  external_entities_input: []
  
  processes:
    - name: "handleSubmit"
      description: "Event handler function used in onClick"
      type: "event_handler"
    - name: "formatMessage"
      description: "Function used for data transformation"
      type: "computation"
  
  data_stores:
    - name: "message"
      type: "state"
      dataType: "string"
    - name: "submitted"
      type: "state"
      dataType: "boolean"
  
  external_entities_output:
    - name: "jsx-div-1"
      type: "template"
      target: "div"
    - name: "jsx-h2-1"
      type: "template"
      target: "h2"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
  
  data_flows:
    - from: "message"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "value: message"
    - from: "jsx-input-1"
      to: "message"
      fromType: "external_entity_output"
      toType: "data_store"
      description: "onChange updates message"
    - from: "jsx-button-1"
      to: "handleSubmit"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick: handleSubmit"
    - from: "handleSubmit"
      to: "submitted"
      fromType: "process"
      toType: "data_store"
      description: "updates submitted state"
    - from: "message"
      to: "formatMessage"
      fromType: "data_store"
      toType: "process"
      description: "input to formatMessage"
    - from: "formatMessage"
      to: "jsx-p-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "formatted message display"
    - from: "submitted"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "conditional display"
*/

import { useState } from 'react';

/**
 * Test component for mixed usage pattern detection
 * Tests that functions used in event handlers are correctly classified
 * while functions used for data transformation are also properly identified
 * 
 * Tests Requirement 1.1: handleSubmit used in onClick
 * Tests Requirement 2.2: Classification based on usage context
 * Tests that the analyzer can distinguish between:
 * - handleSubmit: used as event handler (onClick)
 * - formatMessage: used for data transformation (in JSX expression)
 */
export default function EventHandlerMixedUsage() {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Event handler function - used in onClick
  const handleSubmit = () => {
    setSubmitted(true);
  };

  // Data transformation function - used in JSX expression
  const formatMessage = (msg: string) => {
    return msg.toUpperCase();
  };

  return (
    <div>
      <h2>Mixed Usage Pattern</h2>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter a message"
      />
      <button onClick={handleSubmit}>Submit</button>
      {submitted && <p>Formatted: {formatMessage(message)}</p>}
    </div>
  );
}
