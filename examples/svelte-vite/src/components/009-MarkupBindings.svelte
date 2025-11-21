<script lang="ts">
  // Component demonstrating Svelte markup bindings and directives
  let inputValue = $state('');
  let isActive = $state(false);
  let color = $state('blue');
  
  function handleClick() {
    isActive = !isActive;
  }
</script>

<div>
  <!-- Expression binding -->
  <p>Value: {inputValue}</p>
  
  <!-- bind: directive (bidirectional) -->
  <input bind:value={inputValue} />
  
  <!-- on: directive (event handler) -->
  <button on:click={handleClick}>Toggle</button>
  
  <!-- class: directive -->
  <div class:active={isActive}>Status</div>
  
  <!-- style: directive -->
  <span style:color={color}>Colored text</span>
</div>
