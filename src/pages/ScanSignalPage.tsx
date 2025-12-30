import React, { useState, useEffect, useRef } from 'react';
import { websocketClientService } from '../services/websocketClient';
import type { ScanSignal } from '../types/scanSignal';

export const ScanSignalPage: React.FC = () => {
    const [signals, setSignals] = useState<ScanSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        // Check if token exists before connecting
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.error('[ScanSignalPage] No authentication token found!');
            setError('No authentication token found. Please login again.');
            setLoading(false);
            return;
        }

        console.log('[ScanSignalPage] Initializing WebSocket connection...');

        const connectWebSocket = async () => {
            try {
                await websocketClientService.connect({
                    onConnect: () => {
                        if (mountedRef.current) {
                            console.log('[ScanSignalPage] WebSocket connected');
                            setIsConnected(true);
                            setError(null);
                            setLoading(false);
                        }
                    },
                    onDisconnect: () => {
                        if (mountedRef.current) {
                            console.log('[ScanSignalPage] WebSocket disconnected');
                            setIsConnected(false);
                        }
                    },
                    onScanSignal: (signalData: ScanSignal[]) => {
                        if (mountedRef.current) {
                            console.log('[ScanSignalPage] Received scan signals:', signalData);
                            // Sort by symbol alphabetically
                            const sorted = [...signalData].sort((a, b) => a.symbol.localeCompare(b.symbol));
                            setSignals(sorted);
                            setError(null);
                            setLoading(false);
                        }
                    },
                    onError: (errorMessage: string) => {
                        if (mountedRef.current) {
                            console.error('[ScanSignalPage] WebSocket error:', errorMessage);
                            setError(errorMessage);
                            setIsConnected(false);
                            setLoading(false);
                        }
                    },
                });
            } catch (error) {
                console.error('[ScanSignalPage] Failed to connect WebSocket:', error);
                if (mountedRef.current) {
                    setError('Failed to connect to WebSocket server');
                    setLoading(false);
                }
            }
        };

        connectWebSocket();

        return () => {
            mountedRef.current = false;
            websocketClientService.disconnect();
        };
    }, []);

    const formatTime = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatPrice = (price: number): string => {
        if (price >= 1) {
            return price.toFixed(4);
        } else if (price >= 0.0001) {
            return price.toFixed(6);
        } else {
            return price.toFixed(8);
        }
    };

    const getTrendColor = (signal: ScanSignal): string => {
        // Determine trend based on EMA values
        // If ema_fast > ema_slow > ema_50: Bullish trend
        // If ema_fast < ema_slow < ema_50: Bearish trend
        const { ema_fast, ema_slow, ema_50 } = signal.sig;
        
        if (ema_fast > ema_slow && ema_slow > ema_50) {
            return 'text-binance-green'; // Bullish
        } else if (ema_fast < ema_slow && ema_slow < ema_50) {
            return 'text-binance-red'; // Bearish
        } else {
            return 'text-binance-text-secondary'; // Neutral
        }
    };

    const getTrendLabel = (signal: ScanSignal): string => {
        const { ema_fast, ema_slow, ema_50 } = signal.sig;
        
        if (ema_fast > ema_slow && ema_slow > ema_50) {
            return 'Bullish';
        } else if (ema_fast < ema_slow && ema_slow < ema_50) {
            return 'Bearish';
        } else {
            return 'Neutral';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-binance-dark">
                <div className="text-center">
                    <div className="text-binance-text-secondary mb-2">Connecting to signal server...</div>
                    <div className="w-8 h-8 border-4 border-binance-yellow border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-binance-dark py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-bold text-binance-text mb-2">Scan Signal</h1>
                            <p className="text-binance-text-secondary">Real-time trading signals from Binance Futures</p>
                        </div>
                        {/* Connection Status */}
                        <div
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                                isConnected
                                    ? 'bg-binance-green/20 text-binance-green border border-binance-green/30'
                                    : 'bg-binance-red/20 text-binance-red border border-binance-red/30'
                            }`}
                        >
                            <div
                                className={`w-2 h-2 rounded-full ${
                                    isConnected ? 'bg-binance-green animate-pulse' : 'bg-binance-red'
                                }`}
                            ></div>
                            <span className="text-sm font-medium">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-md bg-binance-red/20 text-binance-red border border-binance-red/30">
                        {error}
                    </div>
                )}

                {/* Signals Table */}
                {signals.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-binance-text-secondary">
                            {isConnected
                                ? 'Waiting for signals...'
                                : 'Not connected. Please wait for connection...'}
                        </div>
                    </div>
                ) : (
                    <div className="card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-binance-gray-border">
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            Symbol
                                        </th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            Signal Type
                                        </th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            Trend
                                        </th>
                                        <th className="text-right py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            EMA Fast
                                        </th>
                                        <th className="text-right py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            EMA Slow
                                        </th>
                                        <th className="text-right py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            EMA 50
                                        </th>
                                        <th className="text-left py-4 px-4 text-sm font-semibold text-binance-text-secondary">
                                            Time
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {signals.map((signal, index) => (
                                        <tr
                                            key={`${signal.symbol}-${index}`}
                                            className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <span className="font-semibold text-binance-text">
                                                    {signal.symbol}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                                        signal.sig.type === 'long'
                                                            ? 'bg-binance-green/20 text-binance-green'
                                                            : 'bg-binance-red/20 text-binance-red'
                                                    }`}
                                                >
                                                    {signal.sig.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`font-medium ${getTrendColor(signal)}`}>
                                                    {getTrendLabel(signal)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-binance-text">
                                                    {formatPrice(signal.sig.ema_fast)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-binance-text">
                                                    {formatPrice(signal.sig.ema_slow)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <span className="text-binance-text">
                                                    {formatPrice(signal.sig.ema_50)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="text-binance-text-secondary text-sm">
                                                    {formatTime(signal.sig.time)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                {signals.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Total Signals</div>
                            <div className="text-2xl font-bold text-binance-text">{signals.length}</div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Long Signals</div>
                            <div className="text-2xl font-bold text-binance-green">
                                {signals.filter((s) => s.sig.type === 'long').length}
                            </div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Short Signals</div>
                            <div className="text-2xl font-bold text-binance-red">
                                {signals.filter((s) => s.sig.type === 'short').length}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

