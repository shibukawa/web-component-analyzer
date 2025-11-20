import { Framework } from '../services/analyzer';
import './FrameworkSelector.css';

interface FrameworkSelectorProps {
  framework?: Framework;
  detectedFramework?: Framework;
  detectionConfidence?: number;
  onChange: (framework: Framework | undefined) => void;
}

/**
 * Framework selector with auto-detection indicator
 * Shows detected framework and allows manual override
 */
export function FrameworkSelector({
  framework,
  detectedFramework,
  detectionConfidence,
  onChange
}: FrameworkSelectorProps) {
  const isAutoDetect = framework === undefined;
  const effectiveFramework = framework || detectedFramework || 'react';
  
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'auto') {
      onChange(undefined);
    } else {
      onChange(value as Framework);
    }
  };

  const getDetectionLabel = () => {
    if (!isAutoDetect) {
      return 'Manual';
    }
    if (detectedFramework && detectionConfidence !== undefined) {
      const confidencePercent = Math.round(detectionConfidence * 100);
      return `Auto-detected: ${detectedFramework.charAt(0).toUpperCase() + detectedFramework.slice(1)} (${confidencePercent}%)`;
    }
    return 'Auto-detect';
  };

  return (
    <div className="framework-selector">
      <label htmlFor="framework-select" className="framework-selector-label">
        <span className="framework-badge" data-framework={effectiveFramework}>
          {effectiveFramework.toUpperCase()}
        </span>
        <span>Framework:</span>
      </label>
      <select
        id="framework-select"
        className="framework-selector-dropdown"
        value={isAutoDetect ? 'auto' : framework}
        onChange={handleChange}
        title="Select framework or use auto-detection"
      >
        <option value="auto">Auto-detect</option>
        <option value="react">React</option>
        <option value="vue">Vue</option>
        <option value="svelte" disabled>Svelte</option>
      </select>
      <span className="detection-status" data-auto={isAutoDetect}>
        {getDetectionLabel()}
      </span>
    </div>
  );
}
