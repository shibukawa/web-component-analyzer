<script lang="ts">
  let count = $state(0);

  function increment() {
    count++;
  }

  function decrement() {
    count--;
  }

  function reset() {
    count = 0;
  }
</script>

<div class="counter">
  <h2>Simple Counter</h2>
  <p>Count: {count}</p>
  <button onclick={increment}>Increment</button>
  <button onclick={decrement}>Decrement</button>
  <button onclick={reset}>Reset</button>
</div>
