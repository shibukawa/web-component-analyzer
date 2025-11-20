/**
 * Framework detection utility for automatic framework identification
 * based on code analysis (imports and structure)
 */

export type Framework = 'react' | 'vue' | 'svelte';

export interface FrameworkDetectionResult {
  framework: Framework;
  confidence: number; // 0-1 scale
  reasons: string[];
}

/**
 * Detect framework from code by analyzing imports and structure
 * @param code - Source code to analyze
 * @returns Detected framework with confidence score
 */
export function detectFramework(code: string): FrameworkDetectionResult {
  const vueScore = calculateVueScore(code);
  const reactScore = calculateReactScore(code);
  const svelteScore = calculateSvelteScore(code);

  // Determine winner
  const scores = [
    { framework: 'vue' as Framework, score: vueScore },
    { framework: 'react' as Framework, score: reactScore },
    { framework: 'svelte' as Framework, score: svelteScore },
  ];

  scores.sort((a, b) => b.score.total - a.score.total);

  const winner = scores[0];
  const runnerUp = scores[1];

  // If no clear winner (scores too close or all zero), default to React
  if (winner.score.total === 0 || winner.score.total - runnerUp.score.total < 2) {
    return {
      framework: 'react',
      confidence: 0.5,
      reasons: ['No clear framework detected, defaulting to React'],
    };
  }

  // Calculate confidence (0-1 scale)
  const maxPossibleScore = 10;
  const confidence = Math.min(winner.score.total / maxPossibleScore, 1);

  return {
    framework: winner.framework,
    confidence,
    reasons: winner.score.reasons,
  };
}

interface ScoreResult {
  total: number;
  reasons: string[];
}

/**
 * Calculate Vue framework score based on imports and structure
 */
function calculateVueScore(code: string): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Check for Vue SFC structure (strong indicator)
  if (/<template[^>]*>/.test(code)) {
    score += 5;
    reasons.push('Vue SFC template tag detected');
  }

  if (/<script\s+setup[^>]*>/.test(code)) {
    score += 5;
    reasons.push('Vue script setup tag detected');
  }

  // Check for Vue-specific imports
  const vueImports = [
    { pattern: /from\s+['"]vue['"]/, score: 3, reason: 'Vue core import' },
    { pattern: /from\s+['"]@vue\//, score: 2, reason: 'Vue scoped package import' },
    { pattern: /from\s+['"]pinia['"]/, score: 2, reason: 'Pinia import' },
    { pattern: /from\s+['"]vue-router['"]/, score: 2, reason: 'Vue Router import' },
  ];

  for (const { pattern, score: points, reason } of vueImports) {
    if (pattern.test(code)) {
      score += points;
      reasons.push(reason);
    }
  }

  // Check for Vue Composition API patterns
  const vuePatterns = [
    { pattern: /\bref\s*\(/, score: 1, reason: 'ref() usage' },
    { pattern: /\breactive\s*\(/, score: 1, reason: 'reactive() usage' },
    { pattern: /\bcomputed\s*\(/, score: 1, reason: 'computed() usage' },
    { pattern: /\bdefineProps\s*[(<]/, score: 2, reason: 'defineProps usage' },
    { pattern: /\bdefineEmits\s*[(<]/, score: 2, reason: 'defineEmits usage' },
    { pattern: /\bonMounted\s*\(/, score: 1, reason: 'onMounted lifecycle hook' },
    { pattern: /\bwatch\s*\(/, score: 1, reason: 'watch() usage' },
    { pattern: /\bwatchEffect\s*\(/, score: 1, reason: 'watchEffect() usage' },
  ];

  for (const { pattern, score: points, reason } of vuePatterns) {
    if (pattern.test(code)) {
      score += points;
      reasons.push(reason);
      break; // Only count one pattern match to avoid over-scoring
    }
  }

  return { total: score, reasons };
}

/**
 * Calculate React framework score based on imports and structure
 */
function calculateReactScore(code: string): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Check for React-specific imports
  const reactImports = [
    { pattern: /from\s+['"]react['"]/, score: 3, reason: 'React core import' },
    { pattern: /from\s+['"]react-dom['"]/, score: 2, reason: 'React DOM import' },
    { pattern: /from\s+['"]@tanstack\/react-query['"]/, score: 2, reason: 'TanStack Query import' },
    { pattern: /from\s+['"]@tanstack\/react-router['"]/, score: 2, reason: 'TanStack Router import' },
    { pattern: /from\s+['"]react-router['"]/, score: 2, reason: 'React Router import' },
    { pattern: /from\s+['"]react-router-dom['"]/, score: 2, reason: 'React Router DOM import' },
    { pattern: /from\s+['"]react-hook-form['"]/, score: 2, reason: 'React Hook Form import' },
    { pattern: /from\s+['"]swr['"]/, score: 2, reason: 'SWR import' },
    { pattern: /from\s+['"]zustand['"]/, score: 2, reason: 'Zustand import' },
    { pattern: /from\s+['"]jotai['"]/, score: 2, reason: 'Jotai import' },
    { pattern: /from\s+['"]mobx['"]/, score: 2, reason: 'MobX import' },
    { pattern: /from\s+['"]@apollo\/client['"]/, score: 2, reason: 'Apollo Client import' },
    { pattern: /from\s+['"]@reduxjs\/toolkit['"]/, score: 2, reason: 'Redux Toolkit import' },
    { pattern: /from\s+['"]@trpc\/react-query['"]/, score: 2, reason: 'tRPC React import' },
  ];

  for (const { pattern, score: points, reason } of reactImports) {
    if (pattern.test(code)) {
      score += points;
      reasons.push(reason);
    }
  }

  // Check for React patterns
  const reactPatterns = [
    { pattern: /\buseState\s*\(/, score: 2, reason: 'useState hook' },
    { pattern: /\buseEffect\s*\(/, score: 2, reason: 'useEffect hook' },
    { pattern: /\buseContext\s*\(/, score: 1, reason: 'useContext hook' },
    { pattern: /\buseReducer\s*\(/, score: 1, reason: 'useReducer hook' },
    { pattern: /\buseMemo\s*\(/, score: 1, reason: 'useMemo hook' },
    { pattern: /\buseCallback\s*\(/, score: 1, reason: 'useCallback hook' },
    { pattern: /\buseRef\s*\(/, score: 1, reason: 'useRef hook' },
  ];

  for (const { pattern, score: points, reason } of reactPatterns) {
    if (pattern.test(code)) {
      score += points;
      reasons.push(reason);
      break; // Only count one pattern match to avoid over-scoring
    }
  }

  // Check for JSX patterns (not in template tags)
  const hasJSX = /<[A-Z][a-zA-Z0-9]*[\s>]/.test(code) || /return\s*\(?\s*</.test(code);
  if (hasJSX && !/<template[^>]*>/.test(code)) {
    score += 2;
    reasons.push('JSX syntax detected');
  }

  return { total: score, reasons };
}

/**
 * Calculate Svelte framework score based on imports and structure
 */
function calculateSvelteScore(code: string): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // Check for Svelte-specific imports
  const svelteImports = [
    { pattern: /from\s+['"]svelte['"]/, score: 3, reason: 'Svelte core import' },
    { pattern: /from\s+['"]svelte\/store['"]/, score: 2, reason: 'Svelte store import' },
    { pattern: /from\s+['"]svelte\/transition['"]/, score: 2, reason: 'Svelte transition import' },
    { pattern: /from\s+['"]svelte\/animate['"]/, score: 2, reason: 'Svelte animate import' },
  ];

  for (const { pattern, score: points, reason } of svelteImports) {
    if (pattern.test(code)) {
      score += points;
      reasons.push(reason);
    }
  }

  // Check for Svelte patterns
  const sveltePatterns = [
    { pattern: /\$:\s*\w+\s*=/, score: 2, reason: 'Svelte reactive statement' },
    { pattern: /\bonMount\s*\(/, score: 1, reason: 'onMount lifecycle' },
    { pattern: /\bwritable\s*\(/, score: 1, reason: 'writable store' },
    { pattern: /\breadable\s*\(/, score: 1, reason: 'readable store' },
    { pattern: /\bderived\s*\(/, score: 1, reason: 'derived store' },
  ];

  for (const { pattern, score: points, reason } of sveltePatterns) {
    if (pattern.test(code)) {
      score += points;
      reasons.push(reason);
      break; // Only count one pattern match to avoid over-scoring
    }
  }

  // Check for Svelte-specific syntax
  if (/<script[^>]*>/.test(code) && !/<script\s+setup[^>]*>/.test(code)) {
    // Has script tag but not Vue's script setup
    if (/{#if\s/.test(code) || /{#each\s/.test(code) || /{@html\s/.test(code)) {
      score += 3;
      reasons.push('Svelte template syntax detected');
    }
  }

  return { total: score, reasons };
}
