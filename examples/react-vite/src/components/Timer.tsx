import { useState, useEffect } from 'react';

/**
 * Timer component with cleanup function
 * Demonstrates useEffect with cleanup for timer management
 */
export default function Timer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      console.log('Timer cleanup: interval cleared');
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setSeconds(0);
    setIsRunning(false);
  };

  return (
    <div>
      <h2>Timer</h2>
      <p>Seconds: {seconds}</p>
      <button onClick={handleStart} disabled={isRunning}>
        Start
      </button>
      <button onClick={handleStop} disabled={!isRunning}>
        Stop
      </button>
      <button onClick={handleReset}>
        Reset
      </button>
    </div>
  );
}
