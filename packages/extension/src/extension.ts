// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createReactParser } from '@web-component-analyzer/analyzer';
import { TypeResolver } from './services/type-resolver';
import { DFDVisualizerService } from './visualization/dfd-visualizer-service';
import { WebviewPanelManager } from './visualization/webview-panel-manager';
import { DFDCommandHandler } from './visualization/command-handler';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('web-component-analyzer extension is now active');

	// Create TypeResolver for accurate type-based classification
	const typeResolver = new TypeResolver();
	
	// Create parser instance with TypeResolver
	const reactParser = createReactParser(typeResolver);
	
	// Create Webview Panel Manager
	const webviewPanelManager = new WebviewPanelManager(context);
	
	// Create DFD Visualizer Service
	const dfdVisualizerService = new DFDVisualizerService(reactParser, webviewPanelManager);
	
	// Create and register DFD Command Handler
	const dfdCommandHandler = new DFDCommandHandler(dfdVisualizerService);
	dfdCommandHandler.register(context);
	
	// Add services to subscriptions for proper disposal
	context.subscriptions.push(dfdVisualizerService, dfdCommandHandler);

	// Register command to show component structure (legacy command - kept for backward compatibility)
	const disposable = vscode.commands.registerCommand('web-component-analyzer.showStructure', async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found. Please open a React component file.');
			return;
		}

		const document = editor.document;
		const filePath = document.fileName;
		const sourceCode = document.getText();

		// Check if file is a supported React file
		if (!filePath.match(/\.(tsx|jsx|ts|js)$/)) {
			vscode.window.showWarningMessage('Please open a React component file (.tsx, .jsx, .ts, or .js)');
			return;
		}

		// Show progress indicator
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Analyzing component structure...',
			cancellable: false
		}, async (progress) => {
			try {
				// Parse the component
				progress.report({ message: 'Parsing source code...' });
				const dfdData = await reactParser.parse(sourceCode, filePath);

				// Check for errors
				if (dfdData.errors && dfdData.errors.length > 0) {
					const errorMessages = dfdData.errors.map(err => {
						const location = err.line && err.column ? ` (line ${err.line}, column ${err.column})` : '';
						return `${err.message}${location}`;
					}).join('\n');

					vscode.window.showErrorMessage(`Parser errors:\n${errorMessages}`);
					
					// Still show partial results if available
					if (dfdData.nodes.length === 0 && dfdData.edges.length === 0) {
						return;
					}
				}

				// Check if component was found
				if (dfdData.nodes.length === 0 && dfdData.edges.length === 0) {
					vscode.window.showInformationMessage('No React component found in the current file.');
					return;
				}

				// For now, display DFD data as formatted JSON
				// TODO: Replace with webview visualization in future task
				progress.report({ message: 'Generating visualization...' });
				
				const outputChannel = vscode.window.createOutputChannel('Component Structure');
				outputChannel.clear();
				outputChannel.appendLine('=== Component Structure Analysis ===\n');
				outputChannel.appendLine(`File: ${filePath}\n`);
				outputChannel.appendLine(`Nodes: ${dfdData.nodes.length}`);
				outputChannel.appendLine(`Edges: ${dfdData.edges.length}\n`);
				outputChannel.appendLine('=== DFD Data ===\n');
				outputChannel.appendLine(JSON.stringify(dfdData, null, 2));
				outputChannel.show();

				vscode.window.showInformationMessage(
					`Component analyzed: ${dfdData.nodes.length} nodes, ${dfdData.edges.length} edges. See Output panel for details.`
				);

			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(`Failed to analyze component: ${errorMessage}`);
				console.error('Parser error:', error);
			}
		});
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// Cleanup is handled automatically by VS Code disposing context.subscriptions
}
