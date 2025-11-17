/*
ACCEPTANCE_TEST:
  description: "Component using useForm for form state management with register, handleSubmit, and formState"
  
  external_entities_input: []
  
  data_stores:
    - name: "register"
      type: "library-hook"
      dataType: "function"
      source: "useForm"
    - name: "handleSubmit"
      type: "library-hook"
      dataType: "function"
      source: "useForm"
    - name: "formState"
      type: "library-hook"
      dataType: "object"
      source: "useForm"
    - name: "setValue"
      type: "library-hook"
      dataType: "function"
      source: "useForm"
    - name: "reset"
      type: "library-hook"
      dataType: "function"
      source: "useForm"
  
  processes:
    - name: "onSubmit"
      type: "event_handler"
      description: "Form submission handler"
    - name: "onClick"
      type: "event_handler"
      description: "Reset button click handler"
  
  external_entities_output:
    - name: "subgraph-jsx-output"
      type: "subgraph"
      label: "JSX Output"
    - name: "jsx-form-1"
      type: "template"
      target: "form"
      parent: "subgraph-jsx-output"
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
    - from: "register"
      to: "jsx-input-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "register first name field"
    - from: "register"
      to: "jsx-input-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "register email field"
    - from: "handleSubmit"
      to: "jsx-form-1"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "form submission handler"
    - from: "reset"
      to: "jsx-button-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "reset button click handler"
*/

import { useForm } from 'react-hook-form';

interface FormData {
  firstName: string;
  email: string;
}

export default function ReactHookFormBasicForm() {
  const { register, handleSubmit, formState, setValue, reset } = useForm<FormData>({
    defaultValues: {
      firstName: '',
      email: ''
    }
  });

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <div>
      <h1>React Hook Form Basic Form Test</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>First Name:</label>
          <input
            type="text"
            {...register('firstName', { required: 'First name is required' })}
            placeholder="Enter first name"
            name="firstName"
          />
        </div>
        <div>
          <label>Email:</label>
          <input
            type="email"
            {...register('email', { required: 'Email is required' })}
            placeholder="Enter email"
            name="email"
          />
        </div>
        <button type="submit">Submit</button>
        <button type="button" onClick={() => reset()}>
          Reset
        </button>
      </form>
    </div>
  );
}
