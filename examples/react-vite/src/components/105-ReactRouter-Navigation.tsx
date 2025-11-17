/*
ACCEPTANCE_TEST:
  description: "Component using useNavigate, useParams, and useLocation from React Router for navigation and route parameter access"
  
  external_entities_input:
    - name: "useParams"
      type: "library-hook"
      dataType: "object"
      source: "react-router-dom"
    - name: "useLocation"
      type: "library-hook"
      dataType: "object"
      source: "react-router-dom"
  
  data_stores: []
  
  processes:
    - name: "useNavigate"
      type: "library-hook"
      source: "react-router-dom"
  
  external_entities_output:
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
    - name: "jsx-button-2"
      type: "template"
      target: "button"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "useParams"
      to: "jsx-p-1"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display route parameter"
    - from: "useLocation"
      to: "jsx-p-2"
      fromType: "external_entity_input"
      toType: "external_entity_output"
      description: "display current pathname"
    - from: "useNavigate"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler for navigation"
    - from: "useNavigate"
      to: "jsx-button-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler for back navigation"
*/

import { useNavigate, useParams, useLocation } from 'react-router-dom';

interface RouteParams {
  id?: string;
}

export default function ReactRouterNavigation() {
  const navigate = useNavigate();
  const params = useParams<RouteParams>();
  const location = useLocation();

  const handleNavigateToHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div>
      <h1>React Router Navigation Test</h1>
      <p>Current Route ID: {params.id || 'none'}</p>
      <p>Current Path: {location.pathname}</p>
      <button onClick={handleNavigateToHome}>Go to Home</button>
      <button onClick={handleGoBack}>Go Back</button>
    </div>
  );
}
