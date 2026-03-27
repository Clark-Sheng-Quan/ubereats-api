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
import { dbQuery } from "../db/client.js";

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
    console.error("[localService] Error saving order to storage:", error.message);
  }
}

/**
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
    console.error("[localService] Error logging webhook:", error.message);
  }
}

/**

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
    console.error("[localService] Error logging action:", error.message);
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
    console.error("[localService] Error reading orders:", error.message);
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
    console.error("[localService] Error updating order status:", error.message);
    return false;
  }
}

/**
 * Save Uber connection details for a shop
 * @param {Object} connectionData - Connection data
 */
export async function saveUberConnection(connectionData) {
  try {
    await dbQuery(
      `
      INSERT INTO uber_connections_db (
        shop_id,
        uber_store_id,
        uber_store_name,
        access_token,
        refresh_token,
        expires_at,
        connected_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (shop_id)
      DO UPDATE SET
        uber_store_id = EXCLUDED.uber_store_id,
        uber_store_name = EXCLUDED.uber_store_name,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        connected_at = EXCLUDED.connected_at,
        updated_at = NOW()
      `,
      [
        connectionData.shop_id,
        connectionData.uber_store_id || null,
        connectionData.uber_store_name || null,
        connectionData.access_token || null,
        connectionData.refresh_token || null,
        connectionData.expires_at || null,
        connectionData.connected_at || null,
      ]
    );
  } catch (error) {
    console.error("[localService] Error saving Uber connection:", error.message);
  }
}

/**
 * Get Uber connection for a shop
 * @param {string} shopId - Shop ID
 * @returns {Object|null} Connection data or null
 */
export async function getUberConnection(shopId) {
  try {
    const { rows } = await dbQuery(
      `
      SELECT
        shop_id,
        uber_store_id,
        uber_store_name,
        access_token,
        refresh_token,
        expires_at,
        connected_at
      FROM uber_connections_db
      WHERE shop_id = $1
      LIMIT 1
      `,
      [shopId]
    );
    return rows[0] || null;
  } catch (error) {
    console.error("[localService] Error reading Uber connection:", error.message);
    return null;
  }
}

/**
 * Delete Uber connection for a shop
 * @param {string} shopId - Shop ID
 */
export async function deleteUberConnection(shopId) {
  try {
    await dbQuery("DELETE FROM uber_connections_db WHERE shop_id = $1", [shopId]);
  } catch (error) {
    console.error("[localService] Error deleting Uber connection:", error.message);
  }
}

/**
 * Save menu sync history
 * @param {Object} syncData - Sync history data
 */
export async function saveSyncHistory(syncData) {
  try {
    const id = `sync_${Date.now()}`;
    await dbQuery(
      `
      INSERT INTO sync_history_db (id, shop_id, status, message, details, created_at)
      VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      `,
      [
        id,
        syncData.shop_id,
        syncData.status || null,
        syncData.message || null,
        JSON.stringify(syncData || {}),
      ]
    );

    await dbQuery(
      `
      DELETE FROM sync_history_db
      WHERE shop_id = $1
        AND id NOT IN (
          SELECT id FROM sync_history_db
          WHERE shop_id = $1
          ORDER BY created_at DESC
          LIMIT 1000
        )
      `,
      [syncData.shop_id]
    );

    console.log(`[localService]✅ Sync history saved for shop ${syncData.shop_id}`);
  } catch (error) {
    console.error("[localService] Error saving sync history:", error.message);
  }
}

/**
 * Get sync history for a shop
 * @param {string} shopId - Shop ID
 * @returns {Array} Sync history records
 */
export async function getSyncHistory(shopId) {
  try {
    const { rows } = await dbQuery(
      `
      SELECT details
      FROM sync_history_db
      WHERE shop_id = $1
      ORDER BY created_at DESC
      LIMIT 1000
      `,
      [shopId]
    );

    return rows.map((row) => row.details || {});
  } catch (error) {
    console.error("[localService] Error reading sync history:", error.message);
    return [];
  }
}
