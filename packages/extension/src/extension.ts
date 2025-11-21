// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createReactParser, createVueParser, createParser } from '@web-component-analyzer/analyzer';
import { TypeResolver } from './services/type-resolver';
import { DFDVisualizerService } from './visualization/dfd-visualizer-service';
import { WebviewPanelManager } from './visualization/webview-panel-manager';
import { DFDCommandHandler } from './visualization/command-handler';
import { parseComponent } from './utils/node-parser';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('web-component-analyzer extension is now active');

	// Create TypeResolver for accurate type-based classification
	const typeResolver = new TypeResolver();
	
	// Create parser factory function that detects framework based on file extension
	const parserFactory = (filePath: string) => {
		return createParser(filePath, parseComponent, typeResolver);
	};
	
	// Create Webview Panel Manager
	const webviewPanelManager = new WebviewPanelManager(context);
	
	// Create DFD Visualizer Service with parser factory
	const dfdVisualizerService = new DFDVisualizerService(parserFactory, webviewPanelManager);
	
	// Create and register DFD Command Handler
	const dfdCommandHandler = new DFDCommandHandler(dfdVisualizerService);
	dfdCommandHandler.register(context);
	
	// Add services to subscriptions for proper disposal
	context.subscriptions.push(dfdVisualizerService, dfdCommandHandler);

	// Register command to show component structure (legacy command - kept for backward compatibility)
	const disposable = vscode.commands.registerCommand('web-component-analyzer.showStructure', async () => {
		const editor = vscode.window.activeTextEditor;
		
		if (!editor) {
			vscode.window.showErrorMessage('No active editor found. Please open a component file.');
			return;
		}

		const document = editor.document;
		const filePath = document.fileName;
		const sourceCode = document.getText();

		// Check if file is a supported file type
		if (!filePath.match(/\.(tsx|jsx|ts|js|vue|svelte)$/)) {
			vscode.window.showWarningMessage('Please open a component file (.tsx, .jsx, .ts, .js, .vue, or .svelte)');
			return;
		}

		// Show progress indicator
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: 'Analyzing component structure...',
			cancellable: false
		}, async (progress) => {
			try {
				// Parse the component using appropriate parser
				progress.report({ message: 'Parsing source code...' });
				const parser = parserFactory(filePath);
				const dfdData = await parser.parse(sourceCode, filePath);

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
					vscode.window.showInformationMessage('No component found in the current file.');
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
