export type AmountMode = "FIX" | "PERCENT";
export type MarginType = "ISOLATED" | "CROSSED";
export type PositionHedgeMode = "true" | "false";

export interface TradingConfig {
  // SYSTEM
  IS_NOTIFY: boolean;

  // Amount
  AMOUNT_MODE: AmountMode;
  AMOUNT_VALUE: number;
  LEVERAGE: number;
  MARGIN_TYPE: MarginType;
  POSITION_HEDGE_MODE: PositionHedgeMode;

  // Signal Candle
  SIGNAL_SYMBOL: string | string[];
  SIGNAL_INTERVAL: string;
  SIGNAL_FAST_EMA_PERIOD: number;
  SIGNAL_SLOW_EMA_PERIOD: number;

  // Signal Switch
  USE_LONG: boolean;
  USE_SHORT: boolean;
  USE_GREEN_ONLY: boolean;
  USE_BLUE: boolean;
  USE_LBLUE: boolean;
  USE_RED: boolean;
  USE_ORANGE: boolean;
  USE_YELLOW: boolean;
  USE_GREEN_RED: boolean;

  // BOT
  SIGNAL_CANDLES: number;
  SLEEP_SECONDS: number;

  // API Keys
  BINANCE_API_KEY: string;
  BINANCE_API_SECRET: string;
  NTFY_URL: string;
  NTFY_TOKEN: string;
}

export interface ApiResponse<T> {
  status?: string;
  error?: string;
  details?: string;
  code?: string;
  updated?: T;
  [key: string]: any;
}

