import React from 'react';
import type { BotStatus } from '../types/bot';

interface BotStatusCardProps {
  status: BotStatus;
  onStart: () => void;
  onStop: () => void;
  onTrigger: () => void;
  isLoading?: boolean;
  isWebSocketConnecting?: boolean;
  hasReceivedStatus?: boolean; // Whether we've received bot status from WebSocket
}

export const BotStatusCard: React.FC<BotStatusCardProps> = ({
  status,
  onStart,
  onStop,
  onTrigger,
  isLoading = false,
  isWebSocketConnecting = false,
  hasReceivedStatus = false, // Default to false - haven't received status yet
}) => {
  const isRunning = status.running && !status.stop_flag;

  // Determine status display based on WebSocket connection state
  let statusColor = '';
  let statusText = '';
  let statusDotColor = '';

  // Show "Connecting" if:
  // 1. WebSocket is currently connecting, OR
  // 2. We haven't received bot status from WebSocket yet
  if (isWebSocketConnecting || !hasReceivedStatus) {
    statusColor = 'text-binance-text-secondary';
    statusText = 'Connecting';
    statusDotColor = 'bg-binance-text-secondary';
  } else if (isRunning) {
    statusColor = 'text-binance-green';
    statusText = 'Running';
    statusDotColor = 'bg-binance-green animate-pulse';
  } else {
    statusColor = 'text-binance-red';
    statusText = 'Stopped';
    statusDotColor = 'bg-binance-red';
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-binance-text mb-6 border-b border-binance-gray-border pb-3">
        Bot Control
      </h2>
      <div className="space-y-4">
        {/* Status Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-binance-text">Status:</span>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${statusDotColor}`}
              />
              <span
                className={`text-sm font-semibold ${statusColor}`}
              >
                {statusText}
              </span>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onStart}
            disabled={isRunning || isLoading}
            className={`btn-primary ${isRunning || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Starting...' : 'Start Bot'}
          </button>
          <button
            type="button"
            onClick={onStop}
            disabled={!isRunning || isLoading}
            className={`btn-secondary ${!isRunning || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Stopping...' : 'Stop Bot'}
          </button>
          <button
            type="button"
            onClick={onTrigger}
            disabled={isLoading}
            className="btn-secondary"
          >
            Trigger Signal
          </button>
        </div>
      </div>
    </div>
  );
};

