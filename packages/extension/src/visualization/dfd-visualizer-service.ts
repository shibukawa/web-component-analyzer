import * as vscode from 'vscode';
import { ComponentParser, DFDSourceData } from '@web-component-analyzer/analyzer';
import { WebviewPanelManager } from './webview-panel-manager';
import { FileWatcher } from './file-watcher';

/**
 * Parser factory function type
 */
export type ParserFactory = (filePath: string) => ComponentParser;

/**
 * Service for orchestrating DFD generation and webview management
 * 
 * Responsibilities:
 * - Parse components using appropriate parser (React or Vue)
 * - Manage webview panel lifecycle
 * - Handle errors gracefully
 * - Coordinate refresh operations
 * - Watch for file changes and auto-refresh
 */
export class DFDVisualizerService {
	private disposables: vscode.Disposable[] = [];
	private fileWatcher: FileWatcher;
	private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
	private readonly refreshDebounceDelay = 500; // 500ms debounce for refresh calls
	private parserFactory: ParserFactory;

	constructor(
		parserOrFactory: ComponentParser | ParserFactory,
		private readonly webviewPanelManager: WebviewPanelManager
	) {
		// Support both legacy single parser and new parser factory
		if (typeof parserOrFactory === 'function') {
			this.parserFactory = parserOrFactory;
		} else {
			// Legacy: wrap single parser in factory
			this.parserFactory = () => parserOrFactory;
		}
		
		// Initialize file watcher
		this.fileWatcher = new FileWatcher();
		this.setupFileWatcher();
	}

	/**
	 * Show DFD for the given document
	 * 
	 * Parses the component, creates or reveals a webview panel,
	 * and sends the DFD data to the webview for visualization.
	 * 
	 * @param document - The text document to visualize
	 */
	async showDFD(document: vscode.TextDocument): Promise<void> {
		try {
			// Parse component using appropriate parser (React or Vue)
			const dfdData = await this.parseComponent(document);

			// Handle parse errors
			if (dfdData.errors && dfdData.errors.length > 0) {
				const errorMessages = dfdData.errors.map(e => e.message).join(', ');
				
				// Extract component name from document
				const componentName = this.extractComponentName(dfdData, document);
				
				// Get or create webview panel
				const panel = this.webviewPanelManager.getOrCreatePanel(document, componentName);
				
				// Check for specific error types and show in webview
				if (errorMessages.includes('No React component found') || errorMessages.includes('No Vue component found') || errorMessages.includes('No Svelte component found') || errorMessages.includes('No component found')) {
					this.webviewPanelManager.showError(panel, 'No component detected in the file. Please ensure the file contains a valid component.');
					return;
				}
				
				if (errorMessages.includes('timed out')) {
					this.webviewPanelManager.showError(panel, 'DFD generation timed out. Component may be too complex.');
					return;
				}
				
				// Show generic parse error in webview
				this.webviewPanelManager.showError(panel, `Failed to parse component: ${errorMessages}`);
				
				// If there's no data at all, don't continue
				if (dfdData.nodes.length === 0) {
					return;
				}
			}

			// Extract component name from DFD data or use filename
			const componentName = this.extractComponentName(dfdData, document);

			// Get or create webview panel
			const panel = this.webviewPanelManager.getOrCreatePanel(document, componentName);

			// Send DFD data to webview
			this.webviewPanelManager.updatePanel(panel, dfdData);

		} catch (error) {
			// Handle unexpected errors
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to generate DFD: ${errorMessage}`);
		}
	}

	/**
	 * Refresh DFD for the given document
	 * 
	 * Re-parses the component and updates the existing webview panel
	 * while preserving zoom and pan state.
	 * 
	 * @param document - The text document to refresh
	 */
	async refresh(document: vscode.TextDocument): Promise<void> {
		try {
			// Re-parse component
			const dfdData = await this.parseComponent(document);

			// Handle parse errors (but still update if we have partial data)
			if (dfdData.errors && dfdData.errors.length > 0) {
				const errorMessages = dfdData.errors.map(e => e.message).join(', ');
				
				// Show error notification but continue with update
				vscode.window.showWarningMessage(`Parse errors during refresh: ${errorMessages}`);
			}

			// Extract component name
			const componentName = this.extractComponentName(dfdData, document);

			// Get existing panel (or create if it doesn't exist)
			const panel = this.webviewPanelManager.getOrCreatePanel(document, componentName);

			// Update existing webview panel (preserves zoom and pan state)
			this.webviewPanelManager.updatePanel(panel, dfdData);

		} catch (error) {
			// Handle unexpected errors
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to refresh DFD: ${errorMessage}`);
		}
	}

	/**
	 * Debounced refresh for the given document
	 * 
	 * Debounces refresh calls to prevent excessive regeneration
	 * when files are saved multiple times in quick succession.
	 * 
	 * @param document - The text document to refresh
	 */
	debouncedRefresh(document: vscode.TextDocument): void {
		const uri = document.uri.toString();

		// Clear existing timer for this document
		const existingTimer = this.refreshTimers.get(uri);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new debounced timer
		const timer = setTimeout(async () => {
			// Remove timer from map
			this.refreshTimers.delete(uri);

			// Execute refresh
			try {
				await this.refresh(document);
			} catch (error) {
				console.error('Debounced refresh failed:', error);
			}
		}, this.refreshDebounceDelay);

		this.refreshTimers.set(uri, timer);
	}

	/**
	 * Dispose of service resources
	 * 
	 * Cleans up all resources including webview panels and event listeners.
	 */
	dispose(): void {
		// Clear all pending refresh timers
		this.refreshTimers.forEach(timer => clearTimeout(timer));
		this.refreshTimers.clear();

		// Dispose file watcher
		this.fileWatcher.dispose();

		// Dispose webview panel manager
		this.webviewPanelManager.dispose();

		// Dispose all registered disposables
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}

	/**
	 * Set up file watcher for auto-refresh
	 * 
	 * Watches for file changes and automatically refreshes DFD
	 * when a file with an open webview panel is saved.
	 */
	private setupFileWatcher(): void {
		// Start watching for file changes
		this.fileWatcher.start();

		// Register change handler
		this.fileWatcher.onChange(async (uri) => {
			// Check if there's an active text document for this URI
			const document = vscode.workspace.textDocuments.find(
				doc => doc.uri.toString() === uri.toString()
			);

			if (!document) {
				return;
			}

			// Check if webview panel exists for this file
			if (this.webviewPanelManager.hasPanel(document)) {
				// Auto-refresh the DFD with debouncing
				this.debouncedRefresh(document);
			}
		});
	}

	/**
	 * Parse component from document
	 * 
	 * @param document - The text document to parse
	 * @returns DFD source data
	 */
	private async parseComponent(document: vscode.TextDocument): Promise<DFDSourceData> {
		const sourceCode = document.getText();
		const filePath = document.uri.fsPath;

		// Get appropriate parser based on file extension
		const parser = this.parserFactory(filePath);
		
		return await parser.parse(sourceCode, filePath);
	}

	/**
	 * Extract component name from DFD data or document
	 * 
	 * @param dfdData - The DFD source data
	 * @param document - The text document
	 * @returns Component name for display
	 */
	private extractComponentName(dfdData: DFDSourceData, document: vscode.TextDocument): string {
		// Try to find a process node that might contain the component name
		// (This is a heuristic - the actual component name might be in metadata)
		const processNodes = dfdData.nodes.filter(n => n.type === 'process');
		
		if (processNodes.length > 0 && processNodes[0].metadata?.componentName) {
			return processNodes[0].metadata.componentName;
		}

		// Fall back to filename without extension
		const fileName = document.fileName.split('/').pop() || 'Component';
		return fileName.replace(/\.(tsx|jsx|vue|svelte)$/, '');
	}
}
