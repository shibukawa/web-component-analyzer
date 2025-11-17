# Acceptance Testing Workflow

## Overview

This document describes the recommended workflow for developing features using Mermaid-based acceptance tests. The workflow follows an iterative approach where tests guide implementation.

## Workflow Steps

### Phase 1: Initial Test Setup
1. Create rough `.mmd` reference files based on expected behavior
2. Run tests to see failures
3. Analyze error messages to understand gaps

### Phase 2: Implementation & Refinement
1. Implement or modify code based on test failures
2. Run tests again to check progress
3. Iterate until differences are minimal (only ID/ordering differences)

### Phase 3: Reference File Update
1. When test failures are only due to ID differences or element ordering:
   - Run the test with `--update-refs` flag to auto-generate correct `.mmd` files
   - Or manually copy generated output to `.mmd` files
2. Verify all tests pass

## Commands

### Run Tests
```bash
pnpm run test
```

### Run Tests with Reference Update
When test failures are only due to ID/ordering differences, update reference files:
```bash
pnpm run test -- --update-refs
```

### Run Specific Test
```bash
pnpm run test -- --filter=001
```

### Run Specific Test with Reference Update
```bash
pnpm run test -- --filter=001 --update-refs
```

## Workflow Example

### Step 1: Create Initial Reference Files
```bash
# Generate rough .mmd files for all components
for file in examples/react-vite/src/components/*.tsx; do
  mmdfile="${file%.tsx}.mmd"
  if [ ! -f "$mmdfile" ]; then
    # Generate initial .mmd from current parser output
    node scripts/generate-mmd.js "$file" > "$mmdfile"
  fi
done
```

### Step 2: Run Tests and Analyze Failures
```bash
pnpm run test
# Review error messages to understand what needs to be fixed
```

### Step 3: Fix Code Based on Test Failures
- Analyze missing/extra nodes and edges
- Modify parser or component code
- Re-run tests to verify improvements

### Step 4: Update References When Close
```bash
# When only ID/ordering differences remain:
pnpm run test -- --update-refs
```

## Test Output Interpretation

### Common Differences

**ID Differences** (Safe to ignore during development):
```
Missing nodes:
  - node:library_hook_3:useLocation
Extra nodes:
  - node:library_hook_2:useLocation
```
→ Same element, different ID assignment

**Ordering Differences** (Safe to ignore during development):
```
Missing edges:
  - edge:jsx_element_2:process_4:onClick
Extra edges:
  - edge:jsx_element_2:process_3:onClick
```
→ Same relationship, different element IDs

**Structural Differences** (Must fix):
```
Missing nodes:
  - node:process_5:handleRouterNavigate
```
→ Parser not detecting this process

## Best Practices

1. **Start with rough approximations**: Don't worry about exact IDs initially
2. **Focus on structure first**: Ensure all nodes and edges are present
3. **Iterate incrementally**: Make small code changes and test frequently
4. **Use test output as guidance**: Error messages show exactly what's missing
5. **Update references last**: Only update `.mmd` files when structure is correct

## Integration with Development

### Before Committing Code
1. Ensure all acceptance tests pass
2. Verify `.mmd` files are up-to-date with current parser output
3. Review test output for any unexpected differences

### When Adding New Components
1. Create component file
2. Generate initial `.mmd` file
3. Run tests to see if parser handles it correctly
4. Fix parser if needed
5. Update `.mmd` file when tests pass

### When Modifying Parser
1. Run tests to see impact
2. Update `.mmd` files for affected components
3. Verify all tests pass before committing
