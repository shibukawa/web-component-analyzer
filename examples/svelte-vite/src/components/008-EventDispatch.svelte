<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  // Create event dispatcher with typed events
  const dispatch = createEventDispatcher<{
    submit: { value: string };
    cancel: void;
  }>();
  
  // State for input value
  let inputValue = $state('');
  
  // Handler that dispatches submit event
  function handleSubmit() {
    dispatch('submit', { value: inputValue });
  }
  
  // Handler that dispatches cancel event
  function handleCancel() {
    dispatch('cancel');
  }
</script>

<div>
  <input bind:value={inputValue} placeholder="Enter text" />
  <button on:click={handleSubmit}>Submit</button>
  <button on:click={handleCancel}>Cancel</button>
</div>
