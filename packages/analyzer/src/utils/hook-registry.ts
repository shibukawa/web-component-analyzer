/**
 * Hook Registry for categorizing React hooks and third-party hooks
 * Used by the Hooks Analyzer to classify hook calls in components
 */

import { LibraryAdapter, HookAdapter } from './library-adapter-types.js';

export type HookCategory =
  | 'state'
  | 'effect'
  | 'context'
  | 'data-fetching'
  | 'state-management'
  | 'form'
  | 'routing'
  | 'server-action';

export interface HookRegistry {
  getHookCategory(hookName: string): HookCategory | null;
  registerHook(hookName: string, category: HookCategory): void;
  
  // Library adapter methods
  registerLibraryAdapter(adapter: LibraryAdapter): void;
  getLibraryAdapter(libraryName: string, hookName: string): HookAdapter | null;
  activateLibrary(libraryName: string): void;
  deactivateLibrary(libraryName: string): void;
  getActiveLibraries(): string[];
}

class HookRegistryImpl implements HookRegistry {
  private registry: Map<string, HookCategory>;
  private libraryAdapters: Map<string, LibraryAdapter>;
  private hookAdapterLookup: Map<string, Map<string, HookAdapter>>;
  private activeLibraries: Set<string>;
  private adaptersLoaded: boolean = false;

  constructor() {
    this.registry = new Map();
    this.libraryAdapters = new Map();
    this.hookAdapterLookup = new Map();
    this.activeLibraries = new Set();
    this.initializeBuiltInHooks();
    this.initializeThirdPartyHooks();
  }

  /**
   * Ensure library adapters are loaded (lazy initialization)
   */
  private ensureAdaptersLoaded(): void {
    if (this.adaptersLoaded) {
      return;
    }

    try {
      console.log('📚 HookRegistry: Loading default library adapters (lazy init)...');
      // Use dynamic import to avoid circular dependency
      const { loadDefaultLibraryAdapters } = require('./library-adapters');
      const config = loadDefaultLibraryAdapters();
      console.log(`📚 HookRegistry: Loaded ${config.libraries.length} library adapters`);
      
      for (const adapter of config.libraries) {
        console.log(`📚 HookRegistry: Registering adapter for ${adapter.libraryName}`);
        this.registerLibraryAdapter(adapter);
      }
      
      this.adaptersLoaded = true;
      console.log('📚 HookRegistry: ✅ All adapters registered successfully');
    } catch (error) {
      console.error('📚 HookRegistry: ❌ Failed to load default adapters:', error);
      this.adaptersLoaded = true; // Mark as loaded to avoid repeated attempts
    }
  }

  /**
   * Register React built-in hooks
   */
  private initializeBuiltInHooks(): void {
    // State hooks
    this.registry.set('useState', 'state');
    this.registry.set('useReducer', 'state');

    // Effect hooks
    this.registry.set('useEffect', 'effect');
    this.registry.set('useLayoutEffect', 'effect');
    this.registry.set('useInsertionEffect', 'effect');

    // Context hook
    this.registry.set('useContext', 'context');

    // Memoization hooks (treated as effects for DFD purposes)
    this.registry.set('useCallback', 'effect');
    this.registry.set('useMemo', 'effect');

    // Ref hooks
    this.registry.set('useRef', 'state');
    this.registry.set('useImperativeHandle', 'effect');

    // Other React hooks
    this.registry.set('useDebugValue', 'effect');
    this.registry.set('useDeferredValue', 'state');
    this.registry.set('useTransition', 'state');
    this.registry.set('useId', 'state');
    this.registry.set('useSyncExternalStore', 'state');
  }

  /**
   * Register third-party hooks from popular libraries
   */
  private initializeThirdPartyHooks(): void {
    // Data Fetching - SWR
    this.registry.set('useSWR', 'data-fetching');
    this.registry.set('useSWRConfig', 'data-fetching');
    this.registry.set('useSWRInfinite', 'data-fetching');
    this.registry.set('useSWRMutation', 'data-fetching');

    // Data Fetching - TanStack Query (React Query)
    this.registry.set('useQuery', 'data-fetching');
    this.registry.set('useMutation', 'data-fetching');
    this.registry.set('useQueries', 'data-fetching');
    this.registry.set('useInfiniteQuery', 'data-fetching');
    this.registry.set('useQueryClient', 'data-fetching');
    this.registry.set('useIsFetching', 'data-fetching');
    this.registry.set('useIsMutating', 'data-fetching');

    // Data Fetching - Apollo Client
    this.registry.set('useApolloClient', 'data-fetching');
    this.registry.set('useSubscription', 'data-fetching');
    this.registry.set('useLazyQuery', 'data-fetching');

    // Data Fetching - RTK Query
    this.registry.set('useGetQuery', 'data-fetching');
    this.registry.set('useLazyGetQuery', 'data-fetching');

    // State Management - Jotai
    this.registry.set('useAtom', 'state-management');
    this.registry.set('useAtomValue', 'state-management');
    this.registry.set('useSetAtom', 'state-management');
    this.registry.set('useAtomCallback', 'state-management');
    this.registry.set('useHydrateAtoms', 'state-management');

    // State Management - Zustand
    this.registry.set('useStore', 'state-management');
    this.registry.set('useStoreWithEqualityFn', 'state-management');

    // State Management - Redux
    this.registry.set('useSelector', 'state-management');
    this.registry.set('useDispatch', 'state-management');
    this.registry.set('useStore', 'state-management');

    // State Management - Recoil
    this.registry.set('useRecoilState', 'state-management');
    this.registry.set('useRecoilValue', 'state-management');
    this.registry.set('useSetRecoilState', 'state-management');
    this.registry.set('useResetRecoilState', 'state-management');
    this.registry.set('useRecoilCallback', 'state-management');

    // State Management - MobX
    this.registry.set('useObserver', 'state-management');
    this.registry.set('useLocalObservable', 'state-management');

    // Form Management - React Hook Form
    this.registry.set('useForm', 'form');
    this.registry.set('useController', 'form');
    this.registry.set('useWatch', 'form');
    this.registry.set('useFormContext', 'form');
    this.registry.set('useFormState', 'form');
    this.registry.set('useFieldArray', 'form');

    // Form Management - Formik
    this.registry.set('useFormik', 'form');
    this.registry.set('useField', 'form');
    this.registry.set('useFormikContext', 'form');

    // Routing - React Router
    this.registry.set('useNavigate', 'routing');
    this.registry.set('useParams', 'routing');
    this.registry.set('useLocation', 'routing');
    this.registry.set('useSearchParams', 'routing');
    this.registry.set('useMatch', 'routing');
    this.registry.set('useRoutes', 'routing');
    this.registry.set('useNavigationType', 'routing');
    this.registry.set('useOutlet', 'routing');
    this.registry.set('useOutletContext', 'routing');
    this.registry.set('useHref', 'routing');
    this.registry.set('useLinkClickHandler', 'routing');
    this.registry.set('useInRouterContext', 'routing');
    this.registry.set('useResolvedPath', 'routing');

    // Routing - TanStack Router
    this.registry.set('useRouter', 'routing');
    this.registry.set('useRouterState', 'routing');
    this.registry.set('useMatches', 'routing');
    this.registry.set('useNavigate', 'routing');
    this.registry.set('useSearch', 'routing');

    // Server Actions - Next.js
    this.registry.set('useFormState', 'server-action');
    this.registry.set('useFormStatus', 'server-action');
  }

  /**
   * Get the category of a hook by its name
   * 
   * This method prioritizes adapter-based classification over category-based classification.
   * If the hook is found in any active library adapter, it returns the appropriate category
   * based on the adapter's DFD element types. Otherwise, it falls back to the category registry.
   * 
   * @param hookName The name of the hook (e.g., 'useState', 'useSWR')
   * @returns The hook category or null if not registered
   */
  getHookCategory(hookName: string): HookCategory | null {
    // First, check if this hook exists in any active library adapter
    for (const libraryName of this.activeLibraries) {
      const adapter = this.getLibraryAdapter(libraryName, hookName);
      if (adapter) {
        // Hook found in an active library adapter
        // Derive category from the adapter's return pattern
        return this.deriveCategoryFromAdapter(adapter);
      }
    }

    // Fall back to category-based classification
    return this.registry.get(hookName) ?? null;
  }

  /**
   * Derive a hook category from a library adapter
   * 
   * This method analyzes the adapter's return pattern to determine the most appropriate
   * category. It prioritizes based on the DFD element types in the mappings.
   * 
   * @param adapter The hook adapter
   * @returns The derived hook category
   */
  private deriveCategoryFromAdapter(adapter: HookAdapter): HookCategory {
    const mappings = adapter.returnPattern.mappings;

    // Check for data fetching patterns (external-entity-input with loading/error states)
    const hasExternalInput = mappings.some(m => m.dfdElementType === 'external-entity-input');
    const hasLoadingState = mappings.some(m => m.metadata?.isLoading);
    const hasErrorState = mappings.some(m => m.metadata?.isError);
    
    if (hasExternalInput && (hasLoadingState || hasErrorState)) {
      return 'data-fetching';
    }

    // Check for mutation patterns (process with mutation metadata)
    const hasMutation = mappings.some(m => m.metadata?.isMutation);
    if (hasMutation) {
      return 'data-fetching';
    }

    // Check for state management patterns (data-store elements)
    const hasDataStore = mappings.some(m => m.dfdElementType === 'data-store');
    if (hasDataStore) {
      return 'state-management';
    }

    // Check for process-heavy patterns
    const hasProcess = mappings.some(m => m.dfdElementType === 'process');
    if (hasProcess) {
      return 'effect';
    }

    // Default to state-management for external inputs
    if (hasExternalInput) {
      return 'state-management';
    }

    // Default fallback
    return 'state';
  }

  /**
   * Register a custom hook with a category
   * @param hookName The name of the hook
   * @param category The category to assign to the hook
   */
  registerHook(hookName: string, category: HookCategory): void {
    this.registry.set(hookName, category);
  }

  /**
   * Register a library adapter
   * @param adapter The library adapter to register
   */
  registerLibraryAdapter(adapter: LibraryAdapter): void {
    // Store the adapter by library name
    this.libraryAdapters.set(adapter.libraryName, adapter);

    // Build hook lookup map for fast access
    const hookMap = new Map<string, HookAdapter>();
    adapter.hooks.forEach(hook => {
      hookMap.set(hook.hookName, hook);
    });
    
    // Register under the main library name
    this.hookAdapterLookup.set(adapter.libraryName, hookMap);
    
    // Also register under each package pattern
    // This allows imports like 'swr/mutation' to find adapters registered under 'swr'
    if (adapter.packagePatterns && adapter.packagePatterns.length > 0) {
      adapter.packagePatterns.forEach(pattern => {
        if (pattern !== adapter.libraryName) {
          console.log(`📚 HookRegistry: Also registering ${adapter.libraryName} hooks under pattern: ${pattern}`);
          this.hookAdapterLookup.set(pattern, hookMap);
        }
      });
    }
  }

  /**
   * Get a library adapter for a specific hook
   * @param libraryName The name of the library
   * @param hookName The name of the hook
   * @returns The hook adapter or null if not found
   */
  getLibraryAdapter(libraryName: string, hookName: string): HookAdapter | null {
    // Ensure adapters are loaded before lookup
    this.ensureAdaptersLoaded();
    
    console.log(`📚 HookRegistry.getLibraryAdapter: ${libraryName} / ${hookName}`);
    const hookMap = this.hookAdapterLookup.get(libraryName);
    if (!hookMap) {
      console.log(`📚   ⚠️ No hook map found for library: ${libraryName}`);
      console.log(`📚   Available libraries:`, Array.from(this.hookAdapterLookup.keys()));
      return null;
    }
    const adapter = hookMap.get(hookName) || null;
    if (adapter) {
      console.log(`📚   ✅ Found adapter for ${hookName}`);
    } else {
      console.log(`📚   ⚠️ No adapter found for ${hookName}`);
      console.log(`📚   Available hooks in ${libraryName}:`, Array.from(hookMap.keys()));
    }
    return adapter;
  }

  /**
   * Activate a library for the current analysis
   * @param libraryName The name of the library to activate
   */
  activateLibrary(libraryName: string): void {
    this.activeLibraries.add(libraryName);
  }

  /**
   * Deactivate a library
   * @param libraryName The name of the library to deactivate
   */
  deactivateLibrary(libraryName: string): void {
    this.activeLibraries.delete(libraryName);
  }

  /**
   * Get the list of currently active libraries
   * @returns Array of active library names
   */
  getActiveLibraries(): string[] {
    return Array.from(this.activeLibraries);
  }
}

// Export singleton instance
export const hookRegistry: HookRegistry = new HookRegistryImpl();
