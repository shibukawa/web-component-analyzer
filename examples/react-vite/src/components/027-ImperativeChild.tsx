import React, { forwardRef, useImperativeHandle, useState } from 'react';

export interface ImperativeChildRef {
  focus: () => void;
  getValue: () => string;
  reset: () => void;
}

interface ImperativeChildProps {
  onValueChange?: (value: string) => void;
}

const ImperativeChild = forwardRef<ImperativeChildRef, ImperativeChildProps>(
  ({ onValueChange }, ref) => {
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => {
        setIsFocused(true);
        console.log('Child focused');
      },
      getValue: () => {
        return value;
      },
      reset: () => {
        setValue('');
        onValueChange?.('');
      }
    }), [value, onValueChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <input
        value={value}
        onChange={handleChange}
        style={{ border: isFocused ? '2px solid blue' : '1px solid gray' }}
        placeholder="Type something..."
      />
    );
  }
);

export default ImperativeChild;
