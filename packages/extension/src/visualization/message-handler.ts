import * as vscode from 'vscode';

/**
 * Message types for webview communication
 */
export type WebviewMessageType = 
  | 'ready'
  | 'error'
  | 'nodeSelected'
  | 'layoutComplete'
  | 'navigateToCode'
  | 'retry'
  | 'showMessage';

/**
 * Base message structure
 */
export interface WebviewMessage {
  type: WebviewMessageType;
  data?: any;
}

/**
 * Ready message - webview is ready to receive data
 */
export interface ReadyMessage extends WebviewMessage {
  type: 'ready';
}

/**
 * Error message - error occurred in webview
 */
export interface ErrorMessage extends WebviewMessage {
  type: 'error';
  data: {
    message: string;
    stack?: string;
  };
}

/**
 * Node selected message - user selected a node
 */
export interface NodeSelectedMessage extends WebviewMessage {
  type: 'nodeSelected';
  data: {
    nodeId: string;
  };
}

/**
 * Layout complete message - layout calculation finished
 */
export interface LayoutCompleteMessage extends WebviewMessage {
  type: 'layoutComplete';
}

/**
 * Navigate to code message - user wants to navigate to code
 */
export interface NavigateToCodeMessage extends WebviewMessage {
  type: 'navigateToCode';
  data: {
    nodeId: string;
    metadata: any;
  };
}

/**
 * Retry message - user wants to retry after error
 */
export interface RetryMessage extends WebviewMessage {
  type: 'retry';
}

/**
 * Show message - display a message to the user
 */
export interface ShowMessageMessage extends WebviewMessage {
  type: 'showMessage';
  data: {
    message: string;
    level: 'info' | 'warning' | 'error';
  };
}

/**
 * Union type of all specific message types
 */
export type TypedWebviewMessage = 
  | ReadyMessage
  | ErrorMessage
  | NodeSelectedMessage
  | LayoutCompleteMessage
  | NavigateToCodeMessage
  | RetryMessage
  | ShowMessageMessage;

/**
 * Message handler for webview communication
 * 
 * Responsibilities:
 * - Validate incoming messages
 * - Route messages to appropriate handlers
 * - Provide type-safe message handling
 */
export class MessageHandler {
  private readyHandlers: Array<() => void> = [];
  private errorHandlers: Array<(message: ErrorMessage) => void> = [];
  private nodeSelectedHandlers: Array<(message: NodeSelectedMessage) => void> = [];
  private layoutCompleteHandlers: Array<() => void> = [];
  private navigateToCodeHandlers: Array<(message: NavigateToCodeMessage) => void> = [];
  private retryHandlers: Array<() => void> = [];
  private showMessageHandlers: Array<(message: ShowMessageMessage) => void> = [];

  /**
   * Validate that a message has the required structure
   * 
   * @param message - The message to validate
   * @returns True if message is valid
   */
  validateMessage(message: any): message is WebviewMessage {
    if (!message || typeof message !== 'object') {
      return false;
    }

    if (!message.type || typeof message.type !== 'string') {
      return false;
    }

    const validTypes: WebviewMessageType[] = [
      'ready',
      'error',
      'nodeSelected',
      'layoutComplete',
      'navigateToCode',
      'retry',
      'showMessage'
    ];

    return validTypes.includes(message.type);
  }

  /**
   * Handle incoming message from webview
   * 
   * @param message - The message to handle
   */
  handleMessage(message: any): void {
    // Validate message structure
    if (!this.validateMessage(message)) {
      console.warn('Invalid message received from webview:', message);
      return;
    }

    // Route to appropriate handler based on type
    switch (message.type) {
      case 'ready':
        this.handleReady();
        break;

      case 'error':
        this.handleError(message as ErrorMessage);
        break;

      case 'nodeSelected':
        this.handleNodeSelected(message as NodeSelectedMessage);
        break;

      case 'layoutComplete':
        this.handleLayoutComplete();
        break;

      case 'navigateToCode':
        this.handleNavigateToCode(message as NavigateToCodeMessage);
        break;

      case 'retry':
        this.handleRetry();
        break;

      case 'showMessage':
        this.handleShowMessage(message as ShowMessageMessage);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Register handler for ready messages
   * 
   * @param handler - Function to call when webview is ready
   */
  onReady(handler: () => void): void {
    this.readyHandlers.push(handler);
  }

  /**
   * Register handler for error messages
   * 
   * @param handler - Function to call when error occurs
   */
  onError(handler: (message: ErrorMessage) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Register handler for node selection messages
   * 
   * @param handler - Function to call when node is selected
   */
  onNodeSelected(handler: (message: NodeSelectedMessage) => void): void {
    this.nodeSelectedHandlers.push(handler);
  }

  /**
   * Register handler for layout complete messages
   * 
   * @param handler - Function to call when layout is complete
   */
  onLayoutComplete(handler: () => void): void {
    this.layoutCompleteHandlers.push(handler);
  }

  /**
   * Register handler for navigate to code messages
   * 
   * @param handler - Function to call when navigation is requested
   */
  onNavigateToCode(handler: (message: NavigateToCodeMessage) => void): void {
    this.navigateToCodeHandlers.push(handler);
  }

  /**
   * Register handler for retry messages
   * 
   * @param handler - Function to call when retry is requested
   */
  onRetry(handler: () => void): void {
    this.retryHandlers.push(handler);
  }

  /**
   * Register handler for show message messages
   * 
   * @param handler - Function to call when message should be shown
   */
  onShowMessage(handler: (message: ShowMessageMessage) => void): void {
    this.showMessageHandlers.push(handler);
  }

  /**
   * Handle ready message
   */
  private handleReady(): void {
    this.readyHandlers.forEach(handler => handler());
  }

  /**
   * Handle error message
   */
  private handleError(message: ErrorMessage): void {
    this.errorHandlers.forEach(handler => handler(message));
  }

  /**
   * Handle node selected message
   */
  private handleNodeSelected(message: NodeSelectedMessage): void {
    this.nodeSelectedHandlers.forEach(handler => handler(message));
  }

  /**
   * Handle layout complete message
   */
  private handleLayoutComplete(): void {
    this.layoutCompleteHandlers.forEach(handler => handler());
  }

  /**
   * Handle navigate to code message
   */
  private handleNavigateToCode(message: NavigateToCodeMessage): void {
    console.log('[MessageHandler] Navigate to code:', message);
    this.navigateToCodeHandlers.forEach(handler => handler(message));
  }

  /**
   * Handle retry message
   */
  private handleRetry(): void {
    this.retryHandlers.forEach(handler => handler());
  }

  /**
   * Handle show message
   */
  private handleShowMessage(message: ShowMessageMessage): void {
    this.showMessageHandlers.forEach(handler => handler(message));
  }

  /**
   * Send message to webview
   * 
   * @param panel - The webview panel to send message to
   * @param message - The message to send
   */
  sendMessage(panel: vscode.WebviewPanel, message: any): void {
    panel.webview.postMessage(message);
  }
}
