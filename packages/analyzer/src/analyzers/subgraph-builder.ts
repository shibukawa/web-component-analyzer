/**
 * Subgraph Builder for converting JSX structure into DFD subgraphs
 */

import {
  JSXStructure,
  JSXElementStructure,
  ConditionalBranch,
  ConditionExpression,
  DFDSubgraph,
  DFDNode,
  ProcessInfo,
} from '../parser/types';

/**
 * Builds DFD subgraph structures from JSX structure tree
 */
export class SubgraphBuilder {
  private subgraphCounter: number = 0;
  private elementCounter: number = 0;

  /**
   * Build root JSX Output subgraph
   */
  buildRootSubgraph(structure: JSXStructure): DFDSubgraph {
    this.subgraphCounter = 0;
    this.elementCounter = 0;

    console.log('🏗️ SubgraphBuilder: Building root subgraph from structure:', JSON.stringify(structure, null, 2).substring(0, 500));

    const rootSubgraph: DFDSubgraph = {
      id: this.generateSubgraphId(),
      label: 'JSX Output',
      type: 'jsx-output',
      elements: [],
    };

    // Process the structure and add to root subgraph
    const processed = this.buildSubgraph(structure, rootSubgraph.id, false);
    
    if (processed) {
      if (Array.isArray(processed)) {
        rootSubgraph.elements.push(...processed);
      } else {
        rootSubgraph.elements.push(processed);
      }
    }

    console.log('🏗️ SubgraphBuilder: Root subgraph elements:', rootSubgraph.elements.length);

    // Filter empty subgraphs
    const filtered = this.filterEmptySubgraphs(rootSubgraph);
    return filtered || rootSubgraph;
  }

  /**
   * Build exported handlers subgraph for visualization
   * Creates a subgraph structure for methods exposed through useImperativeHandle
   */
  buildExportedHandlersSubgraph(
    process: ProcessInfo,
    parentNodeId: string
  ): DFDSubgraph | null {
    if (!process.exportedHandlers || process.exportedHandlers.length === 0) {
      return null;
    }

    console.log(`🏗️ SubgraphBuilder: Building exported handlers subgraph for ${process.name}`);

    const subgraph: DFDSubgraph = {
      id: `${parentNodeId}-exported-handlers`,
      label: 'exported handlers',
      type: 'exported-handlers',
      elements: [],
      parentProcessId: parentNodeId,
    };

    for (const handler of process.exportedHandlers) {
      const handlerNode: DFDNode = {
        id: `${parentNodeId}-handler-${handler.name}`,
        label: handler.name,
        type: 'process',
        line: handler.line,
        column: handler.column,
        metadata: {
          processType: 'exported-handler',
          parentProcessId: parentNodeId,
          parameters: handler.parameters,
          returnsValue: handler.returnsValue,
          isAsync: handler.isAsync,
        },
      };

      subgraph.elements.push(handlerNode);
      console.log(`🏗️   Added handler node: ${handler.name}`);
    }

    console.log(`🏗️ SubgraphBuilder: Created exported handlers subgraph with ${subgraph.elements.length} handlers`);
    return subgraph;
  }

  /**
   * Build subgraph from JSX structure (recursive)
   * Returns DFDSubgraph, DFDNode, array of elements, or null
   */
  private buildSubgraph(
    structure: JSXStructure,
    parentId: string,
    isInConditional: boolean
  ): DFDSubgraph | DFDNode | (DFDSubgraph | DFDNode)[] | null {
    if ('type' in structure && structure.type === 'element') {
      return this.processElement(structure as JSXElementStructure, parentId, isInConditional);
    } else {
      return this.buildConditionalSubgraph(structure as ConditionalBranch, parentId);
    }
  }

  /**
   * Process an element structure
   */
  private processElement(
    element: JSXElementStructure,
    parentId: string,
    isInConditional: boolean
  ): DFDSubgraph | DFDNode | (DFDSubgraph | DFDNode)[] | null {
    const results: (DFDSubgraph | DFDNode)[] = [];

    // Process children first
    for (const child of element.children) {
      const processed = this.buildSubgraph(child, parentId, isInConditional);
      if (processed) {
        if (Array.isArray(processed)) {
          results.push(...processed);
        } else {
          results.push(processed);
        }
      }
    }

    // Check if this element should be included
    if (this.shouldIncludeElement(element, isInConditional)) {
      const elementNode = this.buildElementNode(element, parentId);
      if (elementNode) {
        results.unshift(elementNode); // Add element before its children
      }
    }

    // Return results
    if (results.length === 0) {
      return null;
    } else if (results.length === 1) {
      return results[0];
    } else {
      return results;
    }
  }

  /**
   * Build conditional subgraph
   */
  private buildConditionalSubgraph(
    branch: ConditionalBranch,
    parentId: string
  ): DFDSubgraph | DFDNode | (DFDSubgraph | DFDNode)[] | null {
    console.log(`🏗️ buildConditionalSubgraph: type=${branch.type}, condition=${branch.condition.expression}`);
    
    if (branch.type === 'loop') {
      return this.buildLoopSubgraph(branch, parentId);
    }

    // Handle early-return pattern (same as logical-and, but with different semantics)
    if (branch.type === 'early-return') {
      return this.buildEarlyReturnSubgraph(branch, parentId);
    }

    const results: DFDSubgraph[] = [];

    // Handle true branch
    if (branch.trueBranch) {
      const label = this.generateConditionLabel(branch.condition, true, branch.type);
      console.log(`🏗️   Creating conditional subgraph with label: ${label}`);
      
      const subgraph: DFDSubgraph = {
        id: this.generateSubgraphId(),
        label,
        type: 'conditional',
        condition: branch.condition,
        elements: [],
      };

      // First pass: try to build with dependency filtering
      const processed = this.buildSubgraph(branch.trueBranch, subgraph.id, true);
      console.log(`🏗️   Processed trueBranch, result:`, processed ? (Array.isArray(processed) ? `array(${processed.length})` : 'single') : 'null');
      
      if (processed) {
        if (Array.isArray(processed)) {
          subgraph.elements.push(...processed);
        } else {
          subgraph.elements.push(processed);
        }
      }

      console.log(`🏗️   Subgraph ${subgraph.id} has ${subgraph.elements.length} elements after first pass`);
      
      // If no elements were included, try again without dependency filtering
      if (subgraph.elements.length === 0 && branch.trueBranch.type === 'element') {
        console.log(`🏗️   ⚠️ Subgraph is empty, including element without dependency check`);
        const elementNode = this.buildElementNode(branch.trueBranch as JSXElementStructure, subgraph.id);
        if (elementNode) {
          subgraph.elements.push(elementNode);
        }
      }
      
      if (subgraph.elements.length > 0) {
        results.push(subgraph);
      } else {
        console.log(`🏗️   ⚠️ Subgraph ${subgraph.id} is still empty, not adding to results`);
      }
    }

    // Handle false branch (for ternary)
    if (branch.falseBranch && branch.type === 'ternary') {
      const label = this.generateConditionLabel(branch.condition, false, branch.type);
      const subgraph: DFDSubgraph = {
        id: this.generateSubgraphId(),
        label,
        type: 'conditional',
        condition: {
          variables: branch.condition.variables,
          expression: `!(${branch.condition.expression})`,
        },
        elements: [],
      };

      const processed = this.buildSubgraph(branch.falseBranch, subgraph.id, true);
      if (processed) {
        if (Array.isArray(processed)) {
          subgraph.elements.push(...processed);
        } else {
          subgraph.elements.push(processed);
        }
      }

      if (subgraph.elements.length > 0) {
        results.push(subgraph);
      }
    }

    // Handle false branch (for logical-or)
    if (branch.falseBranch && branch.type === 'logical-or') {
      const label = this.generateConditionLabel(branch.condition, false, branch.type);
      const subgraph: DFDSubgraph = {
        id: this.generateSubgraphId(),
        label,
        type: 'conditional',
        condition: branch.condition,
        elements: [],
      };

      const processed = this.buildSubgraph(branch.falseBranch, subgraph.id, true);
      if (processed) {
        if (Array.isArray(processed)) {
          subgraph.elements.push(...processed);
        } else {
          subgraph.elements.push(processed);
        }
      }

      if (subgraph.elements.length > 0) {
        results.push(subgraph);
      }
    }

    if (results.length === 0) {
      return null;
    } else if (results.length === 1) {
      return results[0];
    } else {
      return results;
    }
  }

  /**
   * Build loop subgraph
   */
  private buildLoopSubgraph(
    branch: ConditionalBranch,
    parentId: string
  ): DFDSubgraph | null {
    const subgraph: DFDSubgraph = {
      id: this.generateSubgraphId(),
      label: '{loop}',
      type: 'conditional',
      condition: branch.condition,
      elements: [],
    };

    if (branch.trueBranch) {
      // Check for nested loops with no intermediate content
      const merged = this.tryMergeNestedLoops(branch.trueBranch);
      
      const processed = this.buildSubgraph(merged, subgraph.id, true);
      if (processed) {
        if (Array.isArray(processed)) {
          subgraph.elements.push(...processed);
        } else {
          subgraph.elements.push(processed);
        }
      }
    }

    return subgraph.elements.length > 0 ? subgraph : null;
  }

  /**
   * Build early return subgraph
   * Early returns are similar to logical-and but represent if (condition) { return <JSX>; }
   */
  private buildEarlyReturnSubgraph(
    branch: ConditionalBranch,
    parentId: string
  ): DFDSubgraph | null {
    if (!branch.trueBranch) {
      return null;
    }

    const label = this.generateConditionLabel(branch.condition, true, 'logical-and');
    console.log(`🏗️   Creating early-return subgraph with label: ${label}`);
    
    const subgraph: DFDSubgraph = {
      id: this.generateSubgraphId(),
      label,
      type: 'conditional',
      condition: branch.condition,
      elements: [],
    };

    // Process the JSX content of the early return
    const processed = this.buildSubgraph(branch.trueBranch, subgraph.id, true);
    console.log(`🏗️   Processed early-return branch, result:`, processed ? (Array.isArray(processed) ? `array(${processed.length})` : 'single') : 'null');
    
    if (processed) {
      if (Array.isArray(processed)) {
        subgraph.elements.push(...processed);
      } else {
        subgraph.elements.push(processed);
      }
    }

    console.log(`🏗️   Early-return subgraph ${subgraph.id} has ${subgraph.elements.length} elements`);
    
    // If no elements were included, try again without dependency filtering
    if (subgraph.elements.length === 0 && branch.trueBranch.type === 'element') {
      console.log(`🏗️   ⚠️ Early-return subgraph is empty, including element without dependency check`);
      const elementNode = this.buildElementNode(branch.trueBranch as JSXElementStructure, subgraph.id);
      if (elementNode) {
        subgraph.elements.push(elementNode);
      }
    }
    
    return subgraph.elements.length > 0 ? subgraph : null;
  }

  /**
   * Try to merge nested loops with no intermediate content
   */
  private tryMergeNestedLoops(structure: JSXStructure): JSXStructure {
    // If this is a loop, check if it's directly nested
    if ('type' in structure && structure.type !== 'element') {
      const branch = structure as ConditionalBranch;
      if (branch.type === 'loop' && branch.trueBranch) {
        // This is a nested loop, return its content directly
        return this.tryMergeNestedLoops(branch.trueBranch);
      }
    }

    // If this is an element with a single child that's a loop, merge
    if ('type' in structure && structure.type === 'element') {
      const element = structure as JSXElementStructure;
      if (element.children.length === 1) {
        const child = element.children[0];
        if ('type' in child && child.type !== 'element') {
          const childBranch = child as ConditionalBranch;
          if (childBranch.type === 'loop') {
            // Skip this wrapper element and merge the loop
            return this.tryMergeNestedLoops(child);
          }
        }
      }
    }

    return structure;
  }

  /**
   * Build element node
   */
  private buildElementNode(
    element: JSXElementStructure,
    parentId: string
  ): DFDNode | null {
    const node: DFDNode = {
      id: this.generateElementId(),
      label: element.tagName,
      type: 'external-entity-output',
      line: element.line,
      column: element.column,
      metadata: {
        displayDependencies: element.displayDependencies,
        attributeReferences: element.attributeReferences,
      },
    };

    return node;
  }

  /**
   * Check if element should be included
   */
  private shouldIncludeElement(
    element: JSXElementStructure,
    isInConditional: boolean
  ): boolean {
    const hasDependencies =
      element.displayDependencies.length > 0 ||
      element.attributeReferences.length > 0;

    console.log(`🏗️ shouldIncludeElement: ${element.tagName}, isInConditional=${isInConditional}, hasDependencies=${hasDependencies}, displayDeps=${element.displayDependencies.length}, attrRefs=${element.attributeReferences.length}`);

    // Always include if has dependencies
    if (hasDependencies) {
      console.log(`🏗️   ✅ Including ${element.tagName} (has dependencies)`);
      return true;
    }

    // Don't include wrapper elements without dependencies
    // (children will be included directly if they have dependencies)
    console.log(`🏗️   ❌ Excluding ${element.tagName} (no dependencies)`);
    return false;
  }

  /**
   * Generate condition label from ConditionExpression
   */
  private generateConditionLabel(
    condition: ConditionExpression,
    isTrueBranch: boolean,
    branchType: 'ternary' | 'logical-and' | 'logical-or'
  ): string {
    let expr = condition.expression;

    // For false branch of ternary, negate the condition
    if (branchType === 'ternary' && !isTrueBranch) {
      // Simplify negation if possible
      if (expr.startsWith('!')) {
        expr = expr.substring(1);
      } else {
        expr = `!${expr}`;
      }
    }

    return `{${expr}}`;
  }

  /**
   * Filter empty subgraphs recursively
   */
  private filterEmptySubgraphs(subgraph: DFDSubgraph): DFDSubgraph | null {
    const filteredElements: (DFDNode | DFDSubgraph)[] = [];

    for (const element of subgraph.elements) {
      if ('type' in element && element.type !== 'conditional' && element.type !== 'jsx-output') {
        // This is a DFDNode, keep it
        filteredElements.push(element);
      } else {
        // This is a DFDSubgraph, filter it recursively
        const filtered = this.filterEmptySubgraphs(element as DFDSubgraph);
        if (filtered) {
          filteredElements.push(filtered);
        }
      }
    }

    // Update elements
    subgraph.elements = filteredElements;

    // Return null if empty (unless it's the root)
    if (subgraph.type === 'jsx-output') {
      return subgraph; // Always keep root
    }

    return subgraph.elements.length > 0 ? subgraph : null;
  }

  /**
   * Generate unique subgraph ID
   */
  private generateSubgraphId(): string {
    return `subgraph-${this.subgraphCounter++}`;
  }

  /**
   * Generate unique element ID
   */
  private generateElementId(): string {
    return `jsx-element-${this.elementCounter++}`;
  }
}
