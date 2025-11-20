<template>
  <div class="emits-component">
    <h2>Emits Example</h2>
    <input 
      :value="inputValue" 
      @input="handleInput"
      placeholder="Type something..."
    />
    <button @click="handleSubmit">Submit</button>
    <button @click="handleCancel">Cancel</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Define emits
const emit = defineEmits<{
  update: [value: string];
  submit: [data: { text: string; timestamp: number }];
  cancel: [];
}>();

// State
const inputValue = ref('');

// Event handlers
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  inputValue.value = target.value;
  emit('update', target.value);
}

function handleSubmit() {
  const data = {
    text: inputValue.value,
    timestamp: Date.now()
  };
  emit('submit', data);
  inputValue.value = '';
}

function handleCancel() {
  inputValue.value = '';
  emit('cancel');
}
</script>
