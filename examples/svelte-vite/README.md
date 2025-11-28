# Svelte + Vite Examples

This directory contains example Svelte 5 components for testing the web-component-analyzer extension.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Components

The `src/components/` directory contains test components demonstrating various Svelte 5 patterns:

- **Runes API**: $state, $derived, $effect, $props
- **Stores**: writable, readable, derived
- **Event Dispatching**: createEventDispatcher
- **Markup Bindings**: bind:, on:, class:, style:
- **Control Flow**: {#if}, {#each}, {#await}

Each component has a corresponding `.mmd` file with the expected Mermaid diagram output for acceptance testing.

## Testing

Components are used for acceptance testing of the Svelte parser implementation. The analyzer should correctly extract:

- Props ($props rune)
- Reactive state ($state rune)
- Computed values ($derived rune)
- Side effects ($effect rune)
- Store subscriptions
- Event dispatching
- Markup bindings and directives

## Framework Version

This project uses Svelte 5 with the new runes API. Legacy Svelte syntax is not supported.
