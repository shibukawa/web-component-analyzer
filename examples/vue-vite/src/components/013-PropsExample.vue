<template>
  <div class="props-example">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <p>Count: {{ count }}</p>
    <button @click="handleClick">Click Me</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Define props
const props = defineProps<{
  title: string;
  message: string;
  initialCount?: number;
}>();

// State
const count = ref(props.initialCount || 0);

// Event handler
function handleClick() {
  count.value++;
}
</script>
