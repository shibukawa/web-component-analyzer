# Vue Vite Examples

This directory contains Vue 3 example components for testing the web-component-analyzer extension's Vue support.

## Project Setup

This is a minimal Vite + Vue 3 + TypeScript project with Vue Router and Pinia for state management.

### Dependencies

- **Vue 3.5+**: Core framework
- **Vue Router 4.4+**: Routing library
- **Pinia 2.2+**: State management
- **TypeScript 5.9+**: Type safety
- **Vite 6+**: Build tool

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```
examples/vue-vite/
├── src/
│   ├── components/       # Test components with .mmd reference files
│   │   ├── 006-Emits.vue
│   │   ├── 007-VueRouter.vue
│   │   ├── 008-Pinia.vue
│   │   ├── 009-TemplateBindings.vue
│   │   └── 010-Watchers.vue
│   ├── stores/          # Pinia stores
│   │   ├── counter.ts
│   │   └── user.ts
│   ├── App.vue          # Root component
│   └── main.ts          # Application entry point
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Project dependencies
```

## Test Components

Each component in `src/components/` demonstrates specific Vue patterns:

- **006-Emits.vue**: Event emits with `defineEmits()`
- **007-VueRouter.vue**: Vue Router usage (`useRoute`, `useRouter`)
- **008-Pinia.vue**: Pinia store usage
- **009-TemplateBindings.vue**: Template directives (v-bind, v-on, v-model)
- **010-Watchers.vue**: Watchers (`watch`, `watchEffect`)

Each component has a corresponding `.mmd` file containing the expected Mermaid diagram output for acceptance testing.

## Purpose

This project serves as:

1. **Acceptance test suite**: Validate Vue parser implementation
2. **Example showcase**: Demonstrate supported Vue patterns
3. **Development playground**: Test Vue support in the extension

## Usage with Extension

1. Open this workspace in VS Code
2. Open any `.vue` file in `src/components/`
3. Run command: "Web Component Analyzer: Show Component Structure"
4. View the generated Data Flow Diagram

## Notes

- This is a minimal setup focused on component examples
- No styling or complex UI needed
- Components are designed for parser testing, not production use
- All components use Vue 3 Composition API with `<script setup>` syntax
