import * as vscode from 'vscode';

/**
 * Generator for webview HTML content
 */
export class HTMLContentGenerator {
  constructor(
    private readonly context: vscode.ExtensionContext
  ) {}

  /**
   * Generate complete HTML content for the webview
   */
  generateHTML(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string {
    // Get URIs for webview resources
    const mermaidJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'media', 'mermaid.min.js')
    );

    // Generate nonce for CSP
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'none'; 
                 script-src ${webview.cspSource} 'nonce-${nonce}'; 
                 style-src ${webview.cspSource} 'unsafe-inline'; 
                 img-src ${webview.cspSource} https: data:; 
                 font-src ${webview.cspSource};">
  <title>Component DFD</title>
  <style>
    ${this.getStyles()}
  </style>
</head>
<body>
  <div id="mermaid-container"></div>
  <div class="zoom-controls">
    <button id="zoom-in" title="Zoom In">+</button>
    <button id="zoom-out" title="Zoom Out">−</button>
    <button id="zoom-reset" title="Reset Zoom">⊙</button>
    <button id="copy-mermaid" title="Copy Mermaid Source">📋</button>
  </div>
  <div id="error-container" class="error-container hidden">
    <div class="error-icon">⚠️</div>
    <div class="error-title">Failed to Generate DFD</div>
    <div class="error-message" id="error-message"></div>
    <div class="error-actions">
      <button id="retry-button" onclick="retry()">Retry</button>
    </div>
  </div>
  
  <script src="${mermaidJsUri}"></script>
  <script nonce="${nonce}">
    ${this.getWebviewScript()}
  </script>
</body>
</html>`;
  }

  /**
   * Generate error display HTML
   */
  generateErrorHTML(errorMessage: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DFD Error</title>
  <style>
    ${this.getStyles()}
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">⚠️</div>
    <div class="error-title">Failed to Generate DFD</div>
    <div class="error-message">${this.escapeHtml(errorMessage)}</div>
  </div>
</body>
</html>`;
  }

  /**
   * Get CSS styles for the webview
   */
  private getStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        overflow: hidden;
      }

      #mermaid-container {
        width: 100vw;
        height: 100vh;
        position: absolute;
        top: 0;
        left: 0;
        overflow: hidden;
        background-color: var(--vscode-editor-background);
        cursor: grab;
      }
      
      #mermaid-container svg {
        min-width: 100%;
        min-height: 100%;
      }
      
      /* Zoom controls */
      .zoom-controls {
        position: fixed;
        bottom: 20px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1000;
      }
      
      .zoom-controls button {
        width: 40px;
        height: 40px;
        border: none;
        border-radius: 4px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .zoom-controls button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100vh;
        padding: 40px;
        text-align: center;
      }

      .error-container.hidden {
        display: none;
      }

      .error-icon {
        font-size: 64px;
        margin-bottom: 20px;
      }

      .error-title {
        font-size: 24px;
        font-weight: 600;
        color: var(--vscode-errorForeground);
        margin-bottom: 16px;
      }

      .error-message {
        font-size: 14px;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 24px;
        max-width: 600px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      .error-actions {
        display: flex;
        gap: 12px;
      }

      .error-actions button {
        padding: 8px 16px;
        font-size: 14px;
        font-family: var(--vscode-font-family);
        color: var(--vscode-button-foreground);
        background-color: var(--vscode-button-background);
        border: none;
        border-radius: 2px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .error-actions button:hover {
        background-color: var(--vscode-button-hoverBackground);
      }

      .error-actions button:active {
        background-color: var(--vscode-button-background);
      }

      /* Loading indicator */
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100vw;
        height: 100vh;
        font-size: 16px;
        color: var(--vscode-descriptionForeground);
      }
    `;
  }

  /**
   * Get inline JavaScript for webview initialization and Mermaid configuration
   */
  private getWebviewScript(): string {
    return `
      // VS Code API
      const vscode = acquireVsCodeApi();
      
      // Current theme and diagram
      let currentTheme = 'light';
      let currentDiagram = '';
      let currentScale = 1;
      let panX = 0;
      let panY = 0;
      let isPanning = false;
      let startX = 0;
      let startY = 0;
      let nodeMetadata = new Map();
      
      // Detect initial theme
      function detectTheme() {
        const isDark = document.body.classList.contains('vscode-dark') || 
                       document.body.classList.contains('vscode-high-contrast');
        return isDark ? 'dark' : 'light';
      }
      
      currentTheme = detectTheme();
      
      // Initialize Mermaid when loaded
      async function initMermaid() {
        if (typeof mermaid === 'undefined') {
          // Wait for mermaid to load
          setTimeout(initMermaid, 100);
          return;
        }
        
        const isDark = currentTheme === 'dark';
        
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            padding: 10,
            nodeSpacing: 40,
            rankSpacing: 60
          },
          securityLevel: 'loose'
        });
      }
      
      // Render Mermaid diagram
      async function renderDiagram(diagramText, metadata) {
        const container = document.getElementById('mermaid-container');
        
        if (!container) {
          showError('Container not found');
          return;
        }
        
        try {
          // Store metadata for nodes
          console.log('Received metadata:', metadata);
          if (metadata) {
            nodeMetadata = new Map(Object.entries(metadata));
            console.log('NodeMetadata map size:', nodeMetadata.size);
            console.log('NodeMetadata entries:', Array.from(nodeMetadata.entries()));
          }
          
          // Clear previous diagram
          container.innerHTML = '';
          
          // Create a div for the diagram
          const diagramDiv = document.createElement('div');
          diagramDiv.className = 'mermaid';
          diagramDiv.textContent = diagramText;
          container.appendChild(diagramDiv);
          
          // Render with mermaid
          await mermaid.run({
            nodes: [diagramDiv]
          });
          
          // Add click handlers to nodes
          addNodeClickHandlers();
          
          // Hide error container if visible
          document.getElementById('error-container').classList.add('hidden');
          
          currentDiagram = diagramText;
          
        } catch (error) {
          showError('Failed to render diagram: ' + error.message);
          console.error('Mermaid render error:', error);
        }
      }
      
      // Add click handlers to Mermaid nodes
      function addNodeClickHandlers() {
        const svg = document.querySelector('#mermaid-container svg');
        if (!svg) return;
        
        // Find all node elements
        const nodes = svg.querySelectorAll('.node');
        
        nodes.forEach(node => {
          // Get node ID from the element
          const nodeId = node.id;
          const cleanId = nodeId.replace('flowchart-', '').replace(/-\\d+$/, '');
          
          // Get metadata for this node
          const metadata = nodeMetadata.get(cleanId) || {};
          
          console.log('Node click handler setup:', cleanId, metadata);
          
          // Add click handler for navigation (single click)
          node.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Node clicked:', cleanId, metadata);
            vscode.postMessage({
              type: 'navigateToCode',
              data: {
                nodeId: cleanId,
                metadata: metadata
              }
            });
          });
          
          // Add hover effect
          node.style.cursor = 'pointer';
        });
      }
      
      // Zoom functions
      function zoomIn() {
        currentScale = Math.min(currentScale * 1.2, 5);
        applyZoom();
      }
      
      function zoomOut() {
        currentScale = Math.max(currentScale / 1.2, 0.1);
        applyZoom();
      }
      
      function zoomReset() {
        currentScale = 1;
        applyZoom();
      }
      
      function applyZoom() {
        const svg = document.querySelector('#mermaid-container svg');
        if (svg) {
          svg.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${currentScale})\`;
          svg.style.transformOrigin = 'top left';
        }
      }
      
      // Pan functions
      function setupPanning() {
        const container = document.getElementById('mermaid-container');
        
        container.addEventListener('mousedown', (e) => {
          // Only pan on background, not on nodes
          if (e.target.closest('.node')) {
            return;
          }
          
          isPanning = true;
          startX = e.clientX - panX;
          startY = e.clientY - panY;
          container.style.cursor = 'grabbing';
        });
        
        container.addEventListener('mousemove', (e) => {
          if (!isPanning) return;
          
          panX = e.clientX - startX;
          panY = e.clientY - startY;
          applyZoom();
        });
        
        container.addEventListener('mouseup', () => {
          isPanning = false;
          container.style.cursor = 'grab';
        });
        
        container.addEventListener('mouseleave', () => {
          isPanning = false;
          container.style.cursor = 'grab';
        });
      }
      
      // Copy Mermaid source to clipboard
      function copyMermaidSource() {
        if (!currentDiagram) {
          vscode.postMessage({
            type: 'showMessage',
            data: { message: 'No diagram to copy', level: 'warning' }
          });
          return;
        }
        
        navigator.clipboard.writeText(currentDiagram).then(() => {
          vscode.postMessage({
            type: 'showMessage',
            data: { message: 'Mermaid source copied to clipboard', level: 'info' }
          });
        }).catch(err => {
          console.error('Failed to copy:', err);
          vscode.postMessage({
            type: 'showMessage',
            data: { message: 'Failed to copy to clipboard', level: 'error' }
          });
        });
      }
      
      // Set up zoom controls
      function setupZoomControls() {
        document.getElementById('zoom-in').addEventListener('click', zoomIn);
        document.getElementById('zoom-out').addEventListener('click', zoomOut);
        document.getElementById('zoom-reset').addEventListener('click', zoomReset);
        document.getElementById('copy-mermaid').addEventListener('click', copyMermaidSource);
        
        // Mouse wheel zoom
        const container = document.getElementById('mermaid-container');
        container.addEventListener('wheel', (e) => {
          e.preventDefault();
          if (e.deltaY < 0) {
            zoomIn();
          } else {
            zoomOut();
          }
        });
      }
      
      // Show error message
      function showError(message) {
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        
        if (errorContainer && errorMessage) {
          errorMessage.textContent = message;
          errorContainer.classList.remove('hidden');
        }
        
        vscode.postMessage({
          type: 'error',
          data: { message: message }
        });
      }
      
      // Retry function
      function retry() {
        vscode.postMessage({
          type: 'retry'
        });
      }
      
      // Handle messages from extension
      window.addEventListener('message', async event => {
        const message = event.data;
        
        switch (message.type) {
          case 'renderDFD':
            if (message.diagram) {
              await renderDiagram(message.diagram, message.metadata);
            }
            break;
            
          case 'themeChanged':
            currentTheme = message.theme;
            // Re-render diagram with new theme
            if (currentDiagram) {
              await initMermaid();
              await renderDiagram(currentDiagram, nodeMetadata);
            }
            break;
            
          case 'error':
            if (message.message) {
              showError(message.message);
            }
            break;
        }
      });
      
      // Initialize Mermaid on load
      initMermaid();
      
      // Set up zoom controls and panning
      setupZoomControls();
      setupPanning();
      
      // Notify extension that webview is ready
      vscode.postMessage({ type: 'ready' });
    `;
  }

  /**
   * Generate a nonce for CSP
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}
