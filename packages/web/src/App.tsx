import { useState } from 'react';

function App() {
  const [code, setCode] = useState('');

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ flex: 1, padding: '20px' }}>
        <h1>Web Component Analyzer</h1>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your React/Vue component code here..."
          style={{
            width: '100%',
            height: 'calc(100% - 60px)',
            marginTop: '20px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        />
      </div>
      <div style={{ flex: 1, padding: '20px', borderLeft: '1px solid #ccc' }}>
        <h2>Component DFD</h2>
        <div id="diagram" style={{ marginTop: '20px' }}>
          {/* Mermaid diagram will be rendered here */}
        </div>
      </div>
    </div>
  );
}

export default App;
