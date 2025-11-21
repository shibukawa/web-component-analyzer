<script lang="ts">
  import { writable, readable, derived } from 'svelte/store';
  
  // Component demonstrating local store creation
  const count = writable(0);
  const name = writable('John');
  const timestamp = readable(Date.now());
  const doubleCount = derived(count, $count => $count * 2);
</script>

<div>
  <p>Count: {$count}</p>
  <p>Name: {$name}</p>
  <p>Timestamp: {$timestamp}</p>
  <p>Double Count: {$doubleCount}</p>
</div>
