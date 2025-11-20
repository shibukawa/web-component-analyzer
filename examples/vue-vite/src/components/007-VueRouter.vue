<template>
  <div class="router-component">
    <h2>Vue Router Example</h2>
    <p>User ID: {{ route.params.id }}</p>
    <p>Search Query: {{ route.query.search }}</p>
    <p>Current Path: {{ route.path }}</p>
    <button @click="goToHome">Go Home</button>
    <button @click="goToUser">Go to User 123</button>
    <button @click="goBack">Go Back</button>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter, onBeforeRouteUpdate, onBeforeRouteLeave } from 'vue-router';
import { ref } from 'vue';

// Access route and router
const route = useRoute();
const router = useRouter();

// State
const navigationCount = ref(0);

// Navigation functions
function goToHome() {
  navigationCount.value++;
  router.push('/');
}

function goToUser() {
  navigationCount.value++;
  router.push({ name: 'user', params: { id: '123' } });
}

function goBack() {
  router.back();
}

// Navigation guards
onBeforeRouteUpdate((to, from) => {
  console.log('Route updating from', from.path, 'to', to.path);
  return true;
});

onBeforeRouteLeave((to, from) => {
  console.log('Leaving route', from.path, 'to', to.path);
  return true;
});
</script>
