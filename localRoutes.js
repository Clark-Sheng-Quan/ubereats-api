/**
 * Local API Routes
 * Handles operations on locally stored order data (JSON files)
 * Path prefix: /api/local/*
 */

import express from "express";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
} from "./orderService.js";
import fs from "fs";
import path from "path";

const router = express.Router();

/**
 * GET /api/local/orders
 * Get all orders from local storage
 * Query params: status, limit, offset
 */
router.get("/orders", (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let orders = getAllOrders();

    // Filter by status if provided
    if (status) {
      orders = orders.filter((order) => order.status === status);
    }

    // Apply pagination
    const start = parseInt(offset);
    const end = start + parseInt(limit);
    const paginatedOrders = orders.slice(start, end);

    res.json({
      orders: paginatedOrders,
      total: orders.length,
      limit: parseInt(limit),
      offset: start,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/local/orders/:orderId
 * Get a specific order from local storage
 */
router.get("/orders/:orderId", (req, res) => {
  try {
    const order = getOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found in local storage" });
    }

    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/local/orders/:orderId/status
 * Update order status in local storage
 */
router.patch("/orders/:orderId/status", (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const updated = updateOrderStatus(orderId, status);

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ success: true, orderId, status });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/local/stats
 * Get statistics from local orders
 */
router.get("/stats", (req, res) => {
  try {
    const orders = getAllOrders();

    const stats = {
      total: orders.length,
      by_status: {},
      by_event: {},
    };

    orders.forEach((order) => {
      // Count by status
      stats.by_status[order.status] = (stats.by_status[order.status] || 0) + 1;

      // Count by event type
      stats.by_event[order.event_type] =
        (stats.by_event[order.event_type] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/local/orders/clear
 * Clear all local order records (for testing)
 */
router.post("/orders/clear", (req, res) => {
  try {
    const dataDir = path.join(process.cwd(), "data");

    // Clear orders.json
    fs.writeFileSync(path.join(dataDir, "orders.json"), "[]", "utf8");

    // Clear webhook_logs.json
    fs.writeFileSync(path.join(dataDir, "webhook_logs.json"), "[]", "utf8");

    // Clear actions.json
    fs.writeFileSync(path.join(dataDir, "actions.json"), "[]", "utf8");

    res.json({
      success: true,
      message: "All local order records cleared",
    });
  } catch (error) {
    console.error("Error clearing orders:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
