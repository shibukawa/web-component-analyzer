import { useState } from 'react';
import './CopyButton.css';

interface CopyButtonProps {
  code: string;
}

export function CopyButton({ code }: CopyButtonProps) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setNotificationMessage('Mermaid code copied!');
      setShowNotification(true);
      
      // Hide notification after 2 seconds
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setNotificationMessage('Failed to copy');
      setShowNotification(true);
      
      setTimeout(() => {
        setShowNotification(false);
      }, 2000);
    }
  };

  return (
    <>
      <button
        className="copy-button"
        onClick={handleCopy}
        title="Copy Mermaid Code"
        aria-label="Copy Mermaid code to clipboard"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      
      {showNotification && (
        <div className="copy-notification">
          {notificationMessage}
        </div>
      )}
    </>
  );
}
