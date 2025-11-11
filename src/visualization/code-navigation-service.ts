import * as vscode from 'vscode';

/**
 * Service for navigating to code locations from DFD nodes
 */
export class CodeNavigationService {
  /**
   * Navigate to the code location for a node
   * @param document The document containing the component
   * @param nodeId The ID of the node to navigate to
   * @param nodeMetadata Metadata containing line and column information
   */
  async navigateToNode(
    document: vscode.TextDocument,
    nodeId: string,
    nodeMetadata: any
  ): Promise<void> {
    // Debug logging
    console.log('[CodeNavigationService] Navigate to node:', {
      nodeId,
      metadata: nodeMetadata,
      hasLine: nodeMetadata?.line !== undefined,
      line: nodeMetadata?.line,
      column: nodeMetadata?.column
    });
    
    // Extract line and column from metadata
    const line = nodeMetadata?.line;
    const column = nodeMetadata?.column || 0;
    
    // Handle missing location data
    if (line === undefined) {
      console.error('[CodeNavigationService] No line information for node:', nodeId, nodeMetadata);
      vscode.window.showInformationMessage(
        `Code location not available for this element (nodeId: ${nodeId})`
      );
      return;
    }
    
    // Find existing editor for this document
    const existingEditor = vscode.window.visibleTextEditors.find(
      editor => editor.document.uri.toString() === document.uri.toString()
    );
    
    // Open or activate the document
    const editor = existingEditor 
      ? await vscode.window.showTextDocument(document, existingEditor.viewColumn, false)
      : await vscode.window.showTextDocument(document);
    
    const position = new vscode.Position(line - 1, column); // Convert to 0-based
    const range = new vscode.Range(position, position);
    
    // Move cursor to location
    editor.selection = new vscode.Selection(position, position);
    
    // Reveal range in editor
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    
    // Highlight the line temporarily
    const decoration = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
      isWholeLine: true
    });
    editor.setDecorations(decoration, [range]);
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
      decoration.dispose();
    }, 2000);
  }
}
