<template>
  <div class="watchers-component">
    <h2>Watchers Example</h2>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <p>Message: {{ message }}</p>
    <p>Full Name: {{ fullName }}</p>
    <button @click="increment">Increment</button>
    <input v-model="firstName" placeholder="First Name" />
    <input v-model="lastName" placeholder="Last Name" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue';

// State
const count = ref(0);
const doubled = ref(0);
const message = ref('');
const firstName = ref('John');
const lastName = ref('Doe');
const fullName = ref('');

// Watch single ref
watch(count, (newValue, oldValue) => {
  console.log('count changed:', newValue, oldValue);
  message.value = `Count changed from ${oldValue} to ${newValue}`;
});

// Watch multiple refs
watch([firstName, lastName], ([newFirst, newLast]) => {
  console.log('Name changed:', newFirst, newLast);
  fullName.value = `${newFirst} ${newLast}`;
});

// Watch with getter function
watch(() => count.value * 2, (newValue) => {
  console.log('doubled value:', newValue);
});

// WatchEffect - automatically tracks dependencies
watchEffect(() => {
  doubled.value = count.value * 2;
});

// WatchEffect with cleanup
watchEffect((onCleanup) => {
  const timer = setTimeout(() => {
    console.log('Timer executed');
  }, 1000);
  
  onCleanup(() => {
    clearTimeout(timer);
  });
});

// Event handler
function increment() {
  count.value++;
}
</script>
