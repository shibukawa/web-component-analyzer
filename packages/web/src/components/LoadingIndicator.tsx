import './LoadingIndicator.css';

interface LoadingIndicatorProps {
  message?: string;
}

/**
 * Loading indicator with spinner
 * Shows loading state during component analysis
 */
export function LoadingIndicator({ message = 'Analyzing component...' }: LoadingIndicatorProps) {
  return (
    <div className="loading-indicator">
      <div className="spinner"></div>
      <p className="loading-message">{message}</p>
    </div>
  );
}
