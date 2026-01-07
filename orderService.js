import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  UBER_API_BASE_URL,
  UBER_API_VERSION,
  WEBHOOK_EVENTS,
  STORAGE_CONFIG,
} from "./config.js";
import { getAccessToken } from "./tokenManager.js";
import { acceptOrder } from "./orderActions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Handle incoming webhook events from Uber Eats
 * @param {Object} webhookData - The webhook payload from Uber
 */
export async function handleWebhookEvent(webhookData) {
  const { event_type, event_id, resource_href, meta, event_time } = webhookData;

  console.log(`\n📨 Processing event: ${event_type}`);
  console.log(`   Event ID: ${event_id}`);
  console.log(`   Time: ${event_time}`);

  // Log the webhook for debugging
  logWebhook(webhookData);

  try {
    switch (event_type) {
      case WEBHOOK_EVENTS.ORDER_NOTIFICATION:
        await handleNewOrder(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_SCHEDULED:
        await handleScheduledOrder(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_RELEASE:
        await handleOrderRelease(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_FAILURE:
        await handleOrderFailure(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_CANCEL:
        await handleOrderCancel(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.STORE_PROVISIONED:
        await handleStoreProvisioned(meta);
        break;

      case WEBHOOK_EVENTS.STORE_DEPROVISIONED:
        await handleStoreDeprovisioned(meta);
        break;

      case WEBHOOK_EVENTS.FULFILLMENT_RESOLVED:
        await handleFulfillmentResolved(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.STORE_STATUS_CHANGED:
        await handleStoreStatusChanged(meta);
        break;

      default:
        console.warn(`⚠️ Unknown event type: ${event_type}`);
    }
  } catch (error) {
    console.error(`❌ Error handling event ${event_type}:`, error.message);
    throw error;
  }
}

/**
 * Handle new order (orders.notification)
 * Fetch complete order details and prepare for POS
 */
async function handleNewOrder(resourceHref, meta) {
  console.log(`\n🆕 NEW ORDER RECEIVED`);
  const orderId = meta?.resource_id;

  try {
    // Fetch complete order details from Uber API
    const orderDetails = await fetchOrderDetails(orderId, resourceHref);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Status: ${orderDetails?.status}`);
    console.log(`   Items: ${orderDetails?.cart?.items?.length || 0}`);

    // Save order to storage
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.notification",
      resource_href: resourceHref,
      order_details: orderDetails,
      received_at: new Date().toISOString(),
      status: "pending",
    });

    // TODO: Push to POS system here
    console.log(`   📋 Order saved, waiting for POS confirmation`);

    // Log action
    logAction(orderId, "order_received", {
      items_count: orderDetails?.cart?.items?.length,
      customer_name: orderDetails?.customer?.name,
    });
  } catch (error) {
    console.error(`   ❌ Error processing new order:`, error.message);
    logAction(orderId, "order_error", { error: error.message });
  }
}

/**
 * Handle scheduled order (orders.scheduled.notification)
 * Order scheduled for a future time
 */
async function handleScheduledOrder(resourceHref, meta) {
  console.log(`\n📅 SCHEDULED ORDER RECEIVED`);
  const orderId = meta?.resource_id;

  try {
    const orderDetails = await fetchOrderDetails(orderId, resourceHref);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Scheduled time: ${orderDetails?.scheduled_delivery_time}`);

    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.scheduled.notification",
      resource_href: resourceHref,
      order_details: orderDetails,
      received_at: new Date().toISOString(),
      status: "scheduled",
    });

    logAction(orderId, "scheduled_order_received", {
      scheduled_time: orderDetails?.scheduled_delivery_time,
    });
  } catch (error) {
    console.error(`   ❌ Error processing scheduled order:`, error.message);
  }
}

/**
 * Handle order release (orders.release)
 * Courier has reached geo-fence, ready to deliver
 */
async function handleOrderRelease(resourceHref, meta) {
  console.log(`\n🚚 COURIER REACHED GEO-FENCE`);
  const orderId = meta?.resource_id;

  try {
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.release",
      resource_href: resourceHref,
      received_at: new Date().toISOString(),
      status: "courier_near",
    });

    logAction(orderId, "courier_geofence_reached", {
      timestamp: new Date().toISOString(),
    });

    console.log(`   Order ID: ${orderId}`);
    console.log(`   ✅ Courier approaching - prepare order for handoff`);
  } catch (error) {
    console.error(`   ❌ Error handling order release:`, error.message);
  }
}

/**
 * Handle order failure (orders.failure - API v1.0.0 only)
 */
async function handleOrderFailure(resourceHref, meta) {
  console.log(`\n❌ ORDER FAILED`);
  const orderId = meta?.resource_id;

  try {
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.failure",
      resource_href: resourceHref,
      received_at: new Date().toISOString(),
      status: "failed",
    });

    logAction(orderId, "order_failed", {});
  } catch (error) {
    console.error(`   ❌ Error handling order failure:`, error.message);
  }
}

/**
 * Handle order cancellation (orders.cancel - API v2.0+)
 */
async function handleOrderCancel(resourceHref, meta) {
  console.log(`\n🚫 ORDER CANCELLED`);
  const orderId = meta?.resource_id;

  try {
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.cancel",
      resource_href: resourceHref,
      received_at: new Date().toISOString(),
      status: "cancelled",
    });

    logAction(orderId, "order_cancelled", {});
    console.log(`   Order ID: ${orderId}`);
    console.log(`   ✅ Order marked as cancelled in system`);
  } catch (error) {
    console.error(`   ❌ Error handling order cancellation:`, error.message);
  }
}

/**
 * Handle store provisioning (store.provisioned)
 */
async function handleStoreProvisioned(meta) {
  console.log(`\n🏪 STORE PROVISIONED`);
  console.log(`   Store has been granted access`);
  logAction("system", "store_provisioned", meta);
}

/**
 * Handle store deprovisioning (store.deprovisioned)
 */
async function handleStoreDeprovisioned(meta) {
  console.log(`\n🏪 STORE DEPROVISIONED`);
  console.log(`   Store access has been removed`);
  logAction("system", "store_deprovisioned", meta);
}

/**
 * Handle fulfillment issue resolved
 */
async function handleFulfillmentResolved(resourceHref, meta) {
  console.log(`\n✅ FULFILLMENT ISSUE RESOLVED`);
  const orderId = meta?.resource_id;

  try {
    const orderDetails = await fetchOrderDetails(orderId, resourceHref);
    saveOrderToStorage({
      order_id: orderId,
      event_type: "order.fulfillment_issues.resolved",
      resource_href: resourceHref,
      order_details: orderDetails,
      received_at: new Date().toISOString(),
      status: "fulfillment_resolved",
    });

    logAction(orderId, "fulfillment_resolved", {});
    console.log(`   Order ID: ${orderId}`);
  } catch (error) {
    console.error(`   ❌ Error handling fulfillment resolution:`, error.message);
  }
}

/**
 * Handle store status change
 */
async function handleStoreStatusChanged(meta) {
  console.log(`\n🏪 STORE STATUS CHANGED`);
  console.log(`   Status: ${meta?.status}`);
  logAction("system", "store_status_changed", meta);
}

/**
 * Fetch complete order details from Uber API
 * @param {string} orderId - The order ID
 * @param {string} resourceHref - The resource URL from webhook (optional)
 * @returns {Promise<Object>} Order details
 */
export async function fetchOrderDetails(orderId, resourceHref = null) {
  try {
    // Get a valid access token (will use cached or fetch new)
    const accessToken = await getAccessToken();

    // Use resource_href from webhook if provided, but convert to sandbox
    let url;
    if (resourceHref) {
      // Replace production domain with sandbox test domain
      url = resourceHref.replace(
        "https://api.uber.com",
        "https://test-api.uber.com"
      );
      console.log(`   📍 Using webhook resource_href: ${url}`);
    } else {
      // Fallback to constructing the URL
      url = `${UBER_API_BASE_URL}/${UBER_API_VERSION}/eats/orders/${orderId}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If it's a 401, the token might be invalid
      if (response.status === 401) {
        console.error(
          "⚠️ Authentication failed. Token may be invalid or expired."
        );
        console.log("Returning partial order data from webhook metadata");
        return { partial: true, order_id: orderId };
      }

      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`
      );
    }

    const orderData = await response.json();
    console.log(`   ✅ Fetched full order details`);
    return orderData;
  } catch (error) {
    console.error(`   ⚠️ Error fetching order details: ${error.message}`);
    // Return partial data so webhook processing can continue
    return { partial: true, order_id: orderId, error: error.message };
  }
}

/**
 * Save order to storage (file-based for now)
 * @param {Object} orderData - Order data to save
 */
function saveOrderToStorage(orderData) {
  try {
    const ordersFile = path.join(__dirname, STORAGE_CONFIG.ordersFile);
    let orders = [];

    // Read existing orders
    if (fs.existsSync(ordersFile)) {
      const content = fs.readFileSync(ordersFile, "utf8");
      orders = content ? JSON.parse(content) : [];
    }

    // Add or update order
    const existingIndex = orders.findIndex(
      (o) => o.order_id === orderData.order_id
    );
    if (existingIndex >= 0) {
      // Merge with existing order data
      orders[existingIndex] = { ...orders[existingIndex], ...orderData };
    } else {
      orders.push(orderData);
    }

    // Write back to file
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), "utf8");
    console.log(`   💾 Order saved to storage`);
  } catch (error) {
    console.error(`   ❌ Error saving order to storage:`, error.message);
  }
}

/**
 * Log webhook events for debugging and audit trail
 * @param {Object} webhookData - The webhook payload
 */
function logWebhook(webhookData) {
  try {
    const logsFile = path.join(__dirname, STORAGE_CONFIG.logsFile);
    let logs = [];

    // Read existing logs
    if (fs.existsSync(logsFile)) {
      const content = fs.readFileSync(logsFile, "utf8");
      logs = content ? JSON.parse(content) : [];
    }

    // Add new log entry (keep only last 1000 entries)
    logs.push({
      timestamp: new Date().toISOString(),
      event_id: webhookData.event_id,
      event_type: webhookData.event_type,
      resource_id: webhookData.meta?.resource_id,
    });

    if (logs.length > 1000) {
      logs = logs.slice(-1000);
    }

    fs.writeFileSync(logsFile, JSON.stringify(logs, null, 2), "utf8");
  } catch (error) {
    console.error("Error logging webhook:", error.message);
  }
}

/**
 * Log actions for audit trail
 * @param {string} orderId - Order ID
 * @param {string} action - Action name
 * @param {Object} details - Action details
 */
function logAction(orderId, action, details) {
  const timestamp = new Date().toISOString();
  console.log(`   [${timestamp}] ${action}`);

  try {
    const logsFile = path.join(__dirname, "data/actions.json");
    let actions = [];

    if (fs.existsSync(logsFile)) {
      const content = fs.readFileSync(logsFile, "utf8");
      actions = content ? JSON.parse(content) : [];
    }

    actions.push({
      timestamp,
      order_id: orderId,
      action,
      details,
    });

    // Keep only last 5000 actions
    if (actions.length > 5000) {
      actions = actions.slice(-5000);
    }

    fs.writeFileSync(logsFile, JSON.stringify(actions, null, 2), "utf8");
  } catch (error) {
    console.error("Error logging action:", error.message);
  }
}

/**
 * Get all stored orders
 * @returns {Array} Array of orders
 */
export function getAllOrders() {
  try {
    const ordersFile = path.join(__dirname, STORAGE_CONFIG.ordersFile);
    if (fs.existsSync(ordersFile)) {
      const content = fs.readFileSync(ordersFile, "utf8");
      return content ? JSON.parse(content) : [];
    }
    return [];
  } catch (error) {
    console.error("Error reading orders:", error.message);
    return [];
  }
}

/**
 * Get specific order by ID
 * @param {string} orderId - Order ID
 * @returns {Object|null} Order data or null
 */
export function getOrderById(orderId) {
  const orders = getAllOrders();
  return orders.find((o) => o.order_id === orderId) || null;
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 */
export function updateOrderStatus(orderId, status) {
  try {
    const ordersFile = path.join(__dirname, STORAGE_CONFIG.ordersFile);
    let orders = [];

    if (fs.existsSync(ordersFile)) {
      const content = fs.readFileSync(ordersFile, "utf8");
      orders = content ? JSON.parse(content) : [];
    }

    const order = orders.find((o) => o.order_id === orderId);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2), "utf8");
      console.log(`✅ Order ${orderId} status updated to: ${status}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error updating order status:", error.message);
    return false;
  }
}
