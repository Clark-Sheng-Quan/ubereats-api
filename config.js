// Uber Eats Configuration
// Your Basic Auth keys (same as in Uber Dashboard)
export const PRIMARY_KEY = "UE_TEST_KEY_9f3aA72kL1";
export const SECONDARY_KEY = "UE_TEST_KEY_b81Qp55zX9";

// Uber always uses username "uber" for webhook authentication
export const USERNAME = "uber";

// Uber API Configuration
export const UBER_API_BASE_URL = "https://api.uber.com";
export const UBER_API_VERSION = "v1";

// Your store ID - Replace with your actual store ID
export const STORE_ID = "your_store_id_here";

// OAuth Token - For API calls to get order details
// You'll need to get this from your Uber Developer Dashboard
export const UBER_ACCESS_TOKEN = process.env.UBER_ACCESS_TOKEN || "your_access_token_here";

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
};

// Database/Storage configuration (optional)
export const STORAGE_CONFIG = {
  // You can use file-based storage for now, later migrate to database
  ordersFile: "./data/orders.json",
  logsFile: "./data/webhook_logs.json",
};
