import { useState, useLayoutEffect, useRef } from 'react';

/**
 * Example component demonstrating useLayoutEffect for DOM measurements
 * useLayoutEffect runs synchronously after DOM mutations but before browser paint
 */
export default function LayoutEffectExample() {
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const divRef = useRef<HTMLDivElement>(null);

  // useLayoutEffect for measuring DOM elements
  useLayoutEffect(() => {
    if (divRef.current) {
      const rect = divRef.current.getBoundingClientRect();
      setWidth(rect.width);
      setHeight(rect.height);
    }

    // Cleanup function to reset measurements
    return () => {
      setWidth(0);
      setHeight(0);
    };
  }, []);

  return (
    <div>
      <h2>Layout Effect Example</h2>
      <div
        ref={divRef}
        style={{
          padding: '20px',
          border: '2px solid blue',
          backgroundColor: '#f0f0f0',
        }}
      >
        This div is being measured
      </div>
      <p>Width: {width}px</p>
      <p>Height: {height}px</p>
    </div>
  );
}
