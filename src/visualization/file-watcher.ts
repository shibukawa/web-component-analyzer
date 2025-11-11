import * as vscode from 'vscode';

/**
 * File watcher for component files
 * 
 * Watches for changes to .tsx, .jsx, .vue files and emits
 * debounced change events to trigger DFD refresh.
 */
export class FileWatcher {
	private watcher: vscode.FileSystemWatcher | undefined;
	private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
	private readonly debounceDelay = 500; // 500ms debounce
	private disposables: vscode.Disposable[] = [];
	private changeHandlers: Array<(uri: vscode.Uri) => void> = [];

	/**
	 * Start watching for file changes
	 */
	start(): void {
		// Create file system watcher for supported file types
		this.watcher = vscode.workspace.createFileSystemWatcher(
			'**/*.{tsx,jsx,vue}'
		);

		// Watch for file changes
		this.watcher.onDidChange((uri) => {
			this.handleFileChange(uri);
		}, null, this.disposables);

		this.disposables.push(this.watcher);
	}

	/**
	 * Register a handler for file change events
	 * 
	 * @param handler - Callback function to invoke when a file changes
	 */
	onChange(handler: (uri: vscode.Uri) => void): void {
		this.changeHandlers.push(handler);
	}

	/**
	 * Handle file change with debouncing
	 * 
	 * Debounces change events to avoid excessive regeneration
	 * when files are saved multiple times in quick succession.
	 * 
	 * @param uri - The URI of the changed file
	 */
	private handleFileChange(uri: vscode.Uri): void {
		const uriString = uri.toString();

		// Clear existing timer for this file
		const existingTimer = this.debounceTimers.get(uriString);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		// Set new debounced timer
		const timer = setTimeout(() => {
			// Remove timer from map
			this.debounceTimers.delete(uriString);

			// Notify all registered handlers
			this.changeHandlers.forEach(handler => {
				try {
					handler(uri);
				} catch (error) {
					console.error('Error in file change handler:', error);
				}
			});
		}, this.debounceDelay);

		this.debounceTimers.set(uriString, timer);
	}

	/**
	 * Dispose of file watcher resources
	 */
	dispose(): void {
		// Clear all pending timers
		this.debounceTimers.forEach(timer => clearTimeout(timer));
		this.debounceTimers.clear();

		// Clear handlers
		this.changeHandlers = [];

		// Dispose watcher and other disposables
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}
}
