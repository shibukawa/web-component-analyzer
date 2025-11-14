import './ZoomControls.css';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  scale: number;
}

export function ZoomControls({ onZoomIn, onZoomOut, onReset, scale }: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
      <button
        className="zoom-control-button"
        onClick={onZoomIn}
        title="Zoom In"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        className="zoom-control-button"
        onClick={onReset}
        title="Reset Zoom"
        aria-label="Reset zoom"
      >
        ⊙
      </button>
      <button
        className="zoom-control-button"
        onClick={onZoomOut}
        title="Zoom Out"
        aria-label="Zoom out"
      >
        −
      </button>
      <div className="zoom-level" title={`Zoom: ${Math.round(scale * 100)}%`}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
