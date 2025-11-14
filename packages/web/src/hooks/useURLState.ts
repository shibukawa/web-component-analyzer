import { useEffect, useState } from 'react';
import { compressAndEncode, decodeAndDecompress } from '../utils/compression';

/**
 * Shared state interface for URL encoding
 */
export interface SharedState {
  code: string;
  framework?: 'react' | 'vue' | 'svelte';
}

/**
 * Hook for managing URL state with compression and encoding
 * Reads query parameters on mount and provides functions to generate shareable URLs
 */
export function useURLState() {
  const [initialState, setInitialState] = useState<SharedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Read and decode URL parameters on mount
  useEffect(() => {
    const loadFromURL = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const encodedCode = params.get('code');
        const framework = params.get('framework') as 'react' | 'vue' | 'svelte' | null;

        if (encodedCode) {
          const code = await decodeAndDecompress(encodedCode);
          setInitialState({
            code,
            framework: framework || undefined
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared code');
        console.error('Failed to decode URL state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromURL();
  }, []);

  /**
   * Generates a shareable URL with encoded code
   * @param state - The state to encode in the URL
   * @returns Promise resolving to the shareable URL
   */
  const generateShareableURL = async (state: SharedState): Promise<string> => {
    try {
      const encodedCode = await compressAndEncode(state.code);
      const url = new URL(window.location.href);
      
      // Clear existing query parameters
      url.search = '';
      
      // Add encoded code
      url.searchParams.set('code', encodedCode);
      
      // Add framework if specified
      if (state.framework) {
        url.searchParams.set('framework', state.framework);
      }

      return url.toString();
    } catch (err) {
      throw new Error(`Failed to generate shareable URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  /**
   * Updates the browser URL without reloading the page
   * @param state - The state to encode in the URL
   */
  const updateURL = async (state: SharedState): Promise<void> => {
    try {
      const url = await generateShareableURL(state);
      window.history.pushState({}, '', url);
    } catch (err) {
      throw new Error(`Failed to update URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return {
    initialState,
    error,
    isLoading,
    generateShareableURL,
    updateURL
  };
}
