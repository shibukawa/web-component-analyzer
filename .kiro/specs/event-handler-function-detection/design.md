# Design Document

## Overview

This design enhances the analyzer's function detection capabilities by leveraging JSX event handler usage patterns. When TypeScript type inference cannot determine if a variable is a function, the system will analyze how the variable is used in JSX attributes (onClick, onChange, etc.) to make an informed classification. This approach reduces reliance on name-based heuristics and produces more accurate data flow diagrams.

## Architecture

### High-Level Flow

```
1. JSX Analysis Phase (conditional-extractor.ts)
   ↓ Extracts attributeReferences with event handler info
   
2. Event Handler Analysis Phase (NEW)
   ↓ Identifies variables used in event handler attributes
   ↓ Creates EventHandlerUsageMap
   
3. Type Classification Phase (type-classifier.ts)
   ↓ Enhanced with event handler usage information
   ↓ Classifies variables as functions based on usage
   
4. DFD Construction Phase (dfd-builder.ts)
   ↓ Creates correct directional edges
   ↓ JSX_element --[onClick: f]--> process_node
```

### Key Components

1. **EventHandlerUsageAnalyzer** (NEW)
   - Analyzes `JSXAttributeReference[]` to identify event handler patterns
   - Builds a map of variables used in event handler contexts
   - Detects both direct references (`onClick={f}`) and arrow function wrappers (`onClick={() => f()}`)

2. **Enhanced TypeClassifier**
   - Accepts event handler usage information as additional input
   - Uses usage patterns as classification signals when type inference fails
   - Maintains backward compatibility with existing type-based classification

3. **Enhanced DFD Builder**
   - Uses updated classification to create correct edge directions
   - Generates edges from JSX elements to event handler processes
   - Avoids incorrect binding edges from processes to elements

## Components and Interfaces

### New Component: EventHandlerUsageAnalyzer

```typescript
/**
 * Analyzes JSX attribute references to identify variables used as event handlers
 */
export class EventHandlerUsageAnalyzer {
  /**
   * Analyze attribute references and build usage map
   * @param attributeReferences - All JSX attribute references from component
   * @returns Map of variable names to their event handler usage contexts
   */
  analyze(attributeReferences: JSXAttributeReference[]): EventHandlerUsageMap;
  
  /**
   * Check if an attribute name is an event handler
   * @param attributeName - The attribute name (e.g., 'onClick', 'onChange')
   * @returns true if the attribute is an event handler
   */
  private isEventHandlerAttribute(attributeName: string): boolean;
  
  /**
   * Extract function references from arrow function expressions
   * @param variables - Variables extracted from arrow function body
   * @returns Function names called within the arrow function
   */
  private extractFunctionCallsFromArrowFunction(variables: string[]): string[];
}

/**
 * Map of variable names to their event handler usage information
 */
export interface EventHandlerUsageMap {
  [variableName: string]: EventHandlerUsageInfo;
}

/**
 * Information about how a variable is used in event handlers
 */
export interface EventHandlerUsageInfo {
  variableName: string;
  usageContexts: EventHandlerUsageContext[];
  isLikelyFunction: boolean; // true if used in event handler context
}

/**
 * Context information for a single event handler usage
 */
export interface EventHandlerUsageContext {
  attributeName: string; // e.g., 'onClick', 'onChange'
  usageType: 'direct' | 'arrow-function-call'; // onClick={f} vs onClick={() => f()}
  jsxElement?: string; // Tag name of the JSX element
}
```

### Enhanced TypeClassifier Interface

```typescript
export class TypeClassifier {
  /**
   * Classify a variable with optional event handler usage information
   * @param typeString - TypeScript type string
   * @param variableName - Name of the variable being classified
   * @param eventHandlerUsage - Optional usage information from JSX analysis
   * @returns Classification result
   */
  classifyWithUsage(
    typeString: string,
    variableName: string,
    eventHandlerUsage?: EventHandlerUsageInfo
  ): TypeClassification;
  
  /**
   * Existing classify method (maintained for backward compatibility)
   */
  classify(typeString: string): TypeClassification;
}
```

### Enhanced JSXAttributeReference

The existing `JSXAttributeReference` interface already has the necessary fields:

```typescript
export interface JSXAttributeReference {
  attributeName: string; // e.g., 'onClick', 'onChange'
  referencedVariable: string; // Name of the variable being referenced
  propertyName?: string; // Property name if accessing object property
  isEventHandler?: boolean; // Will be set by EventHandlerUsageAnalyzer
}
```

## Data Models

### Event Handler Attribute Patterns

The system recognizes these event handler attribute patterns:

**React Event Handlers:**
- Mouse events: `onClick`, `onDoubleClick`, `onMouseDown`, `onMouseUp`, `onMouseEnter`, `onMouseLeave`, `onMouseMove`
- Form events: `onChange`, `onInput`, `onSubmit`, `onReset`, `onFocus`, `onBlur`
- Keyboard events: `onKeyDown`, `onKeyUp`, `onKeyPress`
- Touch events: `onTouchStart`, `onTouchEnd`, `onTouchMove`, `onTouchCancel`
- Drag events: `onDrag`, `onDragStart`, `onDragEnd`, `onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop`
- Other: `onScroll`, `onWheel`, `onLoad`, `onError`

**Pattern Recognition:**
- Attributes starting with `on` followed by uppercase letter: `/^on[A-Z]/`
- Custom event handlers following the same pattern

### Usage Type Detection

**Direct Reference:**
```tsx
<button onClick={handleClick}>
// attributeName: 'onClick'
// referencedVariable: 'handleClick'
// usageType: 'direct'
```

**Arrow Function Wrapper:**
```tsx
<button onClick={() => handleClick()}>
// attributeName: 'onClick'
// referencedVariable: 'handleClick' (extracted from arrow function body)
// usageType: 'arrow-function-call'
```

**Member Expression:**
```tsx
<button onClick={store.increment}>
// attributeName: 'onClick'
// referencedVariable: 'store'
// propertyName: 'increment'
// usageType: 'direct'
```

## Error Handling

### Graceful Degradation

1. **Missing Type Information**: If TypeScript type is unavailable and no event handler usage is found, fall back to existing name-based heuristics
2. **Ambiguous Usage**: If a variable is used in both event handler and data contexts, prioritize type information over usage patterns
3. **Complex Expressions**: For complex arrow function bodies, extract all function calls and mark them as potential event handlers

### Validation

1. **Consistency Check**: Verify that event handler usage aligns with type information when both are available
2. **Warning Logging**: Log warnings when usage patterns contradict type information
3. **Test Coverage**: Ensure acceptance tests cover edge cases

## Testing Strategy

### Unit Tests

1. **EventHandlerUsageAnalyzer Tests**
   - Test direct reference detection: `onClick={f}`
   - Test arrow function detection: `onClick={() => f()}`
   - Test member expression detection: `onClick={store.increment}`
   - Test multiple usage contexts for same variable
   - Test non-event-handler attributes (should not be classified as functions)

2. **Enhanced TypeClassifier Tests**
   - Test classification with event handler usage information
   - Test fallback to type-based classification
   - Test priority when both type and usage information available
   - Test backward compatibility with existing classify() method

3. **Integration Tests**
   - Test end-to-end flow from JSX analysis to DFD construction
   - Test correct edge direction generation
   - Test with Zustand selectors and other store patterns

### Acceptance Tests

Create new test components in `examples/react-vite/src/components/`:

1. **Event Handler Direct Reference** (`170-EventHandler-DirectReference.tsx`)
   - Simple onClick with function variable
   - Verify correct edge direction in DFD

2. **Event Handler Arrow Function** (`171-EventHandler-ArrowFunction.tsx`)
   - onClick with arrow function calling a function
   - Verify function detection and edge direction

3. **Zustand Store Event Handler** (`172-Zustand-EventHandler.tsx`)
   - Event handler using Zustand selector function
   - Verify correct classification without type inference

4. **Mixed Usage Pattern** (`173-EventHandler-MixedUsage.tsx`)
   - Variable used in both event handler and data contexts
   - Verify correct classification based on context

### Heuristic Removal Validation

1. **Configuration Flag**: Add `DISABLE_NAME_HEURISTICS` environment variable
2. **Test Suite Execution**: Run all acceptance tests with flag enabled
3. **Result Comparison**: Compare DFD output with and without name-based heuristics
4. **Removal Decision**: If results are identical, remove `isEventHandlerName` method from `process-analyzer.ts`

## Implementation Phases

### Phase 1: Event Handler Usage Analysis

1. Create `EventHandlerUsageAnalyzer` class
2. Implement attribute pattern recognition
3. Build usage map from `JSXAttributeReference[]`
4. Add unit tests

### Phase 2: Type Classifier Enhancement

1. Add `classifyWithUsage` method to `TypeClassifier`
2. Integrate event handler usage information
3. Maintain backward compatibility
4. Add unit tests

### Phase 3: DFD Builder Integration

1. Call `EventHandlerUsageAnalyzer` during DFD construction
2. Pass usage information to `TypeClassifier`
3. Update edge creation logic
4. Add integration tests

### Phase 4: Acceptance Testing

1. Create test components
2. Generate expected `.mmd` files
3. Run acceptance tests
4. Verify correct DFD output

### Phase 5: Heuristic Validation and Removal

1. Add configuration flag for disabling name-based heuristics
2. Run acceptance tests with flag enabled
3. Compare results
4. Remove `isEventHandlerName` if results are identical
5. Update documentation

## Design Decisions and Rationales

### Decision 1: Separate EventHandlerUsageAnalyzer

**Rationale**: Keeps concerns separated. JSX analysis focuses on structure extraction, while usage analysis focuses on semantic interpretation. This makes the code more maintainable and testable.

### Decision 2: Enhance TypeClassifier Rather Than Replace

**Rationale**: Maintains backward compatibility and allows gradual migration. Type information is still the most reliable source when available; usage patterns serve as a fallback.

### Decision 3: Two-Phase Approach (Usage Analysis → Classification)

**Rationale**: Allows the usage map to be built once and reused for all variables. More efficient than analyzing usage during each classification call.

### Decision 4: Prioritize Type Information Over Usage

**Rationale**: TypeScript types are explicit and reliable. Usage patterns are heuristic and should only be used when type information is unavailable or ambiguous.

### Decision 5: Validate Before Removing Heuristics

**Rationale**: Name-based heuristics may still be needed for edge cases. Validation ensures we don't break existing functionality.

## Dependencies

### Existing Components

- `conditional-extractor.ts`: Provides `JSXAttributeReference[]`
- `type-classifier.ts`: Enhanced with usage information
- `dfd-builder.ts`: Integrates new analysis phase
- `process-analyzer.ts`: Contains name-based heuristics to be removed

### New Dependencies

- None (uses existing TypeScript and SWC dependencies)

## Performance Considerations

1. **Single Pass Analysis**: Build usage map once during DFD construction
2. **Efficient Lookup**: Use Map data structure for O(1) variable lookup
3. **Lazy Evaluation**: Only analyze event handler usage when type information is unavailable
4. **Caching**: Cache classification results to avoid redundant analysis

## Migration Path

### Backward Compatibility

1. Existing `classify()` method remains unchanged
2. New `classifyWithUsage()` method is optional
3. DFD Builder gradually adopts new method
4. Old behavior preserved when usage information not provided

### Gradual Adoption

1. Phase 1-3: New functionality added alongside existing code
2. Phase 4: Acceptance tests validate new behavior
3. Phase 5: Remove old heuristics only after validation

## Future Enhancements

1. **Vue Event Handler Support**: Extend pattern recognition to Vue `@click`, `@change` syntax
2. **Svelte Event Handler Support**: Extend to Svelte `on:click`, `on:change` syntax
3. **Custom Event Handlers**: Allow configuration of custom event handler patterns
4. **Usage Context Weighting**: Assign confidence scores based on usage frequency and context
