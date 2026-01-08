import express from "express";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  fetchOrderDetails,
} from "../services/orderService.js";
import {
  acceptOrder,
  denyOrder,
  reportFulfillmentIssue,
  cancelOrder,
  DENY_REASONS,
  CANCEL_REASONS,
} from "../services/orderActions.js";

const router = express.Router();

/**
 * GET /api/orders
 * Get all received orders with optional filtering
 */
router.get("/orders", (req, res) => {
  try {
    const orders = getAllOrders();
    const { status, limit = 50 } = req.query;

    let filtered = orders;

    // Filter by status if provided
    if (status) {
      filtered = orders.filter((o) => o.status === status);
    }

    // Limit results
    const limited = filtered.slice(-limit);

    res.json({
      total: orders.length,
      filtered: filtered.length,
      returned: limited.length,
      orders: limited.reverse(), // Most recent first
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:orderId
 * Get specific order details
 */
router.get("/orders/:orderId", (req, res) => {
  try {
    const { orderId } = req.params;
    const order = getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/orders/:orderId/status
 * Update order status
 */
router.patch("/orders/:orderId/status", (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const success = updateOrderStatus(orderId, status);

    if (!success) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order status updated", order_id: orderId, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:orderId/details
 * Fetch fresh order details from Uber API
 */
router.get("/orders/:orderId/details", async (req, res) => {
  try {
    const { orderId } = req.params;
    const details = await fetchOrderDetails(orderId);

    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get webhook statistics
 */
router.get("/stats", (req, res) => {
  try {
    const orders = getAllOrders();

    const stats = {
      total_orders: orders.length,
      by_status: {},
      by_event_type: {},
    };

    orders.forEach((order) => {
      // Count by status
      if (!stats.by_status[order.status]) {
        stats.by_status[order.status] = 0;
      }
      stats.by_status[order.status]++;

      // Count by event type
      if (!stats.by_event_type[order.event_type]) {
        stats.by_event_type[order.event_type] = 0;
      }
      stats.by_event_type[order.event_type]++;
    });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:orderId/accept
 * Manually accept an order
 */
router.post("/orders/:orderId/accept", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { estimated_prep_time_minutes, reason } = req.body;

    const result = await acceptOrder(orderId, {
      estimated_prep_time_minutes: estimated_prep_time_minutes || 15,
      reason: reason,
    });

    if (result.success) {
      updateOrderStatus(orderId, "accepted");
      res.json({
        message: "Order accepted successfully",
        order_id: orderId,
        data: result.data,
      });
    } else {
      res.status(500).json({
        error: "Failed to accept order",
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:orderId/deny
 * Manually deny an order
 */
router.post("/orders/:orderId/deny", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, out_of_items } = req.body;

    const result = await denyOrder(orderId, {
      reason: reason || DENY_REASONS.CANNOT_COMPLETE,
      out_of_items: out_of_items,
    });

    if (result.success) {
      updateOrderStatus(orderId, "denied");
      res.json({
        message: "Order denied successfully",
        order_id: orderId,
        data: result.data,
      });
    } else {
      res.status(500).json({
        error: "Failed to deny order",
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:orderId/fulfillment-issue
 * Report fulfillment issue (items out of stock)
 */
router.post("/orders/:orderId/fulfillment-issue", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { out_of_stock_items } = req.body;

    if (!out_of_stock_items || !Array.isArray(out_of_stock_items)) {
      return res.status(400).json({
        error: "out_of_stock_items array is required",
      });
    }

    const result = await reportFulfillmentIssue(orderId, out_of_stock_items);

    if (result.success) {
      updateOrderStatus(orderId, "fulfillment_issue_reported");
      res.json({
        message: "Fulfillment issue reported successfully",
        order_id: orderId,
        data: result.data,
      });
    } else {
      res.status(500).json({
        error: "Failed to report fulfillment issue",
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/:orderId/cancel
 * Cancel an order
 */
router.post("/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const result = await cancelOrder(
      orderId,
      reason || CANCEL_REASONS.MERCHANT_REQUEST
    );

    if (result.success) {
      updateOrderStatus(orderId, "cancelled");
      res.json({
        message: "Order cancelled successfully",
        order_id: orderId,
        data: result.data,
      });
    } else {
      res.status(500).json({
        error: "Failed to cancel order",
        details: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders/clear
 * Clear all order records (for testing/development)
 */
router.post("/orders/clear", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    
    const ordersFile = path.join(process.cwd(), "data/orders.json");
    const logsFile = path.join(process.cwd(), "data/webhook_logs.json");
    const actionsFile = path.join(process.cwd(), "data/actions.json");

    // Clear all files
    if (fs.existsSync(ordersFile)) {
      fs.writeFileSync(ordersFile, "[]", "utf8");
    }
    if (fs.existsSync(logsFile)) {
      fs.writeFileSync(logsFile, "[]", "utf8");
    }
    if (fs.existsSync(actionsFile)) {
      fs.writeFileSync(actionsFile, "[]", "utf8");
    }

    res.json({ message: "All order records cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
