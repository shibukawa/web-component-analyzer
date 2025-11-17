/*
ACCEPTANCE_TEST:
  description: "Simple component with props, state, and basic event handler (5-10 nodes)"
  
  external_entities_input:
    - name: "name"
      type: "prop"
      dataType: "string"
    - name: "greeting"
      type: "prop"
      dataType: "string"
  
  processes:
    - name: "handleClick"
      description: "Updates click count when button is clicked"
      type: "event_handler"
  
  data_stores:
    - name: "count"
      type: "state"
      dataType: "number"
  
  external_entities_output:
    - name: "greeting_display"
      type: "template"
      target: "h1"
    - name: "count_display"
      type: "template"
      target: "p"
    - name: "button_click"
      type: "template"
      target: "button"
  
  data_flows:
    - from: "greeting"
      to: "greeting_display"
      fromType: "external_entity_input"
      toType: "external_entity_output"
    - from: "name"
      to: "greeting_display"
      fromType: "external_entity_input"
      toType: "external_entity_output"
    - from: "count"
      to: "count_display"
      fromType: "data_store"
      toType: "external_entity_output"
    - from: "button_click"
      to: "handleClick"
      fromType: "external_entity_output"
      toType: "process"
    - from: "handleClick"
      to: "count"
      fromType: "process"
      toType: "data_store"
*/

import { useState } from 'react';

interface SimpleGreetingProps {
  name: string;
  greeting?: string;
}

/**
 * Simple component for testing basic DFD visualization
 * Expected nodes: 5-10
 * - 2 input props (name, greeting)
 * - 1 state (count)
 * - 1 process (handleClick)
 * - 3 outputs (greeting display, count display, button)
 */
export default function SimpleGreeting({ name, greeting = 'Hello' }: SimpleGreetingProps) {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>{greeting}, {name}!</h1>
      <p>You clicked {count} times</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}
