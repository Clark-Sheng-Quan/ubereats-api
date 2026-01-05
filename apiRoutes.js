import express from "express";
import {
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  fetchOrderDetails,
} from "./orderService.js";

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

export default router;
