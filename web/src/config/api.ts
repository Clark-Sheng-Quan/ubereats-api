// Web后台的API配置
export const config = {
  // POS系统API - 通过ngrok隧道
  POS_API_BASE: "https://caesural-magali-graphic.ngrok-free.dev/api/service/pos",
  
  // Uber API配置
  UBER_API_BASE: "https://api.uber.com/v2",
  UBER_OAUTH_URL: "https://login.uber.com/oauth/v2/authorize",
  UBER_TOKEN_URL: "https://login.uber.com/oauth/v2/token",
  UBER_CLIENT_ID: "",
  UBER_CLIENT_SECRET: "",
  UBER_REDIRECT_URI: "http://localhost:5174/auth/uber/callback",
  
  // 后端Node.js服务
  BACKEND_API: "http://localhost:3000/api",
};

export const UBER_SCOPES = [
  "eats.order:read",
  "eats.store:write",
  "eats.menu:write",
];
