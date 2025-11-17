/*
ACCEPTANCE_TEST:
  description: "Component using Next.js useSearchParams and useParams hooks"
  
  external_entities_input:
    - name: "URL: Input"
      type: "external"
      dataType: "url"
  
  processes:
    - name: "useSearchParams\n<Next.js>"
      type: "library-hook"
      source: "next/navigation"
    - name: "useParams\n<Next.js>"
      type: "library-hook"
      source: "next/navigation"
  
  data_stores:
    - name: "query"
      type: "computed"
      dataType: "string"
    - name: "filter"
      type: "computed"
      dataType: "string"
  
  external_entities_output:
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
    - name: "jsx-p-2"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
    - name: "jsx-p-3"
      type: "template"
      target: "p"
      parent: "subgraph-jsx-output"
  
  data_flows:
    - from: "URL: Input"
      to: "useParams\n<Next.js>"
      fromType: "external_entity_input"
      toType: "process"
      description: "URL provides route params"
    - from: "URL: Input"
      to: "useSearchParams\n<Next.js>"
      fromType: "external_entity_input"
      toType: "process"
      description: "URL provides search params"
    - from: "useParams\n<Next.js>"
      to: "jsx-p-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "display route param id"
    - from: "useSearchParams\n<Next.js>"
      to: "query"
      fromType: "process"
      toType: "data_store"
      description: "extract query param"
    - from: "useSearchParams\n<Next.js>"
      to: "filter"
      fromType: "process"
      toType: "data_store"
      description: "extract filter param"
    - from: "query"
      to: "jsx-p-2"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display search param query"
    - from: "filter"
      to: "jsx-p-3"
      fromType: "data_store"
      toType: "external_entity_output"
      description: "display search param filter"
*/

import { useSearchParams, useParams } from 'next/navigation';

export default function NextJSSearchParams() {
  const searchParams = useSearchParams();
  const params = useParams();

  return (
    <div>
      <h1>Next.js Search Params Test</h1>
      <p>Route param ID: {params.id}</p>
      <p>Search query: {searchParams.get('query')}</p>
      <p>Filter: {searchParams.get('filter')}</p>
    </div>
  );
}
