<template>
  <div class="composables">
    <h2>Composables Example</h2>
    <p>Counter: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <p>Stored Value: {{ storedValue }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
    <button @click="updateStorage">Update Storage</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from '../hooks/useCounter';
import { useLocalStorage } from '../hooks/useLocalStorage';

// Use composables
const { count, doubled, increment, decrement } = useCounter(0);
const { value: storedValue, setValue } = useLocalStorage('myKey', 'default');

// Functions
function updateStorage() {
  setValue('Updated value');
}
</script>
