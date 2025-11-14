/**
 * Hook Registry for categorizing React hooks and third-party hooks
 * Used by the Hooks Analyzer to classify hook calls in components
 */

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
}

class HookRegistryImpl implements HookRegistry {
  private registry: Map<string, HookCategory>;

  constructor() {
    this.registry = new Map();
    this.initializeBuiltInHooks();
    this.initializeThirdPartyHooks();
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
   * @param hookName The name of the hook (e.g., 'useState', 'useSWR')
   * @returns The hook category or null if not registered
   */
  getHookCategory(hookName: string): HookCategory | null {
    return this.registry.get(hookName) ?? null;
  }

  /**
   * Register a custom hook with a category
   * @param hookName The name of the hook
   * @param category The category to assign to the hook
   */
  registerHook(hookName: string, category: HookCategory): void {
    this.registry.set(hookName, category);
  }
}

// Export singleton instance
export const hookRegistry: HookRegistry = new HookRegistryImpl();
