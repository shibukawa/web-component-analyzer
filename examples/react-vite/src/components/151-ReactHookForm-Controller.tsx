/*
ACCEPTANCE_TEST:
  description: "Component using useController for individual field control with field and fieldState"
  
  external_entities_input: []
  
  data_stores:
    - name: "field"
      type: "library-hook"
      dataType: "object"
      source: "useController"
    - name: "fieldState"
      type: "library-hook"
      dataType: "object"
      source: "useController"
  
  processes: []
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "jsx-div-1"
      type: "template"
      target: "div"
      parent: "subgraph-jsx-output"
    - name: "jsx-input-1"
      type: "template"
      target: "input"
      parent: "subgraph-jsx-output"
    - name: "jsx-span-1"
      type: "template"
      target: "span"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "field"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "field binding to input"
    - from: "fieldState"
      to: "jsx-span-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display field error state"
*/

import { useForm, useController } from 'react-hook-form';

interface FormData {
  username: string;
}

export default function ReactHookFormController() {
  const { control } = useForm<FormData>({
    defaultValues: {
      username: ''
    }
  });

  const { field, fieldState } = useController({
    name: 'username',
    control,
    rules: { required: 'Username is required' }
  });

  return (
    <div>
      <h1>React Hook Form Controller Test</h1>
      <div>
        <label>Username:</label>
        <input
          type="text"
          {...field}
          placeholder="Enter username"
        />
        {fieldState.error && (
          <span style={{ color: 'red' }}>{fieldState.error.message}</span>
        )}
      </div>
    </div>
  );
}
