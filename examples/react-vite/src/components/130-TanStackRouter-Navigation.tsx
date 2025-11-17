/*
ACCEPTANCE_TEST:
  description: "Component using useRouter, useNavigate, and useLocation from TanStack Router for navigation and location access"
  
  external_entities_input:
    - name: "URL: Input"
      type: "external"
      dataType: "url"
  
  processes:
    - name: "useLocation\n<TanStack Router>"
      type: "library-hook"
      source: "@tanstack/react-router"
    - name: "useRouter\n<TanStack Router>"
      type: "library-hook"
      source: "@tanstack/react-router"
    - name: "useNavigate\n<TanStack Router>"
      type: "library-hook"
      source: "@tanstack/react-router"
    - name: "handleNavigateToHome"
      type: "event_handler"
    - name: "handleRouterNavigate"
      type: "event_handler"
  
  external_entities_output:
    - name: "URL: Output"
      type: "external"
      dataType: "url"
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
    - from: "URL: Input"
      to: "useLocation\n<TanStack Router>"
      fromType: "external_entity_input"
      toType: "process"
      description: "URL provides location"
    - from: "useLocation\n<TanStack Router>"
      to: "jsx-p-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "display current pathname"
    - from: "URL: Input"
      to: "useRouter\n<TanStack Router>"
      fromType: "external_entity_input"
      toType: "process"
      description: "URL provides router state"
    - from: "useRouter\n<TanStack Router>"
      to: "jsx-p-2"
      fromType: "process"
      toType: "external_entity_output"
      description: "display router status"
    - from: "jsx-button-1"
      to: "handleNavigateToHome"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick event"
    - from: "handleNavigateToHome"
      to: "useNavigate\n<TanStack Router>"
      fromType: "process"
      toType: "process"
      description: "calls navigate function"
    - from: "useNavigate\n<TanStack Router>"
      to: "URL: Output"
      fromType: "process"
      toType: "external_entity_output"
      description: "navigate changes URL"
    - from: "jsx-button-2"
      to: "handleRouterNavigate"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick event"
    - from: "handleRouterNavigate"
      to: "useRouter\n<TanStack Router>"
      fromType: "process"
      toType: "process"
      description: "calls router.navigate"
    - from: "useRouter\n<TanStack Router>"
      to: "URL: Output"
      fromType: "process"
      toType: "external_entity_output"
      description: "router navigates to URL"
*/

import { useRouter, useNavigate, useLocation } from '@tanstack/react-router';

export default function TanStackRouterNavigation() {
  const router = useRouter();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigateToHome = () => {
    navigate({ to: '/' });
  };

  const handleRouterNavigate = () => {
    router.navigate({ to: '/about' });
  };

  return (
    <div>
      <h1>TanStack Router Navigation Test</h1>
      <p>Current Path: {location.pathname}</p>
      <p>Router Status: {router.state.status}</p>
      <button onClick={handleNavigateToHome}>Go to Home</button>
      <button onClick={handleRouterNavigate}>Go to About</button>
    </div>
  );
}
