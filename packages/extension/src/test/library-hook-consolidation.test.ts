/**
 * Tests for Library Hook Consolidation (useSWR, useSWRMutation)
 */

import * as assert from 'assert';
import { parseComponent } from '@web-component-analyzer/analyzer';

suite('Library Hook Consolidation Test Suite', () => {
  test('useSWR should consolidate into single node', async () => {
    const sourceCode = `
      import useSWR from 'swr';
      
      const fetcher = (url: string) => fetch(url).then(res => res.json());
      
      function MyComponent() {
        const { data, error, isLoading, mutate } = useSWR('/api/user', fetcher);
        
        if (isLoading) return <p>Loading...</p>;
        if (error) return <p>Error: {error.message}</p>;
        
        return (
          <div>
            <p>{data.name}</p>
            <button onClick={() => mutate()}>Refresh</button>
          </div>
        );
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    // Find useSWR nodes
    const swrNodes = result.dfd.nodes.filter(n => n.metadata?.hookName === 'useSWR');
    
    assert.strictEqual(swrNodes.length, 1, 'Should have exactly 1 consolidated useSWR node');
    
    const swrNode = swrNodes[0];
    assert.strictEqual(swrNode.label, 'useSWR<resource>', 'Node label should be useSWR<resource>');
    assert.strictEqual(swrNode.type, 'data-store', 'Node type should be data-store');
    assert.ok(swrNode.metadata?.isLibraryHook, 'Node should be marked as library hook');
    
    // Check properties
    const properties = swrNode.metadata?.properties as string[];
    assert.ok(properties.includes('data'), 'Should include data property');
    assert.ok(properties.includes('error'), 'Should include error property');
    assert.ok(properties.includes('isLoading'), 'Should include isLoading property');
    assert.ok(properties.includes('mutate'), 'Should include mutate property');
    
    // Check data vs process properties
    const dataProperties = swrNode.metadata?.dataProperties as string[];
    const processProperties = swrNode.metadata?.processProperties as string[];
    
    assert.ok(dataProperties.includes('data'), 'data should be a data property');
    assert.ok(dataProperties.includes('error'), 'error should be a data property');
    assert.ok(dataProperties.includes('isLoading'), 'isLoading should be a data property');
    assert.ok(processProperties.includes('mutate'), 'mutate should be a process property');
  });

  test('useSWRMutation should consolidate into single node', async () => {
    const sourceCode = `
      import useSWRMutation from 'swr/mutation';
      
      async function updateUser(url: string, { arg }: { arg: any }) {
        return fetch(url, { method: 'POST', body: JSON.stringify(arg) }).then(r => r.json());
      }
      
      function MyComponent() {
        const { data, error, trigger, isMutating } = useSWRMutation('/api/user', updateUser);
        
        return (
          <div>
            <button onClick={() => trigger({ name: 'John' })}>Update</button>
            {isMutating && <p>Updating...</p>}
            {error && <p>Error: {error.message}</p>}
            {data && <p>Success: {data.message}</p>}
          </div>
        );
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    // Find useSWRMutation nodes
    const swrMutationNodes = result.dfd.nodes.filter(n => n.metadata?.hookName === 'useSWRMutation');
    
    assert.strictEqual(swrMutationNodes.length, 1, 'Should have exactly 1 consolidated useSWRMutation node');
    
    const swrNode = swrMutationNodes[0];
    assert.strictEqual(swrNode.label, 'useSWRMutation<resource>', 'Node label should be useSWRMutation<resource>');
    assert.strictEqual(swrNode.type, 'data-store', 'Node type should be data-store');
    
    // Check properties
    const properties = swrNode.metadata?.properties as string[];
    assert.ok(properties.includes('data'), 'Should include data property');
    assert.ok(properties.includes('error'), 'Should include error property');
    assert.ok(properties.includes('isMutating'), 'Should include isMutating property');
    assert.ok(properties.includes('trigger'), 'Should include trigger property');
    
    // Check data vs process properties
    const dataProperties = swrNode.metadata?.dataProperties as string[];
    const processProperties = swrNode.metadata?.processProperties as string[];
    
    assert.ok(dataProperties.includes('data'), 'data should be a data property');
    assert.ok(dataProperties.includes('error'), 'error should be a data property');
    assert.ok(dataProperties.includes('isMutating'), 'isMutating should be a data property');
    assert.ok(processProperties.includes('trigger'), 'trigger should be a process property');
  });

  test('Edges should include property names in labels', async () => {
    const sourceCode = `
      import useSWR from 'swr';
      
      function MyComponent() {
        const { data, error, isLoading } = useSWR('/api/user', fetch);
        
        return (
          <div>
            {isLoading && <p>Loading...</p>}
            {error && <p>Error: {error.message}</p>}
            {data && <p>Name: {data.name}</p>}
          </div>
        );
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    // Find edges from useSWR node
    const swrNode = result.dfd.nodes.find(n => n.metadata?.hookName === 'useSWR');
    assert.ok(swrNode, 'Should find useSWR node');
    
    const edgesFromSwr = result.dfd.edges.filter(e => e.from === swrNode!.id);
    
    // Check that edges have property names in labels
    const hasIsLoadingEdge = edgesFromSwr.some(e => e.label.includes('isLoading'));
    const hasErrorEdge = edgesFromSwr.some(e => e.label.includes('error'));
    const hasDataEdge = edgesFromSwr.some(e => e.label.includes('data'));
    
    assert.ok(hasIsLoadingEdge, 'Should have edge with isLoading in label');
    assert.ok(hasErrorEdge, 'Should have edge with error in label');
    assert.ok(hasDataEdge, 'Should have edge with data in label');
  });

  test('useSWR should create Server node for API endpoint', async () => {
    const sourceCode = `
      import useSWR from 'swr';
      
      const fetcher = (url: string) => fetch(url).then(res => res.json());
      
      function MyComponent() {
        const { data, error, isLoading } = useSWR('/api/user', fetcher);
        
        if (isLoading) return <p>Loading...</p>;
        if (error) return <p>Error: {error.message}</p>;
        
        return <div><p>{data.name}</p></div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    // Find Server node
    const serverNodes = result.dfd.nodes.filter(n => n.metadata?.category === 'server');
    assert.strictEqual(serverNodes.length, 1, 'Should have exactly 1 Server node');
    
    const serverNode = serverNodes[0];
    assert.strictEqual(serverNode.label, 'Server: /api/user', 'Server node label should include endpoint');
    assert.strictEqual(serverNode.type, 'external-entity-input', 'Server node should be external-entity-input');
    assert.strictEqual(serverNode.metadata?.endpoint, '/api/user', 'Server node should have endpoint metadata');
    
    // Find useSWR node
    const swrNode = result.dfd.nodes.find(n => n.metadata?.hookName === 'useSWR');
    assert.ok(swrNode, 'Should find useSWR node');
    
    // Check that useSWR node references the Server node
    assert.strictEqual(swrNode.metadata?.serverNodeId, serverNode.id, 'useSWR node should reference Server node');
    
    // Find edge from Server to useSWR
    const serverEdges = result.dfd.edges.filter(e => e.from === serverNode.id && e.to === swrNode.id);
    assert.strictEqual(serverEdges.length, 1, 'Should have edge from Server to useSWR');
    assert.strictEqual(serverEdges[0].label, 'fetches', 'Edge label should be "fetches"');
  });

  test('useSWRMutation should create Server node for API endpoint', async () => {
    const sourceCode = `
      import useSWRMutation from 'swr/mutation';
      
      async function updateUser(url: string, { arg }: { arg: any }) {
        return fetch(url, { method: 'POST', body: JSON.stringify(arg) }).then(r => r.json());
      }
      
      function MyComponent() {
        const { data, error, trigger } = useSWRMutation('/api/user', updateUser);
        
        return (
          <div>
            <button onClick={() => trigger({ name: 'John' })}>Update</button>
            {error && <p>Error: {error.message}</p>}
            {data && <p>Success: {data.message}</p>}
          </div>
        );
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    
    // Find Server node
    const serverNodes = result.dfd.nodes.filter(n => n.metadata?.category === 'server');
    assert.strictEqual(serverNodes.length, 1, 'Should have exactly 1 Server node');
    
    const serverNode = serverNodes[0];
    assert.strictEqual(serverNode.label, 'Server: /api/user', 'Server node label should include endpoint');
    assert.strictEqual(serverNode.type, 'external-entity-input', 'Server node should be external-entity-input');
    
    // Find useSWRMutation node
    const swrNode = result.dfd.nodes.find(n => n.metadata?.hookName === 'useSWRMutation');
    assert.ok(swrNode, 'Should find useSWRMutation node');
    
    // Find edge from Server to useSWRMutation
    const serverEdges = result.dfd.edges.filter(e => e.from === serverNode.id && e.to === swrNode.id);
    assert.strictEqual(serverEdges.length, 1, 'Should have edge from Server to useSWRMutation');
    assert.strictEqual(serverEdges[0].label, 'fetches', 'Edge label should be "fetches"');
  });
});
