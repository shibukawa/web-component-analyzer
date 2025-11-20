<template>
  <div class="control-structures">
    <h2>Control Structures Example</h2>
    
    <!-- v-if / v-else-if / v-else -->
    <div class="status-section">
      <h3>Status Display</h3>
      <p v-if="status === 'loading'">Loading...</p>
      <p v-else-if="status === 'success'">Success! Data loaded.</p>
      <p v-else-if="status === 'error'">Error occurred.</p>
      <p v-else>Unknown status</p>
    </div>
    
    <!-- v-for with array -->
    <div class="list-section">
      <h3>Items List</h3>
      <ul>
        <li v-for="item in items" :key="item.id">
          {{ item.name }} - {{ item.value }}
        </li>
      </ul>
    </div>
    
    <!-- v-for with nested array -->
    <div class="matrix-section">
      <h3>Matrix Display</h3>
      <div class="matrix">
        <span v-for="cell in flatMatrix" :key="cell">
          {{ cell }}
        </span>
      </div>
    </div>
    
    <!-- Combined v-if and v-for -->
    <div class="filtered-section">
      <h3>Active Items Only</h3>
      <ul>
        <li v-for="item in items" :key="item.id" v-if="item.active">
          {{ item.name }}
        </li>
      </ul>
    </div>
    
    <button @click="changeStatus">Change Status</button>
    <button @click="addItem">Add Item</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Item {
  id: number;
  name: string;
  value: number;
  active: boolean;
}

// State for conditional rendering
const status = ref<'loading' | 'success' | 'error' | 'idle'>('loading');

// State for list rendering
const items = ref<Item[]>([
  { id: 1, name: 'Apple', value: 10, active: true },
  { id: 2, name: 'Banana', value: 20, active: false },
  { id: 3, name: 'Cherry', value: 30, active: true }
]);

// State for matrix rendering
const matrix = ref<number[][]>([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
]);

// Computed property for flattened matrix
const flatMatrix = computed(() => {
  return matrix.value.flat();
});

// Functions
function changeStatus() {
  const statuses: Array<'loading' | 'success' | 'error' | 'idle'> = ['loading', 'success', 'error', 'idle'];
  const currentIndex = statuses.indexOf(status.value);
  status.value = statuses[(currentIndex + 1) % statuses.length];
}

function addItem() {
  const newId = items.value.length + 1;
  items.value.push({
    id: newId,
    name: `Item ${newId}`,
    value: newId * 10,
    active: Math.random() > 0.5
  });
}
</script>

<style scoped>
.control-structures {
  padding: 20px;
}

.status-section,
.list-section,
.matrix-section,
.filtered-section {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.matrix {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.matrix span {
  padding: 5px 10px;
  background: #f0f0f0;
  border-radius: 3px;
}

button {
  margin: 5px;
  padding: 10px 15px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #45a049;
}
</style>
