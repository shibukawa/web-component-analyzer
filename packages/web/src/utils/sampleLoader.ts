/**
 * Sample loader utility for managing and accessing sample components
 */

import { 
  SampleComponent, 
  ALL_SAMPLES, 
  REACT_SAMPLES, 
  VUE_SAMPLES, 
  SVELTE_SAMPLES 
} from '../data/samples';

export type Framework = 'react' | 'vue' | 'svelte';

export interface SamplesByFramework {
  react: SampleComponent[];
  vue: SampleComponent[];
  svelte: SampleComponent[];
}

/**
 * Get all samples grouped by framework
 */
export function getSamplesByFramework(): SamplesByFramework {
  return {
    react: REACT_SAMPLES,
    vue: VUE_SAMPLES,
    svelte: SVELTE_SAMPLES
  };
}

/**
 * Get all samples as a flat array
 */
export function getAllSamples(): SampleComponent[] {
  return ALL_SAMPLES;
}

/**
 * Get samples for a specific framework
 */
export function getSamplesForFramework(framework: Framework): SampleComponent[] {
  switch (framework) {
    case 'react':
      return REACT_SAMPLES;
    case 'vue':
      return VUE_SAMPLES;
    case 'svelte':
      return SVELTE_SAMPLES;
    default:
      return [];
  }
}

/**
 * Get a sample by its ID
 */
export function getSampleById(id: string): SampleComponent | undefined {
  return ALL_SAMPLES.find(sample => sample.id === id);
}

/**
 * Get the first sample for a given framework (useful for defaults)
 */
export function getDefaultSampleForFramework(framework: Framework): SampleComponent | undefined {
  const samples = getSamplesForFramework(framework);
  return samples.length > 0 ? samples[0] : undefined;
}

/**
 * Get the first sample overall (useful for initial load)
 */
export function getDefaultSample(): SampleComponent {
  return REACT_SAMPLES[0];
}

/**
 * Search samples by name or description
 */
export function searchSamples(query: string): SampleComponent[] {
  const lowerQuery = query.toLowerCase();
  return ALL_SAMPLES.filter(sample => 
    sample.name.toLowerCase().includes(lowerQuery) ||
    sample.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get count of samples per framework
 */
export function getSampleCounts(): Record<Framework, number> {
  return {
    react: REACT_SAMPLES.length,
    vue: VUE_SAMPLES.length,
    svelte: SVELTE_SAMPLES.length
  };
}
