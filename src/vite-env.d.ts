/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Window interface for runtime injection
declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

