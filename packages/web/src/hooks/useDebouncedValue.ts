import { useState, useEffect, useRef } from 'react';

/**
 * Debounces a value - returns the value after the specified delay
 * For large changes (like sample selection), updates immediately
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const previousValueRef = useRef<T>(value);

  useEffect(() => {
    // Check if this is a large change (e.g., sample selection vs typing)
    const currentLength = typeof value === 'string' ? value.length : 0;
    const previousLength = typeof previousValueRef.current === 'string' ? previousValueRef.current.length : 0;
    const lengthDiff = Math.abs(currentLength - previousLength);
    
    // If the change is large (>100 characters), update immediately
    // This handles sample selection while still debouncing typing
    if (lengthDiff > 100) {
      console.log('Large change detected, updating immediately');
      setDebouncedValue(value);
      previousValueRef.current = value;
      return;
    }

    // For small changes (typing), use debounce
    const timeoutId = setTimeout(() => {
      console.log('Debounced update');
      setDebouncedValue(value);
      previousValueRef.current = value;
    }, delay);

    // Clean up the timeout if value changes before delay
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
