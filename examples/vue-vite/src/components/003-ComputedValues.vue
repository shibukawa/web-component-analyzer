<template>
  <div class="computed-values">
    <h2>Computed Values Example</h2>
    <p>First Name: {{ firstName }}</p>
    <p>Last Name: {{ lastName }}</p>
    <p>Full Name: {{ fullName }}</p>
    <p>Items Count: {{ items.length }}</p>
    <p>Total Price: ${{ totalPrice }}</p>
    <button @click="updateName">Update Name</button>
    <button @click="addItem">Add Item</button>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

// State
const firstName = ref('John');
const lastName = ref('Doe');
const items = reactive([
  { name: 'Item 1', price: 10 },
  { name: 'Item 2', price: 20 }
]);

// Computed properties
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
const totalPrice = computed(() => items.reduce((sum, item) => sum + item.price, 0));

// Functions
function updateName() {
  firstName.value = 'Jane';
  lastName.value = 'Smith';
}

function addItem() {
  items.push({ name: `Item ${items.length + 1}`, price: 15 });
}
</script>
