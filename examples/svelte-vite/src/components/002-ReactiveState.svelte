<script lang="ts">
  // Component demonstrating $state rune
  let count = $state(0);
  let message = $state('Hello');
  let isActive = $state(true);
</script>

<div>
  <p>Count: {count}</p>
  <p>Message: {message}</p>
  <p>Active: {isActive}</p>
</div>
