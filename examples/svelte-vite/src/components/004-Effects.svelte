<script lang="ts">
  // Component demonstrating $effect rune
  let count = $state(0);
  let message = $state('Hello');
  
  // Effect that runs when count changes
  $effect(() => {
    console.log('Count changed:', count);
  });
  
  // Effect that runs when message changes
  $effect(() => {
    console.log('Message changed:', message);
  });
</script>

<div>
  <p>Count: {count}</p>
  <p>Message: {message}</p>
</div>
