/**
 * Tests for DFD generation with useImperativeHandle
 */

import * as assert from 'assert';
import { parseSync } from '@swc/core';
import { SWCASTAnalyzer } from '../parser/ast-analyzer';
import { DefaultDFDBuilder } from '../parser/dfd-builder';
import { DFDNode, DFDEdge, ProcessInfo } from '../parser/types';

suite('DFD Imperative Handle Test Suite', () => {
  test('Should create external-entity-output nodes for ref.current.method() calls', async () => {
    const sourceCode = `
      import React, { useRef, useEffect } from 'react';
      
      function ParentComponent() {
        const childRef = useRef(null);
        
        useEffect(() => {
          if (childRef.current) {
            childRef.current.focus();
          }
        }, []);
        
        return <ChildComponent ref={childRef} />;
      }
    `;

    const ast = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(ast);
    assert.ok(analysis, 'Should have analysis data');
    
    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis!);
    
    // Check for external call node
    const externalCallNodes = dfd.nodes.filter((n: DFDNode) =>
      n.type === 'external-entity-output' && 
      n.metadata?.category === 'external-call'
    );
    
    assert.ok(externalCallNodes.length > 0, 'Should have external call nodes');
    
    const focusCall = externalCallNodes.find((n: DFDNode) => n.label.includes('focus'));
    assert.ok(focusCall, 'Should have focus() call node');
    assert.ok(focusCall!.label.includes('.current.'), 'Should include .current. in label to indicate ref access');
    
    // Check for edge from useEffect to external call
    const useEffectNode = dfd.nodes.find((n: DFDNode) => 
      n.type === 'process' && n.label === 'useEffect'
    );
    assert.ok(useEffectNode, 'Should have useEffect process node');
    
    const edgeToFocus = dfd.edges.find((e: DFDEdge) => 
      e.from === useEffectNode!.id && e.to === focusCall!.id
    );
    assert.ok(edgeToFocus, 'Should have edge from useEffect to focus call');
    assert.strictEqual(edgeToFocus!.label, 'calls', 'Edge should be labeled as calls');
  });

  test('Should create multiple external-entity-output nodes for multiple ref calls', async () => {
    const sourceCode = `
      import React, { useRef, useCallback } from 'react';
      
      function ParentComponent() {
        const childRef = useRef(null);
        
        const handleSubmit = useCallback(() => {
          if (childRef.current) {
            const value = childRef.current.getValue();
            childRef.current.reset();
          }
        }, []);
        
        return <ChildComponent ref={childRef} />;
      }
    `;

    const ast = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(ast);
    assert.ok(analysis, 'Should have analysis data');
    
    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis!);
    
    // Check for external call nodes
    const externalCallNodes = dfd.nodes.filter((n: DFDNode) => 
      n.type === 'external-entity-output' && 
      n.metadata?.category === 'external-call'
    );
    
    assert.ok(externalCallNodes.length >= 2, 'Should have at least 2 external call nodes');
    
    const getValueCall = externalCallNodes.find((n: DFDNode) => n.label.includes('getValue'));
    const resetCall = externalCallNodes.find((n: DFDNode) => n.label.includes('reset'));
    
    assert.ok(getValueCall, 'Should have getValue() call node');
    assert.ok(resetCall, 'Should have reset() call node');
    
    // Check for edges from useCallback to external calls
    const useCallbackNode = dfd.nodes.find((n: DFDNode) => 
      n.type === 'process' && n.label === 'handleSubmit'
    );
    assert.ok(useCallbackNode, 'Should have handleSubmit process node');
    
    const edgeToGetValue = dfd.edges.find((e: DFDEdge) => 
      e.from === useCallbackNode!.id && e.to === getValueCall!.id
    );
    const edgeToReset = dfd.edges.find((e: DFDEdge) => 
      e.from === useCallbackNode!.id && e.to === resetCall!.id
    );
    
    assert.ok(edgeToGetValue, 'Should have edge from handleSubmit to getValue call');
    assert.ok(edgeToReset, 'Should have edge from handleSubmit to reset call');
  });

  test('Should handle ref calls in event handlers', async () => {
    const sourceCode = `
      import React, { useRef } from 'react';
      
      function ParentComponent() {
        const childRef = useRef(null);
        
        const handleReset = () => {
          childRef.current.reset();
        };
        
        return (
          <div>
            <button onClick={handleReset}>Reset</button>
            <ChildComponent ref={childRef} />
          </div>
        );
      }
    `;

    const ast = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(ast);
    assert.ok(analysis, 'Should have analysis data');
    
    const builder = new DefaultDFDBuilder();
    const dfd = builder.build(analysis!);
    
    // Check for external call node
    const externalCallNodes = dfd.nodes.filter((n: DFDNode) => 
      n.type === 'external-entity-output' && 
      n.metadata?.category === 'external-call'
    );
    
    const resetCall = externalCallNodes.find((n: DFDNode) => n.label.includes('reset'));
    assert.ok(resetCall, 'Should have reset() call node');
    
    // Check for edge from event handler to external call
    const handlerNode = dfd.nodes.find((n: DFDNode) => 
      n.type === 'process' && n.label === 'handleReset'
    );
    assert.ok(handlerNode, 'Should have handleReset process node');
    
    const edgeToReset = dfd.edges.find((e: DFDEdge) => 
      e.from === handlerNode!.id && e.to === resetCall!.id
    );
    assert.ok(edgeToReset, 'Should have edge from handleReset to reset call');
  });

  test('Should detect ref references in processes', async () => {
    const sourceCode = `
      import React, { useRef, useEffect } from 'react';
      
      function ParentComponent() {
        const childRef = useRef(null);
        
        useEffect(() => {
          if (childRef.current) {
            childRef.current.focus();
          }
        }, []);
        
        return <ChildComponent ref={childRef} />;
      }
    `;

    const ast = parseSync(sourceCode, {
      syntax: 'typescript',
      tsx: true
    });

    const analyzer = new SWCASTAnalyzer();
    const analysis = await analyzer.analyze(ast);
    assert.ok(analysis, 'Should have analysis data');
    
    const useEffectProcess = analysis!.processes.find((p: ProcessInfo) => p.type === 'useEffect');
    assert.ok(useEffectProcess, 'Should have useEffect process');
    assert.ok(useEffectProcess!.references, 'Should have references');
    assert.ok(useEffectProcess!.references.includes('childRef'), 'Should reference childRef');
  });
});
