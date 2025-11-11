import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create media directory
mkdirSync('media', { recursive: true });

// Copy Mermaid JS
const mermaidBasePath = join(__dirname, 'node_modules', 'mermaid', 'dist');

try {
  copyFileSync(
    join(mermaidBasePath, 'mermaid.min.js'),
    'media/mermaid.min.js'
  );
  console.log('✓ Copied Mermaid resources');
} catch (error) {
  console.error('Failed to copy Mermaid resources:', error.message);
  process.exit(1);
}

console.log('✓ Webview resources bundled successfully');
