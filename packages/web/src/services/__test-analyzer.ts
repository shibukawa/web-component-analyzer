/**
 * Quick test to verify analyzer integration
 * This file can be deleted after verification
 */

import { analyzeComponent } from './analyzer';
import { transformToMermaid } from './mermaidTransformer';

// Simple React component for testing
const testCode = `
import React, { useState } from 'react';

interface Props {
  initialCount: number;
}

export default function Counter({ initialCount }: Props) {
  const [count, setCount] = useState(initialCount);

  const increment = () => {
    setCount(count + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
`;

async function testAnalyzer() {
  console.log('Testing analyzer integration...');
  
  const result = await analyzeComponent(testCode, 'react');
  
  if (result.success && result.dfdData) {
    console.log('✅ Analysis successful!');
    console.log('Nodes:', result.dfdData.nodes.length);
    console.log('Edges:', result.dfdData.edges.length);
    
    const mermaidCode = transformToMermaid(result.dfdData);
    console.log('\n📊 Mermaid diagram:');
    console.log(mermaidCode);
  } else {
    console.error('❌ Analysis failed:', result.error);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAnalyzer();
}
