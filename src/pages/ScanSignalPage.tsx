import React, { useState, useEffect, useRef, useMemo } from 'react';
import { websocketClientService } from '../services/websocketClient';
import type { ScanSignal } from '../types/scanSignal';

type SortColumn = 'symbol' | 'trend' | 'state' | 'score' | 'ema_fast' | 'ema_slow' | 'ema_50' | 'adx' | 'time';
type SortDirection = 'asc' | 'desc';

export const ScanSignalPage: React.FC = () => {
    const [signals, setSignals] = useState<ScanSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<SortColumn>('symbol');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
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
                            // Don't sort here - let useMemo handle sorting
                            setSignals(signalData);
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


    const getTrendLabel = (signal: ScanSignal): string => {
        // Use trend field if available
        if (signal.trend) {
            return signal.trend;
        }

        // Fallback: Calculate from EMA values
        const { ema_fast, ema_slow, ema_50 } = signal;

        if (ema_fast > ema_slow && ema_slow > ema_50) {
            return 'Bullish';
        } else if (ema_fast < ema_slow && ema_slow < ema_50) {
            return 'Bearish';
        } else {
            return 'Neutral';
        }
    };

    const getStateBadgeClass = (state: string): string => {
        const stateUpper = state.toUpperCase();

        if (stateUpper === 'WATCH') {
            return 'bg-binance-yellow/20 text-binance-yellow';
        } else if (stateUpper === 'ACTIVE') {
            return 'bg-binance-green/20 text-binance-green';
        } else if (stateUpper === 'LONG_CONTINUE' || stateUpper === 'LONG_START') {
            return 'bg-binance-green/20 text-binance-green border border-binance-green/30';
        } else if (stateUpper === 'SHORT_CONTINUE' || stateUpper === 'SHORT_START') {
            return 'bg-binance-red/20 text-binance-red border border-binance-red/30';
        } else {
            return 'bg-binance-text-secondary/20 text-binance-text-secondary';
        }
    };

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            // Toggle direction if same column
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column with ascending direction
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedSignals = useMemo(() => {
        const sorted = [...signals];

        sorted.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortColumn) {
                case 'symbol':
                    aValue = a.symbol;
                    bValue = b.symbol;
                    break;
                case 'trend':
                    aValue = getTrendLabel(a);
                    bValue = getTrendLabel(b);
                    break;
                case 'state':
                    aValue = a.state;
                    bValue = b.state;
                    break;
                case 'score':
                    aValue = a.score;
                    bValue = b.score;
                    break;
                case 'ema_fast':
                    aValue = a.ema_fast;
                    bValue = b.ema_fast;
                    break;
                case 'ema_slow':
                    aValue = a.ema_slow;
                    bValue = b.ema_slow;
                    break;
                case 'ema_50':
                    aValue = a.ema_50;
                    bValue = b.ema_50;
                    break;
                case 'adx':
                    aValue = a.adx;
                    bValue = b.adx;
                    break;
                case 'time':
                    aValue = a.time;
                    bValue = b.time;
                    break;
                default:
                    return 0;
            }

            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return sortDirection === 'asc' ? comparison : -comparison;
            }

            // Handle number comparison
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });

        return sorted;
    }, [signals, sortColumn, sortDirection]);

    // Group signals by trend
    const groupedSignals = useMemo(() => {
        const bullish: ScanSignal[] = [];
        const bearish: ScanSignal[] = [];
        const neutral: ScanSignal[] = [];

        sortedSignals.forEach((signal) => {
            const trend = getTrendLabel(signal).toLowerCase();
            if (trend === 'bullish' || trend === 'long') {
                bullish.push(signal);
            } else if (trend === 'bearish' || trend === 'short') {
                bearish.push(signal);
            } else {
                neutral.push(signal);
            }
        });

        return { bullish, bearish, neutral };
    }, [sortedSignals]);

    // Get time from first signal (all signals have same time)
    const displayTime = signals.length > 0 ? formatTime(signals[0].time) : null;

    const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
        if (sortColumn !== column) {
            return (
                <svg className="w-4 h-4 ml-1 text-binance-text-secondary opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
            );
        }

        if (sortDirection === 'asc') {
            return (
                <svg className="w-4 h-4 ml-1 text-binance-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
            );
        } else {
            return (
                <svg className="w-4 h-4 ml-1 text-binance-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            );
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
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${isConnected
                                ? 'bg-binance-green/20 text-binance-green border border-binance-green/30'
                                : 'bg-binance-red/20 text-binance-red border border-binance-red/30'
                                }`}
                        >
                            <div
                                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-binance-green animate-pulse' : 'bg-binance-red'
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

                {/* Time Label */}
                {displayTime && signals.length > 0 && (
                    <div className="mb-4">
                        <div className="text-sm text-binance-text-secondary">
                            Time: <span className="text-binance-text font-semibold">{displayTime}</span>
                        </div>
                    </div>
                )}

                {/* Signals Display */}
                {signals.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-binance-text-secondary">
                            {isConnected
                                ? 'Waiting for signals...'
                                : 'Not connected. Please wait for connection...'}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Bull / Bear Panel - Single Card with 50/50 Split */}
                        <div className="card overflow-hidden mb-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-binance-gray-border">
                                {/* Bullish Panel - Left 50% */}
                                <div className="overflow-hidden">
                                    <div className="px-4 py-3 border-b border-binance-gray-border bg-binance-green/10">
                                        <h2 className="text-lg font-semibold text-binance-green">
                                            Bullish ({groupedSignals.bullish.length})
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-binance-gray-border">
                                                    <th
                                                        className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('symbol')}
                                                    >
                                                        <div className="flex items-center">
                                                            Symbol
                                                            <SortIcon column="symbol" />
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('state')}
                                                    >
                                                        <div className="flex items-center">
                                                            State
                                                            <SortIcon column="state" />
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('score')}
                                                    >
                                                        <div className="flex items-center justify-end">
                                                            Score
                                                            <SortIcon column="score" />
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('adx')}
                                                    >
                                                        <div className="flex items-center justify-end">
                                                            ADX
                                                            <SortIcon column="adx" />
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedSignals.bullish.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-binance-text-secondary">
                                                            No bullish signals
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    groupedSignals.bullish.map((signal, index) => (
                                                        <tr
                                                            key={`bull-${signal.symbol}-${index}`}
                                                            className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                                                        >
                                                            <td className="py-3 px-4">
                                                                <span className="font-semibold text-binance-text">
                                                                    {signal.symbol}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span
                                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStateBadgeClass(signal.state)}`}
                                                                >
                                                                    {signal.state}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className="text-binance-text font-semibold">
                                                                    {signal.score}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className="text-binance-text">
                                                                    {signal.adx.toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Bearish Panel - Right 50% */}
                                <div className="overflow-hidden">
                                    <div className="px-4 py-3 border-b border-binance-gray-border bg-binance-red/10">
                                        <h2 className="text-lg font-semibold text-binance-red">
                                            Bearish ({groupedSignals.bearish.length})
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-binance-gray-border">
                                                    <th
                                                        className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('symbol')}
                                                    >
                                                        <div className="flex items-center">
                                                            Symbol
                                                            <SortIcon column="symbol" />
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('state')}
                                                    >
                                                        <div className="flex items-center">
                                                            State
                                                            <SortIcon column="state" />
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('score')}
                                                    >
                                                        <div className="flex items-center justify-end">
                                                            Score
                                                            <SortIcon column="score" />
                                                        </div>
                                                    </th>
                                                    <th
                                                        className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                        onClick={() => handleSort('adx')}
                                                    >
                                                        <div className="flex items-center justify-end">
                                                            ADX
                                                            <SortIcon column="adx" />
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupedSignals.bearish.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="py-8 text-center text-binance-text-secondary">
                                                            No bearish signals
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    groupedSignals.bearish.map((signal, index) => (
                                                        <tr
                                                            key={`bear-${signal.symbol}-${index}`}
                                                            className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                                                        >
                                                            <td className="py-3 px-4">
                                                                <span className="font-semibold text-binance-text">
                                                                    {signal.symbol}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span
                                                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStateBadgeClass(signal.state)}`}
                                                                >
                                                                    {signal.state}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className="text-binance-text font-semibold">
                                                                    {signal.score}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className="text-binance-text">
                                                                    {signal.adx.toFixed(2)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Neutral Panel at Bottom */}
                        {groupedSignals.neutral.length > 0 && (
                            <div className="card overflow-hidden">
                                <div className="px-4 py-3 border-b border-binance-gray-border bg-binance-text-secondary/10">
                                    <h2 className="text-lg font-semibold text-binance-text-secondary">
                                        Neutral ({groupedSignals.neutral.length})
                                    </h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-binance-gray-border">
                                                <th
                                                    className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                    onClick={() => handleSort('symbol')}
                                                >
                                                    <div className="flex items-center">
                                                        Symbol
                                                        <SortIcon column="symbol" />
                                                    </div>
                                                </th>
                                                <th
                                                    className="text-left py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                    onClick={() => handleSort('state')}
                                                >
                                                    <div className="flex items-center">
                                                        State
                                                        <SortIcon column="state" />
                                                    </div>
                                                </th>
                                                <th
                                                    className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                    onClick={() => handleSort('score')}
                                                >
                                                    <div className="flex items-center justify-end">
                                                        Score
                                                        <SortIcon column="score" />
                                                    </div>
                                                </th>
                                                <th
                                                    className="text-right py-3 px-4 text-sm font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                                    onClick={() => handleSort('adx')}
                                                >
                                                    <div className="flex items-center justify-end">
                                                        ADX
                                                        <SortIcon column="adx" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedSignals.neutral.map((signal, index) => (
                                                <tr
                                                    key={`neutral-${signal.symbol}-${index}`}
                                                    className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                                                >
                                                    <td className="py-3 px-4">
                                                        <span className="font-semibold text-binance-text">
                                                            {signal.symbol}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span
                                                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${signal.state === 'WATCH'
                                                                ? 'bg-binance-yellow/20 text-binance-yellow'
                                                                : signal.state === 'ACTIVE'
                                                                    ? 'bg-binance-green/20 text-binance-green'
                                                                    : 'bg-binance-text-secondary/20 text-binance-text-secondary'
                                                                }`}
                                                        >
                                                            {signal.state}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className="text-binance-text font-semibold">
                                                            {signal.score}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className="text-binance-text">
                                                            {signal.adx.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Summary Stats */}
                {signals.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Total Signals</div>
                            <div className="text-2xl font-bold text-binance-text">{signals.length}</div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Watch State</div>
                            <div className="text-2xl font-bold text-binance-yellow">
                                {signals.filter((s) => s.state === 'WATCH').length}
                            </div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Bullish Trend</div>
                            <div className="text-2xl font-bold text-binance-green">
                                {signals.filter((s) => {
                                    const trend = getTrendLabel(s).toLowerCase();
                                    return trend === 'bullish' || trend === 'long';
                                }).length}
                            </div>
                        </div>
                        <div className="card">
                            <div className="text-sm text-binance-text-secondary mb-1">Bearish Trend</div>
                            <div className="text-2xl font-bold text-binance-red">
                                {signals.filter((s) => {
                                    const trend = getTrendLabel(s).toLowerCase();
                                    return trend === 'bearish' || trend === 'short';
                                }).length}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

