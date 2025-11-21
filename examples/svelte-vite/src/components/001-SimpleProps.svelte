<script lang="ts">
  // Simple component demonstrating $props rune
  let { userName, age }: { userName: string; age: number } = $props();
</script>

<div>
  <h1>Hello, {userName}!</h1>
  <p>You are {age} years old.</p>
</div>
