import * as vscode from 'vscode';
import { DFDVisualizerService } from './dfd-visualizer-service';

/**
 * Interface for command handler
 */
export interface CommandHandler {
	/**
	 * Register commands with VS Code
	 */
	register(context: vscode.ExtensionContext): void;
	
	/**
	 * Dispose of command handler resources
	 */
	dispose(): void;
}

/**
 * Handles registration and execution of DFD visualization commands
 */
export class DFDCommandHandler implements CommandHandler {
	private disposables: vscode.Disposable[] = [];
	
	constructor(private visualizerService: DFDVisualizerService) {}
	
	/**
	 * Register commands with VS Code
	 */
	register(context: vscode.ExtensionContext): void {
		// Register showDFD command
		const showDFDCommand = vscode.commands.registerCommand(
			'web-component-analyzer.showDFD',
			() => this.executeShowDFD()
		);
		
		// Register refreshDFD command
		const refreshDFDCommand = vscode.commands.registerCommand(
			'web-component-analyzer.refreshDFD',
			() => this.executeRefreshDFD()
		);
		
		this.disposables.push(showDFDCommand, refreshDFDCommand);
		context.subscriptions.push(showDFDCommand, refreshDFDCommand);
	}
	
	/**
	 * Execute the showDFD command
	 */
	private async executeShowDFD(): Promise<void> {
		// Get active text editor
		const editor = vscode.window.activeTextEditor;
		
		// Validate editor exists
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found. Please open a component file.');
			return;
		}
		
		const document = editor.document;
		const filePath = document.fileName;
		
		// Validate file type (.tsx, .jsx, .vue, .svelte)
		if (!this.isSupportedFileType(filePath)) {
			vscode.window.showErrorMessage(
				'Unsupported file type. Please open a .tsx, .jsx, .vue, or .svelte file.'
			);
			return;
		}
		
		// Call DFD Visualizer Service
		try {
			await this.visualizerService.showDFD(document);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to show DFD: ${errorMessage}`);
			console.error('DFD visualization error:', error);
		}
	}

	/**
	 * Execute the refreshDFD command
	 * 
	 * Refreshes the existing DFD panel for the active editor,
	 * preserving zoom and pan state.
	 */
	private async executeRefreshDFD(): Promise<void> {
		// Get active text editor
		const editor = vscode.window.activeTextEditor;
		
		// Validate editor exists
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found. Please open a component file.');
			return;
		}
		
		const document = editor.document;
		const filePath = document.fileName;
		
		// Validate file type (.tsx, .jsx, .vue, .svelte)
		if (!this.isSupportedFileType(filePath)) {
			vscode.window.showErrorMessage(
				'Unsupported file type. Please open a .tsx, .jsx, .vue, or .svelte file.'
			);
			return;
		}
		
		// Call DFD Visualizer Service refresh method
		try {
			await this.visualizerService.refresh(document);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			vscode.window.showErrorMessage(`Failed to refresh DFD: ${errorMessage}`);
			console.error('DFD refresh error:', error);
		}
	}
	
	/**
	 * Check if the file type is supported for DFD visualization
	 */
	private isSupportedFileType(filePath: string): boolean {
		return /\.(tsx|jsx|vue|svelte)$/i.test(filePath);
	}
	
	/**
	 * Clean up command handler resources
	 */
	dispose(): void {
		this.disposables.forEach(d => d.dispose());
		this.disposables = [];
	}
}
