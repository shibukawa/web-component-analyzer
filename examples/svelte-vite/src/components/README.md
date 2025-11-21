# Svelte Test Components

This directory contains Svelte 5 components for acceptance testing of the web-component-analyzer extension.

## Naming Convention

Components follow the pattern: `{number}-{DescriptiveName}.svelte`

Each component has a corresponding `.mmd` file with the expected Mermaid diagram output.

## Test Coverage

### Svelte 5 Runes
- `001-SimpleProps.svelte` - $props() rune
- `002-ReactiveState.svelte` - $state() rune
- `003-DerivedValues.svelte` - $derived() rune
- `004-Effects.svelte` - $effect() rune

### Stores
- `005-Stores.svelte` - writable/readable stores
- `006-AutoSubscription.svelte` - $store syntax

### SvelteKit (if applicable)
- `007-SvelteKit.svelte` - $page, goto()

### Events
- `008-EventDispatch.svelte` - createEventDispatcher

### Markup
- `009-MarkupBindings.svelte` - bind:, on:, class:
- `010-ControlFlow.svelte` - {#if}, {#each}, {#await}

## Running Tests

Acceptance tests are run from the extension package:

```bash
cd packages/extension
pnpm run test
```

## Creating New Tests

1. Create a new `.svelte` component file
2. Create a corresponding `.mmd` file with expected output
3. Run tests to verify parser behavior
4. Update `.mmd` file if needed using `--update-refs` flag
