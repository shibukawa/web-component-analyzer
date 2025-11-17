import React, { useRef, useEffect, useCallback } from 'react';
import ImperativeChild, { type ImperativeChildRef } from './ImperativeChild';

interface ParentWithImperativeProps {
  autoFocus?: boolean;
  onSubmit?: (value: string) => void;
}

const ParentWithImperative: React.FC<ParentWithImperativeProps> = ({ 
  autoFocus = false, 
  onSubmit 
}) => {
  const childRef = useRef<ImperativeChildRef>(null);

  // useEffect calling imperative handle
  useEffect(() => {
    if (autoFocus && childRef.current) {
      childRef.current.focus();
    }
  }, [autoFocus]);

  // Callback calling imperative handle
  const handleSubmit = useCallback(() => {
    if (childRef.current) {
      const value = childRef.current.getValue();
      onSubmit?.(value);
    }
  }, [onSubmit]);

  const handleReset = useCallback(() => {
    if (childRef.current) {
      childRef.current.reset();
    }
  }, []);

  const handleValueChange = (value: string) => {
    console.log('Value changed:', value);
  };

  return (
    <div>
      <h3>Parent with Imperative Child</h3>
      <ImperativeChild 
        ref={childRef} 
        onValueChange={handleValueChange}
      />
      <div>
        <button onClick={handleSubmit}>Submit</button>
        <button onClick={handleReset}>Reset</button>
      </div>
    </div>
  );
};

export default ParentWithImperative;
