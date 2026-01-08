import express from "express";
import { getStores, getStoreDetails, updateStoreStatus, updateStorePrepTime, getStoreStatus, updateStoreInfo, updateFulfillmentConfig } from "../services/storeService.js";

const router = express.Router();

// GET /api/store/list - List all stores
router.get("/list", async (req, res) => {
  try {
    const stores = await getStores();
    res.json({ stores });
  } catch (error) {
    console.error("Error listing stores:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/store/:storeId - Get store details
router.get("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await getStoreDetails(storeId);
    res.json(store);
  } catch (error) {
    console.error(`Error getting details for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/store/:storeId/status - Update store status
router.post("/:storeId/status", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { status, reason, is_offline_until } = req.body;

    if (!status || (status !== "ONLINE" && status !== "OFFLINE")) {
      return res.status(400).json({ error: "Status must be 'ONLINE' or 'OFFLINE'" });
    }

    const result = await updateStoreStatus(storeId, status, reason, is_offline_until);
    res.json(result);
  } catch (error) {
    console.error(`Error updating status for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/store/:storeId/prep-time - Update store preparation time
router.post("/:storeId/prep-time", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { default_prep_time } = req.body;

    if (default_prep_time === undefined || typeof default_prep_time !== "number") {
      return res.status(400).json({ error: "default_prep_time (number in minutes) is required" });
    }

    const result = await updateStorePrepTime(storeId, default_prep_time);
    res.json(result);
  } catch (error) {
    console.error(`Error updating prep time for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/store/:storeId/status - Get store status
router.get("/:storeId/status", async (req, res) => {
  try {
    const { storeId } = req.params;
    const status = await getStoreStatus(storeId);
    res.json(status);
  } catch (error) {
    console.error(`Error getting status for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/store/:storeId/info - Update store information (contact, location, pickup instructions)
router.post("/:storeId/info", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { contact, location, pickup_instructions } = req.body;

    const updateData = {};
    if (contact) updateData.contact = contact;
    if (location) updateData.location = location;
    if (pickup_instructions) updateData.pickup_instructions = pickup_instructions;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "At least one of contact, location, or pickup_instructions is required" });
    }

    const result = await updateStoreInfo(storeId, updateData);
    res.json(result);
  } catch (error) {
    console.error(`Error updating info for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/store/:storeId/fulfillment-config - Update fulfillment configuration
router.post("/:storeId/fulfillment-config", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { custom_min_etd_minutes } = req.body;

    if (custom_min_etd_minutes !== undefined && (typeof custom_min_etd_minutes !== "number" || custom_min_etd_minutes > 160)) {
      return res.status(400).json({ error: "custom_min_etd_minutes must be a number between 1 and 160 minutes" });
    }

    const configData = {};
    if (custom_min_etd_minutes !== undefined) {
      configData.custom_min_etd_minutes = custom_min_etd_minutes;
    }

    const result = await updateFulfillmentConfig(storeId, configData);
    res.json(result);
  } catch (error) {
    console.error(`Error updating fulfillment config for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
