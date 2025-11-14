/**
 * Type definitions for TypeResolver (implementation in extension package)
 */

/**
 * Request for type information
 */
export interface TypeQueryRequest {
  filePath: string;
  variableName?: string;
  componentName?: string;
  propName?: string;
  line?: number;
  column?: number;
  position?: {
    line: number;
    character: number;
  };
}

/**
 * Response containing type information
 */
export interface TypeQueryResponse {
  typeString: string;
  isFunction: boolean;
}

/**
 * TypeResolver interface for querying type information
 * Implementation is VS Code-specific and lives in the extension package
 */
export interface TypeResolver {
  queryType(request: TypeQueryRequest): Promise<TypeQueryResponse | null>;
  resolveType(filePath: string, variableName: string, line?: number, column?: number): Promise<TypeQueryResponse | null>;
  resolveTypes(requests: TypeQueryRequest[]): Promise<Map<string, string>>;
}
