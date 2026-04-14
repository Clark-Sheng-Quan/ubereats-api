/**
 * Shop Binding Service
 * Manages bindings between POS shops and Uber stores
 */

import { dbQuery } from "../../db/client.js";

/**
 * Get bindings for a specific POS shop
 */
export async function getShopBindings(pos_shop_id) {
  const { rows } = await dbQuery(
    "SELECT pos_shop_id, pos_shop_name, uber_store_id, uber_store_name, bound_at FROM shop_bindings_db WHERE pos_shop_id = $1 ORDER BY updated_at DESC",
    [pos_shop_id]
  );
  return rows;
}

/**
 * Get single binding by POS shop ID
 */
export async function getShopBinding(pos_shop_id) {
  const { rows } = await dbQuery(
    "SELECT pos_shop_id, pos_shop_name, uber_store_id, uber_store_name, bound_at FROM shop_bindings_db WHERE pos_shop_id = $1 LIMIT 1",
    [pos_shop_id]
  );
  return rows[0] || null;
}

/**
 * Get single binding by Uber store ID
 */
export async function getShopBindingByUberStoreId(uber_store_id) {
  const { rows } = await dbQuery(
    "SELECT pos_shop_id, pos_shop_name, uber_store_id, uber_store_name, bound_at FROM shop_bindings_db WHERE uber_store_id = $1 LIMIT 1",
    [uber_store_id]
  );
  return rows[0] || null;
}

/**
 * Create or update binding
 */
export async function saveShopBinding(bindingData) {
  const binding = {
    pos_shop_id: bindingData.pos_shop_id,
    pos_shop_name: bindingData.pos_shop_name,
    uber_store_id: bindingData.uber_store_id,
    uber_store_name: bindingData.uber_store_name,
    bound_at: bindingData.bound_at || new Date().toISOString(),
  };

  await dbQuery(
    `
    INSERT INTO shop_bindings_db (
      pos_shop_id,
      pos_shop_name,
      uber_store_id,
      uber_store_name,
      bound_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (pos_shop_id)
    DO UPDATE SET
      pos_shop_name = EXCLUDED.pos_shop_name,
      uber_store_id = EXCLUDED.uber_store_id,
      uber_store_name = EXCLUDED.uber_store_name,
      bound_at = EXCLUDED.bound_at,
      updated_at = NOW()
    `,
    [
      binding.pos_shop_id,
      binding.pos_shop_name,
      binding.uber_store_id,
      binding.uber_store_name,
      binding.bound_at,
    ]
  );

  return binding;
}

/**
 * Delete binding
 */
export async function deleteShopBinding(pos_shop_id) {
  const result = await dbQuery("DELETE FROM shop_bindings_db WHERE pos_shop_id = $1", [pos_shop_id]);
  return result.rowCount > 0;
}

/**
 * Check if a Uber store is already bound
 */
export async function isUberStoreAlreadyBound(uber_store_id) {
  const { rowCount } = await dbQuery(
    "SELECT 1 FROM shop_bindings_db WHERE uber_store_id = $1 LIMIT 1",
    [uber_store_id]
  );
  return rowCount > 0;
}

/**
 * Get all bindings (for admin use)
 */
export async function getAllShopBindings() {
  const { rows } = await dbQuery(
    "SELECT pos_shop_id, pos_shop_name, uber_store_id, uber_store_name, bound_at FROM shop_bindings_db ORDER BY updated_at DESC"
  );
  return rows;
}
