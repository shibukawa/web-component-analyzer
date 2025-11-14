import React from 'react';

interface SimpleProps {
  title: string;
  count: number;
}

export default function SimpleFunctional({ title, count }: SimpleProps) {
  return (
    <div>
      <h1>{title}</h1>
      <p>Count: {count}</p>
    </div>
  );
}
