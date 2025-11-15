/**
 * Import Detector for identifying third-party library usage
 * 
 * This module analyzes import statements in React components to detect which
 * third-party libraries are being used, enabling the analyzer to apply
 * appropriate library adapters for accurate DFD generation.
 */

import * as swc from '@swc/core';
import { ImportInfo, ImportedItem } from '../utils/library-adapter-types';

/**
 * Interface for detecting and analyzing import statements
 */
export interface ImportDetector {
  /**
   * Detect and extract all import statements from a module
   * @param module - The SWC module to analyze
   * @returns Array of ImportInfo objects describing all imports
   */
  detectImports(module: swc.Module): ImportInfo[];

  /**
   * Get list of active third-party libraries based on detected imports
   * @param imports - Array of ImportInfo from detectImports()
   * @param registeredLibraries - Set of library names that have registered adapters
   * @returns Array of library names that are both imported and have adapters
   */
  getActiveLibraries(imports: ImportInfo[], registeredLibraries: Set<string>): string[];
}

/**
 * Implementation of ImportDetector
 */
export class SWCImportDetector implements ImportDetector {
  /**
   * Detect and extract all import statements from a module
   */
  detectImports(module: swc.Module): ImportInfo[] {
    const imports: ImportInfo[] = [];

    console.log('📦 Import Detector: Starting import detection');
    console.log('📦 Module body items:', module.body.length);

    for (const item of module.body) {
      if (item.type === 'ImportDeclaration') {
        const importInfo = this.extractImportInfo(item);
        if (importInfo) {
          imports.push(importInfo);
          console.log(`📦 Detected import from: ${importInfo.source}`);
          if (importInfo.isNamespaceImport) {
            console.log(`📦   -> Namespace import as: ${importInfo.namespace}`);
          } else {
            console.log(`📦   -> Named imports:`, importInfo.imports.map(i => 
              i.alias ? `${i.name} as ${i.alias}` : i.name
            ));
          }
        }
      }
    }

    console.log(`📦 Total imports detected: ${imports.length}`);
    return imports;
  }

  /**
   * Get list of active third-party libraries
   */
  getActiveLibraries(imports: ImportInfo[], registeredLibraries: Set<string>): string[] {
    const activeLibraries: string[] = [];

    console.log('📦 ========================================');
    console.log('📦 Checking for active libraries');
    console.log('📦 Total imports detected:', imports.length);
    console.log('📦 Registered libraries:', Array.from(registeredLibraries));

    for (const importInfo of imports) {
      console.log(`📦 Checking import: ${importInfo.source}`);
      // Check if this import source matches any registered library
      if (registeredLibraries.has(importInfo.source)) {
        activeLibraries.push(importInfo.source);
        console.log(`📦   ✅ Active library: ${importInfo.source}`);
      } else {
        console.log(`📦   ⏭️  Skipping unregistered: ${importInfo.source}`);
      }
    }

    console.log(`📦 ========================================`);
    console.log(`📦 Total active libraries: ${activeLibraries.length}`);
    if (activeLibraries.length > 0) {
      console.log(`📦 Active libraries list:`, activeLibraries);
    }
    return activeLibraries;
  }

  /**
   * Extract import information from an ImportDeclaration node
   */
  private extractImportInfo(importDecl: swc.ImportDeclaration): ImportInfo | null {
    const source = importDecl.source.value;
    
    // Check for namespace import: import * as Name from 'library'
    const namespaceSpecifier = importDecl.specifiers.find(
      spec => spec.type === 'ImportNamespaceSpecifier'
    ) as swc.ImportNamespaceSpecifier | undefined;

    if (namespaceSpecifier) {
      return {
        source,
        imports: [],
        isNamespaceImport: true,
        namespace: namespaceSpecifier.local.value,
      };
    }

    // Extract named and default imports
    const imports: ImportedItem[] = [];

    for (const specifier of importDecl.specifiers) {
      if (specifier.type === 'ImportDefaultSpecifier') {
        // Default import: import React from 'react'
        imports.push({
          name: 'default',
          alias: specifier.local.value,
          isDefault: true,
        });
      } else if (specifier.type === 'ImportSpecifier') {
        // Named import: import { useState } from 'react'
        // or aliased: import { useState as useStateHook } from 'react'
        const importedName = specifier.imported 
          ? (specifier.imported.type === 'Identifier' ? specifier.imported.value : specifier.imported.value)
          : specifier.local.value;
        
        const localName = specifier.local.value;
        const hasAlias = importedName !== localName;

        imports.push({
          name: importedName,
          alias: hasAlias ? localName : undefined,
          isDefault: false,
        });
      }
    }

    return {
      source,
      imports,
      isNamespaceImport: false,
    };
  }
}

/**
 * Create a new Import Detector instance
 */
export function createImportDetector(): ImportDetector {
  return new SWCImportDetector();
}

