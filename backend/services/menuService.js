/**
 * Menu Management Service for Uber Eats
 * Implements 3 core Uber Eats Menu Management APIs:
 * - GET /v2/eats/stores/{store_id}/menus (Get Menu)
 * - POST /v2/eats/stores/{store_id}/menus/items/{item_id} (Update Item)
 * - PUT /v2/eats/stores/{store_id}/menus (Upload Menu)
 * 
 * Reference: Uber Eats Menu Management API Documentation
 */

import fetch from "node-fetch";
import { getAccessToken } from "../utils/tokenManager.js";
import { UBER_API_BASE_URL as BASE_URL } from "../config/config.js";

/**
 * Get Menu
 * GET /v2/eats/stores/{store_id}/menus
 * 
 * Retrieves the entire menu for a specific store.
 * Note: Response may be very large, consider using gzip compression.
 * 
 * @param {string} storeId - The UUID of the store
 * @param {string} [menuType] - Optional menu type filter
 *   - MENU_TYPE_FULFILLMENT_DELIVERY (default)
 *   - MENU_TYPE_FULFILLMENT_PICK_UP
 *   - MENU_TYPE_FULFILLMENT_DINE_IN
 * @returns {Promise<Object>} MenuConfiguration { menus, categories, items, modifier_groups }
 */
export async function getMenu(storeId, menuType = null) {
  const token = await getAccessToken();
  
  let url = `${BASE_URL}/v2/eats/stores/${storeId}/menus`;
  if (menuType) {
    url += `?menu_type=${menuType}`;
  }

  console.log(`\n📋 Getting menu for store: ${storeId}`);
  if (menuType) console.log(`   Menu type: ${menuType}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get menu: ${response.status} ${error}`);
  }

  const data = await response.json();
  // console.log(`\n[menuService] Full response from Uber API:`);
  // console.log(JSON.stringify(data, null, 2));
  // console.log(`\n[menuService] Summary:`);
  // console.log(`   Items count: ${data.items?.length || 0}`);
  // console.log(`   Categories count: ${data.categories?.length || 0}`);
  // console.log(`   Menus count: ${data.menus?.length || 0}`);
  // console.log(`   Modifier groups count: ${data.modifier_groups?.length || 0}`);
  return data;
}

/**
 * Update Item
 * POST /v2/eats/stores/{store_id}/menus/items/{item_id}
 * 
 * Updates an individual item within a menu. This endpoint performs sparse updates,
 * meaning it will only update fields that are specified.
 * 
 * @param {string} storeId - The UUID of the store
 * @param {string} itemId - The UUID of the item to update
 * @param {Object} updateData - UpdateItemConfiguration (sparse update fields)
 *   - price_info: {price (required), core_price?, container_deposit?, overrides?, priced_by_unit?}
 *   - suspension_info: {suspension?, overrides?}
 *   - menu_type: MENU_TYPE_FULFILLMENT_DELIVERY | MENU_TYPE_FULFILLMENT_PICK_UP | MENU_TYPE_FULFILLMENT_DINE_IN
 *   - product_info: {gtin?, plu?, merchant_id?, product_type?, product_traits?, countries_of_origin?, target_market?}
 *   - classifications: {can_serve_alone?, alcoholic_items?, dietary_label_info?, ingredients?, additives?, preparation_type?, is_high_fat_salt_sugar?, food_business_operator?, instructions_for_use?}
 *   - beverage_info: {caffeine_amount?, alcohol_by_volume?, coffee_info?}
 *   - physical_properties_info: {reusable_packaging?, storage_instructions?}
 *   - medication_info: {medical_prescription_required?}
 *   - nutritional_info: {calories?, kilojoules?, serving_size?, number_of_servings?, calories_per_serving?, kilojoules_per_serving?, fat?, saturated_fatty_acids?, carbohydrates?, sugar?, protein?, salt?, allergens?, net_quantity?, number_of_servings_interval?}
 *   - selling_info: {...}
 * @returns {Promise<void>} Returns 204 No Content on success
 */
export async function updateItem(storeId, itemId, updateData) {
  const token = await getAccessToken();
  const url = `${BASE_URL}/v2/eats/stores/${storeId}/menus/items/${itemId}`;

  console.log(`\n✏️ Updating item: ${itemId}`);
  console.log(`   Store: ${storeId}`);

  // Build request body with only provided fields (sparse update)
  const body = {};
  const updateFields = [];

  if (updateData.price_info) {
    body.price_info = updateData.price_info;
    updateFields.push("💰 price_info");
  }
  if (updateData.suspension_info) {
    body.suspension_info = updateData.suspension_info;
    updateFields.push("🚫 suspension_info");
  }
  if (updateData.menu_type) {
    body.menu_type = updateData.menu_type;
    updateFields.push("📋 menu_type");
  }
  if (updateData.product_info) {
    body.product_info = updateData.product_info;
    updateFields.push("📦 product_info");
  }
  if (updateData.classifications) {
    body.classifications = updateData.classifications;
    updateFields.push("🏷️ classifications");
  }
  if (updateData.beverage_info) {
    body.beverage_info = updateData.beverage_info;
    updateFields.push("☕ beverage_info");
  }
  if (updateData.physical_properties_info) {
    body.physical_properties_info = updateData.physical_properties_info;
    updateFields.push("📦 physical_properties_info");
  }
  if (updateData.medication_info) {
    body.medication_info = updateData.medication_info;
    updateFields.push("💊 medication_info");
  }
  if (updateData.nutritional_info) {
    body.nutritional_info = updateData.nutritional_info;
    updateFields.push("🥗 nutritional_info");
  }
  if (updateData.selling_info) {
    body.selling_info = updateData.selling_info;
    updateFields.push("💼 selling_info");
  }

  if (updateFields.length === 0) {
    throw new Error("At least one field must be provided for update");
  }

  console.log(`   Updating: ${updateFields.join(", ")}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update item: ${response.status} ${error}`);
  }

  console.log(`   ✅ Item updated successfully (204 No Content)`);
}

/**
 * Upload Menu
 * PUT /v2/eats/stores/{store_id}/menus
 * 
 * Creates or overrides the entire menu for a specific store.
 * Use this to do a complete menu replacement.
 * Note: Request payload may be very large, consider using gzip compression.
 * 
 * @param {string} storeId - The UUID of the store
 * @param {Object} menuConfig - Complete MenuConfiguration
 *   - menus: Menu[] - List of menus
 *   - categories: Category[] - List of categories
 *   - items: Item[] - List of items
 *   - modifier_groups: ModifierGroup[] - List of modifier groups
 *   - menu_type?: (optional) MENU_TYPE_FULFILLMENT_DELIVERY | MENU_TYPE_FULFILLMENT_PICK_UP | MENU_TYPE_FULFILLMENT_DINE_IN
 * @returns {Promise<void>} Returns 204 No Content on success
 */
export async function uploadMenu(storeId, menuConfig) {
  const token = await getAccessToken();

  let url = `${BASE_URL}/v2/eats/stores/${storeId}/menus`;
  if (menuConfig.menu_type) {
    url += `?menu_type=${menuConfig.menu_type}`;
  }

  console.log(`\n⬆️ Uploading menu for store: ${storeId}`);
  console.log(`   Menus: ${menuConfig.menus?.length || 0}`);
  console.log(`   Categories: ${menuConfig.categories?.length || 0}`);
  console.log(`   Items: ${menuConfig.items?.length || 0}`);
  console.log(`   Modifier Groups: ${menuConfig.modifier_groups?.length || 0}`);

  // Prepare request body
  const body = {
    menus: menuConfig.menus || [],
    categories: menuConfig.categories || [],
    items: menuConfig.items || [],
    modifier_groups: menuConfig.modifier_groups || [],
  };

  // Remove empty arrays
  if (!body.menus.length) delete body.menus;
  if (!body.categories.length) delete body.categories;
  if (!body.items.length) delete body.items;
  if (!body.modifier_groups.length) delete body.modifier_groups;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[menuService] Failed to upload menu: ${response.status} ${error}`);
  }

  console.log(`   ✅ Menu uploaded successfully (204 No Content)`);
  console.log(`   [menuService] Use Get Menu endpoint to verify`);}