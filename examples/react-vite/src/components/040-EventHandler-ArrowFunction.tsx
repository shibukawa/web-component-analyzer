/*
ACCEPTANCE_TEST:
  description: "onClick using arrow function wrapper - function call detection"
  
  external_entities_input: []
  
  processes:
    - name: "increment"
      description: "Function called within arrow function in onClick"
      type: "event_handler"
    - name: "decrement"
      description: "Function called within arrow function in onClick"
      type: "event_handler"
    - name: "reset"
      description: "Function called within arrow function in onClick"
      type: "event_handler"
  
  data_stores:
    - name: "value"
      type: "state"
      dataType: "number"
  
  external_entities_output:
    - name: "jsx-div-1"
      type: "template"
      target: "div"
    - name: "jsx-h2-1"
      type: "template"
      target: "h2"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
    - name: "jsx-button-2"
      type: "template"
      target: "button"
    - name: "jsx-button-3"
      type: "template"
      target: "button"
  
  data_flows:
    - from: "value"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display: value"
    - from: "jsx-button-1"
      to: "increment"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick: () => increment()"
    - from: "jsx-button-2"
      to: "decrement"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick: () => decrement()"
    - from: "jsx-button-3"
      to: "reset"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick: () => reset()"
    - from: "increment"
      to: "value"
      fromType: "process"
      toType: "data_store"
      description: "updates value state"
    - from: "decrement"
      to: "value"
      fromType: "process"
      toType: "data_store"
      description: "updates value state"
    - from: "reset"
      to: "value"
      fromType: "process"
      toType: "data_store"
      description: "updates value state"
*/

import { useState } from 'react';

/**
 * Test component for arrow function wrapper event handler detection
 * Tests Requirement 1.2: Variable called within arrow function in event handler
 * Tests Requirement 2.3: Support for arrow function wrapper pattern
 */
export default function EventHandlerArrowFunction() {
  const [value, setValue] = useState(0);

  // Function variables that will be called within arrow functions
  const increment = () => {
    setValue(value + 1);
  };

  const decrement = () => {
    setValue(value - 1);
  };

  const reset = () => {
    setValue(0);
  };

  return (
    <div>
      <h2>Arrow Function Event Handlers</h2>
      <p>Value: {value}</p>
      <button onClick={() => increment()}>Increment</button>
      <button onClick={() => decrement()}>Decrement</button>
      <button onClick={() => reset()}>Reset</button>
    </div>
  );
}
