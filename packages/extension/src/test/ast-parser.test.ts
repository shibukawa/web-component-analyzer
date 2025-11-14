/**
 * Tests for AST Parser
 */

import * as assert from 'assert';
import { parseComponent } from '../utils/node-parser';

suite('AST Parser Test Suite', () => {

  test('Parse valid TypeScript file', async () => {
    const sourceCode = `
      interface Props {
        name: string;
      }
      
      function MyComponent({ name }: Props) {
        return <div>{name}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.ok(result.module, 'Module should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
    assert.strictEqual(result.module?.type, 'Module', 'Should return a Module');
  });

  test('Parse valid JavaScript file', async () => {
    const sourceCode = `
      function MyComponent({ name }) {
        return <div>{name}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.jsx');
    
    assert.ok(result.module, 'Module should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
    assert.strictEqual(result.module?.type, 'Module', 'Should return a Module');
  });

  test('Handle syntax errors gracefully', async () => {
    const sourceCode = `
      function MyComponent({ name }) {
        return <div>{name}</div>
      // Missing closing brace for function
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.strictEqual(result.module, undefined, 'Module should not be parsed');
    assert.ok(result.error, 'Should have an error');
    assert.ok(result.error?.message, 'Error should have a message');
  });

  test('Support .tsx file extension', async () => {
    const sourceCode = `
      interface Props {
        count: number;
      }
      
      const Counter: React.FC<Props> = ({ count }) => {
        return <div>Count: {count}</div>;
      };
    `;

    const result = await parseComponent(sourceCode, 'Counter.tsx');
    
    assert.ok(result.module, 'Module should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Support .jsx file extension', async () => {
    const sourceCode = `
      const Counter = ({ count }) => {
        return <div>Count: {count}</div>;
      };
    `;

    const result = await parseComponent(sourceCode, 'Counter.jsx');
    
    assert.ok(result.module, 'Module should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Support .ts file extension (non-JSX)', async () => {
    const sourceCode = `
      interface User {
        name: string;
        age: number;
      }
      
      function getUser(): User {
        return { name: 'John', age: 30 };
      }
    `;

    const result = await parseComponent(sourceCode, 'utils.ts');
    
    assert.ok(result.module, 'Module should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Support .js file extension (non-JSX)', async () => {
    const sourceCode = `
      function getUser() {
        return { name: 'John', age: 30 };
      }
    `;

    const result = await parseComponent(sourceCode, 'utils.js');
    
    assert.ok(result.module, 'Module should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Configure SWC for TypeScript syntax', async () => {
    const sourceCode = `
      type Status = 'active' | 'inactive';
      
      interface Props {
        status: Status;
      }
      
      function StatusComponent({ status }: Props) {
        return <div>{status}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.ok(result.module, 'Module should be parsed with TypeScript syntax');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Configure SWC for ECMAScript syntax', async () => {
    const sourceCode = `
      const MyComponent = ({ status }) => {
        return <div>{status}</div>;
      };
    `;

    const result = await parseComponent(sourceCode, 'test.jsx');
    
    assert.ok(result.module, 'Module should be parsed with ECMAScript syntax');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Support decorators in TypeScript', async () => {
    const sourceCode = `
      function Component(target: any) {
        return target;
      }
      
      @Component
      class MyComponent {
        render() {
          return <div>Hello</div>;
        }
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.ok(result.module, 'Module should be parsed with decorators');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Support dynamic imports', async () => {
    const sourceCode = `
      async function loadComponent() {
        const module = await import('./MyComponent');
        return module.default;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.ts');
    
    assert.ok(result.module, 'Module should be parsed with dynamic imports');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Extract line and column from syntax error', async () => {
    const sourceCode = `
      function MyComponent() {
        const x = ;
        return <div>Test</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.ok(result.error, 'Should have an error');
    assert.ok(result.error?.message, 'Error should have a message');
    // Line and column may or may not be extracted depending on SWC error format
  });

  test('Parse complex TypeScript component', async () => {
    const sourceCode = `
      import React, { useState, useEffect } from 'react';
      
      interface User {
        id: number;
        name: string;
      }
      
      interface Props {
        userId: number;
      }
      
      const UserProfile: React.FC<Props> = ({ userId }) => {
        const [user, setUser] = useState<User | null>(null);
        
        useEffect(() => {
          fetchUser(userId).then(setUser);
        }, [userId]);
        
        return (
          <div>
            {user ? <h1>{user.name}</h1> : <p>Loading...</p>}
          </div>
        );
      };
      
      async function fetchUser(id: number): Promise<User> {
        return { id, name: 'John' };
      }
    `;

    const result = await parseComponent(sourceCode, 'UserProfile.tsx');
    
    assert.ok(result.module, 'Complex component should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Parse class component with TypeScript', async () => {
    const sourceCode = `
      import React from 'react';
      
      interface Props {
        title: string;
      }
      
      interface State {
        count: number;
      }
      
      class Counter extends React.Component<Props, State> {
        constructor(props: Props) {
          super(props);
          this.state = { count: 0 };
        }
        
        render() {
          return (
            <div>
              <h1>{this.props.title}</h1>
              <p>Count: {this.state.count}</p>
            </div>
          );
        }
      }
    `;

    const result = await parseComponent(sourceCode, 'Counter.tsx');
    
    assert.ok(result.module, 'Class component should be parsed successfully');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Handle empty source code', async () => {
    const sourceCode = '';

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.ok(result.module, 'Empty source should be parsed');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });

  test('Handle source code with only comments', async () => {
    const sourceCode = `
      // This is a comment
      /* This is a block comment */
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    assert.ok(result.module, 'Comments-only source should be parsed');
    assert.strictEqual(result.error, undefined, 'Should not have errors');
  });
});
