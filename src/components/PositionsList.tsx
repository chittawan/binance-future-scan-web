import React, { useState } from 'react';
import type { Position, IncomeHistory, SpotOrder, Balance } from '../types/bot';
import { spotService } from '../services/api';
import SignalChart from './SignalChart';

interface PositionsListProps {
  positions: Position[];
  incomeHistory?: IncomeHistory[];
  spotOrders?: SpotOrder[];
  balance?: Balance | null;
  loading?: boolean;
  configSymbols?: string[];
  onClosePosition?: (symbol: string, side: 'LONG' | 'SHORT') => void;
  onTabChange?: (tab: 'positions' | 'history') => void;
}

type SortColumn = 'symbol' | 'time' | 'pnl' | null;
type SpotSortColumn = 'asset' | 'usdt_value' | null;
type SortOrder = 'asc' | 'desc';

interface SortState {
  column: SortColumn;
  order: SortOrder;
}

interface SpotSortState {
  column: SpotSortColumn;
  order: SortOrder;
}

export const PositionsList: React.FC<PositionsListProps> = ({
  positions,
  incomeHistory = [],
  spotOrders = [],
  balance = null,
  loading = false,
  configSymbols = [],
  onClosePosition,
  onTabChange
}) => {
  const [confirmClose, setConfirmClose] = useState<{ symbol: string; side: 'LONG' | 'SHORT' } | null>(null);
  const [confirmCloseSpot, setConfirmCloseSpot] = useState<{ symbol: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>({ column: null, order: 'desc' });
  const [spotSortState, setSpotSortState] = useState<SpotSortState>({ column: null, order: 'desc' });
  const [actionLoading, setActionLoading] = useState(false);

  // Debug: Log positions data
  // console.log('[PositionsList] Received positions:', positions);
  // console.log('[PositionsList] Positions count:', positions.length);

  const activePositions = positions.filter((pos) => {
    const positionAmt = parseFloat(pos.positionAmt || '0');
    const isActive = positionAmt !== 0;
    if (!isActive) {
      console.log('[PositionsList] Filtered out position:', pos.symbol, 'positionAmt:', pos.positionAmt);
    }
    return isActive;
  });

  console.log('[PositionsList] Active positions count:', activePositions.length);

  // Sort positions based on sortState
  const sortedPositions = React.useMemo(() => {
    if (!sortState.column) {
      return activePositions;
    }

    const sorted = [...activePositions].sort((a, b) => {
      let comparison = 0;

      switch (sortState.column) {
        case 'symbol':
          // Sort alphabetically by symbol
          comparison = (a.symbol || '').localeCompare(b.symbol || '');
          break;
        case 'time':
          // Sort by time (updateTime or openTime)
          const timeA = a.updateTime || a.openTime || 0;
          const timeB = b.updateTime || b.openTime || 0;
          comparison = timeA - timeB;
          break;
        case 'pnl':
          // Sort by unrealized profit
          const pnlA = parseFloat(a.unRealizedProfit || '0');
          const pnlB = parseFloat(b.unRealizedProfit || '0');
          comparison = pnlA - pnlB;
          break;
      }

      return sortState.order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [activePositions, sortState]);

  const handleSort = (column: SortColumn) => {
    if (sortState.column === column) {
      // Same column: toggle order
      if (sortState.order === 'desc') {
        setSortState({ column, order: 'asc' });
      } else {
        // Remove sorting when clicking the same column for the third time
        setSortState({ column: null, order: 'desc' });
      }
    } else {
      // Different column: set new column with default order
      setSortState({ column, order: 'desc' });
    }
  };

  const handleTabChange = (tab: 'positions' | 'history') => {
    setActiveTab(tab);
    // Notify parent component about tab change
    onTabChange?.(tab);
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-baseline justify-between mb-6 border-b border-binance-gray-border pb-3">
          <div className="flex gap-4">
            <div className="text-xl font-semibold text-white/50 leading-tight">
              Positions ({positions.length})
            </div>
            <div className="text-xl font-semibold text-white/50 leading-tight">
              Trade History ({incomeHistory.length})
            </div>
          </div>
          <div className="text-xl font-bold text-white/50 leading-tight">
            - USDT
          </div>
        </div>
        <div className="text-white/70">Loading...</div>
      </div>
    );
  }

  const handleCloseClick = (symbol: string, side: 'LONG' | 'SHORT') => {
    setConfirmClose({ symbol, side });
  };

  const handleConfirmClose = () => {
    if (confirmClose) {
      onClosePosition?.(confirmClose.symbol, confirmClose.side);
      setConfirmClose(null);
    }
  };

  const handleCancelClose = () => {
    setConfirmClose(null);
  };

  const handleCloseSpotClick = (asset: string) => {
    // Convert asset to symbol format (e.g., "BTC" -> "BTCUSDT")
    const symbol = `${asset}USDT`;
    setConfirmCloseSpot({ symbol });
  };

  const handleConfirmCloseSpot = async () => {
    if (confirmCloseSpot) {
      try {
        setActionLoading(true);
        const result = await spotService.closeOrder(confirmCloseSpot.symbol);
        if (result.error) {
          console.error('Failed to close spot order:', result.error);
          alert(`Failed to close spot order: ${result.error}`);
        } else {
          console.log('Spot order closed successfully');
          // Optionally refresh data or show success message
        }
        setConfirmCloseSpot(null);
      } catch (error: any) {
        console.error('Failed to close spot order:', error);
        alert(`Failed to close spot order: ${error.response?.data?.error || error.message}`);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleCancelCloseSpot = () => {
    setConfirmCloseSpot(null);
  };

  const handleSymbolClick = (symbol: string, e?: React.MouseEvent) => {
    // If Ctrl/Cmd is pressed, open Binance link, otherwise show chart
    if (e?.ctrlKey || e?.metaKey) {
      const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;
      window.open(binanceUrl, '_blank', 'noopener,noreferrer');
    } else {
      setChartSymbol(symbol);
    }
  };

  const isSymbolInConfig = (symbol: string): boolean => {
    return configSymbols.includes(symbol);
  };

  // Filter and calculate spot orders data (exclude USDT)
  const filteredSpotOrders = React.useMemo(() => {
    return spotOrders.filter(order => {
      // Filter out USDT and assets with zero total balance
      if (order.asset === 'USDT') return false;
      const total = parseFloat(String(order.total || '0'));
      return total > 0;
    });
  }, [spotOrders]);

  // Get USDT balance separately
  const usdtBalance = React.useMemo(() => {
    const usdtOrder = spotOrders.find(order => order.asset === 'USDT');
    if (!usdtOrder) return null;
    return {
      free: parseFloat(String(usdtOrder.free || '0')),
      locked: parseFloat(String(usdtOrder.locked || '0')),
      total: parseFloat(String(usdtOrder.total || '0')),
    };
  }, [spotOrders]);

  // Get list of symbols from active positions and spot orders for chart navigation
  // Use sortedPositions and sortedSpotOrders to maintain sort order
  const symbolList = React.useMemo(() => {
    const futuresSymbols = sortedPositions.map(pos => pos.symbol);
    const spotSymbols = sortedSpotOrders.map(order => `${order.asset}USDT`);
    // Combine futures and spot symbols, remove duplicates while maintaining order
    const combined: string[] = [];
    const seen = new Set<string>();
    // Add futures symbols first (maintaining sort order)
    futuresSymbols.forEach(symbol => {
      if (!seen.has(symbol)) {
        combined.push(symbol);
        seen.add(symbol);
      }
    });
    // Add spot symbols (maintaining sort order)
    spotSymbols.forEach(symbol => {
      if (!seen.has(symbol)) {
        combined.push(symbol);
        seen.add(symbol);
      }
    });
    return combined;
  }, [sortedPositions, sortedSpotOrders]);

  // Sort spot orders based on spotSortState
  const sortedSpotOrders = React.useMemo(() => {
    if (!spotSortState.column) {
      return filteredSpotOrders;
    }

    const sorted = [...filteredSpotOrders].sort((a, b) => {
      let comparison = 0;

      switch (spotSortState.column) {
        case 'asset':
          // Sort alphabetically by asset
          comparison = (a.asset || '').localeCompare(b.asset || '');
          break;
        case 'usdt_value':
          // Sort by USDT value
          const valueA = parseFloat(String(a.usdt_value || '0'));
          const valueB = parseFloat(String(b.usdt_value || '0'));
          comparison = valueA - valueB;
          break;
      }

      return spotSortState.order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredSpotOrders, spotSortState]);

  const handleSpotSort = (column: SpotSortColumn) => {
    if (spotSortState.column === column) {
      // Same column: toggle order
      if (spotSortState.order === 'desc') {
        setSpotSortState({ column, order: 'asc' });
      } else {
        // Remove sorting when clicking the same column for the third time
        setSpotSortState({ column: null, order: 'desc' });
      }
    } else {
      // Different column: set new column with default order
      setSpotSortState({ column, order: 'desc' });
    }
  };

  // Calculate total USDT value for spot orders
  const totalSpotUsdtValue = React.useMemo(() => {
    return filteredSpotOrders.reduce((sum, order) => {
      return sum + parseFloat(String(order.usdt_value || '0'));
    }, 0);
  }, [filteredSpotOrders]);

  // Calculate total PNL from all positions
  const totalPnl = activePositions.reduce((sum, position) => {
    const unrealizedPnl = parseFloat(position.unRealizedProfit || '0');
    return sum + unrealizedPnl;
  }, 0);
  const isTotalProfit = totalPnl >= 0;

  // Calculate total income from history
  const totalIncome = incomeHistory.reduce((sum, income) => {
    return sum + parseFloat(income.income || '0');
  }, 0);
  const isIncomeProfit = totalIncome >= 0;

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date as dd/mm/yyyy HH:mm:ss
  const formatDateTime = (timestamp: number | string | undefined): string => {
    if (!timestamp) return '';
    const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <>
      <div className="card">
        {/* Futures Header */}
        <div className="flex items-center justify-between mb-6 border-b border-binance-gray-border pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-binance-yellow">Futures</h2>
          </div>
          {balance && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-white/50 mb-1">Available Balance</div>
                <div className="text-xl font-bold leading-tight text-binance-yellow">
                  {(() => {
                    const availableBalance = parseFloat(balance.availableBalance || balance.available_balance || '0');
                    return (
                      <>
                        {availableBalance.toFixed(2)} <span className="text-base text-white/70">USDT</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-baseline justify-between mb-6 border-b border-binance-gray-border pb-3">
          <div className="flex gap-6">
            <button
              onClick={() => handleTabChange('positions')}
              className={`relative text-xl font-semibold leading-tight transition-all duration-200 ${activeTab === 'positions'
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
                }`}
            >
              Positions ({activePositions.length})
              {activeTab === 'positions' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-binance-yellow -mb-3"></span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`relative text-xl font-semibold leading-tight transition-all duration-200 ${activeTab === 'history'
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
                }`}
            >
              Trade History ({incomeHistory.length})
              {activeTab === 'history' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-binance-yellow -mb-3"></span>
              )}
            </button>
          </div>
          {activeTab === 'positions' && (
            <div className={`text-xl font-bold leading-tight ${isTotalProfit ? 'text-binance-green' : 'text-binance-red'}`}>
              {(() => {
                const pnlStr = totalPnl.toFixed(2);
                const [integerPart, decimalPart] = pnlStr.split('.');
                const sign = isTotalProfit ? '+' : '';
                return (
                  <>
                    {sign}{integerPart}
                    <span className="text-[0.7em]">{decimalPart ? `.${decimalPart}` : ''}</span> USDT
                  </>
                );
              })()}
            </div>
          )}
          {activeTab === 'history' && (
            <div className={`text-xl font-bold leading-tight ${isIncomeProfit ? 'text-binance-green' : 'text-binance-red'}`}>
              {(() => {
                const incomeStr = totalIncome.toFixed(2);
                const [integerPart, decimalPart] = incomeStr.split('.');
                const sign = isIncomeProfit ? '+' : '';
                return (
                  <>
                    {sign}{integerPart}
                    <span className="text-[0.7em]">{decimalPart ? `.${decimalPart}` : ''}</span> USDT
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-binance-gray-border">
                  <th
                    className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-white w-[20%] md:w-auto cursor-pointer hover:text-binance-yellow transition-colors select-none"
                    onClick={() => handleSort('symbol')}
                    title="Click to sort by symbol"
                  >
                    <div className="flex items-center gap-1">
                      <span>Symbol</span>
                      {sortState.column === 'symbol' && sortState.order === 'desc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      {sortState.column === 'symbol' && sortState.order === 'asc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                      {sortState.column !== 'symbol' && (
                        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="hidden md:table-cell text-right py-3 px-4 text-sm font-semibold text-white">Size</th>
                  <th
                    className="hidden md:table-cell text-right py-3 px-4 text-sm font-semibold text-white cursor-pointer hover:text-binance-yellow transition-colors select-none"
                    onClick={() => handleSort('time')}
                    title="Click to sort by time"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Entry Price</span>
                      {sortState.column === 'time' && sortState.order === 'desc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      {sortState.column === 'time' && sortState.order === 'asc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                      {sortState.column !== 'time' && (
                        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="hidden md:table-cell text-right py-3 px-4 text-sm font-semibold text-white">Mark Price</th>
                  <th className="hidden md:table-cell text-right py-3 px-4 text-sm font-semibold text-white">Margin</th>
                  <th
                    className="text-right py-3 px-2 md:px-4 text-sm font-semibold text-white w-[30%] md:w-auto cursor-pointer hover:text-binance-yellow transition-colors select-none"
                    onClick={() => handleSort('pnl')}
                    title="Click to sort by PNL"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>PNL(ROI %)</span>
                      {sortState.column === 'pnl' && sortState.order === 'desc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      {sortState.column === 'pnl' && sortState.order === 'asc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                      {sortState.column !== 'pnl' && (
                        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 md:px-4 text-sm font-semibold text-white w-[20%] md:w-auto">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedPositions.map((position, index) => {
                  const amount = parseFloat(position.positionAmt || '0');
                  const side = amount > 0 ? 'LONG' : 'SHORT';
                  const unrealizedPnl = parseFloat(position.unRealizedProfit || '0');
                  const isProfit = unrealizedPnl >= 0;
                  const entryPrice = parseFloat(position.entryPrice || '0');
                  const markPrice = parseFloat(position.markPrice || '0');
                  const isolatedMargin = parseFloat(position.isolatedMargin || '0');
                  const initialMargin = parseFloat(position.initialMargin || '0');
                  const isolatedWallet = parseFloat(position.isolatedWallet || '0');
                  const marginType = parseFloat(position.isolatedMargin || '0') > 0 ? 'ISOLATED' : 'CROSS';
                  const qty = Math.abs(amount);

                  // Calculate notional value: position size * mark price
                  const notionalValue = position.notional
                    ? Math.abs(parseFloat(position.notional))
                    : qty * markPrice;

                  // Use leverage from normalized position data (already calculated in BotPage.tsx)
                  // The leverage should already be normalized and rounded to integer from WebSocket data
                  // Always trust the leverage from normalized data to match WebSocket updates
                  let leverage = 1;

                  // First, try to use leverage from normalized position data (from WebSocket/BotPage normalization)
                  const apiLeverageStr = position.leverage || '';
                  const apiLeverage = parseFloat(apiLeverageStr);

                  // Trust the leverage from normalized data if it's valid and reasonable (1-125x)
                  // This ensures consistency with WebSocket updates from BotPage.tsx
                  if (apiLeverage >= 1 && apiLeverage <= 125 && !isNaN(apiLeverage) && isFinite(apiLeverage)) {
                    // Use the leverage from normalized data directly (already rounded to integer in BotPage)
                    leverage = Math.round(apiLeverage);
                  } else {
                    // Fallback: Calculate leverage using formula: Leverage = |notional| / initial_margin
                    // Always use initial_margin regardless of margin type (matches BotPage.tsx)
                    if (initialMargin > 0 && notionalValue > 0) {
                      leverage = notionalValue / initialMargin;
                      console.log(`[PositionsList] Calculated leverage for ${position.symbol}: ${leverage.toFixed(2)}x (|Notional|: ${notionalValue}, Initial Margin: ${initialMargin}, Type: ${marginType})`);
                    } else {
                      // Debug: log why we can't calculate leverage
                      console.warn(`[PositionsList] Cannot calculate leverage for ${position.symbol}:`, {
                        notionalValue,
                        initialMargin,
                        isolatedWallet,
                        isolatedMargin,
                        marginType,
                        apiLeverage: apiLeverageStr,
                        positionAmt: position.positionAmt,
                        markPrice,
                        entryPrice,
                      });
                      // Keep default leverage = 1
                    }

                    // Ensure leverage is at least 1 and reasonable (max 125x for Binance Futures)
                    leverage = Math.max(1, Math.min(125, leverage));
                    // Round leverage to integer for display (Binance shows integer leverage)
                    leverage = Math.round(leverage);
                  }

                  // Calculate ROI % - use isolatedWallet if available, otherwise use isolatedMargin
                  // For Cross margin, we need to calculate based on position value
                  let roi = 0;
                  if (marginType === 'ISOLATED' && isolatedMargin > 0) {
                    roi = (unrealizedPnl / isolatedMargin) * 100;
                  } else if (marginType === 'CROSS') {
                    // For cross margin, calculate ROI based on position notional value
                    const notional = Math.abs(amount) * markPrice;
                    if (leverage && leverage > 0) {
                      const marginUsed = notional / leverage;
                      if (marginUsed > 0) {
                        roi = (unrealizedPnl / marginUsed) * 100;
                      }
                    }
                  } else if (isolatedWallet > 0) {
                    roi = (unrealizedPnl / isolatedWallet) * 100;
                  } else if (isolatedMargin > 0) {
                    roi = (unrealizedPnl / isolatedMargin) * 100;
                  }

                  return (
                    <tr
                      key={`${position.symbol}-${index}`}
                      className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                    >
                      <td className="py-4 px-2 md:px-4">
                        <div
                          className="flex items-center gap-2 group cursor-pointer"
                          onClick={(e) => handleSymbolClick(position.symbol, e)}
                          title="Click to view chart (Ctrl/Cmd+Click to open Binance)"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium group-hover:text-binance-yellow transition-colors">
                                {position.symbol}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-white/60">Perp {leverage.toFixed(0)}x</span>
                              {!isSymbolInConfig(position.symbol) && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-binance-red/20 text-binance-red border border-binance-red/30"
                                  title="This symbol is not in your trading configuration"
                                >
                                  <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Not in Config
                                </span>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-4 h-4 text-binance-text-secondary group-hover:text-binance-yellow transition-colors opacity-0 group-hover:opacity-100"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </td>
                      <td className={`hidden md:table-cell py-4 px-4 text-right font-semibold ${side === 'LONG' ? 'text-binance-white' : 'text-binance-white'
                        }`}>
                        {amount < 0 ? '-' : ''}{Math.abs(amount).toFixed(1)} {position.symbol.replace('USDT', '')}
                      </td>
                      <td className="hidden md:table-cell py-4 px-4 text-right text-white font-medium">
                        <div>{entryPrice.toFixed(7)}</div>
                        {(position.updateTime || position.openTime) && (
                          <div className="text-xs text-white/50 mt-0.5">
                            {formatDateTime(position.updateTime || position.openTime)}
                          </div>
                        )}
                      </td>
                      <td className="hidden md:table-cell py-4 px-4 text-right text-white font-medium">
                        {markPrice.toFixed(7)}
                      </td>
                      <td className="hidden md:table-cell py-4 px-4 text-right">
                        <div className="text-white font-medium">
                          {marginType === 'ISOLATED' && isolatedMargin > 0
                            ? `${isolatedWallet.toFixed(2)} USDT`
                            : marginType === 'CROSS'
                              ? `${initialMargin.toFixed(2)} USDT`
                              : '-'}
                        </div>
                        <div className={`text-xs font-medium mt-0.5 ${marginType === 'ISOLATED'
                          ? 'text-binance-yellow'
                          : 'text-white/60'
                          }`}>
                          {marginType}
                        </div>
                      </td>
                      <td className="py-4 px-2 md:px-4 text-right">
                        <div className={`font-bold text-sm md:text-base ${isProfit ? 'text-binance-green' : 'text-binance-red'}`}>
                          {(() => {
                            const pnlStr = unrealizedPnl.toFixed(2);
                            const [integerPart, decimalPart] = pnlStr.split('.');
                            const sign = isProfit ? '+' : '';
                            return (
                              <>
                                {sign}{integerPart}
                                <span className="text-[0.7em]">{decimalPart ? `.${decimalPart}` : ''}</span> USDT
                              </>
                            );
                          })()}
                        </div>
                        <div className={`text-xs font-medium mt-0.5 ${isProfit ? 'text-binance-green' : 'text-binance-red'}`}>
                          {isProfit ? '+' : ''}{roi.toFixed(2)}%
                        </div>
                      </td>
                      <td className="py-4 px-2 md:px-4 text-center">
                        <button
                          onClick={() => handleCloseClick(position.symbol, side)}
                          className="px-3 md:px-4 py-2 text-xs font-semibold bg-binance-red/20 hover:bg-binance-red/30 text-binance-red border border-binance-red/30 rounded transition-colors whitespace-nowrap"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Trade History Tab */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-white/70">
                <p>Loading trade history...</p>
              </div>
            ) : incomeHistory.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <p>No trade history available</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-binance-gray-border">
                    <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-white">Symbol</th>
                    <th className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-white">Type</th>
                    <th className="text-right py-3 px-2 md:px-4 text-sm font-semibold text-white">Income</th>
                    <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-white">Time</th>
                    <th className="hidden md:table-cell text-left py-3 px-4 text-sm font-semibold text-white">Transaction ID</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeHistory.map((income, index) => {
                    const incomeValue = parseFloat(income.income || '0');
                    const isPositive = incomeValue >= 0;
                    return (
                      <tr
                        key={`${income.tranId}-${index}`}
                        className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                      >
                        <td className="py-4 px-2 md:px-4">
                          <div
                            className="flex items-center gap-2 group cursor-pointer"
                            onClick={(e) => handleSymbolClick(income.symbol, e)}
                            title="Click to view chart (Ctrl/Cmd+Click to open Binance)"
                          >
                            <span className="text-white font-medium group-hover:text-binance-yellow transition-colors">
                              {income.symbol}
                            </span>
                            {!isSymbolInConfig(income.symbol) && (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-binance-red/20 text-binance-red border border-binance-red/30"
                                title="This symbol is not in your trading configuration"
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Not in Config
                              </span>
                            )}
                            <svg
                              className="w-4 h-4 text-binance-text-secondary group-hover:text-binance-yellow transition-colors opacity-0 group-hover:opacity-100"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </td>
                        <td className="py-4 px-2 md:px-4">
                          <div className="text-white/80 text-sm">{income.incomeType}</div>
                        </td>
                        <td className="py-4 px-2 md:px-4 text-right">
                          <div className={`font-bold text-sm md:text-base ${isPositive ? 'text-binance-green' : 'text-binance-red'}`}>
                            {isPositive ? '+' : ''}{incomeValue.toFixed(8)} {income.asset}
                          </div>
                        </td>
                        <td className="hidden md:table-cell py-4 px-4 text-white/80 text-sm">
                          {formatDate(income.time)}
                        </td>
                        <td className="hidden md:table-cell py-4 px-4 text-white/60 text-xs font-mono">
                          {income.tranId}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Spot Section */}
      <div className="card mt-6">
        {/* Spot Header with Available Balance */}
        <div className="flex items-center justify-between mb-6 border-b border-binance-gray-border pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-binance-yellow">Spot</h2>
          </div>
          {usdtBalance && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-white/50 mb-1">Available Balance</div>
                <div className="text-xl font-bold leading-tight text-binance-yellow">
                  {usdtBalance.free.toFixed(2)} <span className="text-base text-white/70">USDT</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Asset Header with Total USDT Value */}
        <div className="flex items-baseline justify-between mb-6 border-b border-binance-gray-border pb-3">
          <div className="flex gap-6">
            <div className="text-xl font-semibold text-white leading-tight">
              Asset ({sortedSpotOrders.length})
            </div>
          </div>
          <div className="text-xl font-bold leading-tight text-binance-green">
            {(() => {
              const usdtStr = totalSpotUsdtValue.toFixed(2);
              const [integerPart, decimalPart] = usdtStr.split('.');
              return (
                <>
                  ${integerPart}
                  <span className="text-[0.7em]">{decimalPart ? `.${decimalPart}` : ''}</span> USDT
                </>
              );
            })()}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-8 text-white/70">
              <p>Loading spot balances...</p>
            </div>
          ) : spotOrders.length === 0 ? (
            <div className="text-center py-8 text-white/70">
              <p>No spot balances available</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-binance-gray-border">
                  <th
                    className="text-left py-3 px-2 md:px-4 text-sm font-semibold text-white cursor-pointer hover:text-binance-yellow transition-colors select-none"
                    onClick={() => handleSpotSort('asset')}
                    title="Click to sort by asset"
                  >
                    <div className="flex items-center gap-1">
                      <span>Asset</span>
                      {spotSortState.column === 'asset' && spotSortState.order === 'desc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      {spotSortState.column === 'asset' && spotSortState.order === 'asc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                      {spotSortState.column !== 'asset' && (
                        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="hidden md:table-cell text-right py-3 px-4 text-sm font-semibold text-white">Price</th>
                  <th className="text-right py-3 px-2 md:px-4 text-sm font-semibold text-white">Balance</th>
                  <th
                    className="text-right py-3 px-2 md:px-4 text-sm font-semibold text-white cursor-pointer hover:text-binance-yellow transition-colors select-none"
                    onClick={() => handleSpotSort('usdt_value')}
                    title="Click to sort by USDT value"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>USDT Value</span>
                      {spotSortState.column === 'usdt_value' && spotSortState.order === 'desc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                      {spotSortState.column === 'usdt_value' && spotSortState.order === 'asc' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                      {spotSortState.column !== 'usdt_value' && (
                        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="text-center py-3 px-2 md:px-4 text-sm font-semibold text-white w-[20%] md:w-auto">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedSpotOrders.map((order, index) => {
                  const locked = parseFloat(String(order.locked || '0'));
                  const total = parseFloat(String(order.total || '0'));
                  const usdtValue = parseFloat(String(order.usdt_value || '0'));
                  const price = parseFloat(String(order.price || '0'));
                  const hasValue = usdtValue > 0;

                  return (
                    <tr
                      key={`${order.asset}-${index}`}
                      className="border-b border-binance-gray-border hover:bg-binance-gray-light transition-colors"
                    >
                      <td className="py-4 px-2 md:px-4">
                        <div
                          className="flex items-center gap-2 group cursor-pointer"
                          onClick={(e) => {
                            // For spot, we need to convert asset to futures symbol format (e.g., "BTC" -> "BTCUSDT")
                            const futuresSymbol = `${order.asset}USDT`;
                            handleSymbolClick(futuresSymbol, e);
                          }}
                          title="Click to view chart (Ctrl/Cmd+Click to open Binance)"
                        >
                          <span className="text-white font-medium group-hover:text-binance-yellow transition-colors">
                            {order.asset}
                          </span>
                          <svg
                            className="w-4 h-4 text-binance-text-secondary group-hover:text-binance-yellow transition-colors opacity-0 group-hover:opacity-100"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </td>
                      <td className="hidden md:table-cell py-4 px-4 text-right text-white/60 text-sm">
                        {price > 0 ? `$${price.toFixed(8)}` : '-'}
                      </td>
                      <td className="py-4 px-2 md:px-4 text-right text-white font-medium">
                        <div>{total.toFixed(8)}</div>
                        {locked > 0 && (
                          <div className="text-xs text-white/50 mt-0.5">
                            Lock {locked.toFixed(8)}
                          </div>
                        )}
                      </td>
                      <td className={`py-4 px-2 md:px-4 text-right font-medium ${hasValue ? 'text-binance-yellow' : 'text-white/50'}`}>
                        {hasValue ? `$${usdtValue.toFixed(2)}` : '-'}
                      </td>
                      <td className="py-4 px-2 md:px-4 text-center">
                        {order.asset !== 'USDT' && (
                          <button
                            onClick={() => handleCloseSpotClick(order.asset)}
                            className="px-3 md:px-4 py-2 text-xs font-semibold bg-binance-red/20 hover:bg-binance-red/30 text-binance-red border border-binance-red/30 rounded transition-colors whitespace-nowrap"
                            disabled={actionLoading}
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm Close Dialog */}
      {confirmClose && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-binance-gray border border-binance-gray-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Close Position</h3>
            <p className="text-white/80 mb-6">
              Are you sure you want to close the <span className="font-semibold text-white">{confirmClose.symbol}</span> position ({confirmClose.side})?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelClose}
                className="px-4 py-2 text-sm font-semibold bg-binance-gray-light text-white border border-binance-gray-border rounded hover:bg-binance-gray-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 text-sm font-semibold bg-binance-red text-white rounded hover:bg-binance-red/90 transition-colors"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Close Spot Dialog */}
      {confirmCloseSpot && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-binance-gray border border-binance-gray-border rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Confirm Close Spot Order</h3>
            <p className="text-white/80 mb-6">
              Are you sure you want to close the spot order for <span className="font-semibold text-white">{confirmCloseSpot.symbol}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelCloseSpot}
                className="px-4 py-2 text-sm font-semibold bg-binance-gray-light text-white border border-binance-gray-border rounded hover:bg-binance-gray-border transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCloseSpot}
                className="px-4 py-2 text-sm font-semibold bg-binance-red text-white rounded hover:bg-binance-red/90 transition-colors"
                disabled={actionLoading}
              >
                {actionLoading ? 'Closing...' : 'Confirm Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signal Chart Modal */}
      {chartSymbol && (
        <SignalChart
          symbol={chartSymbol}
          interval="1h"
          onClose={() => setChartSymbol(null)}
          symbolList={symbolList}
          onSymbolChange={(newSymbol) => setChartSymbol(newSymbol)}
        />
      )}
    </>
  );
};

