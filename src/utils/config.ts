// Environment configuration utility
export const config = {
  // Environment
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',
  
  // Server Configuration
  server: {
    host: import.meta.env.VITE_SERVER_HOST || 'localhost',
    port: import.meta.env.VITE_SERVER_PORT || '5000',
    protocol: import.meta.env.VITE_SERVER_PROTOCOL || 'http',
  },
  
  // Frontend Configuration
  frontend: {
    host: import.meta.env.VITE_FRONTEND_HOST || 'localhost',
    port: import.meta.env.VITE_FRONTEND_PORT || '5173',
    protocol: import.meta.env.VITE_FRONTEND_PROTOCOL || 'http',
  },
  
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || `${import.meta.env.VITE_SERVER_PROTOCOL || 'http'}://${import.meta.env.VITE_SERVER_HOST || 'localhost'}:${import.meta.env.VITE_SERVER_PORT || '5000'}/api`,
  },
  
  // WebSocket Configuration
  websocket: {
    url: import.meta.env.VITE_SOCKET_URL || `${import.meta.env.VITE_SERVER_PROTOCOL || 'http'}://${import.meta.env.VITE_SERVER_HOST || 'localhost'}:${import.meta.env.VITE_SERVER_PORT || '5000'}`,
  },
} as const;

// Helper functions to build URLs dynamically
export const buildServerUrl = (path: string = '') => {
  const { protocol, host, port } = config.server;
  return `${protocol}://${host}:${port}${path}`;
};

export const buildFrontendUrl = (path: string = '') => {
  const { protocol, host, port } = config.frontend;
  return `${protocol}://${host}:${port}${path}`;
};

export const buildApiUrl = (endpoint: string = '') => {
  return `${config.api.baseUrl}${endpoint}`;
};

// Export commonly used URLs
export const API_BASE_URL = config.api.baseUrl;
export const WEBSOCKET_URL = config.websocket.url;

export default config;
