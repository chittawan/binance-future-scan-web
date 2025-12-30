import React from 'react';
import type { Balance } from '../types/bot';

interface BalanceCardProps {
  balance: Balance | null;
  loading?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balance, loading = false }) => {
  if (loading) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-binance-text mb-6 border-b border-binance-gray-border pb-3">
          Account Balance
        </h2>
        <div className="text-binance-text-secondary">Loading...</div>
      </div>
    );
  }

  if (!balance) {
    return (
      <div className="card">
        <h2 className="text-xl font-semibold text-binance-text mb-6 border-b border-binance-gray-border pb-3">
          Account Balance
        </h2>
        <div className="text-binance-text-secondary">No balance data</div>
      </div>
    );
  }

  // Normalize balance values - support both formats
  const walletBalance = parseFloat(
    balance.walletBalance ||
    balance.balance ||
    balance.wb ||
    '0'
  );
  const availableBalance = parseFloat(
    balance.availableBalance ||
    balance.available_balance ||
    balance.cw ||
    balance.cross_wallet_balance ||
    '0'
  );
  const asset = balance.asset || balance.a || 'USDT';

  // Format numbers - support up to 5 digits without abbreviation
  const formatBalance = (value: number): string => {
    if (value === 0) return '0.00';
    // Don't abbreviate if value is less than 100,000 (5 digits)
    if (value < 100000) {
      return value.toFixed(2);
    }
    // Only abbreviate if value is 100,000 or more
    if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    }
    if (value >= 100000) {
      return (value / 1000).toFixed(2) + 'K';
    }
    return value.toFixed(2);
  };

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-binance-text mb-6 border-b border-binance-gray-border pb-3">
        Account Balance
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-binance-gray-light/30 rounded-lg p-4 border border-binance-gray-border">
          <p className="text-sm text-binance-text-secondary mb-2">Wallet Balance</p>
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="text-3xl font-bold text-binance-text whitespace-nowrap flex-shrink-0">
              {formatBalance(walletBalance)}
            </p>
            <span className="text-lg text-binance-text-secondary flex-shrink-0">{asset}</span>
          </div>
          <p className="text-xs text-binance-text-secondary mt-2">
            Total account balance
          </p>
        </div>
        <div className="bg-binance-green/10 rounded-lg p-4 border border-binance-green/20">
          <p className="text-sm text-binance-text-secondary mb-2">Available Balance</p>
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="text-3xl font-bold text-binance-green whitespace-nowrap flex-shrink-0">
              {formatBalance(availableBalance)}
            </p>
            <span className="text-lg text-binance-text-secondary flex-shrink-0">{asset}</span>
          </div>
          <p className="text-xs text-binance-text-secondary mt-2">
            Available for trading
          </p>
        </div>
      </div>
      {walletBalance > 0 && (
        <div className="mt-4 pt-4 border-t border-binance-gray-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-binance-text-secondary">In Use</span>
            <span className="text-binance-text font-medium">
              {formatBalance(walletBalance - availableBalance)} {asset}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

