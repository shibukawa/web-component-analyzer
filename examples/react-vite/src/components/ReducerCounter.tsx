import { useReducer, useEffect } from 'react';

/**
 * Reducer state interface with multiple properties
 */
interface CounterState {
  count: number;
  step: number;
  history: number[];
}

/**
 * Reducer action types
 */
type CounterAction =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'RESET' };

/**
 * Reducer function
 */
function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case 'INCREMENT':
      return {
        ...state,
        count: state.count + state.step,
        history: [...state.history, state.count + state.step]
      };
    case 'DECREMENT':
      return {
        ...state,
        count: state.count - state.step,
        history: [...state.history, state.count - state.step]
      };
    case 'SET_STEP':
      return {
        ...state,
        step: action.payload
      };
    case 'RESET':
      return {
        count: 0,
        step: 1,
        history: [0]
      };
    default:
      return state;
  }
}

/**
 * Component demonstrating useReducer with multiple state properties
 * 
 * This component showcases:
 * - useReducer with complex state object (count, step, history)
 * - Dispatch calls in event handlers
 * - Dispatch calls in useEffect
 * - State properties displayed in JSX
 */
export default function ReducerCounter() {
  const [{ count, step, history }, dispatch] = useReducer(counterReducer, {
    count: 0,
    step: 1,
    history: [0]
  });

  // Effect that logs history changes
  useEffect(() => {
    console.log('History updated:', history);
    
    // Dispatch action when history gets too long
    if (history.length > 10) {
      dispatch({ type: 'RESET' });
    }
  }, [history]);

  // Event handlers that dispatch actions
  const handleIncrement = () => {
    dispatch({ type: 'INCREMENT' });
  };

  const handleDecrement = () => {
    dispatch({ type: 'DECREMENT' });
  };

  const handleStepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newStep = parseInt(event.target.value, 10);
    if (!isNaN(newStep)) {
      dispatch({ type: 'SET_STEP', payload: newStep });
    }
  };

  const handleReset = () => {
    dispatch({ type: 'RESET' });
  };

  return (
    <div className="reducer-counter">
      <h2>Reducer Counter</h2>
      
      <div className="counter-display">
        <p>Current Count: {count}</p>
        <p>Step Size: {step}</p>
        <p>History Length: {history.length}</p>
      </div>

      <div className="controls">
        <button onClick={handleIncrement}>Increment</button>
        <button onClick={handleDecrement}>Decrement</button>
        <button onClick={handleReset}>Reset</button>
      </div>

      <div className="step-control">
        <label>
          Step Size:
          <input
            type="number"
            value={step}
            onChange={handleStepChange}
            min="1"
          />
        </label>
      </div>

      <div className="history">
        <h3>History</h3>
        <ul>
          {history.map((value, index) => (
            <li key={index}>{value}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
