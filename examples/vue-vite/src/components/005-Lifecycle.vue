<template>
  <div class="lifecycle">
    <h2>Lifecycle Hooks Example</h2>
    <p>Mount Count: {{ mountCount }}</p>
    <p>Update Count: {{ updateCount }}</p>
    <p>Message: {{ message }}</p>
    <button @click="updateMessage">Update Message</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate } from 'vue';

// State
const mountCount = ref(0);
const updateCount = ref(0);
const message = ref('Initial message');

// Lifecycle hooks
onBeforeMount(() => {
  console.log('Before mount');
});

onMounted(() => {
  mountCount.value++;
  console.log('Component mounted');
});

onBeforeUpdate(() => {
  console.log('Before update');
});

onUpdated(() => {
  updateCount.value++;
  console.log('Component updated');
});

onUnmounted(() => {
  console.log('Component unmounted');
});

// Functions
function updateMessage() {
  message.value = `Updated at ${Date.now()}`;
}
</script>
