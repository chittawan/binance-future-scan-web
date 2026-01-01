/**
 * WebSocket Client Service for Scan Signals
 * 
 * This service provides WebSocket connection management for receiving scan signals.
 * Uses the client WebSocket endpoint: /api/v1/futures/websocket/client
 */

import { getApiBaseUrl } from './api';
import type { ScanSignal, ScanSignalMessage } from '../types/scanSignal';

type WebSocketClientMessage = ScanSignalMessage | {
    type: 'error' | string;
    data: any;
};

type WebSocketClientCallbacks = {
    onScanSignal?: (signals: ScanSignal[]) => void;
    onError?: (error: string) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
};

class WebSocketClientService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;
    private callbacks: WebSocketClientCallbacks = {};
    private isConnecting = false;
    private shouldReconnect = true;

    /**
     * Get WebSocket URL from API base URL
     * Converts http:// to ws:// and https:// to wss://
     * Uses the client websocket endpoint: /api/v1/futures/websocket/client
     */
    private getWebSocketUrl(): string {
        const apiUrl = getApiBaseUrl();

        // Convert HTTP/HTTPS to WS/WSS
        let wsUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

        // Remove trailing slash if present
        wsUrl = wsUrl.replace(/\/$/, '');

        // Use the client websocket endpoint
        wsUrl += '/api/v1/futures/websocket/client';

        // Add authentication token
        const token = localStorage.getItem('auth_token');
        if (token) {
            wsUrl += `?token=${encodeURIComponent(token)}`;
        }

        return wsUrl;
    }

    /**
     * Connect to WebSocket server
     */
    async connect(callbacks: WebSocketClientCallbacks = {}): Promise<void> {
        // Check if already connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.updateCallbacks(callbacks);
            return;
        }

        // Check if currently connecting
        if (this.isConnecting) {
            this.updateCallbacks(callbacks);
            return;
        }

        // Merge new callbacks with existing ones
        this.callbacks = { ...this.callbacks, ...callbacks };
        this.shouldReconnect = true;
        this.isConnecting = true;

        try {
            const wsUrl = this.getWebSocketUrl();
            const token = localStorage.getItem('auth_token');

            if (!token) {
                console.error('[WebSocketClient] No authentication token found');
                this.isConnecting = false;
                this.callbacks.onError?.('No authentication token found. Please login again.');
                return;
            }

            console.log('[WebSocketClient] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'));
            this.ws = new WebSocket(wsUrl);

            // Store reference to check if connection was cancelled
            const wsRef = this.ws;

            this.ws.onopen = () => {
                // Check if this connection was cancelled (disconnected before open)
                if (this.ws !== wsRef || !this.shouldReconnect) {
                    if (this.ws) {
                        this.ws.close();
                    }
                    return;
                }

                this.isConnecting = false;
                this.reconnectAttempts = 0;
                console.log('[WebSocketClient] Connected successfully');
                this.callbacks.onConnect?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    console.log('[WebSocketClient] Received message:', event.data.substring(0, 100) + '...');
                    const parsed = JSON.parse(event.data);
                    // Handle both array format (backward compatibility) and object format
                    this.handleMessage(parsed);
                } catch (error) {
                    console.error('[WebSocketClient] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocketClient] Connection error');
                this.isConnecting = false;
                const errorMessage = `WebSocket connection error: ${error?.type || 'Unknown error'}`;
                this.callbacks.onError?.(errorMessage);
            };

            this.ws.onclose = (event) => {
                // Check if this connection was cancelled (disconnected before close)
                if (this.ws !== wsRef) {
                    return;
                }

                this.isConnecting = false;
                this.ws = null; // Clear WebSocket reference
                console.log('[WebSocketClient] Disconnected');
                this.callbacks.onDisconnect?.();

                // Don't reconnect if close code is 1008 (Policy violation - usually authentication failed)
                if (event.code === 1008) {
                    console.error('[WebSocketClient] Authentication failed (code 1008)');
                    this.shouldReconnect = false;
                    this.callbacks.onError?.('Authentication failed. Please login again.');
                    return;
                }

                if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`[WebSocketClient] Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                    setTimeout(() => {
                        // Check if token still exists before reconnecting
                        const token = localStorage.getItem('auth_token');
                        if (token) {
                            this.connect(this.callbacks);
                        } else {
                            console.error('[WebSocketClient] No token found, cannot reconnect');
                            this.shouldReconnect = false;
                            this.callbacks.onError?.('Authentication token expired. Please login again.');
                        }
                    }, this.reconnectDelay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('[WebSocketClient] Max reconnection attempts reached');
                    this.shouldReconnect = false;
                    this.callbacks.onError?.('Failed to reconnect to WebSocket server after multiple attempts');
                }
            };
        } catch (error) {
            console.error('[WebSocketClient] Failed to create connection:', error);
            this.isConnecting = false;
            this.callbacks.onError?.('Failed to create WebSocket connection');
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketClientMessage | ScanSignal[]): void {
        // Handle case where message is an array directly (backward compatibility)
        if (Array.isArray(message)) {
            console.log('[WebSocketClient] Received array format message with', message.length, 'signals');
            this.callbacks.onScanSignal?.(message);
            return;
        }

        // Handle structured message format
        console.log('[WebSocketClient] Received message type:', message.type);
        switch (message.type) {
            case 'scan_signal':
                if ('data' in message && Array.isArray(message.data)) {
                    console.log('[WebSocketClient] Received scan_signal with', message.data.length, 'signals');
                    this.callbacks.onScanSignal?.(message.data);
                } else {
                    console.warn('[WebSocketClient] scan_signal message missing data or data is not array');
                }
                break;
            case 'error':
                this.callbacks.onError?.(message.data?.message || message.data || 'Unknown error');
                break;
            default:
                console.warn('[WebSocketClient] Unknown message type:', message.type);
        }
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.shouldReconnect = false;
        this.isConnecting = false;

        if (this.ws) {
            // Only close if connection is established or connecting
            if (this.ws.readyState === WebSocket.CONNECTING ||
                this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.close();
                } catch (e) {
                    console.error('[WebSocketClient] Error closing WebSocket:', e);
                }
            }
            this.ws = null;
        }
        this.callbacks = {};
    }

    /**
     * Update callbacks without reconnecting
     */
    updateCallbacks(callbacks: WebSocketClientCallbacks): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Check if WebSocket is connecting
     */
    getIsConnecting(): boolean {
        return this.isConnecting || (this.ws !== null && this.ws.readyState === WebSocket.CONNECTING);
    }
}

// Export singleton instance
export const websocketClientService = new WebSocketClientService();

