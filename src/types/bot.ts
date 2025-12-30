export interface BotStatus {
  running: boolean;
  stop_flag: boolean;
}

export interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: string;
  isolatedMargin: string;
  positionSide: string;
  breakEvenPrice?: string;
  marginRatio?: string;
  notional?: string;
  isolatedWallet?: string;
  initialMargin?: string;
  openTime?: number;
  updateTime?: number;
  [key: string]: any;
}

export interface Balance {
  asset: string;
  balance: string;
  availableBalance: string;
  walletBalance: string;
  [key: string]: any;
}

export interface IncomeHistory {
  symbol: string;
  incomeType: string;
  income: string;
  asset: string;
  info: string;
  time: number;
  tranId: number;
  tradeId: string;
  additional_properties?: Record<string, any>;
}

export interface SpotOrder {
  asset: string;
  free: string | number;
  locked: string | number;
  total: string | number;
  usdt_value: string | number;
  price: string | number;
}

