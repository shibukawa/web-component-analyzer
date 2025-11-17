import React, { useRef } from 'react';
import ImperativeChild, { ImperativeChildRef } from './ImperativeChild';

export default function ImperativeHandleExample() {
  const childRef = useRef<ImperativeChildRef>(null);
  const [displayValue, setDisplayValue] = React.useState('');

  const handleFocus = () => {
    childRef.current.focus();
  };

  const handleGetValue = () => {
    const value = childRef.current.getValue();
    setDisplayValue(value || '');
  };

  const handleReset = () => {
    childRef.current.reset();
    setDisplayValue('');
  };

  const handleValueChange = (value: string) => {
    setDisplayValue(value);
  };

  return (
    <div>
      <h1>Imperative Handle Example</h1>
      <ImperativeChild ref={childRef} onValueChange={handleValueChange} />
      <div>
        <button onClick={handleFocus}>Focus Child</button>
        <button onClick={handleGetValue}>Get Value</button>
        <button onClick={handleReset}>Reset</button>
      </div>
      <p>Current Value: {displayValue}</p>
    </div>
  );
}
