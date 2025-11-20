<template>
  <div id="app">
    <nav>
      <router-link to="/">Emits</router-link> |
      <router-link to="/router">Vue Router</router-link> |
      <router-link to="/pinia">Pinia</router-link> |
      <router-link to="/template">Template Bindings</router-link> |
      <router-link to="/watchers">Watchers</router-link>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// Root component for Vue examples
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  margin: 0 10px;
}

nav a.router-link-exact-active {
  color: #42b983;
}

main {
  padding: 20px;
}
</style>
