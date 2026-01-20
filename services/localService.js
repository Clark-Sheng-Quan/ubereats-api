/**
 * Local Service Module
 * Handles all local data storage operations (JSON files)
 * - Order storage and retrieval
 * - Webhook logging
 * - Action audit trail
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { STORAGE_CONFIG } from "../config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Save order to storage (file-based)
 * @param {Object} orderData - Order data to save
 */
export function saveOrderToStorage(orderData) {
  try {
    const ordersFile = path.join(dataDir, STORAGE_CONFIG.ordersFile);
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
  } catch (error) {
    console.error(`   ❌ Error saving order to storage:`, error.message);
  }
}

/**
 * Log webhook events for debugging and audit trail
 * @param {Object} webhookData - The webhook payload
 */
export function logWebhook(webhookData) {
  try {
    const logsFile = path.join(dataDir, STORAGE_CONFIG.logsFile);
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
export function logAction(orderId, action, details) {
  const timestamp = new Date().toISOString();
  console.log(`   [${timestamp}] ${action}`);

  try {
    const logsFile = path.join(dataDir, STORAGE_CONFIG.actionsFile || "actions.json");
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
    const ordersFile = path.join(dataDir, STORAGE_CONFIG.ordersFile);
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
 * @returns {boolean} True if order was updated
 */
export function updateOrderStatus(orderId, status) {
  try {
    const ordersFile = path.join(dataDir, STORAGE_CONFIG.ordersFile);
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

/**
 * Save Uber connection details for a shop
 * @param {Object} connectionData - Connection data
 */
export function saveUberConnection(connectionData) {
  try {
    const file = path.join(dataDir, STORAGE_CONFIG.connectionsFile);
    let connections = [];

    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      connections = content ? JSON.parse(content) : [];
    }

    // Find and update or add new connection
    const existingIndex = connections.findIndex(
      (c) => c.shop_id === connectionData.shop_id
    );

    if (existingIndex >= 0) {
      connections[existingIndex] = { ...connections[existingIndex], ...connectionData };
    } else {
      connections.push(connectionData);
    }

    fs.writeFileSync(file, JSON.stringify(connections, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving Uber connection:", error.message);
  }
}

/**
 * Get Uber connection for a shop
 * @param {string} shopId - Shop ID
 * @returns {Object|null} Connection data or null
 */
export function getUberConnection(shopId) {
  try {
    const file = path.join(dataDir, STORAGE_CONFIG.connectionsFile);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const connections = content ? JSON.parse(content) : [];
      return connections.find((c) => c.shop_id === shopId) || null;
    }
    return null;
  } catch (error) {
    console.error("Error reading Uber connection:", error.message);
    return null;
  }
}

/**
 * Delete Uber connection for a shop
 * @param {string} shopId - Shop ID
 */
export function deleteUberConnection(shopId) {
  try {
    const file = path.join(dataDir, STORAGE_CONFIG.connectionsFile);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      let connections = content ? JSON.parse(content) : [];
      connections = connections.filter((c) => c.shop_id !== shopId);
      fs.writeFileSync(file, JSON.stringify(connections, null, 2), "utf8");
    }
  } catch (error) {
    console.error("Error deleting Uber connection:", error.message);
  }
}

/**
 * Save menu sync history
 * @param {Object} syncData - Sync history data
 */
export function saveSyncHistory(syncData) {
  try {
    const file = path.join(dataDir, STORAGE_CONFIG.syncFile);
    let history = [];

    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      history = content ? JSON.parse(content) : [];
    }

    history.push({
      id: `sync_${Date.now()}`,
      ...syncData,
    });

    // Keep only last 1000 sync records per shop
    const byShop = {};
    history.forEach((item) => {
      if (!byShop[item.shop_id]) {
        byShop[item.shop_id] = [];
      }
      byShop[item.shop_id].push(item);
    });

    history = [];
    Object.values(byShop).forEach((items) => {
      if (items.length > 1000) {
        items = items.slice(-1000);
      }
      history.push(...items);
    });

    fs.writeFileSync(file, JSON.stringify(history, null, 2), "utf8");
    console.log(`✅ Sync history saved for shop ${syncData.shop_id}`);
  } catch (error) {
    console.error("Error saving sync history:", error.message);
  }
}

/**
 * Get sync history for a shop
 * @param {string} shopId - Shop ID
 * @returns {Array} Sync history records
 */
export function getSyncHistory(shopId) {
  try {
    const file = path.join(dataDir, STORAGE_CONFIG.syncFile);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      const history = content ? JSON.parse(content) : [];
      return history.filter((h) => h.shop_id === shopId).reverse();
    }
    return [];
  } catch (error) {
    console.error("Error reading sync history:", error.message);
    return [];
  }
}
