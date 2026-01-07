/**
 * Uber API Routes
 * Proxies all Uber Eats API calls
 * Path prefix: /api/uber/*
 */

import express from "express";
import { STORE_ID } from "./config.js";
import {
  acceptOrder,
  denyOrder,
  cancelOrder,
  reportFulfillmentIssue,
  getOrderFromUber,
  listStoreOrders,
  markOrderReady,
  adjustOrderPrice,
  updateOrderReadyTime,
} from "./orderActions.js";

const router = express.Router();

/**
 * GET /api/uber/orders/:orderId
 * Get order details directly from Uber API
 */
router.get("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { expand = "carts,deliveries,payment" } = req.query;

    const result = await getOrderFromUber(orderId, expand);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error fetching order from Uber:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/uber/store/:storeId/orders
 * List orders for a store from Uber API
 */
router.get("/store/:storeId/orders", async (req, res) => {
  try {
    const { storeId } = req.params;
    const {
      expand,
      state,
      status,
      start_time,
      end_time,
      page_size,
      next_page_token,
    } = req.query;

    const params = {
      expand,
      state,
      status,
      start_time,
      end_time,
      page_size,
      next_page_token,
    };

    const result = await listStoreOrders(storeId, params);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error listing store orders from Uber:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/uber/store/orders (uses default STORE_ID from config)
 * List orders for the configured store
 */
router.get("/store/orders", async (req, res) => {
  try {
    const {
      expand,
      state,
      status,
      start_time,
      end_time,
      page_size,
      next_page_token,
    } = req.query;

    const params = {
      expand,
      state,
      status,
      start_time,
      end_time,
      page_size,
      next_page_token,
    };

    const result = await listStoreOrders(STORE_ID, params);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error("Error listing store orders from Uber:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/accept
 * Accept an order via Uber API
 */
router.post("/orders/:orderId/accept", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ready_for_pickup_time, external_reference_id, accepted_by } = req.body;

    const options = {};
    if (ready_for_pickup_time) options.ready_for_pickup_time = ready_for_pickup_time;
    if (external_reference_id) options.external_reference_id = external_reference_id;
    if (accepted_by) options.accepted_by = accepted_by;

    const result = await acceptOrder(orderId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error accepting order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/deny
 * Deny an order via Uber API
 */
router.post("/orders/:orderId/deny", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, info, client_error_code, item_metadata } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Denial reason (type) is required" });
    }

    const options = { reason };
    if (info) options.info = info;
    if (client_error_code) options.client_error_code = client_error_code;
    if (item_metadata) options.item_metadata = item_metadata;

    const result = await denyOrder(orderId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error denying order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/cancel
 * Cancel an order via Uber API
 */
router.post("/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, info, client_error_code } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Cancellation reason (type) is required" });
    }

    const options = { reason };
    if (info) options.info = info;
    if (client_error_code) options.client_error_code = client_error_code;

    const result = await cancelOrder(orderId, options);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error canceling order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/ready
 * Mark order as ready for pickup
 */
router.post("/orders/:orderId/ready", async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await markOrderReady(orderId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error marking order ready:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/adjust-price
 * Adjust order price
 */
router.post("/orders/:orderId/adjust-price", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount_e5, tax_rate, reason, custom_reason } = req.body;

    if (amount_e5 === undefined) {
      return res.status(400).json({ error: "amount_e5 is required" });
    }

    // Validate custom_reason is provided when reason is OTHER
    if (reason === "OTHER" && !custom_reason) {
      return res.status(400).json({ error: "custom_reason is required when reason is OTHER" });
    }

    const result = await adjustOrderPrice(orderId, {
      amount_e5,
      tax_rate,
      reason,
      custom_reason,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error adjusting order price:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/update-ready-time
 * Update order ready for pickup time
 */
router.post("/orders/:orderId/update-ready-time", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ready_for_pickup_time } = req.body;

    if (!ready_for_pickup_time) {
      return res
        .status(400)
        .json({ error: "ready_for_pickup_time is required (RFC3339 format)" });
    }

    const result = await updateOrderReadyTime(orderId, ready_for_pickup_time);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error updating order ready time:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/uber/orders/:orderId/fulfillment-issue
 * Report fulfillment issues (resolve fulfillment issues)
 */
router.post("/orders/:orderId/fulfillment-issue", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fulfillment_issues } = req.body;

    if (!fulfillment_issues || !Array.isArray(fulfillment_issues)) {
      return res
        .status(400)
        .json({ error: "fulfillment_issues array is required with proper structure" });
    }

    const result = await reportFulfillmentIssue(orderId, fulfillment_issues);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, orderId, ...result.data });
  } catch (error) {
    console.error("Error reporting fulfillment issue:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
