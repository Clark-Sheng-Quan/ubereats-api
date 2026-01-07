/**
 * Order Actions Module
 * Handles ALL Uber API order operations
 */

import { UBER_API_BASE_URL, UBER_API_VERSION, STORE_ID } from "./config.js";
import { getAccessToken } from "./tokenManager.js";

/**
 * Accept an order
 * @param {string} orderId - The order ID to accept
 * @param {Object} options - Optional parameters
 * @param {string} options.ready_for_pickup_time - RFC3339 timestamp for pickup time
 * @param {string} options.external_reference_id - External reference ID
 * @param {string} options.accepted_by - Name of person who accepted the order
 * @returns {Promise<Object>} Response from Uber API
 */
export async function acceptOrder(orderId, options = {}) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/accept`;

    console.log(`\n✅ Accepting order: ${orderId}`);
    console.log(`   Request URL: ${url}`);

    // Build request body with optional parameters per API spec
    const body = {};
    if (options.ready_for_pickup_time) body.ready_for_pickup_time = options.ready_for_pickup_time;
    if (options.external_reference_id) body.external_reference_id = options.external_reference_id;
    if (options.accepted_by) body.accepted_by = options.accepted_by;

    console.log(`   Request Body: ${JSON.stringify(body, null, 2)}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Response Body: ${errorText}`);
      let errorMsg = `${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg += ` - ${errorJson.message || errorJson.code || errorText}`;
      } catch {
        errorMsg += ` - ${errorText}`;
      }
      throw new Error(`Failed to accept order: ${errorMsg}`);
    }

    // Read response and check if it's actually successful
    const responseText = await response.text();
    console.log(`   Response Body: ${responseText}`);
    
    let result = {};
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log(`   Note: Response is not JSON (might be 200 with empty body)`);
      }
    }

    console.log(`   ✅ Order ${orderId} accepted successfully`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error accepting order ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Deny an order
 * @param {string} orderId - The order ID to deny
 * @param {Object} options - Denial options
 * @param {string} options.reason - Reason type (ITEM_ISSUE, STORE_CLOSED, etc.)
 * @param {string} options.info - Additional free text explanation
 * @param {string} options.client_error_code - Partner provided error code
 * @param {Object} options.item_metadata - Metadata about invalid items
 * @returns {Promise<Object>} Response from Uber API
 */
export async function denyOrder(orderId, options = {}) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/deny`;

    console.log(`\n🚫 Denying order: ${orderId}`);
    console.log(`   Request URL: ${url}`);

    // Build deny_reason object per API spec
    const deny_reason = {
      type: options.reason || "STORE_CLOSED"
    };
    
    if (options.info) deny_reason.info = options.info;
    if (options.client_error_code) deny_reason.client_error_code = options.client_error_code;
    if (options.item_metadata) deny_reason.item_metadata = options.item_metadata;

    const body = { deny_reason };
    console.log(`   Request Body: ${JSON.stringify(body, null, 2)}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Response Body: ${errorText}`);
      let errorMsg = `${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg += ` - ${errorJson.message || errorJson.code || errorText}`;
      } catch {
        errorMsg += ` - ${errorText}`;
      }
      throw new Error(`Failed to deny order: ${errorMsg}`);
    }

    // Read response and check if it's actually successful
    const responseText = await response.text();
    console.log(`   Response Body: ${responseText}`);
    
    let result = {};
    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.log(`   Note: Response is not JSON (might be 200 with empty body)`);
      }
    }

    console.log(`   ✅ Order ${orderId} denied successfully`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error denying order ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Report fulfillment issues (Resolve Fulfillment Issues)
 * @param {string} orderId - The order ID
 * @param {Array} fulfillmentIssues - Array of fulfillment issue objects
 * @param {Object} fulfillmentIssues[].root_item - The affected item {cart_item_id, quantity}
 * @param {Object} fulfillmentIssues[].fulfillment_action - Action details {action_type, item_substitute, suspend_until, store_response}
 * @param {string} fulfillmentIssues[].fulfillment_issue_type - Issue type (OUT_OF_ITEM, CANNOT_FULFILL_INSTRUCTIONS, PARTIAL_AVAILABILITY, FOUND_ITEM)
 * @returns {Promise<Object>} Response from Uber API
 */
export async function reportFulfillmentIssue(orderId, fulfillmentIssues) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/resolve-fulfillment-issues`;

    console.log(`\n⚠️ Reporting fulfillment issue for order: ${orderId}`);

    // Build fulfillment_issues array per API spec
    const body = {
      fulfillment_issues: Array.isArray(fulfillmentIssues) ? fulfillmentIssues : []
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to report fulfillment issue: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`   ✅ Fulfillment issue reported for order ${orderId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error(
      `   ❌ Error reporting fulfillment issue for order ${orderId}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an order
 * @param {string} orderId - The order ID to cancel
 * @param {Object} options - Cancellation options
 * @param {string} options.reason - Reason type (ITEM_ISSUE, STORE_CLOSED, CUSTOMER_CALLED_TO_CANCEL, etc.)
 * @param {string} options.info - Additional free text explanation
 * @param {string} options.client_error_code - Partner provided error code
 * @returns {Promise<Object>} Response from Uber API
 */
export async function cancelOrder(orderId, options = {}) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/cancel`;

    console.log(`\n❌ Canceling order: ${orderId}`);

    // Build cancellation_reason object (same structure as deny_reason per API spec)
    const cancellation_reason = {
      type: options.reason || "OTHER"
    };
    
    if (options.info) cancellation_reason.info = options.info;
    if (options.client_error_code) cancellation_reason.client_error_code = options.client_error_code;

    const body = { cancellation_reason };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to cancel order: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`   ✅ Order ${orderId} canceled successfully`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error canceling order ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Common deny/cancellation reason types (from Uber Eats API documentation)
 */
export const DENY_CANCEL_REASONS = {
  ITEM_ISSUE: "ITEM_ISSUE",
  KITCHEN_CLOSED: "KITCHEN_CLOSED",
  CUSTOMER_CALLED_TO_CANCEL: "CUSTOMER_CALLED_TO_CANCEL",
  RESTAURANT_TOO_BUSY: "RESTAURANT_TOO_BUSY",
  ORDER_VALIDATION: "ORDER_VALIDATION",
  STORE_CLOSED: "STORE_CLOSED",
  TECHNICAL_FAILURE: "TECHNICAL_FAILURE",
  POS_NOT_READY: "POS_NOT_READY",
  POS_OFFLINE: "POS_OFFLINE",
  CAPACITY: "CAPACITY",
  ADDRESS: "ADDRESS",
  SPECIAL_INSTRUCTIONS: "SPECIAL_INSTRUCTIONS",
  PRICING: "PRICING",
  UNKNOWN: "UNKNOWN",
  OTHER: "OTHER"
};

/**
 * Invalid item types for deny_reason.item_metadata
 */
export const INVALID_ITEM_TYPES = {
  NOT_ON_MENU: "NOT_ON_MENU",
  UNAVAILABLE: "UNAVAILABLE",
  MISSING_INFO: "MISSING_INFO",
  PRICING: "PRICING",
  QUANTITY: "QUANTITY",
  OUT_OF_ITEM: "OUT_OF_ITEM",
  OTHER: "OTHER"
};

/**
 * Price adjustment reasons
 */
export const ADJUST_PRICE_REASONS = {
  REQUESTED_ADD_ONS: "REQUESTED_ADD_ONS",
  BIGGER_SIZE: "BIGGER_SIZE",
  NEW_ITEM_ADDED: "NEW_ITEM_ADDED",
  ITEM_SOLD_OUT: "ITEM_SOLD_OUT",
  REMOVED_ITEM: "REMOVED_ITEM",
  ADD_ON_UNAVAILABLE: "ADD_ON_UNAVAILABLE",
  OTHER: "OTHER"
};

/**
 * Fulfillment issue types
 */
export const FULFILLMENT_ISSUE_TYPES = {
  OUT_OF_ITEM: "OUT_OF_ITEM",
  CANNOT_FULFILL_INSTRUCTIONS: "CANNOT_FULFILL_INSTRUCTIONS",
  PARTIAL_AVAILABILITY: "PARTIAL_AVAILABILITY",
  FOUND_ITEM: "FOUND_ITEM"
};

/**
 * Fulfillment action types
 */
export const FULFILLMENT_ACTION_TYPES = {
  // For Restaurants
  ASK_CUSTOMER: "ASK_CUSTOMER",
  // For Retailers
  SUBSTITUTE_ME: "SUBSTITUTE_ME",
  REPLACE_FOR_ME: "REPLACE_FOR_ME",
  REMOVE_ITEM: "REMOVE_ITEM"
};

/**
 * Get Order Details from Uber API
 * @param {string} orderId - The order ID
 * @param {string} expand - Comma-separated fields to expand (e.g., 'carts,deliveries,payment')
 * @returns {Promise<Object>} Order details
 */
export async function getOrderFromUber(orderId, expand = "carts,deliveries,payment") {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}?expand=${expand}`;

    console.log(`\n📥 Fetching order from Uber: ${orderId}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch order: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`    ✅  Result: ${JSON.stringify(result)}`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error fetching order ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * List Orders from Uber API for a store
 * @param {string} storeId - The store ID
 * @param {Object} params - Query parameters (state, status, start_time, end_time, etc.)
 * @returns {Promise<Object>} List of orders
 */
export async function listStoreOrders(storeId, params = {}) {
  try {
    const accessToken = await getAccessToken();
    
    // Build query string
    const queryParams = new URLSearchParams();
    if (params.expand) queryParams.append("expand", params.expand);
    if (params.state) queryParams.append("state", params.state);
    if (params.status) queryParams.append("status", params.status);
    if (params.start_time) queryParams.append("start_time", params.start_time);
    if (params.end_time) queryParams.append("end_time", params.end_time);
    if (params.page_size) queryParams.append("page_size", params.page_size);
    if (params.next_page_token) queryParams.append("next_page_token", params.next_page_token);

    const url = `${UBER_API_BASE_URL}/v1/delivery/store/${storeId}/orders?${queryParams.toString()}`;

    console.log(`\n📋 Fetching orders for store: ${storeId}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to list orders: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    const orderCount = result.data?.length || result.orders?.length || 0;
    console.log(`    ✅   Result: ${JSON.stringify(result)}`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error listing orders for store ${storeId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Mark Order as Ready for Pickup
 * @param {string} orderId - The order ID
 * @returns {Promise<Object>} Response from Uber API
 */
export async function markOrderReady(orderId) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/ready`;

    console.log(`\n🍽️ Marking order ready: ${orderId}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to mark order ready: ${response.status} ${errorText}`
      );
    }

    let result = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    }

    console.log(`   ✅ Order ${orderId} marked as ready`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error marking order ready ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Adjust Order Price
 * @param {string} orderId - The order ID
 * @param {Object} adjustmentData - Price adjustment data
 * @param {number} adjustmentData.amount_e5 - Amount in E5 format (e.g., 12345 = $1.23, negative for downward adjustment)
 * @param {string} adjustmentData.tax_rate - Tax rate in percentage (e.g., "8.75" for 8.75%)
 * @param {string} adjustmentData.reason - Reason enum: REQUESTED_ADD_ONS, BIGGER_SIZE, NEW_ITEM_ADDED, ITEM_SOLD_OUT, REMOVED_ITEM, ADD_ON_UNAVAILABLE, OTHER
 * @param {string} adjustmentData.custom_reason - Required if reason is OTHER
 * @returns {Promise<Object>} Response from Uber API
 */
export async function adjustOrderPrice(orderId, adjustmentData) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/adjust-price`;

    console.log(`\n💰 Adjusting price for order: ${orderId}`);

    const body = {
      amount_e5: adjustmentData.amount_e5,
    };

    if (adjustmentData.tax_rate !== undefined) {
      body.tax_rate = adjustmentData.tax_rate;
    }

    if (adjustmentData.reason) {
      body.reason = adjustmentData.reason;
      // If reason is OTHER, custom_reason is required
      if (adjustmentData.reason === "OTHER" && adjustmentData.custom_reason) {
        body.custom_reason = adjustmentData.custom_reason;
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to adjust order price: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`   ✅ Order ${orderId} price adjusted successfully`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error adjusting order price ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update Order Ready Time
 * @param {string} orderId - The order ID
 * @param {string} readyForPickupTime - RFC3339 timestamp (e.g., "2023-01-04T18:50:05.000Z")
 * @returns {Promise<Object>} Response from Uber API
 */
export async function updateOrderReadyTime(orderId, readyForPickupTime) {
  try {
    const accessToken = await getAccessToken();
    const url = `${UBER_API_BASE_URL}/v1/delivery/order/${orderId}/update-ready-time`;

    console.log(`\n⏰ Updating ready time for order: ${orderId}`);

    const body = {
      ready_for_pickup_time: readyForPickupTime,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to update order ready time: ${response.status} ${errorText}`
      );
    }

    let result = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    }

    console.log(`   ✅ Order ${orderId} ready time updated`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ Error updating order ready time ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}
