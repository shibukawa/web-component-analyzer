import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./components/006-Emits.vue') },
    { path: '/router', component: () => import('./components/007-VueRouter.vue') },
    { path: '/pinia', component: () => import('./components/008-Pinia.vue') },
    { path: '/template', component: () => import('./components/009-TemplateBindings.vue') },
    { path: '/watchers', component: () => import('./components/010-Watchers.vue') },
  ],
})

// Create app instance
const app = createApp(App)

// Install plugins
app.use(createPinia())
app.use(router)

// Mount app
app.mount('#app')
