/**
 * Shop Binding Service
 * Manages bindings between POS shops and Uber stores
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BINDINGS_FILE = path.join(__dirname, "../data/shop_bindings.json");

/**
 * Read all bindings from file
 */
async function getAllBindings() {
  try {
    const data = await fs.readFile(BINDINGS_FILE, "utf-8");
    
    // Handle empty file
    if (!data || data.trim().length === 0) {
      return [];
    }
    
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      console.warn("[bindingService] Invalid JSON in bindings file, returning empty array");
      return [];
    }
    
    throw error;
  }
}

/**
 * Write bindings to file
 */
async function saveBindings(bindings) {
  await fs.writeFile(BINDINGS_FILE, JSON.stringify(bindings, null, 2), "utf-8");
}

/**
 * Get bindings for a specific POS shop
 */
export async function getShopBindings(pos_shop_id) {
  const bindings = await getAllBindings();
  return bindings.filter((b) => b.pos_shop_id === pos_shop_id);
}

/**
 * Get single binding by POS shop ID
 */
export async function getShopBinding(pos_shop_id) {
  const bindings = await getShopBindings(pos_shop_id);
  return bindings.length > 0 ? bindings[0] : null;
}

/**
 * Create or update binding
 */
export async function saveShopBinding(bindingData) {
  const bindings = await getAllBindings();

  // Check if binding already exists for this POS shop
  const existingIndex = bindings.findIndex(
    (b) => b.pos_shop_id === bindingData.pos_shop_id
  );

  const binding = {
    pos_shop_id: bindingData.pos_shop_id,
    pos_shop_name: bindingData.pos_shop_name,
    uber_store_id: bindingData.uber_store_id,
    uber_store_name: bindingData.uber_store_name,
    bound_at: bindingData.bound_at || new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    // Update existing binding
    bindings[existingIndex] = binding;
  } else {
    // Create new binding
    bindings.push(binding);
  }

  await saveBindings(bindings);
  return binding;
}

/**
 * Delete binding
 */
export async function deleteShopBinding(pos_shop_id) {
  const bindings = await getAllBindings();
  const filtered = bindings.filter((b) => b.pos_shop_id !== pos_shop_id);

  if (filtered.length === bindings.length) {
    console.warn("[bindingService] No binding found to delete for shop:", pos_shop_id);
    return false;
  }

  await saveBindings(filtered);
  return true;
}

/**
 * Check if a Uber store is already bound
 */
export async function isUberStoreAlreadyBound(uber_store_id) {
  const bindings = await getAllBindings();
  return bindings.some((b) => b.uber_store_id === uber_store_id);
}

/**
 * Get all bindings (for admin use)
 */
export async function getAllShopBindings() {
  return await getAllBindings();
}
