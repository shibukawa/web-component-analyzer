# Web Component Analyzer

Visualize the internal structure of frontend components through Data Flow Diagrams (DFD) like the following mermaid.js style.

You can try it without installing on the [playground](https://shibukawa.github.io/web-component-analyzer/) site.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'fontFamily': 'Comic Sans MS, cursive'}, 'flowchart': {'curve': 'basis', 'padding': 20}}}%%
flowchart LR
  subgraph InputProps["Input Props"]
    direction TB
    prop_0("name")
    prop_1("greeting")
  end
  state_2[("count")]
  process_3[["handleClick"]]
  jsx_element_0["h1"]
  jsx_element_1["p"]
  jsx_element_2["button"]
  subgraph subgraph_0["JSX Output"]
    direction TB
      jsx_element_0@{ shape: hex, label: "&lt;h1&gt;" }
      jsx_element_1@{ shape: hex, label: "&lt;p&gt;" }
      jsx_element_2@{ shape: hex, label: "&lt;button&gt;" }
  end
  prop_1 eprop_1_jsx_element_0@-->|"display"| jsx_element_0
  eprop_1_jsx_element_0@{ animate: true }
  prop_0 eprop_0_jsx_element_0@-->|"display"| jsx_element_0
  eprop_0_jsx_element_0@{ animate: true }
  state_2 estate_2_jsx_element_1@-->|"display"| jsx_element_1
  estate_2_jsx_element_1@{ animate: true }
  jsx_element_2 ejsx_element_2_process_3@-->|"onClick"| process_3
  ejsx_element_2_process_3@{ animate: true }
  state_2 estate_2_process_3@-->|"reads"| process_3
  estate_2_process_3@{ animate: true }
  process_3 eprocess_3_state_2@-->|"writes"| state_2
  eprocess_3_state_2@{ animate: true }

  %% Styling
  classDef inputProp fill:#E3F2FD,stroke:#2196F3,stroke-width:2px
  classDef outputProp fill:#FFF3E0,stroke:#FF9800,stroke-width:2px
  classDef process fill:#F3E5F5,stroke:#9C27B0,stroke-width:3px
  classDef dataStore fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px
  classDef libraryHook fill:#C8E6C9,stroke:#388E3C,stroke-width:2px
  classDef jsxElement fill:#FFF3E0,stroke:#FF9800,stroke-width:2px
  classDef contextData fill:#E1F5FE,stroke:#0288D1,stroke-width:2px
  classDef contextFunction fill:#FFF9C4,stroke:#F57C00,stroke-width:2px
  classDef exportedHandler fill:#E8F5E9,stroke:#4CAF50,stroke-width:2px
  class prop_0 inputProp
  class prop_1 inputProp
  class state_2 dataStore
  class process_3 process
  class jsx_element_0 jsxElement
  class jsx_element_1 jsxElement
  class jsx_element_2 jsxElement
```

## How To Use

Install extension

Launch command `Show Component DFD` from command palette.

## Supported Frameworks

* React
  * Router
    * Next.js
    * TanStack Router
    * React Router
  * Query
    * SWR
    * TanStack Query
    * Apollo
    * tRPC
  * Data Store
    * Zustand
    * Jotai
    * MobX
  * From
    * React Hook Form
* Vue 3 (Composition API with `<script setup>`)
  * Vue Router
  * Pinia
* Svelte5
  * SvelteKit router

## License

Apache2

## Known Issues

* DFD nodes are clickable and navigate to source code positions. But locations are sometimes wrong.  