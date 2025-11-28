import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Create media directory
mkdirSync('media', { recursive: true });

// Resolve Mermaid JS path (works with hoisted or local node_modules)
function resolveMermaidPath() {
  const candidates = [
    () => require.resolve('mermaid/dist/mermaid.min.js'),
    () => join(__dirname, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js'),
    () => join(__dirname, '..', '..', 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
  ];

  for (const candidate of candidates) {
    try {
      const result = candidate();
      if (existsSync(result)) {
        return result;
      }
    } catch (error) {
      if (error?.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  throw new Error('Unable to locate mermaid/dist/mermaid.min.js');
}

const mermaidSourcePath = resolveMermaidPath();

copyFileSync(mermaidSourcePath, 'media/mermaid.min.js');

console.log('✓ Copied Mermaid resources');

console.log('✓ Webview resources bundled successfully');
