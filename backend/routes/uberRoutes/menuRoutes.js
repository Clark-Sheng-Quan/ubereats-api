/**
 * Menu Management Routes
 * Implements Uber Eats Menu APIs:
 * - GET /v2/eats/stores/{store_id}/menus
 * - POST /v2/eats/stores/{store_id}/menus/items/{item_id}
 * - PUT /v2/eats/stores/{store_id}/menus
 * Path prefix: /api/menu/*
 */

import express from "express";
import {
  getMenu,
  updateItem,
  uploadMenu,
} from "../../services/uberServices/menuService.js";

const router = express.Router();

/**
 * GET /api/menu/:storeId
 * Get Menu API
 * https://api.uber.com/v2/eats/stores/{store_id}/menus
 * 
 * Query params:
 *   menu_type: (optional) MENU_TYPE_FULFILLMENT_DELIVERY | MENU_TYPE_FULFILLMENT_PICK_UP | MENU_TYPE_FULFILLMENT_DINE_IN
 * 
 * Response: MenuConfiguration { menus, categories, items, modifier_groups }
 */
router.get("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const { menu_type } = req.query;

    const menu = await getMenu(storeId, menu_type);
    res.json(menu);
  } catch (error) {
    console.error(`Error fetching menu for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/menu/:storeId/items/:itemId
 * Update Item API
 * https://api.uber.com/v2/eats/stores/{store_id}/menus/items/{item_id}
 * 
 * Body: UpdateItemConfiguration (sparse update - only provide fields to update)
 *   - price_info: { price (cents), core_price?, container_deposit?, overrides?, priced_by_unit? }
 *   - suspension_info: { suspension?, overrides? }
 *   - menu_type: MENU_TYPE_FULFILLMENT_DELIVERY | MENU_TYPE_FULFILLMENT_PICK_UP | MENU_TYPE_FULFILLMENT_DINE_IN
 *   - product_info: { gtin?, plu?, merchant_id?, product_type?, product_traits?, countries_of_origin?, target_market? }
 *   - classifications: { can_serve_alone?, alcoholic_items?, dietary_label_info?, ingredients?, additives?, ... }
 *   - beverage_info: { caffeine_amount?, alcohol_by_volume?, coffee_info? }
 *   - physical_properties_info: { reusable_packaging?, storage_instructions? }
 *   - medication_info: { medical_prescription_required? }
 *   - nutritional_info: { calories?, kilojoules?, serving_size?, allergens?, ... }
 *   - selling_info: { ... }
 * 
 * Response: 204 No Content
 */
router.post("/:storeId/items/:itemId", async (req, res) => {
  try {
    const { storeId, itemId } = req.params;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "At least one field to update is required" });
    }

    await updateItem(storeId, itemId, updateData);
    res.status(204).send();
  } catch (error) {
    console.error(`Error updating item ${req.params.itemId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/menu/:storeId
 * Upload Menu API
 * https://api.uber.com/v2/eats/stores/{store_id}/menus
 * 
 * Body: MenuConfiguration
 *   - menus: Menu[]
 *   - categories: Category[]
 *   - items: Item[]
 *   - modifier_groups: ModifierGroup[]
 *   - menu_type?: (optional) MENU_TYPE_FULFILLMENT_DELIVERY | MENU_TYPE_FULFILLMENT_PICK_UP | MENU_TYPE_FULFILLMENT_DINE_IN
 * 
 * Response: 204 No Content
 */
router.put("/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params;
    const menuConfig = req.body;

    // Validate that at least one of the required arrays is provided
    if (
      !menuConfig.menus &&
      !menuConfig.categories &&
      !menuConfig.items &&
      !menuConfig.modifier_groups
    ) {
      return res.status(400).json({
        error: "At least one of menus, categories, items, or modifier_groups must be provided",
      });
    }

    await uploadMenu(storeId, menuConfig);
    res.status(204).send();
  } catch (error) {
    console.error(`Error uploading menu for store ${req.params.storeId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
