<script lang="ts">
  interface Props {
    title: string;
    message: string;
    initialCount?: number;
  }

  let { title, message, initialCount = 0 }: Props = $props();
  let count = $state(initialCount);

  function onclick() {
    count++;
  }
</script>

<div class="props-example">
  <h2>{title}</h2>
  <p>{message}</p>
  <p>Count: {count}</p>
  <button on:click={onclick}>Click Me</button>
</div>
