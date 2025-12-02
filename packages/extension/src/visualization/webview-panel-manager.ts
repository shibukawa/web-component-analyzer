import * as vscode from 'vscode';
import { DFDSourceData, DFDNode, DFDSubgraph } from '@web-component-analyzer/analyzer';
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
import { ThemeConfig } from './theme-config';

export class WebviewPanelManager {
  private panels: Map<string, vscode.WebviewPanel> = new Map();
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private htmlGenerator: HTMLContentGenerator;
  private disposables: vscode.Disposable[] = [];
  private codeNavigationService: CodeNavigationService;
  private documentMap: Map<string, vscode.TextDocument> = new Map();
  private dfdDataMap: Map<string, DFDSourceData> = new Map();

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

    // Detect current theme
    const currentTheme = this.getCurrentTheme();

    // Set HTML content with current theme
    panel.webview.html = this.htmlGenerator.generateHTML(
      panel.webview,
      this.context.extensionUri,
      currentTheme
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
    // Find the URI for this panel to store DFD data
    let panelUri: string | undefined;
    for (const [uri, p] of this.panels.entries()) {
      if (p === panel) {
        panelUri = uri;
        break;
      }
    }
    
    // Store DFD data for later use when theme changes
    if (panelUri) {
      this.dfdDataMap.set(panelUri, dfdData);
    }
    
    // Detect current theme
    const theme = this.getCurrentTheme();
    
    // Get full theme configuration
    const themeConfig = ThemeConfig.getTheme(theme);

    // Transform DFD data to Mermaid format with current theme
    const mermaidDiagram = transformToMermaid(dfdData, theme === 'dark' ? 'dark' : 'light');

    // Create metadata map for ALL nodes (including subgraph nodes)
    const metadata = this.collectAllNodeMetadata(dfdData);

    // Send diagram and metadata to webview
    panel.webview.postMessage({
      type: 'renderDFD',
      diagram: mermaidDiagram,
      metadata: metadata,
      theme: theme,
      themeVariables: themeConfig.themeVariables
    });
  }

  /**
   * Show error message in webview
   * 
   * @param panel - The webview panel to show error in
   * @param errorMessage - The error message to display
   */
  showError(panel: vscode.WebviewPanel, errorMessage: string): void {
    panel.webview.postMessage({
      type: 'error',
      message: errorMessage
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

    // Clear DFD data map
    this.dfdDataMap.clear();

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
      // Call async handler with the URI of the panel that sent the message
      this.handleNavigateToCode(uri, message.data.nodeId, message.data.metadata).catch(error => {
        console.error('[DFD Visualization] Error in navigate to code handler:', error);
      });
    });

    // Register show message handler
    messageHandler.onShowMessage((message) => {
      const { message: text, level } = message.data;
      switch (level) {
        case 'info':
          vscode.window.showInformationMessage(text);
          break;
        case 'warning':
          vscode.window.showWarningMessage(text);
          break;
        case 'error':
          vscode.window.showErrorMessage(text);
          break;
      }
    });

    // Handle panel disposal
    panel.onDidDispose(() => {
      this.panels.delete(uri);
      this.messageHandlers.delete(uri);
      this.documentMap.delete(uri);
      this.dfdDataMap.delete(uri);
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
   * @param nodeId - The selected node ID
   */
  private handleNodeSelection(nodeId: string): void {
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
   * @param panelUri - The URI of the panel that sent the message
   * @param nodeId - The node ID to navigate to
   * @param metadata - Node metadata containing location information (line, column, etc.)
   */
  private async handleNavigateToCode(panelUri: string, nodeId: string, metadata: any): Promise<void> {
    // Find the document for this specific panel using the URI
    let document = this.documentMap.get(panelUri);
    
    // If we can't find the document in our map, try to find it in visible editors
    if (!document) {
      // Try to find an editor with matching URI
      const matchingEditor = vscode.window.visibleTextEditors.find(
        editor => editor.document.uri.toString() === panelUri
      );
      if (matchingEditor) {
        document = matchingEditor.document;
      }
    }
    
    // Last resort: try the active text editor
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
   * active webview panels with the new theme colors and re-renders diagrams.
   */
  private setupThemeChangeListener(): void {
    // Listen for theme changes
    const themeChangeListener = vscode.window.onDidChangeActiveColorTheme((theme) => {
      // Detect new theme
      const newTheme = theme.kind === vscode.ColorThemeKind.Dark || 
                       theme.kind === vscode.ColorThemeKind.HighContrast
        ? 'dark'
        : 'light';
      
      // Get full theme configuration
      const themeConfig = ThemeConfig.getTheme(newTheme);
      
      // Send theme update message to all active webview panels
      this.panels.forEach((panel, uri) => {
        // Get stored DFD data for this panel
        const dfdData = this.dfdDataMap.get(uri);
        
        if (dfdData) {
          // Re-transform diagram with new theme
          const mermaidDiagram = transformToMermaid(dfdData, newTheme === 'dark' ? 'dark' : 'light');
          
          // Create metadata map for ALL nodes (including subgraph nodes)
          const metadata = this.collectAllNodeMetadata(dfdData);
          
          // Send new diagram with updated theme
          panel.webview.postMessage({
            type: 'renderDFD',
            diagram: mermaidDiagram,
            metadata: metadata,
            theme: newTheme,
            themeVariables: themeConfig.themeVariables
          });
        } else {
          // Fallback: just send theme update if we don't have DFD data
          panel.webview.postMessage({
            type: 'themeChanged',
            theme: newTheme,
            themeVariables: themeConfig.themeVariables
          });
        }
      });
    });

    this.disposables.push(themeChangeListener);
  }

  /**
   * Collect metadata from all nodes in DFD data, including nodes in subgraphs
   * 
   * @param dfdData - The DFD source data
   * @returns A map of sanitized node IDs to their metadata
   */
  private collectAllNodeMetadata(dfdData: DFDSourceData): Record<string, any> {
    const metadata: Record<string, any> = {};

    // Add metadata from top-level nodes
    for (const node of dfdData.nodes) {
      const sanitizedId = sanitizeId(node.id);
      metadata[sanitizedId] = {
        ...node.metadata,
        // line and column from node properties take precedence over metadata
        line: node.line,
        column: node.column
      };
    }

    // Add metadata from rootSubgraph nodes
    if (dfdData.rootSubgraph) {
      this.collectNodesFromSubgraph(dfdData.rootSubgraph, metadata);
    }

    // Add metadata from additional subgraphs
    if (dfdData.subgraphs) {
      for (const subgraph of dfdData.subgraphs) {
        this.collectNodesFromSubgraph(subgraph, metadata);
      }
    }

    return metadata;
  }

  /**
   * Recursively collect nodes from a subgraph and add their metadata
   * 
   * @param subgraph - The subgraph to process
   * @param metadata - The metadata map to populate
   */
  private collectNodesFromSubgraph(
    subgraph: DFDSubgraph,
    metadata: Record<string, any>
  ): void {
    for (const element of subgraph.elements) {
      // Check if element is a DFDNode (has 'type' but is not a subgraph type)
      if (this.isDFDNode(element)) {
        const node = element as DFDNode;
        const sanitizedId = sanitizeId(node.id);
        // Only add if not already present (top-level nodes take precedence)
        if (!metadata[sanitizedId]) {
          metadata[sanitizedId] = {
            ...node.metadata,
            // line and column from node properties take precedence over metadata
            line: node.line,
            column: node.column
          };
        }
      } else if (this.isDFDSubgraph(element)) {
        // Recursively process nested subgraph
        this.collectNodesFromSubgraph(element as DFDSubgraph, metadata);
      }
    }
  }

  /**
   * Check if an element is a DFDNode
   */
  private isDFDNode(element: DFDNode | DFDSubgraph): element is DFDNode {
    return 'type' in element && 
           element.type !== 'conditional' && 
           element.type !== 'jsx-output' &&
           element.type !== 'loop' &&
           element.type !== 'loop-conditional' &&
           element.type !== 'await' &&
           element.type !== 'lifecycle-hooks' &&
           element.type !== 'emits' &&
           element.type !== 'exported-handlers' &&
           !('elements' in element);
  }

  /**
   * Check if an element is a DFDSubgraph
   */
  private isDFDSubgraph(element: DFDNode | DFDSubgraph): element is DFDSubgraph {
    return 'elements' in element;
  }
}
