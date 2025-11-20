import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  // State
  const userName = ref('Guest');
  const userId = ref<number | null>(null);

  // Actions
  function updateName(name: string) {
    userName.value = name;
  }

  function setUserId(id: number) {
    userId.value = id;
  }

  function logout() {
    userName.value = 'Guest';
    userId.value = null;
  }

  return {
    userName,
    userId,
    updateName,
    setUserId,
    logout
  };
});
