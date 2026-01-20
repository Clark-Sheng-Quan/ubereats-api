/**
 * Uber Eats Integration Service
 * Manages POS integration activation and configuration
 * Handles: Activate, Update, Retrieve, and Remove Integration configurations
 */

import axios from "axios";
import { UBER_API_BASE_URL, INTEGRATOR_BRAND_ID } from "../config/config.js";

/**
 * Activate Integration - Create or update POS data binding for a store
 * PUT /v1/eats/stores/{store_id}/pos_data
 * @param {string} accessToken - Uber API access token
 * @param {string} storeId - Uber store UUID
 * @param {Object} posData - POS integration data
 * @returns {Promise<Object>} Integration activation response
 */
export async function activateIntegration(accessToken, storeId, posData) {
  try {
    const payload = {
      allowed_customer_requests: {
        allow_single_use_items_requests: true,
        allow_special_instruction_requests: true,
      },
      integrator_brand_id: INTEGRATOR_BRAND_ID || "Vend88-sandbox",
      integrator_store_id: posData.integrator_store_id,
      is_order_manager: posData.is_order_manager ?? true,
      merchant_store_id: posData.merchant_store_id,
      require_manual_acceptance: posData.require_manual_acceptance ?? false,
      store_configuration_data: posData.store_configuration_data || JSON.stringify({
        pos_system: "vend",
        binding_time: new Date().toISOString(),
      }),
      webhooks_config: posData.webhooks_config || {
        order_release_webhooks: {
          is_enabled: true,
        },
        schedule_order_webhooks: {
          is_enabled: true,
        },
        delivery_status_webhooks: {
          is_enabled: true,
        },
        webhooks_version: "1.0.0",
      },
    };

    const url = `${UBER_API_BASE_URL}/v1/eats/stores/${storeId}/pos_data`;

    console.log("[integrationService] URL:", url);
    console.log("[integrationService] Access Token:", accessToken);

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log("[integrationService] Response:", response.data);
    return {
      success: true,
      data: response.data,
      message: "Integration activated successfully",
    };
  } catch (error) {
    console.error("[integrationService] Error status:", error.response?.status);
    console.error("[integrationService] Error headers:", error.response?.headers);
    console.error("[integrationService] Error data:", error.response?.data);
    console.error("[integrationService] Error message:", error.message);

    throw error;
  }
}

/**
 * Update Integration Configuration
 * PUT /v1/eats/stores/{store_id}/pos_data (with partial updates)
 * @param {string} accessToken - Uber API access token
 * @param {string} storeId - Uber store UUID
 * @param {Object} updateData - Configuration data to update
 * @returns {Promise<Object>} Update response
 */
export async function updateIntegrationConfiguration(
  accessToken,
  storeId,
  updateData
) {
  try {
    const payload = {
      allowed_customer_requests: updateData.allowed_customer_requests || {
        allow_single_use_items_requests: true,
        allow_special_instruction_requests: true,
      },
      integrator_brand_id: INTEGRATOR_BRAND_ID || "Vend88-sandbox",
      ...updateData,
    };

    const response = await axios.patch(
      `${UBER_API_BASE_URL}/v1/eats/stores/${storeId}/pos_data`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      `[integrationService] Updated integration configuration for store ${storeId}`
    );
    return {
      success: true,
      data: response.data,
      message: "Configuration updated successfully",
    };
  } catch (error) {
    console.error(
      `[integrationService] Failed to update configuration: ${error.message}`
    );
    throw error;
  }
}

/**
 * Retrieve Integration Configuration
 * GET /v1/eats/stores/{store_id}/pos_data
 * @param {string} accessToken - Uber API access token
 * @param {string} storeId - Uber store UUID
 * @returns {Promise<Object>} Current integration configuration
 */
export async function retrieveIntegrationConfiguration(accessToken, storeId) {
  try {
    const response = await axios.get(
      `${UBER_API_BASE_URL}/v1/eats/stores/${storeId}/pos_data`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      `[integrationService] Retrieved integration configuration for store ${storeId}`
    );
    return {
      success: true,
      data: response.data,
      message: "Configuration retrieved successfully",
    };
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`[integrationService] No integration found for store ${storeId}`);
      return {
        success: true,
        data: null,
        message: "No integration configuration found",
      };
    }
    console.error(
      `[integrationService] Failed to retrieve configuration: ${error.message}`
    );
    throw error;
  }
}

/**
 * Remove Integration Configuration
 * DELETE /v1/eats/stores/{store_id}/pos_data
 * @param {string} accessToken - Uber API access token
 * @param {string} storeId - Uber store UUID
 * @returns {Promise<Object>} Removal response
 */
export async function removeIntegrationConfiguration(accessToken, storeId) {
  try {
    const response = await axios.delete(
      `${UBER_API_BASE_URL}/v1/eats/stores/${storeId}/pos_data`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      `[integrationService] Removed integration configuration for store ${storeId}`
    );
    return {
      success: true,
      data: response.data,
      message: "Integration removed successfully",
    };
  } catch (error) {
    console.error(
      `[integrationService] Failed to remove configuration: ${error.message}`
    );
    throw error;
  }
}
