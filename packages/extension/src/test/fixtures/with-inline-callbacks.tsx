import React, { useState } from 'react';

interface WithInlineCallbacksProps {
  initialValue: number;
}

export default function WithInlineCallbacks({ initialValue }: WithInlineCallbacksProps) {
  const [count, setCount] = useState(initialValue);
  const [text, setText] = useState('');

  return (
    <div>
      <h1>Inline Callbacks Example</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
      <button onClick={() => setCount(0)}>Reset</button>
      <input 
        value={text} 
        onChange={(e) => setText(e.target.value)} 
      />
      <button onClick={() => {
        console.log('Count:', count);
        console.log('Text:', text);
      }}>
        Log Values
      </button>
    </div>
  );
}
