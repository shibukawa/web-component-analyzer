import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { configureMonacoLanguages } from './utils/monacoConfig';
import { initializeSWC } from './services/browser-parser';

// Configure Monaco Editor languages before rendering
configureMonacoLanguages();

// Initialize SWC WASM and then render the app
initializeSWC()
  .then(() => {
    console.log('SWC initialized, rendering app...');
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch((error) => {
    console.error('Failed to initialize SWC:', error);
    // Show error message to user
    document.getElementById('root')!.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: system-ui;">
        <h1 style="color: #f44336;">Failed to Initialize</h1>
        <p>Could not load the code analyzer. Please refresh the page.</p>
        <pre style="text-align: left; background: #f5f5f5; padding: 20px; border-radius: 8px; overflow: auto;">
${error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    `;
  });
