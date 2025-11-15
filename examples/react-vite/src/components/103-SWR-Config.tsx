/*
ACCEPTANCE_TEST:
  description: "Component using useSWRConfig for global mutate function"
  
  external_entities_input:
    - name: "mutate"
      type: "library-hook"
      dataType: "function"
      source: "useSWRConfig"
  
  processes:
    - name: "handleRefreshAll"
      type: "event-handler"
      references: ["mutate"]
  
  external_entities_output:
    - name: "jsx-button-1"
      type: "template"
      target: "button"
  
  data_flows:
    - from: "mutate"
      to: "handleRefreshAll"
      fromType: "external_entity_input"
      toType: "process"
      description: "mutate function used in handler"
    - from: "handleRefreshAll"
      to: "jsx-button-1"
      fromType: "process"
      toType: "external_entity_output"
      description: "onClick handler"
*/

import { useSWRConfig } from 'swr';

export default function SWRConfigExample() {
  const { mutate } = useSWRConfig();

  const handleRefreshAll = () => {
    // Revalidate all SWR caches
    mutate(() => true);
  };

  return (
    <div>
      <h1>SWR Config Test</h1>
      <p>This component uses useSWRConfig to get the global mutate function.</p>
      <button onClick={handleRefreshAll}>Refresh All Caches</button>
    </div>
  );
}
