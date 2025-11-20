import { ref, watch } from 'vue';

export function useLocalStorage(key: string, defaultValue: string) {
  const value = ref(defaultValue);

  // Load from localStorage on init
  const stored = localStorage.getItem(key);
  if (stored) {
    value.value = stored;
  }

  // Watch for changes and update localStorage
  watch(value, (newValue) => {
    localStorage.setItem(key, newValue);
  });

  function setValue(newValue: string) {
    value.value = newValue;
  }

  return {
    value,
    setValue
  };
}
