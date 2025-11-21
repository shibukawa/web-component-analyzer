<script lang="ts">
  let count = $state(0);
  
  function increment() {
    count++;
  }
</script>

<main>
  <h1>Svelte + Vite Examples</h1>
  <div class="card">
    <button on:click={increment}>
      count is {count}
    </button>
  </div>
  <p>
    Check out the components in <code>src/components/</code> for examples.
  </p>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
