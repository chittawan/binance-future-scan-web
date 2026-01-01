export interface SymbolPushPopResult {
  status: string;
  symbol: string;
  client_name: string;
  status_code: number;
  response: {
    status: string;
    symbol: string;
  };
}

export interface SymbolPushPopResponse {
  success: boolean;
  message: string;
  symbol: string;
  status_counts: {
    pushed?: number;
    popped?: number;
    'already exists'?: number;
    error?: number;
  };
  results: SymbolPushPopResult[];
}

