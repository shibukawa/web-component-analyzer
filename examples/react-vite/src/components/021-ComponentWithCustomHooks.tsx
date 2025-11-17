/**
 * Component demonstrating custom hooks support
 * 
 * This component uses a custom hook (useCounter) that returns both data and functions.
 * The DFD should show:
 * - A single data-store node for the custom hook containing only the data value (count)
 * - Edges from processes to the data store when increment/decrement are called
 */

import { useState, useCallback } from 'react';

// Custom hook that returns data and functions
function useCounter(initialValue: number = 0) {
  const [count, setCount] = useState(initialValue);
  
  // increment is wrapped with useCallback inside the custom hook
  const increment = useCallback(() => setCount(c => c + 1), []);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initialValue);
  
  return { count, increment, decrement, reset };
}

export default function ComponentWithCustomHooks() {
  const { count, increment, decrement, reset } = useCounter(0);
  
  // Wrap decrement with useCallback in the component
  const handleDecrement = useCallback(() => {
    decrement();
  }, [decrement]);
  
  return (
    <div>
      <h2>Counter: {count}</h2>
      <button onClick={increment}>Increment</button>
      <button onClick={handleDecrement}>Decrement</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
