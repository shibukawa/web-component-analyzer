<script lang="ts">
  import { writable } from 'svelte/store';
  
  // Component demonstrating auto-subscription ($store syntax)
  const counter = writable(0);
  const userName = writable('Alice');
  
  // Auto-subscriptions in expressions
  let doubled = $counter * 2;
  let greeting = `Hello, ${$userName}!`;
  
  // Store updates
  function increment() {
    counter.update(n => n + 1);
  }
  
  function updateName() {
    userName.set('Bob');
  }
</script>

<div>
  <p>Counter: {$counter}</p>
  <p>Doubled: {doubled}</p>
  <p>Greeting: {greeting}</p>
  <button on:click={increment}>Increment</button>
  <button on:click={updateName}>Update Name</button>
</div>
