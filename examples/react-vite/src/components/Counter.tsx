import { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  onLimitReached?: (limit: 'min' | 'max', value: number) => void;
}

/**
 * Counter component with props and custom event handlers
 * This component demonstrates:
 * - Optional props with default values
 * - Custom event handlers with different signatures
 * - Conditional logic in event handlers
 * - Mix of inline callbacks and named handlers
 */
export default function Counter({ 
  initialValue = 0, 
  step = 1, 
  min = -Infinity, 
  max = Infinity,
  onChange,
  onLimitReached
}: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const handleIncrement = () => {
    const newValue = count + step;
    if (newValue <= max) {
      setCount(newValue);
      if (onChange) {
        onChange(newValue);
      }
    } else {
      if (onLimitReached) {
        onLimitReached('max', max);
      }
    }
  };

  const handleDecrement = () => {
    const newValue = count - step;
    if (newValue >= min) {
      setCount(newValue);
      if (onChange) {
        onChange(newValue);
      }
    } else {
      if (onLimitReached) {
        onLimitReached('min', min);
      }
    }
  };

  const handleReset = () => {
    setCount(initialValue);
    if (onChange) {
      onChange(initialValue);
    }
  };

  return (
    <div className="counter">
      <h3>Counter</h3>
      <div className="counter-display">
        <button onClick={handleDecrement} disabled={count <= min}>
          -
        </button>
        <span className="count-value">{count}</span>
        <button onClick={handleIncrement} disabled={count >= max}>
          +
        </button>
      </div>
      <div className="counter-controls">
        <button onClick={handleReset}>Reset</button>
        <button onClick={() => setCount(count * 2)}>Double</button>
        <button onClick={() => setCount(Math.floor(count / 2))}>Half</button>
      </div>
      <div className="counter-info">
        <small>Step: {step} | Min: {min} | Max: {max}</small>
      </div>
    </div>
  );
}
