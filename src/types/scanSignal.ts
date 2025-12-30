export interface ScanSignal {
  symbol: string;
  sig: {
    time: number;
    type: 'long' | 'short';
    ema_fast: number;
    ema_slow: number;
    ema_50: number;
  };
}

export interface ScanSignalMessage {
  type: 'scan_signal';
  data: ScanSignal[];
}

