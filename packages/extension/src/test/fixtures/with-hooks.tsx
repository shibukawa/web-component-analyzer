import React, { useState, useEffect } from 'react';

interface WithHooksProps {
  initialValue: number;
}

export default function WithHooks({ initialValue }: WithHooksProps) {
  const [count, setCount] = useState(initialValue);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage(`Count is ${count}`);
  }, [count]);

  const handleIncrement = () => {
    setCount(count + 1);
  };

  const handleDecrement = () => {
    setCount(count - 1);
  };

  return (
    <div>
      <h1>Counter</h1>
      <p>{message}</p>
      <button onClick={handleIncrement}>Increment</button>
      <button onClick={handleDecrement}>Decrement</button>
      <p>Current count: {count}</p>
    </div>
  );
}
