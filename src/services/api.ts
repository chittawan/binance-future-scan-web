import axios, { AxiosError } from 'axios';
import type { TradingConfig, ApiResponse } from '../types/tradingConfig';
import type {
  ClientConfig,
  ClientConfigListResponse,
  ClientConfigCreateRequest,
  ClientConfigCreateResponse,
  ClientConfigDeleteResponse,
} from '../types/clientConfig';
import type { SymbolPushPopResponse } from '../types/symbolPushPop';

// Get API base URL from environment variable or use default
// For Vite: use import.meta.env.VITE_API_BASE_URL
// For runtime (Docker): use window.__API_BASE_URL__ (injected by entrypoint script)
export const getApiBaseUrl = (): string => {
  // Runtime injection (Docker) - check dynamically to ensure script has executed
  if (typeof window !== 'undefined') {
    const injectedUrl = (window as any).__API_BASE_URL__;
    if (injectedUrl) {
      console.log('[API] ✓ Using injected API_BASE_URL:', injectedUrl);
      return injectedUrl;
    } else {
      console.warn('[API] ⚠ window.__API_BASE_URL__ not found');
      console.warn('[API] Available window properties:', Object.keys(window).filter(k => k.includes('API') || k.includes('BASE')));
    }
  }
  // Build-time env variable (Vite)
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('[API] Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Default fallback
  console.error('[API] ❌ No API_BASE_URL found, using default localhost:8001');
  console.error('[API] This should not happen in production!');
  return 'http://localhost:8001';
};

// Initialize with default, will be updated dynamically
const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get token from localStorage
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set token in axios default headers
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Initialize token on module load
const token = getToken();
if (token) {
  setAuthToken(token);
}

// Request interceptor to add token to every request and update baseURL dynamically
apiClient.interceptors.request.use(
  (config) => {
    // Update baseURL dynamically to ensure we always use the latest injected value
    const currentBaseUrl = getApiBaseUrl();
    if (config.baseURL !== currentBaseUrl) {
      config.baseURL = currentBaseUrl;
      apiClient.defaults.baseURL = currentBaseUrl;
    }

    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      setAuthToken(null);
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  async login(username: string, password: string): Promise<{ access_token?: string; token?: string }> {
    const response = await apiClient.post('/api/v1/auth/login', {
      username,
      password,
    });
    return response.data;
  },
};

export const configService = {
  async getConfig(): Promise<TradingConfig> {
    const response = await apiClient.get<TradingConfig>('/api/v1/config/config');
    return response.data;
  },

  async updateConfig(config: Partial<TradingConfig>): Promise<ApiResponse<TradingConfig>> {
    const response = await apiClient.post<ApiResponse<TradingConfig>>('/api/v1/config/config', config);
    return response.data;
  },
};

export const futuresService = {
  async getExchangeInfo(): Promise<any> {
    const response = await apiClient.get('/api/v1/futures/exchange-info');
    return response.data;
  },

  async getBalance(): Promise<any> {
    const response = await apiClient.get('/api/v1/futures/balance');
    return response.data;
  },

  async getPositions(symbol?: string): Promise<any> {
    const params = symbol ? { symbol } : {};
    const response = await apiClient.get('/api/v1/futures/positions', { params });
    return response.data;
  },

  async closePosition(symbol: string, side: 'BUY' | 'SELL'): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/futures/order/closeAll', {
      symbol,
      side,
    });
    return response.data;
  },

  async getIncomeHistory(): Promise<any> {
    const response = await apiClient.post('/api/v1/futures/income-history', {});
    return response.data;
  },
};

export const botService = {
  async start(): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/bot/botrunner/start');
    return response.data;
  },

  async stop(): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/bot/botrunner/stop');
    return response.data;
  },

  async getStatus(): Promise<{ running: boolean; stop_flag: boolean }> {
    const response = await apiClient.get<{ running: boolean; stop_flag: boolean }>('/api/v1/bot/botrunner/status');
    return response.data;
  },

  async changeTime(): Promise<ApiResponse<any>> {
    const response = await apiClient.get<ApiResponse<any>>('/api/v1/bot/botrunner/change_time');
    return response.data;
  },
};

export const dashboardService = {
  async getDashboard(activeTab: 'positions' | 'income-history'): Promise<{
    status: { running: boolean; stop_flag: boolean };
    balance: any;
    tab_data: any;
  }> {
    const response = await apiClient.get('/api/v1/futures/dashboard', {
      params: { activeTab },
    });
    return response.data;
  },
};

export const websocketService = {
  /**
   * Subscribe to account WebSocket stream for real-time balance and position updates
   * This endpoint may return WebSocket URL or connection info
   */
  async subscribeAccountWebSocket(): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/futures/websocket/account/subscribe', {});
    return response.data;
  },
};

export const spotService = {
  async closeOrder(symbol: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>('/api/v1/spot/order/close', {}, {
      params: { symbol },
    });
    return response.data;
  },
};

export const signalService = {
  async getCandles(params: {
    symbol: string;
    interval?: string;
    isDebug?: boolean;
  }): Promise<{
    sig: {
      position: string;
      trend: string;
      candle: string;
      time: string;
    };
    result_signals: string[];
    signals: string[];
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    timestamp: number[];
  }> {
    const response = await apiClient.post('/api/v1/signals/candles', {
      symbol: params.symbol,
      interval: params.interval || '1h',
      isDebug: params.isDebug ?? false,
    });
    return response.data;
  },
};

export const clientConfigService = {
  async getClients(): Promise<ClientConfigListResponse> {
    const response = await apiClient.get<ClientConfigListResponse>('/api/v1/config/config/clients');
    return response.data;
  },

  async createClient(client: ClientConfigCreateRequest): Promise<ClientConfigCreateResponse> {
    const response = await apiClient.post<ClientConfigCreateResponse>('/api/v1/config/config/clients', client);
    return response.data;
  },

  async deleteClient(clientName: string): Promise<ClientConfigDeleteResponse> {
    const response = await apiClient.delete<ClientConfigDeleteResponse>(`/api/v1/config/config/clients/${clientName}`);
    return response.data;
  },
};

export const symbolPushPopService = {
  async pushSymbol(symbol: string): Promise<SymbolPushPopResponse> {
    const response = await apiClient.post<SymbolPushPopResponse>(`/api/v1/config/config/symbol/push/${symbol}`, {});
    return response.data;
  },

  async popSymbol(symbol: string): Promise<SymbolPushPopResponse> {
    const response = await apiClient.post<SymbolPushPopResponse>(`/api/v1/config/config/symbol/pop/${symbol}`, {});
    return response.data;
  },
};

