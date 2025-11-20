<template>
  <div class="pinia-component">
    <h2>Pinia Store Example</h2>
    <p>Count: {{ count }}</p>
    <p>Double Count: {{ doubleCount }}</p>
    <p>User Name: {{ userName }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <button @click="reset">Reset</button>
    <button @click="updateUser">Update User</button>
  </div>
</template>

<script setup lang="ts">
import { useCounterStore } from '../stores/counter';
import { useUserStore } from '../stores/user';
import { storeToRefs } from 'pinia';

// Access stores
const counterStore = useCounterStore();
const userStore = useUserStore();

// Convert state to refs
const { count, doubleCount } = storeToRefs(counterStore);
const { userName } = storeToRefs(userStore);

// Call store actions
function increment() {
  counterStore.increment();
}

function decrement() {
  counterStore.decrement();
}

function reset() {
  counterStore.reset();
}

function updateUser() {
  userStore.updateName('John Doe');
}
</script>
