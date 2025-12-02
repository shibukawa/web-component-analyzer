# Implementation Plan: VS Code Dark Theme Support

- [x] 1. Create Theme Configuration Module
  - [x] 1.1 Create `packages/extension/src/visualization/theme-config.ts` with theme detection logic
    - Implement `detectVSCodeTheme()` function to detect light/dark/high-contrast themes
    - Implement `getTheme()` function to generate Mermaid configuration
    - Import theme definitions from web version (`packages/web/src/config/themes.ts`)
    - _Requirements: 3.1, 4.1_
  
  - [x] 1.2 Import and reuse web version theme definitions
    - Copy or import light theme colors from `packages/web/src/config/themes.ts`
    - Copy or import dark theme colors from `packages/web/src/config/themes.ts`
    - Ensure high-contrast theme support
    - _Requirements: 1.1, 1.3, 2.2_
  
  - [ ]* 1.3 Write property test for theme detection
    - **Property 6: Automatic Theme Detection**
    - **Validates: Requirements 3.1**
  
  - [ ]* 1.4 Write property test for theme color consistency
    - **Property 4: Theme Consistency Across Platforms**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 2. Update HTML Content Generator
  - [x] 2.1 Modify `packages/extension/src/visualization/html-content-generator.ts` to use theme configuration
    - Import theme configuration module
    - Detect current VS Code theme
    - Pass theme variables to Mermaid initialization
    - _Requirements: 1.1, 1.3, 2.2_
  
  - [x] 2.2 Update CSS styles to use theme-aware colors
    - Use CSS custom properties for theme colors
    - Apply theme colors to mermaid-container and error elements
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.3 Update Mermaid initialization script
    - Pass theme variables from theme configuration
    - Set theme to 'base' for full customization
    - Configure flowchart settings to match web version
    - _Requirements: 2.3, 4.4_
  
  - [ ]* 2.4 Write property test for light theme rendering
    - **Property 2: Light Theme Rendering**
    - **Validates: Requirements 1.3**
  
  - [ ]* 2.5 Write property test for dark theme rendering
    - **Property 1: Dark Theme Rendering**
    - **Validates: Requirements 1.1**

- [x] 3. Update Webview Panel Manager
  - [x] 3.1 Modify `packages/extension/src/visualization/webview-panel-manager.ts` to detect theme changes
    - Listen for VS Code configuration changes
    - Detect theme changes
    - Send theme change messages to webview
    - _Requirements: 3.2, 3.3_
  
  - [x] 3.2 Implement theme change notification
    - Create message format for theme changes
    - Send theme information to webview on initialization
    - Send theme information when theme changes
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 3.3 Write property test for theme change propagation
    - **Property 7: Theme Change Propagation**
    - **Validates: Requirements 3.2, 3.3**

- [x] 4. Update Extension Host
  - [x] 4.1 Modify `packages/extension/src/extension.ts` to listen for theme changes
    - Register listener for `onDidChangeConfiguration` event
    - Detect theme changes
    - Notify webview panel manager of theme changes
    - _Requirements: 3.2_
  
  - [ ]* 4.2 Write property test for automatic theme detection
    - **Property 6: Automatic Theme Detection**
    - **Validates: Requirements 3.1**

- [x] 5. Update Webview Script
  - [x] 5.1 Update inline webview script in HTML content generator
    - Implement theme change message handler
    - Re-initialize Mermaid with new theme variables
    - Re-render diagram with new theme
    - _Requirements: 1.2, 1.4, 3.2, 3.3_
  
  - [x] 5.2 Implement theme detection on webview load
    - Detect initial theme from VS Code CSS classes
    - Initialize Mermaid with correct theme
    - _Requirements: 3.1_
  
  - [x] 5.3 Implement diagram re-rendering on theme change
    - Clear previous diagram
    - Re-render with new theme variables
    - Preserve zoom and pan state
    - _Requirements: 1.2, 1.4_
  
  - [ ]* 5.4 Write property test for theme change idempotence
    - **Property 3: Theme Change Idempotence**
    - **Validates: Requirements 1.2, 1.4, 3.2**
  
  - [ ]* 5.5 Write property test for no visual flashing
    - **Property 8: No Visual Flashing on Theme Change**
    - **Validates: Requirements 3.4**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Accessibility Features
  - [x] 7.1 Verify color contrast ratios for all themes
    - Test light theme contrast ratios (minimum 4.5:1)
    - Test dark theme contrast ratios (minimum 4.5:1)
    - Test high-contrast theme contrast ratios
    - _Requirements: 1.1, 1.3, 1.5_
  
  - [x] 7.2 Implement high-contrast mode support
    - Detect high-contrast theme
    - Apply high-contrast colors
    - Increase border width for visibility
    - _Requirements: 1.5_
  
  - [ ]* 7.3 Write property test for color accessibility
    - **Property 9: Color Accessibility**
    - **Validates: Requirements 1.1, 1.3, 1.5**
  
  - [ ]* 7.4 Write property test for high-contrast mode
    - **Property 10: High-Contrast Mode Support**
    - **Validates: Requirements 1.5**

- [x] 8. Implement Diagram Structure Preservation
  - [x] 8.1 Verify diagram structure remains unchanged on theme switch
    - Test that nodes remain in same positions
    - Test that edges remain connected
    - Test that relationships are preserved
    - _Requirements: 1.1, 1.3, 1.5_
  
  - [ ]* 8.2 Write property test for diagram structure preservation
    - **Property 5: Diagram Structure Preservation**
    - **Validates: Requirements 1.1, 1.3, 1.5**

- [x] 9. Verify Platform Consistency
  - [x] 9.1 Compare extension theme variables with web version
    - Verify primary, secondary, tertiary colors match
    - Verify flowchart configuration matches
    - Verify edge colors and cluster styling match
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 9.2 Verify theme variable format consistency
    - Verify theme variables are passed in correct format
    - Verify Mermaid configuration structure matches web version
    - _Requirements: 4.4_
  
  - [ ]* 9.3 Write property test for theme variable format
    - **Property 11: Theme Variable Format Consistency**
    - **Validates: Requirements 4.4**

- [x] 10. Integration Testing
  - [x] 10.1 Test theme detection on extension load
    - Load extension with light theme
    - Load extension with dark theme
    - Load extension with high-contrast theme
    - Verify correct theme is detected
    - _Requirements: 3.1_
  
  - [x] 10.2 Test theme change handling
    - Change VS Code theme from light to dark
    - Change VS Code theme from dark to light
    - Change VS Code theme to high-contrast
    - Verify diagram updates correctly
    - _Requirements: 1.2, 1.4, 3.2_
  
  - [x] 10.3 Test diagram rendering with different themes
    - Render various diagram types with light theme
    - Render various diagram types with dark theme
    - Render various diagram types with high-contrast theme
    - Verify all diagrams render correctly
    - _Requirements: 1.1, 1.3, 1.5_
  
  - [x] 10.4 Test zoom and pan state preservation
    - Apply zoom and pan to diagram
    - Change theme
    - Verify zoom and pan state is preserved
    - _Requirements: 1.2, 1.4_

- [x] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Documentation and Cleanup
  - [x] 12.1 Update extension documentation
    - Document theme support feature
    - Document supported themes (light, dark, high-contrast)
    - Document theme detection behavior
    - _Requirements: 1.1, 1.3, 1.5_
  
  - [x] 12.2 Add code comments and documentation
    - Document theme configuration module
    - Document theme detection logic
    - Document theme change handling
    - _Requirements: 4.1, 4.2_
  
  - [x] 12.3 Clean up debug logging
    - Remove or disable debug console logs
    - Keep error logging for troubleshooting
    - _Requirements: All_

