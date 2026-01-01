import React, { useState, useEffect, useRef, useMemo } from 'react';
import { websocketClientService } from '../services/websocketClient';
import type { ScanSignal } from '../types/scanSignal';
import SignalChart from '../components/SignalChart';

type SortColumn = 'symbol' | 'trend' | 'state' | 'score' | 'ema_fast' | 'ema_slow' | 'ema_50' | 'adx' | 'time';
type SortDirection = 'asc' | 'desc';

type ViewMode = 'default' | 'three-column';

export const ScanSignalPage: React.FC = () => {
    const [signals, setSignals] = useState<ScanSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<SortColumn>('symbol');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [chartSymbol, setChartSymbol] = useState<string | null>(null);
    const [chartTrend, setChartTrend] = useState<string | null>(null);
    const [chartState, setChartState] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('default');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const mountedRef = useRef(true);

    // Helper function to handle chart symbol click with trend and state
    const handleChartSymbolClick = (symbol: string, panelTrend?: 'Bullish' | 'Bearish' | 'Neutral') => {
        const signal = signals.find(s => s.symbol === symbol);
        // Use panelTrend if provided (from which panel it was clicked), otherwise use getTrendLabel
        let trend: string | null = null;
        if (panelTrend) {
            trend = panelTrend;
        } else if (signal) {
            trend = getTrendLabel(signal);
        }
        // Get state from signal
        const state = signal?.state || null;
        setChartSymbol(symbol);
        setChartTrend(trend);
        setChartState(state);
    };

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

    // Helper function to remove LONG_ and SHORT_ prefix from state
    const formatState = (state: string): string => {
        if (state.startsWith('LONG_')) {
            return state.substring(5); // Remove "LONG_"
        } else if (state.startsWith('SHORT_')) {
            return state.substring(6); // Remove "SHORT_"
        }
        return state;
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

    // Filter signals by search query
    const filteredSignals = useMemo(() => {
        if (!searchQuery.trim()) {
            return sortedSignals;
        }
        const query = searchQuery.trim().toLowerCase();
        return sortedSignals.filter((signal) => {
            return signal.symbol.toLowerCase().includes(query);
        });
    }, [sortedSignals, searchQuery]);

    // Group signals by trend
    const groupedSignals = useMemo(() => {
        const bullish: ScanSignal[] = [];
        const bearish: ScanSignal[] = [];
        const neutral: ScanSignal[] = [];

        filteredSignals.forEach((signal) => {
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
    }, [filteredSignals]);

    // Get time from first signal (all signals have same time)
    const displayTime = signals.length > 0 ? formatTime(signals[0].time) : null;

    // Create symbol list for chart navigation - use filteredSignals to maintain sort order
    const symbolList = useMemo(() => {
        return filteredSignals.map(s => s.symbol);
    }, [filteredSignals]);

    // Helper function to render a signal table panel
    const renderSignalTable = (
        signals: ScanSignal[],
        title: string,
        titleColor: string,
        bgColor: string,
        keyPrefix: string,
        panelTrend?: 'Bullish' | 'Bearish' | 'Neutral'
    ) => {
        return (
            <div className="overflow-hidden">
                <div className={`px-4 py-3 border-b border-binance-gray-border ${bgColor}`}>
                    <h2 className={`text-lg font-semibold ${titleColor}`}>
                        {title} ({signals.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-binance-gray-border">
                                <th
                                    className="text-left py-2.5 px-3 text-xs font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                    onClick={() => handleSort('symbol')}
                                >
                                    <div className="flex items-center">
                                        Symbol
                                        <SortIcon column="symbol" />
                                    </div>
                                </th>
                                <th
                                    className="text-left py-2.5 px-2 text-xs font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                    onClick={() => handleSort('state')}
                                >
                                    <div className="flex items-center">
                                        State
                                        <SortIcon column="state" />
                                    </div>
                                </th>
                                <th
                                    className="text-right py-2.5 px-3 text-xs font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
                                    onClick={() => handleSort('score')}
                                >
                                    <div className="flex items-center justify-end">
                                        Score
                                        <SortIcon column="score" />
                                    </div>
                                </th>
                                <th
                                    className="text-right py-2.5 px-3 text-xs font-semibold text-binance-text-secondary cursor-pointer hover:text-binance-yellow transition-colors select-none"
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
                            {signals.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-binance-text-secondary">
                                        No {title.toLowerCase()} signals
                                    </td>
                                </tr>
                            ) : (
                                signals.map((signal, index) => (
                                    <tr
                                        key={`${keyPrefix}-${signal.symbol}-${index}`}
                                        className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                                    >
                                        <td
                                            className="py-2 px-3 cursor-pointer hover:text-binance-yellow transition-colors"
                                            onClick={() => handleChartSymbolClick(signal.symbol, panelTrend)}
                                            title="Click to view chart"
                                        >
                                            <span className="text-sm font-semibold text-binance-text">
                                                {signal.symbol}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${getStateBadgeClass(signal.state)}`}
                                            >
                                                {formatState(signal.state)}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <span className="text-sm text-binance-text font-semibold">
                                                {signal.score}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <span className="text-sm text-binance-text">
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
        );
    };

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

                {/* Search Bar */}
                {signals.length > 0 && (
                    <div className="mb-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาเหรียญ (เช่น BTCUSDT, ETHUSDT...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-2.5 pl-10 bg-binance-gray-light border border-binance-gray-border rounded-lg text-binance-text placeholder-binance-text-secondary focus:outline-none focus:ring-2 focus:ring-binance-yellow focus:border-transparent transition-all"
                            />
                            <svg
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-binance-text-secondary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-binance-text-secondary hover:text-binance-text transition-colors"
                                    title="Clear search"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <div className="mt-2 text-sm text-binance-text-secondary">
                                พบ {filteredSignals.length} เหรียญ จากทั้งหมด {signals.length} เหรียญ
                            </div>
                        )}
                    </div>
                )}

                {/* Time Label and View Mode */}
                {displayTime && signals.length > 0 && (
                    <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-binance-text-secondary">
                            Time: <span className="text-binance-text font-semibold">{displayTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-binance-text-secondary">View Mode:</span>
                            <button
                                onClick={() => setViewMode('default')}
                                className={`px-3 py-1.5 text-xs rounded transition-colors ${viewMode === 'default'
                                    ? 'bg-binance-yellow text-binance-dark font-semibold'
                                    : 'bg-binance-gray-light text-binance-text hover:bg-binance-gray-border'
                                    }`}
                            >
                                Default
                            </button>
                            <button
                                onClick={() => setViewMode('three-column')}
                                className={`px-3 py-1.5 text-xs rounded transition-colors ${viewMode === 'three-column'
                                    ? 'bg-binance-yellow text-binance-dark font-semibold'
                                    : 'bg-binance-gray-light text-binance-text hover:bg-binance-gray-border'
                                    }`}
                            >
                                3 Columns
                            </button>
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
                ) : filteredSignals.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-binance-text-secondary">
                            ไม่พบเหรียญที่ตรงกับคำค้นหา "{searchQuery}"
                        </div>
                    </div>
                ) : (
                    <>
                        {viewMode === 'default' ? (
                            <>
                                {/* Default Mode: Bull / Bear Panel - Single Card with 50/50 Split */}
                                <div className="card overflow-hidden mb-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-binance-gray-border">
                                        {/* Bullish Panel - Left 50% */}
                                        {renderSignalTable(
                                            groupedSignals.bullish,
                                            'Bullish',
                                            'text-binance-green',
                                            'bg-binance-green/10',
                                            'bull',
                                            'Bullish'
                                        )}
                                        {/* Bearish Panel - Right 50% */}
                                        {renderSignalTable(
                                            groupedSignals.bearish,
                                            'Bearish',
                                            'text-binance-red',
                                            'bg-binance-red/10',
                                            'bear',
                                            'Bearish'
                                        )}
                                    </div>
                                </div>

                                {/* Neutral Panel at Bottom */}
                                {groupedSignals.neutral.length > 0 && (
                                    <div className="card overflow-hidden">
                                        {renderSignalTable(
                                            groupedSignals.neutral,
                                            'Neutral',
                                            'text-binance-text-secondary',
                                            'bg-binance-text-secondary/10',
                                            'neutral',
                                            'Neutral'
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Three Column Mode: Bullish, Neutral, Bearish in 3 columns (4-4-4) */}
                                <div className="card overflow-hidden">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 divide-x divide-binance-gray-border">
                                        {/* Bullish Panel - 4 cols */}
                                        <div className="lg:col-span-4">
                                            {renderSignalTable(
                                                groupedSignals.bullish,
                                                'Bullish',
                                                'text-binance-green',
                                                'bg-binance-green/10',
                                                'bull',
                                                'Bullish'
                                            )}
                                        </div>
                                        {/* Neutral Panel - 4 cols */}
                                        <div className="lg:col-span-4">
                                            {renderSignalTable(
                                                groupedSignals.neutral,
                                                'Neutral',
                                                'text-binance-text-secondary',
                                                'bg-binance-text-secondary/10',
                                                'neutral',
                                                'Neutral'
                                            )}
                                        </div>
                                        {/* Bearish Panel - 4 cols */}
                                        <div className="lg:col-span-4">
                                            {renderSignalTable(
                                                groupedSignals.bearish,
                                                'Bearish',
                                                'text-binance-red',
                                                'bg-binance-red/10',
                                                'bear',
                                                'Bearish'
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
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

                {/* Signal Chart Modal */}
                {chartSymbol && (
                    <SignalChart
                        symbol={chartSymbol}
                        interval="1h"
                        onClose={() => {
                            setChartSymbol(null);
                            setChartTrend(null);
                            setChartState(null);
                        }}
                        symbolList={symbolList}
                        onSymbolChange={(newSymbol) => {
                            const signal = signals.find(s => s.symbol === newSymbol);
                            const trend = signal ? getTrendLabel(signal) : null;
                            const state = signal?.state || null;
                            setChartSymbol(newSymbol);
                            setChartTrend(trend);
                            setChartState(state);
                        }}
                        trend={chartTrend || undefined}
                        state={chartState || undefined}
                    />
                )}
            </div>
        </div>
    );
};

