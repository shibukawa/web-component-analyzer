<script lang="ts">
  interface Props {
    title: string;
    message: string;
    initialCount?: number;
  }

  let { title, message, initialCount = 0 }: Props = $props();
  let count = $state(initialCount);

  function handleClick() {
    count++;
  }
</script>

<div class="props-example">
  <h2>{title}</h2>
  <p>{message}</p>
  <p>Count: {count}</p>
  <button onclick={handleClick}>Click Me</button>
</div>
