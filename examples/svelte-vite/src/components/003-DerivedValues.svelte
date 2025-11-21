<script lang="ts">
  // Component demonstrating $derived rune
  let count = $state(0);
  let doubled = $derived(count * 2);
  let tripled = $derived(count * 3);
</script>

<div>
  <p>Count: {count}</p>
  <p>Doubled: {doubled}</p>
  <p>Tripled: {tripled}</p>
</div>
