<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    update: string;
    submit: { text: string; timestamp: number };
    cancel: undefined;
  }>();

  let inputValue = $state('');

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    inputValue = target.value;
    dispatch('update', target.value);
  }

  function handleSubmit() {
    const data = {
      text: inputValue,
      timestamp: Date.now()
    };
    dispatch('submit', data);
    inputValue = '';
  }

  function handleCancel() {
    inputValue = '';
    dispatch('cancel', undefined);
  }
</script>

<div class="events-component">
  <h2>Events Example</h2>
  <input 
    bind:value={inputValue}
    on:input={handleInput}
    placeholder="Type something..."
  />
  <button on:click={handleSubmit}>Submit</button>
  <button on:click={handleCancel}>Cancel</button>
</div>
