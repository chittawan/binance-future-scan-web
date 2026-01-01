export interface ClientConfig {
  client_name: string;
  client_api_base_url: string;
}

export interface ClientConfigCreateRequest {
  client_name: string;
  client_api_key: string;
  client_api_base_url: string;
}

export interface ClientConfigListResponse {
  success: boolean;
  clients: ClientConfig[];
}

export interface ClientConfigCreateResponse {
  success: boolean;
  message: string;
  client: ClientConfig;
}

export interface ClientConfigDeleteResponse {
  success: boolean;
  message: string;
}

