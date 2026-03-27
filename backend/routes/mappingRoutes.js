import express from "express";
import { getMenu } from "../services/uberServices/menuService.js";
import {
  getMappings,
  getUberMenuSnapshot,
  listUberItems,
  upsertItemMapping,
  upsertOptionItemMapping,
  upsertOptionMapping,
  upsertUberItemsFromMenu,
} from "../services/mappingService.js";

const router = express.Router();

function requireFields(payload, requiredFields) {
  const missing = requiredFields.filter((field) => {
    const value = payload?.[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  return missing;
}

router.post("/uber-items/sync", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["shop_id", "store_id"]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const { shop_id: shopId, store_id: storeId, menu_type: menuType } = req.body;
    const menuConfig = await getMenu(storeId, menuType || null);
    const result = await upsertUberItemsFromMenu(shopId, menuConfig || {});

    res.json({
      success: true,
      message: "Uber menu snapshot synced into local database",
      data: result,
    });
  } catch (error) {
    console.error("[mappingRoutes] Failed to sync Uber items:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/uber-menu/local", async (req, res) => {
  try {
    const shopId = String(req.query.shop_id || "").trim();
    if (!shopId) {
      return res.status(400).json({ success: false, message: "shop_id is required" });
    }

    const itemPage = Math.max(1, parseInt(req.query.item_page || "1", 10));
    const optionPage = Math.max(1, parseInt(req.query.option_page || "1", 10));
    const itemsPerPage = parseInt(req.query.items_per_page || "15", 10);
    const optionItemsPerPage = parseInt(req.query.option_items_per_page || "50", 10);

    const data = await getUberMenuSnapshot(shopId, itemPage, optionPage, itemsPerPage, optionItemsPerPage);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[mappingRoutes] Failed to get local Uber menu snapshot:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/uber-items", async (req, res) => {
  try {
    const shopId = String(req.query.shop_id || "").trim();
    if (!shopId) {
      return res.status(400).json({ success: false, message: "shop_id is required" });
    }

    const rows = await listUberItems(shopId);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("[mappingRoutes] Failed to list Uber items:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/item", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["shop_id", "pos_item_id", "uber_item_id"]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const mapping = await upsertItemMapping(req.body);
    res.json({ success: true, data: mapping });
  } catch (error) {
    console.error("[mappingRoutes] Failed to upsert item mapping:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/option", async (req, res) => {
  try {
    const missing = requireFields(req.body, ["shop_id", "pos_option_id", "uber_option_id"]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const mapping = await upsertOptionMapping(req.body);
    res.json({ success: true, data: mapping });
  } catch (error) {
    console.error("[mappingRoutes] Failed to upsert option mapping:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/option-item", async (req, res) => {
  try {
    const missing = requireFields(req.body, [
      "shop_id",
      "pos_option_id",
      "pos_option_item_id",
      "uber_option_id",
      "uber_option_item_id",
    ]);

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const mapping = await upsertOptionItemMapping(req.body);
    res.json({ success: true, data: mapping });
  } catch (error) {
    console.error("[mappingRoutes] Failed to upsert option item mapping:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const shopId = String(req.query.shop_id || "").trim();
    if (!shopId) {
      return res.status(400).json({ success: false, message: "shop_id is required" });
    }

    const data = await getMappings(shopId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[mappingRoutes] Failed to get mappings:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
