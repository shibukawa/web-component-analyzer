import { useState } from 'react';
import { compressAndEncode } from '../utils/compression';
import './ShareButton.css';

interface ShareButtonProps {
  code: string;
  framework?: string;
}

type ToastType = 'success' | 'error';

/**
 * Button to generate shareable URLs with compressed code
 * Copies the URL to clipboard and shows toast notification
 */
export function ShareButton({ code, framework }: ShareButtonProps) {
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleShare = async () => {
    if (!code || code.trim().length === 0) {
      showToast('error', 'No code to share');
      return;
    }

    setIsGenerating(true);

    try {
      // Compress and encode the code
      const encoded = await compressAndEncode(code);
      
      // Generate shareable URL
      const url = new URL(window.location.href);
      url.searchParams.set('code', encoded);
      if (framework) {
        url.searchParams.set('framework', framework);
      }
      
      const shareableUrl = url.toString();

      // Copy to clipboard
      await navigator.clipboard.writeText(shareableUrl);
      
      showToast('success', 'Link copied to clipboard!');
    } catch (error) {
      console.error('Share error:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <button
        className="share-button"
        onClick={handleShare}
        disabled={isGenerating}
        title="Share this component"
      >
        {isGenerating ? '⏳' : '🔗'} Share
      </button>
      
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
