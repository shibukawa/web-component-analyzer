import './ErrorDisplay.css';

interface ErrorDisplayProps {
  error: string;
  type?: 'parse' | 'compression' | 'rendering' | 'network';
}

/**
 * Displays error messages in the visualization pane
 * Shows error type, details, and helpful suggestions
 */
export function ErrorDisplay({ error, type = 'parse' }: ErrorDisplayProps) {
  const getSuggestions = (errorType: string, errorMessage: string): string[] => {
    const suggestions: string[] = [];
    const errorLower = errorMessage.toLowerCase();
    
    switch (errorType) {
      case 'parse':
        suggestions.push('Check your component syntax. Make sure it\'s valid TypeScript/JSX code.');
        if (errorLower.includes('unexpected token') || errorLower.includes('syntax')) {
          suggestions.push('Look for missing brackets, parentheses, or semicolons');
          suggestions.push('Ensure JSX elements are properly closed');
        }
        if (errorLower.includes('export') || errorLower.includes('component')) {
          suggestions.push('Make sure your component is exported (export default or export function)');
        }
        suggestions.push('Try selecting a sample component to see a working example');
        break;
      case 'compression':
        suggestions.push('The shared URL may be corrupted. Try copying the link again.');
        suggestions.push('If the problem persists, the URL might be too long for your browser');
        break;
      case 'rendering':
        suggestions.push('The diagram could not be rendered. This may be due to complex component structure.');
        suggestions.push('Try simplifying your component or check the browser console for details');
        break;
      case 'network':
        suggestions.push('Check your internet connection and try again.');
        suggestions.push('If the problem persists, try refreshing the page');
        break;
      default:
        suggestions.push('Please check your code and try again.');
        suggestions.push('Select a sample component to see a working example');
    }
    
    return suggestions;
  };

  const getErrorTitle = (errorType: string): string => {
    switch (errorType) {
      case 'parse':
        return 'Parse Error';
      case 'compression':
        return 'Decompression Error';
      case 'rendering':
        return 'Rendering Error';
      case 'network':
        return 'Network Error';
      default:
        return 'Error';
    }
  };

  const suggestions = getSuggestions(type, error);
  
  return (
    <div className="error-display">
      <div className="error-icon">⚠️</div>
      <h3 className="error-title">{getErrorTitle(type)}</h3>
      <p className="error-message">{error}</p>
      
      <div className="error-suggestions">
        <strong>💡 Suggestions:</strong>
        <ul className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
      
      <div className="error-help">
        <p>
          <strong>Need more help?</strong> Check the browser console (F12) for detailed error information.
        </p>
      </div>
    </div>
  );
}
