<template>
  <div class="template-bindings">
    <h2>Template Bindings Example</h2>
    
    <!-- Mustache binding -->
    <p>Message: {{ message }}</p>
    
    <!-- v-bind / : directive -->
    <input :value="inputValue" :placeholder="placeholderText" />
    <div :class="dynamicClass" :style="dynamicStyle">Styled Content</div>
    
    <!-- v-on / @ directive -->
    <button @click="handleClick">Click Me</button>
    <input @input="handleInput" @focus="handleFocus" />
    
    <!-- v-model directive -->
    <input v-model="modelValue" placeholder="Two-way binding" />
    <textarea v-model="textareaValue"></textarea>
    
    <!-- v-if / v-show directives -->
    <p v-if="showContent">Conditional Content</p>
    <p v-show="isVisible">Visible Content</p>
    
    <!-- v-for directive -->
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// State
const message = ref('Hello Vue!');
const inputValue = ref('');
const placeholderText = ref('Enter text...');
const modelValue = ref('');
const textareaValue = ref('');
const showContent = ref(true);
const isVisible = ref(true);
const items = ref([
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' },
  { id: 3, name: 'Item 3' }
]);

// Computed
const dynamicClass = computed(() => showContent.value ? 'active' : 'inactive');
const dynamicStyle = computed(() => ({
  color: isVisible.value ? 'blue' : 'gray'
}));

// Event handlers
function handleClick() {
  showContent.value = !showContent.value;
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
}

function handleFocus() {
  console.log('Input focused');
}
</script>
