/*
ACCEPTANCE_TEST:
  description: "Component using Next.js useRouter and usePathname hooks for navigation"
  
  external_entities_input:
    - name: "URL: Input"
      type: "external"
      dataType: "url"
  
  processes:
    - name: "usePathname\n<Next.js>"
      type: "library-hook"
      source: "next/navigation"
    - name: "useRouter\n<Next.js>"
      type: "library-hook"
      source: "next/navigation"
    - name: "handleNavigate"
      type: "event_handler"
    - name: "handleBack"
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
    - name: "jsx-p-1"
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
      to: "usePathname\n<Next.js>"
      fromType: "external_entity_input"
      toType: "process"
      description: "URL provides pathname"
    - from: "usePathname\n<Next.js>"
      to: "jsx-p-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "display current pathname"
    - from: "jsx-button-1"
      to: "handleNavigate"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick event"
    - from: "handleNavigate"
      to: "useRouter\n<Next.js>"
      fromType: "process"
      toType: "process"
      description: "calls router.push"
    - from: "jsx-button-2"
      to: "handleBack"
      fromType: "external_entity_output"
      toType: "process"
      description: "onClick event"
    - from: "handleBack"
      to: "useRouter\n<Next.js>"
      fromType: "process"
      toType: "process"
      description: "calls router.back"
    - from: "useRouter\n<Next.js>"
      to: "URL: Output"
      fromType: "process"
      toType: "external_entity_output"
      description: "router navigates to URL"
*/

import { useRouter, usePathname } from 'next/navigation';

export default function NextJSRouting() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = () => {
    router.push('/new-page');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div>
      <h1>Next.js Routing Test</h1>
      <p>Current pathname: {pathname}</p>
      <button onClick={handleNavigate}>Go to New Page</button>
      <button onClick={handleBack}>Go Back</button>
    </div>
  );
}
