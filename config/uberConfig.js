/**
 * Uber集成配置
 */

export const UBER_CONFIG = {
  // OAuth配置
  OAUTH_URL: "https://login.uber.com/oauth/v2/authorize",
  TOKEN_URL: "https://login.uber.com/oauth/v2/token",
  REDIRECT_URI: "http://localhost:5174/auth/uber/callback",
  CLIENT_ID: "YOUR_CLIENT_ID", // 需要配置
  CLIENT_SECRET: "YOUR_CLIENT_SECRET", // 需要配置
  
  // API配置
  API_BASE: "https://api.uber.com/v2/eats",
  
  // Token配置
  TOKEN_LIFETIME_SECONDS: 86400, // 24 hours
  TOKEN_BUFFER_SECONDS: 300, // 5 minutes before expiration
};
