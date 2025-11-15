/**
 * Type definitions for third-party library adapter system
 * 
 * This module defines the core interfaces and types for the library adapter system,
 * which enables the analyzer to recognize and properly visualize hooks from popular
 * React third-party libraries.
 */

/**
 * Information about an imported item from a library
 */
export interface ImportedItem {
  /** Original name in the library */
  name: string;
  /** Local alias if renamed (e.g., import { useSWR as useData }) */
  alias?: string;
  /** True for default imports (e.g., import React from 'react') */
  isDefault: boolean;
}

/**
 * Information about an import statement
 */
export interface ImportInfo {
  /** Source library name (e.g., 'swr', 'react-router-dom', '@tanstack/react-query') */
  source: string;
  /** List of imported items from this library */
  imports: ImportedItem[];
  /** True for namespace imports (e.g., import * as SWR from 'swr') */
  isNamespaceImport: boolean;
  /** The namespace identifier if isNamespaceImport is true */
  namespace?: string;
}

/**
 * DFD element types that can be generated from hook return values
 */
export type DFDElementType = 'external-entity-input' | 'data-store' | 'process';

/**
 * Metadata associated with a return value mapping
 */
export interface ReturnValueMetadata {
  /** Indicates this is a loading state */
  isLoading?: boolean;
  /** Indicates this is an error state */
  isError?: boolean;
  /** Indicates this is a mutation function */
  isMutation?: boolean;
  /** Indicates this is a refetch function */
  isRefetch?: boolean;
  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Mapping of a hook return value to a DFD element
 */
export interface ReturnValueMapping {
  /** Variable name for array destructuring patterns (e.g., '0', '1', '2') */
  variableName?: string;
  /** Property name for object destructuring patterns (e.g., 'data', 'error') */
  propertyName?: string;
  /** The type of DFD element this return value should generate */
  dfdElementType: DFDElementType;
  /** Optional metadata for the DFD element */
  metadata?: ReturnValueMetadata;
}

/**
 * Pattern describing how a hook's return value should be destructured
 */
export interface ReturnValuePattern {
  /** Type of return value pattern */
  type: 'object' | 'array' | 'single';
  /** Mappings from return value parts to DFD elements */
  mappings: ReturnValueMapping[];
}

/**
 * Pattern describing data flow between hook return values
 */
export interface DataFlowPattern {
  /** Source variable or property name */
  from: string;
  /** Target variable or property name */
  to: string;
  /** Optional condition for the flow */
  condition?: string;
}

/**
 * Adapter configuration for a specific hook from a library
 */
export interface HookAdapter {
  /** Name of the hook (e.g., 'useSWR', 'useQuery') */
  hookName: string;
  /** Pattern describing the hook's return value structure */
  returnPattern: ReturnValuePattern;
  /** Optional data flow patterns between return values */
  dataFlows?: DataFlowPattern[];
}

/**
 * Adapter configuration for a third-party library
 */
export interface LibraryAdapter {
  /** Name of the library (e.g., 'swr', '@tanstack/react-query') */
  libraryName: string;
  /** Alternative package names that should match this library */
  packagePatterns: string[];
  /** Hook adapters for this library */
  hooks: HookAdapter[];
}

/**
 * Configuration schema for library adapters
 */
export interface LibraryAdapterConfig {
  /** List of library adapters */
  libraries: LibraryAdapter[];
}

/**
 * User configuration for customizing library adapters
 */
export interface UserLibraryAdapterConfig {
  /** Extend from default configuration */
  extends?: 'default';
  /** Override specific library adapters */
  overrides?: Record<string, Partial<LibraryAdapter>>;
  /** Add custom library adapters */
  custom?: LibraryAdapter[];
  /** List of library names to disable */
  disabled?: string[];
}
