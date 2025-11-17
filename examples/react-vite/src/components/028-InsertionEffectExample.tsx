import { useState, useInsertionEffect } from 'react';

/**
 * Example component demonstrating useInsertionEffect for CSS-in-JS
 * useInsertionEffect runs before all DOM mutations, ideal for injecting styles
 */
export default function InsertionEffectExample() {
  const [isActive, setIsActive] = useState(false);

  // useInsertionEffect for injecting CSS rules
  useInsertionEffect(() => {
    const styleId = 'insertion-effect-styles';
    
    // Check if style element already exists
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    // Inject CSS rules
    styleElement.textContent = `
      .insertion-effect-box {
        padding: 20px;
        border: 2px solid green;
        border-radius: 8px;
        transition: all 0.3s ease;
      }
      
      .insertion-effect-box.active {
        background-color: #90EE90;
        transform: scale(1.05);
      }
    `;

    // Cleanup function to remove styles
    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  return (
    <div>
      <h2>Insertion Effect Example</h2>
      <div className={`insertion-effect-box ${isActive ? 'active' : ''}`}>
        This component uses useInsertionEffect to inject CSS styles
      </div>
      <button onClick={handleToggle}>
        {isActive ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );
}
