/*
ACCEPTANCE_TEST:
  description: "Simple onClick using function variable - direct reference pattern"
  
  external_entities_input: []
  
  processes:
    - name: "handleClick"
      description: "Event handler function referenced directly in onClick"
      type: "event_handler"
  
  data_stores:
    - name: "count"
      type: "state"
      dataType: "number"
  
  external_entities_output:
    - name: "jsx-div-1"
      type: "template"
      target: "div"
    - name: "jsx-p-1"
      type: "template"
      target: "p"
    - name: "jsx-button-1"
      type: "template"
      target: "button"
  
  data_flows:
    - from: "count"
      to: "jsx-p-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display: count"
    - from: "jsx-button-1"
      to: "handleClick"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick: handleClick"
    - from: "handleClick"
      to: "count"
      fromType: "process"
      toType: "data_store"
      description: "updates count state"
*/

import { useState } from 'react';

/**
 * Test component for direct event handler reference detection
 * Tests Requirement 1.1: Variable referenced directly in event handler attribute
 * Tests Requirement 1.3: DFD shows correct edge direction from JSX element to function
 */
export default function EventHandlerDirectReference() {
  const [count, setCount] = useState(0);

  // Function variable that will be referenced directly in onClick
  const handleClick = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Click Me</button>
    </div>
  );
}
