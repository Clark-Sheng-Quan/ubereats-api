/**
 * Service for managing Uber Eats Stores
 * Handles listing stores, getting details, and updating status
 */
import fetch from "node-fetch";
import { getAccessToken } from "../utils/tokenManager.js";
import { UBER_API_BASE_URL as BASE_URL } from "../config/config.js";

/**
 * Get a list of all stores authorized for this account
 * @returns {Promise<Array>} List of stores
 */
export async function getStores() {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v1/delivery/stores`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get stores: ${response.status} ${error}`);
  }
  const data = await response.json();
  console.log(data);
  return data.stores;
}

/**
 * Get details for a specific store
 * @param {string} storeId - The UUID of the store
 * @returns {Promise<Object>} Store details
 */
export async function getStoreDetails(storeId) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v1/delivery/store/${storeId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get store details: ${response.status} ${error}`);
  }
  const data = await response.json();
  console.log(data);
  return data;
}

/**
 * Update the online/offline status of a store
 * @param {string} storeId - The UUID of the store
 * @param {string} status - "ONLINE" or "OFFLINE"
 * @param {string} [reason] - Optional reason for going offline
 * @param {string} [is_offline_until] - Optional timestamp for when the store will be back online
 * @returns {Promise<Object>} Updated status response
 */
export async function updateStoreStatus(storeId, status, reason, is_offline_until) {
  const token = await getAccessToken();
  
  const body = {
    status: status,
  };
  
  if (reason) {
    body.reason = reason;
  }

  if (is_offline_until) {
    body.is_offline_until = is_offline_until;
  }

  const response = await fetch(
    `${BASE_URL}/v1/delivery/store/${storeId}/update-store-status`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update store status: ${response.status} ${error}`);
  }
  const data = await response.json();
  console.log(data);
  return data;
}

/**
 * Update the default preparation time for a store
 * @param {string} storeId - The UUID of the store
 * @param {number} defaultPrepTime - Default preparation time in minutes
 * @returns {Promise<Object>} Updated prep time response
 */
export async function updateStorePrepTime(storeId, defaultPrepTime) {
  const token = await getAccessToken();
  
  // Convert minutes to seconds (Uber API expects seconds)
  const prepTimeInSeconds = defaultPrepTime * 60;
  
  const body = {
    default_prep_time: prepTimeInSeconds,
  };

  const response = await fetch(
    `${BASE_URL}/v1/delivery/store/${storeId}/update-store-prep-time`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update store prep time: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

/**
 * Get the current orderability status of a store
 * @param {string} storeId - The UUID of the store
 * @returns {Promise<Object>} Store status information
 */
export async function getStoreStatus(storeId) {
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL}/v1/delivery/store/${storeId}/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get store status: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

/**
 * Update store contact, location, and pickup instructions information
 * @param {string} storeId - The UUID of the store
 * @param {Object} updateData - Store information to update
 * @param {Object} [updateData.contact] - Contact information
 * @param {Object} [updateData.location] - Location information
 * @param {string} [updateData.pickup_instructions] - Pickup instructions
 * @returns {Promise<Object>} Updated store information
 */
export async function updateStoreInfo(storeId, updateData) {
  const token = await getAccessToken();
  
  const body = {};
  
  if (updateData.contact) {
    body.contact = updateData.contact;
  }
  
  if (updateData.location) {
    body.location = updateData.location;
  }
  
  if (updateData.pickup_instructions) {
    body.pickup_instructions = updateData.pickup_instructions;
  }

  const response = await fetch(`${BASE_URL}/v1/delivery/store/${storeId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update store info: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

/**
 * Update fulfillment configuration for a store using BYOC (Bring Your Own Courier)
 * @param {string} storeId - The UUID of the store
 * @param {Object} configData - Fulfillment configuration
 * @param {number} [configData.custom_min_etd_minutes] - Custom minimum ETD in minutes (max 160)
 * @returns {Promise<Object>} Updated fulfillment configuration
 */
export async function updateFulfillmentConfig(storeId, configData) {
  const token = await getAccessToken();
  
  const body = {
    override_config: configData || {},
  };

  const response = await fetch(
    `${BASE_URL}/v1/delivery/store/${storeId}/update-fulfillment-configuration`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update fulfillment config: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}
