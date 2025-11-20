<template>
  <div class="reactive-state">
    <h2>Reactive State Example</h2>
    <p>Counter: {{ counter }}</p>
    <p>Name: {{ user.name }}</p>
    <p>Email: {{ user.email }}</p>
    <button @click="incrementCounter">Increment</button>
    <button @click="updateUser">Update User</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

// ref state
const counter = ref(0);

// reactive state
const user = reactive({
  name: 'John Doe',
  email: 'john@example.com'
});

// Functions
function incrementCounter() {
  counter.value++;
}

function updateUser() {
  user.name = 'Jane Smith';
  user.email = 'jane@example.com';
}
</script>
