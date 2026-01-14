// Uber Eats Configuration
// Your Signing Keys (from Uber Dashboard - used for webhook signature verification)
export const PRIMARY_KEY = "UE_TEST_KEY_9f3aA72kL1";
export const SECONDARY_KEY = "UE_TEST_KEY_b81Qp55zX9";

// Uber always uses username "uber" for webhook authentication
export const USERNAME = "uber";

// Uber API Configuration
// For Sandbox/Test environment
export const UBER_API_BASE_URL = "https://test-api.uber.com";
export const UBER_API_VERSION = "v2";

// Your store ID - Replace with your actual store ID
export const STORE_ID = "f9b63b20-ad76-46bc-93bb-76c9e86e9e22";

// OAuth Client Credentials - For automatic token generation
// Get these from your Uber Developer Dashboard
export const UBER_CLIENT_ID = process.env.UBER_CLIENT_ID || "Y09XkWICeoPp_4LX6QDZIgVkHk1LK_G8";
export const UBER_CLIENT_SECRET = process.env.UBER_CLIENT_SECRET || "HEfOndSQ0cAW-BIl8lAQ1cb80U2eCxBM_t1nzrMN";

// Webhook configuration
export const WEBHOOK_ENDPOINT = "http://localhost:3000/ubereats/webhook";

// Event types to handle
export const WEBHOOK_EVENTS = {
  ORDER_NOTIFICATION: "orders.notification",           // New order created
  ORDER_SCHEDULED: "orders.scheduled.notification",    // Scheduled order
  ORDER_RELEASE: "orders.release",                     // Courier reached geo-fence
  ORDER_FAILURE: "orders.failure",                     // Order failed (API v1.0.0 only)
  ORDER_CANCEL: "orders.cancel",                       // Order cancelled (API v2.0+)
  STORE_PROVISIONED: "store.provisioned",              // Store access granted
  STORE_DEPROVISIONED: "store.deprovisioned",          // Store access removed
  FULFILLMENT_RESOLVED: "order.fulfillment_issues.resolved",  // Fulfillment issue resolved
  STORE_STATUS_CHANGED: "store.status.changed",        // Store status changed
  MENU_REFRESH_REQUEST: "store.menu_refresh_request",  // Menu refresh requested
};

// Database/Storage configuration (optional)
// Token configuration
// TOKEN_LIFETIME_SECONDS: Expected lifetime of the token (used as default fallback)
// TOKEN_BUFFER_SECONDS: How many seconds before actual expiration to trigger a refresh
// e.g., if token expires in 24 hours, refresh when 5 minutes (300s) are left
export const TOKEN_CONFIG = {
  lifetimeSeconds: 86400, // 24 hours - expected token lifetime from Uber
  bufferSeconds: 300,     // Refresh 5 minutes before expiration
};

export const STORAGE_CONFIG = {
  // You can use file-based storage for now, later migrate to database
  ordersFile: "orders.json",
  logsFile: "webhook_logs.json",
  actionsFile: "actions.json",
  connectionsFile: "uber_connections.json",
  syncFile: "sync_history.json",
};
