<template>
  <div class="simple-props">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <p>Count: {{ count }}</p>
    <div v-if="isActive">
      <p>Active Status</p>
      <p>Count is: {{ count }}</p>
    </div>
    <p v-if="count > 5">High count!</p>
  </div>
</template>

<script setup lang="ts">
// Define props
defineProps<{
  title: string;
  message: string;
  count: number;
  isActive: boolean;
}>();
</script>
