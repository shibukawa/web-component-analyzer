<script lang="ts">
  // Component demonstrating Svelte control flow structures
  let showMessage = $state(true);
  let items = $state(['Apple', 'Banana', 'Cherry']);
  let dataPromise = $state(Promise.resolve({ name: 'John', age: 30 }));
</script>

<div>
  <!-- Conditional rendering with {#if} -->
  {#if showMessage}
    <p>Message is visible</p>
  {/if}
  
  <!-- Loop rendering with {#each} -->
  {#each items as item}
    <li>{item}</li>
  {/each}
  
  <!-- Async rendering with {#await} -->
  {#await dataPromise then data}
    <p>Name: {data.name}</p>
    <p>Age: {data.age}</p>
  {/await}
</div>
