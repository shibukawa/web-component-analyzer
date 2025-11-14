import { SampleComponent } from '../data/samples';
import './SampleSelector.css';

interface SampleSelectorProps {
  samples: SampleComponent[];
  currentSampleId?: string;
  onSelect: (sample: SampleComponent) => void;
}

/**
 * Dropdown menu for selecting sample components
 * Groups samples by framework and shows current framework indicator
 */
export function SampleSelector({ samples, currentSampleId, onSelect }: SampleSelectorProps) {
  // Group samples by framework
  const groupedSamples = samples.reduce((acc, sample) => {
    if (!acc[sample.framework]) {
      acc[sample.framework] = [];
    }
    acc[sample.framework].push(sample);
    return acc;
  }, {} as Record<string, SampleComponent[]>);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sampleId = event.target.value;
    const sample = samples.find(s => s.id === sampleId);
    if (sample) {
      onSelect(sample);
    }
  };

  const currentSample = samples.find(s => s.id === currentSampleId);
  const frameworkLabel = currentSample?.framework.toUpperCase() || 'REACT';

  return (
    <div className="sample-selector">
      <label htmlFor="sample-select" className="sample-selector-label">
        <span className="framework-badge">{frameworkLabel}</span>
        <span>Sample Component:</span>
      </label>
      <select
        id="sample-select"
        className="sample-selector-dropdown"
        value={currentSampleId || ''}
        onChange={handleChange}
        title="Choose a sample component to load into the editor"
      >
        <option value="">-- Select a sample to get started --</option>
        {Object.entries(groupedSamples).map(([framework, frameworkSamples]) => (
          <optgroup key={framework} label={framework.toUpperCase()}>
            {frameworkSamples.map(sample => (
              <option key={sample.id} value={sample.id}>
                {sample.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {currentSample && (
        <p className="sample-description">{currentSample.description}</p>
      )}
    </div>
  );
}
