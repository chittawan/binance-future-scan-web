export interface ScanSignal {
  symbol: string;
  time: number;
  trend: string | null;
  state: string;
  score: number;
  ema_fast: number;
  ema_slow: number;
  ema_50: number;
  adx: number;
}

export interface ScanSignalMessage {
  type: 'scan_signal';
  data: ScanSignal[];
}

