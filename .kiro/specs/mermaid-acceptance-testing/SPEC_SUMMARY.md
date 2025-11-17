# Mermaid-Based Acceptance Testing - Spec Summary

## Overview

This spec defines a new acceptance testing framework that replaces embedded YAML specifications with Mermaid diagram files (`.mmd`) as the source of truth for expected parser output.

## Key Changes

### Current Approach (YAML-based)
- Acceptance test specs embedded in component files as YAML comments
- Difficult to visualize expected output
- Maintenance overhead when parser behavior changes

### New Approach (Mermaid-based)
- `.mmd` files placed alongside test components
- Visual representation of expected DFD output
- Easy to update and verify
- Semantic normalization handles formatting variations

## File Structure

```
examples/react-vite/src/components/
├── 001-ConditionalRendering.tsx
├── 001-ConditionalRendering.mmd        ← NEW
├── 002-LoopRendering.tsx
├── 002-LoopRendering.mmd               ← NEW
└── [more components and .mmd files]
```

## Implementation Components

1. **Mermaid Parser** - Parse Mermaid syntax into structured AST
2. **Mermaid Normalizer** - Normalize diagrams to handle formatting variations
3. **Mermaid Comparator** - Compare normalized diagrams and report differences
4. **Test Discovery** - Scan for test component pairs
5. **Test Runner** - Orchestrate test execution and reporting
6. **Framework Integration** - Integrate with existing test suite

## Core Features

- Automatic test discovery based on file naming conventions
- Semantic comparison (ignores formatting differences)
- Detailed failure reporting with diffs
- CLI filtering support for running specific tests
- Integration with existing test framework

## Next Steps

To begin implementation, open the tasks.md file and click "Start task" next to the first task item. The implementation will proceed incrementally, building each component and integrating them into the test framework.

