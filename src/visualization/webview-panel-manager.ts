import * as vscode from 'vscode';
import { DFDSourceData } from '../parser/types';
import { HTMLContentGenerator } from './html-content-generator';
import { transformToMermaid, sanitizeId } from './mermaid-transformer';
import { MessageHandler, ErrorMessage } from './message-handler';
import { CodeNavigationService } from './code-navigation-service';

/**
 * Manager for webview panel lifecycle and communication
 * 
 * Responsibilities:
 * - Store and manage webview panels by document URI
 * - Create new panels with proper configuration
 * - Update panels with new DFD data
 * - Handle panel disposal and cleanup
 */
export class WebviewPanelManager {
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private htmlGenerator: HTMLContentGenerator;
  private disposables: vscode.Disposable[] = [];
  private codeNavigationService: CodeNavigationService;
  private documentMap: Map<string, vscode.TextDocument> = new Map();

  constructor(
    private readonly context: vscode.ExtensionContext
  ) {
    this.htmlGenerator = new HTMLContentGenerator(context);
    this.codeNavigationService = new CodeNavigationService();
    this.setupThemeChangeListener();
    this.setupFileCloseListener();
  }

  /**
   * Set up listener for file close events
   * 
   * Disposes panels when their associated files are closed
   * to free up resources and prevent memory leaks.
   */
  private setupFileCloseListener(): void {
    // Listen for text document close events
    const closeListener = vscode.workspace.onDidCloseTextDocument((document) => {
      const uri = document.uri.toString();
      
      // Check if we have a panel for this document
      if (this.panels.has(uri)) {
        const panel = this.panels.get(uri);
        
        // Dispose the panel (this will trigger onDidDispose which cleans up)
        panel?.dispose();
        
        // Clean up our references
        this.panels.delete(uri);
        this.messageHandlers.delete(uri);
        this.documentMap.delete(uri);
      }
    });

    this.disposables.push(closeListener);
  }

  /**
   * Get existing panel or create a new one for the document
   * 
   * Checks if a panel already exists for the given document URI.
   * If it exists, reveals it. Otherwise, creates a new panel with
   * proper configuration.
   * 
   * @param document - The text document to visualize
   * @param componentName - Name of the component for panel title
   * @returns The webview panel (existing or newly created)
   */
  getOrCreatePanel(
    document: vscode.TextDocument,
    componentName: string
  ): vscode.WebviewPanel {
    const uri = document.uri.toString();
    
    // Store document reference for code navigation
    this.documentMap.set(uri, document);
    
    // Check if panel already exists for this document
    const existingPanel = this.panels.get(uri);
    if (existingPanel) {
      // Reveal existing panel
      existingPanel.reveal(vscode.ViewColumn.Beside);
      return existingPanel;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'componentDFD', // View type identifier
      `Component DFD: ${componentName}`, // Panel title
      vscode.ViewColumn.Beside, // Show beside active editor
      {
        enableScripts: true, // Enable JavaScript in webview
        retainContextWhenHidden: true, // Keep state when hidden
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ]
      }
    );

    // Set HTML content
    panel.webview.html = this.htmlGenerator.generateHTML(
      panel.webview,
      this.context.extensionUri
    );

    // Store panel in map
    this.panels.set(uri, panel);

    // Set up panel event listeners
    this.setupPanelListeners(panel, uri);

    return panel;
  }

  /**
   * Update panel with new DFD data
   * 
   * Transforms DFD data to Mermaid format and sends it to the webview.
   * The webview will handle rendering the diagram.
   * 
   * @param panel - The webview panel to update
   * @param dfdData - The DFD source data to visualize
   */
  updatePanel(
    panel: vscode.WebviewPanel,
    dfdData: DFDSourceData
  ): void {
    // Detect current theme
    const theme = this.getCurrentTheme();

    // Transform DFD data to Mermaid format
    const mermaidDiagram = transformToMermaid(dfdData);

    // Create metadata map for nodes (nodeId -> metadata)
    // Use sanitized IDs to match Mermaid node IDs
    const metadata: Record<string, any> = {};
    for (const node of dfdData.nodes) {
      const sanitizedId = sanitizeId(node.id);
      metadata[sanitizedId] = {
        line: node.line,
        column: node.column,
        ...node.metadata
      };
    }

    console.log('[WebviewPanelManager] Sending metadata to webview:', metadata);

    // Send diagram and metadata to webview
    panel.webview.postMessage({
      type: 'renderDFD',
      diagram: mermaidDiagram,
      metadata: metadata,
      theme: theme
    });
  }

  /**
   * Check if a panel exists for the given document
   * 
   * @param document - The text document to check
   * @returns True if a panel exists for this document
   */
  hasPanel(document: vscode.TextDocument): boolean {
    const uri = document.uri.toString();
    return this.panels.has(uri);
  }

  /**
   * Dispose of all panels and clean up resources
   * 
   * Disposes all webview panels and removes event listeners.
   */
  dispose(): void {
    // Dispose all panels
    this.panels.forEach(panel => panel.dispose());
    this.panels.clear();

    // Clear message handlers
    this.messageHandlers.clear();

    // Clear document map
    this.documentMap.clear();

    // Dispose all event listeners
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }

  /**
   * Set up event listeners for a panel
   * 
   * @param panel - The webview panel
   * @param uri - The document URI key
   */
  private setupPanelListeners(panel: vscode.WebviewPanel, uri: string): void {
    // Create message handler for this panel
    const messageHandler = new MessageHandler();
    this.messageHandlers.set(uri, messageHandler);

    // Register error handler
    messageHandler.onError((errorMessage: ErrorMessage) => {
      this.handleError(errorMessage);
    });

    // Register node selection handler
    messageHandler.onNodeSelected((message) => {
      this.handleNodeSelection(message.data.nodeId);
    });

    // Register layout complete handler
    messageHandler.onLayoutComplete(() => {
      this.handleLayoutComplete();
    });

    // Register navigate to code handler
    messageHandler.onNavigateToCode((message) => {
      // Call async handler without awaiting (fire and forget)
      this.handleNavigateToCode(message.data.nodeId, message.data.metadata).catch(error => {
        console.error('[DFD Visualization] Error in navigate to code handler:', error);
      });
    });

    // Handle panel disposal
    panel.onDidDispose(() => {
      this.panels.delete(uri);
      this.messageHandlers.delete(uri);
      this.documentMap.delete(uri);
    }, null, this.disposables);

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      message => {
        messageHandler.handleMessage(message);
      },
      null,
      this.disposables
    );
  }

  /**
   * Handle error message from webview
   * 
   * @param errorMessage - The error message
   */
  private handleError(errorMessage: ErrorMessage): void {
    const message = errorMessage.data.message;
    const stack = errorMessage.data.stack;

    // Log error to extension console
    console.error('Webview error:', message);
    if (stack) {
      console.error('Stack trace:', stack);
    }

    // Display error notification to user
    vscode.window.showErrorMessage(`DFD Visualization Error: ${message}`);
  }

  /**
   * Handle node selection from webview
   * 
   * Logs selected node information to the extension console.
   * This provides visibility into user interactions with the diagram.
   * 
   * @param nodeId - The selected node ID
   */
  private handleNodeSelection(nodeId: string): void {
    // Log selected node information to extension console
    console.log('[DFD Visualization] Node selected:', {
      nodeId: nodeId,
      timestamp: new Date().toISOString()
    });
    
    // Future enhancements:
    // - Show node details in a hover tooltip
    // - Display node properties in a side panel
    // - Highlight related nodes in the diagram
  }

  /**
   * Handle layout complete from webview
   */
  private handleLayoutComplete(): void {
    console.log('Layout complete');
    
    // Future: Could show notification or update status bar
  }

  /**
   * Handle navigate to code request from webview
   * 
   * Receives navigateToCode messages from the webview when a user
   * double-clicks on a node. Extracts the node ID and metadata,
   * and calls the Code Navigation Service to navigate to the code location.
   * 
   * @param nodeId - The node ID to navigate to
   * @param metadata - Node metadata containing location information (line, column, etc.)
   */
  private async handleNavigateToCode(nodeId: string, metadata: any): Promise<void> {
    // Log navigation request
    console.log('[DFD Visualization] Navigate to code requested:', {
      nodeId: nodeId,
      metadata: metadata,
      timestamp: new Date().toISOString()
    });

    // Find the document for the current panel
    // We need to find which panel sent this message
    let document: vscode.TextDocument | undefined;
    
    // Try to find the document from our document map
    for (const [uri, doc] of this.documentMap.entries()) {
      if (this.panels.has(uri)) {
        document = doc;
        break;
      }
    }
    
    // If we can't find the document, try the active text editor
    if (!document) {
      document = vscode.window.activeTextEditor?.document;
    }
    
    if (!document) {
      vscode.window.showErrorMessage('Cannot navigate: no active document found');
      return;
    }

    // Call the Code Navigation Service
    try {
      await this.codeNavigationService.navigateToNode(document, nodeId, metadata);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[DFD Visualization] Navigation error:', errorMessage);
      vscode.window.showErrorMessage(`Failed to navigate to code: ${errorMessage}`);
    }
  }

  /**
   * Get current VS Code theme
   * 
   * @returns 'light' or 'dark'
   */
  private getCurrentTheme(): 'light' | 'dark' {
    const theme = vscode.window.activeColorTheme.kind;
    return theme === vscode.ColorThemeKind.Dark || 
           theme === vscode.ColorThemeKind.HighContrast
      ? 'dark'
      : 'light';
  }


  /**
   * Set up theme change listener
   * 
   * Listens for VS Code theme change events and updates all
   * active webview panels with the new theme colors.
   */
  private setupThemeChangeListener(): void {
    // Listen for theme changes
    const themeChangeListener = vscode.window.onDidChangeActiveColorTheme((theme) => {
      // Detect new theme
      const newTheme = theme.kind === vscode.ColorThemeKind.Dark || 
                       theme.kind === vscode.ColorThemeKind.HighContrast
        ? 'dark'
        : 'light';
      
      // Send theme update message to all active webview panels
      this.panels.forEach(panel => {
        panel.webview.postMessage({
          type: 'themeChanged',
          theme: newTheme
        });
      });
    });

    this.disposables.push(themeChangeListener);
  }
}
