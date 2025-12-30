/**
 * WebSocket Service for Real-time Updates
 * 
 * This service provides WebSocket connection management for real-time bot data updates.
 * Replace polling with WebSocket for better performance and real-time updates.
 */

import { getApiBaseUrl } from './api';

type WebSocketMessage = {
    type: 'bot_status' | 'balance' | 'positions' | 'income_history' | 'error'
    | 'account_update' | 'balance_update' | 'position_update' | 'status_update'
    | 'spot_orders'
    | string; // Allow other message types from backend
    data: any;
    event?: string; // Some backends use 'event' field
};

type WebSocketCallbacks = {
    onBotStatus?: (status: { running: boolean; stop_flag: boolean }) => void;
    onBalance?: (balance: any) => void;
    onPositions?: (positions: any[]) => void;
    onIncomeHistory?: (history: any[]) => void;
    onSpotOrders?: (spotOrders: any[]) => void;
    onError?: (error: string) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
};

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 3000;
    private callbacks: WebSocketCallbacks = {};
    private isConnecting = false;
    private shouldReconnect = true;

    /**
     * Get WebSocket URL from API base URL
     * Converts http:// to ws:// and https:// to wss://
     * Uses the account websocket endpoint: /api/v1/futures/websocket/account
     */
    private getWebSocketUrl(): string {
        const apiUrl = getApiBaseUrl();

        // Convert HTTP/HTTPS to WS/WSS
        let wsUrl = apiUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

        // Remove trailing slash if present
        wsUrl = wsUrl.replace(/\/$/, '');

        // Use the account websocket endpoint
        wsUrl += '/api/v1/futures/websocket/account';

        // Add authentication token
        const token = localStorage.getItem('auth_token');
        if (token) {
            wsUrl += `?token=${encodeURIComponent(token)}`;
        }

        return wsUrl;
    }

    /**
     * Connect to WebSocket server
     * Connects to backend WebSocket endpoint to receive real-time balance and position updates
     */
    async connect(callbacks: WebSocketCallbacks = {}): Promise<void> {
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
                console.error('[WebSocket] No authentication token found');
                this.isConnecting = false;
                this.callbacks.onError?.('No authentication token found. Please login again.');
                return;
            }

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
                this.callbacks.onConnect?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                }
            };

            this.ws.onerror = (error) => {
                console.error('[WebSocket] Connection error');
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
                this.callbacks.onDisconnect?.();

                // Don't reconnect if close code is 1008 (Policy violation - usually authentication failed)
                if (event.code === 1008) {
                    console.error('[WebSocket] Authentication failed (code 1008)');
                    this.shouldReconnect = false;
                    this.callbacks.onError?.('Authentication failed. Please login again.');
                    return;
                }

                if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => {
                        // Check if token still exists before reconnecting
                        const token = localStorage.getItem('auth_token');
                        if (token) {
                            this.connect(this.callbacks);
                        } else {
                            console.error('[WebSocket] No token found, cannot reconnect');
                            this.shouldReconnect = false;
                            this.callbacks.onError?.('Authentication token expired. Please login again.');
                        }
                    }, this.reconnectDelay);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('[WebSocket] Max reconnection attempts reached');
                    this.shouldReconnect = false;
                    this.callbacks.onError?.('Failed to reconnect to WebSocket server after multiple attempts');
                }
            };
        } catch (error) {
            console.error('[WebSocket] Failed to create connection:', error);
            this.isConnecting = false;
            this.callbacks.onError?.('Failed to create WebSocket connection');
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: WebSocketMessage): void {
        // Handle message type or event field
        const messageType = message.event || message.type;

        switch (messageType) {
            case 'bot_status':
            case 'status_update':
                this.callbacks.onBotStatus?.(message.data);
                break;
            case 'balance':
                this.callbacks.onBalance?.(message.data);
                break;
            case 'balance_update':
            case 'account_update':
                // Account update might contain balance
                if (message.data?.balance !== undefined) {
                    this.callbacks.onBalance?.(message.data.balance);
                } else {
                    this.callbacks.onBalance?.(message.data);
                }
                break;
            case 'positions':
                const positionsArray = Array.isArray(message.data) ? message.data : (message.data ? [message.data] : []);
                this.callbacks.onPositions?.(positionsArray);
                break;
            case 'position_update':
                const positionUpdateArray = Array.isArray(message.data) ? message.data : [message.data];
                this.callbacks.onPositions?.(positionUpdateArray);
                break;
            case 'income_history':
                const incomeArray = Array.isArray(message.data) ? message.data : [];
                this.callbacks.onIncomeHistory?.(incomeArray);
                break;
            case 'spot_orders':
                const spotOrdersArray = Array.isArray(message.data) ? message.data : [];
                this.callbacks.onSpotOrders?.(spotOrdersArray);
                break;
            case 'error':
                this.callbacks.onError?.(message.data?.message || message.data || 'Unknown error');
                break;
            default:
                // Try to handle generic account updates
                if (messageType?.includes('balance') || messageType?.includes('account')) {
                    this.callbacks.onBalance?.(message.data);
                } else if (messageType?.includes('position')) {
                    this.callbacks.onPositions?.(Array.isArray(message.data) ? message.data : [message.data]);
                } else {
                    console.warn('[WebSocket] Unknown message type:', messageType);
                }
        }
    }

    /**
     * Send message to WebSocket server
     */
    send(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send message: WebSocket not connected');
        }
    }

    /**
     * Subscribe to specific data channels
     */
    subscribe(channels: string[]): void {
        this.send({
            type: 'subscribe',
            channels,
        });
    }

    /**
     * Unsubscribe from specific data channels
     */
    unsubscribe(channels: string[]): void {
        this.send({
            type: 'unsubscribe',
            channels,
        });
    }

    /**
     * Disconnect from WebSocket server
     */
    disconnect(): void {
        this.shouldReconnect = false;
        this.isConnecting = false; // Clear connecting flag to prevent race conditions

        if (this.ws) {
            // Only close if connection is established or connecting
            if (this.ws.readyState === WebSocket.CONNECTING ||
                this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.close();
                } catch (e) {
                    console.error('[WebSocket] Error closing WebSocket:', e);
                }
            }
            this.ws = null;
        }
        this.callbacks = {};
    }

    /**
     * Update callbacks without reconnecting
     * Useful when callbacks need to be updated but WebSocket is already connected
     */
    updateCallbacks(callbacks: WebSocketCallbacks): void {
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
export const websocketService = new WebSocketService();

