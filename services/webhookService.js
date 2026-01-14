import { log } from "node:console";
import {
  UBER_API_BASE_URL,
  UBER_API_VERSION,
  WEBHOOK_EVENTS,
} from "../config/config.js";
import { getAccessToken } from "../utils/tokenManager.js";
import { 
  saveOrderToStorage, 
  logWebhook, 
  logAction 
} from "./localService.js";

/**
 * Handle incoming webhook events from Uber Eats
 * @param {Object} webhookData - The webhook payload from Uber
 */
export async function handleWebhookEvent(webhookData) {
  const { event_type, event_id, resource_href, meta, event_time } = webhookData;

  console.log(`\n📨 Processing event: ${event_type}`);
  console.log(`   Event ID: ${event_id}`);
  console.log(`   Time: ${event_time}`);

  // Log the webhook for debugging
  logWebhook(webhookData);

  try {
    switch (event_type) {
      case WEBHOOK_EVENTS.ORDER_NOTIFICATION:
        await handleNewOrder(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_SCHEDULED:
        await handleScheduledOrder(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_RELEASE:
        await handleOrderRelease(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_FAILURE:
        await handleOrderFailure(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.ORDER_CANCEL:
        await handleOrderCancel(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.STORE_PROVISIONED:
        await handleStoreProvisioned(meta);
        break;

      case WEBHOOK_EVENTS.STORE_DEPROVISIONED:
        await handleStoreDeprovisioned(meta);
        break;

      case WEBHOOK_EVENTS.FULFILLMENT_RESOLVED:
        await handleFulfillmentResolved(resource_href, meta);
        break;

      case WEBHOOK_EVENTS.STORE_STATUS_CHANGED:
        await handleStoreStatusChanged(meta);
        break;

      case "store.menu_refresh_request":
        await handleMenuRefreshRequest(webhookData);
        break;

      default:
        console.warn(`⚠️ Unknown event type: ${event_type}`);
    }
  } catch (error) {
    console.error(`❌ Error handling event ${event_type}:`, error.message);
    throw error;
  }
}

/**
 * Handle new order (orders.notification)
 * Fetch complete order details and prepare for POS
 */
async function handleNewOrder(resourceHref, meta) {
  console.log(`\n🆕 NEW ORDER RECEIVED`);
  const orderId = meta?.resource_id;

  try {
    // Fetch complete order details from Uber API
    const orderDetails = await fetchOrderDetails(orderId, resourceHref);
    console.log(orderDetails);

    // Save order to storage
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.notification",
      resource_href: resourceHref,
      order_details: orderDetails,
      received_at: new Date().toISOString(),
      status: "pending",
    });

    // Log action
    logAction(orderId, "order_received", {
      items_count: orderDetails?.cart?.items?.length,
      customer_name: orderDetails?.customer?.name,
    });
  } catch (error) {
    console.error(`   ❌ Error processing new order:`, error.message);
    logAction(orderId, "order_error", { error: error.message });
  }
}

/**
 * Handle scheduled order (orders.scheduled.notification)
 * Order scheduled for a future time
 */
async function handleScheduledOrder(resourceHref, meta) {
  console.log(`\n📅 SCHEDULED ORDER RECEIVED`);
  const orderId = meta?.resource_id;

  try {
    const orderDetails = await fetchOrderDetails(orderId, resourceHref);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Scheduled time: ${orderDetails?.scheduled_delivery_time}`);

    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.scheduled.notification",
      resource_href: resourceHref,
      order_details: orderDetails,
      received_at: new Date().toISOString(),
      status: "scheduled",
    });

    logAction(orderId, "scheduled_order_received", {
      scheduled_time: orderDetails?.scheduled_delivery_time,
    });
  } catch (error) {
    console.error(`   ❌ Error processing scheduled order:`, error.message);
  }
}

/**
 * Handle order release (orders.release)
 * Courier has reached geo-fence, ready to deliver
 */
async function handleOrderRelease(resourceHref, meta) {
  console.log(`\n🚚 COURIER REACHED GEO-FENCE`);
  const orderId = meta?.resource_id;

  try {
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.release",
      resource_href: resourceHref,
      received_at: new Date().toISOString(),
      status: "courier_near",
    });

    logAction(orderId, "courier_geofence_reached", {
      timestamp: new Date().toISOString(),
    });

    console.log(`   Order ID: ${orderId}`);
    console.log(`   ✅ Courier approaching - prepare order for handoff`);
  } catch (error) {
    console.error(`   ❌ Error handling order release:`, error.message);
  }
}

/**
 * Handle order failure (orders.failure - API v1.0.0 only)
 */
async function handleOrderFailure(resourceHref, meta) {
  console.log(`\n❌ ORDER FAILED`);
  const orderId = meta?.resource_id;

  try {
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.failure",
      resource_href: resourceHref,
      received_at: new Date().toISOString(),
      status: "failed",
    });

    logAction(orderId, "order_failed", {});
  } catch (error) {
    console.error(`   ❌ Error handling order failure:`, error.message);
  }
}

/**
 * Handle order cancellation (orders.cancel - API v2.0+)
 */
async function handleOrderCancel(resourceHref, meta) {
  console.log(`\n🚫 ORDER CANCELLED`);
  const orderId = meta?.resource_id;

  try {
    saveOrderToStorage({
      order_id: orderId,
      event_type: "orders.cancel",
      resource_href: resourceHref,
      received_at: new Date().toISOString(),
      status: "cancelled",
    });

    logAction(orderId, "order_cancelled", {});
    console.log(`   Order ID: ${orderId}`);
    console.log(`   ✅ Order marked as cancelled in system`);
  } catch (error) {
    console.error(`   ❌ Error handling order cancellation:`, error.message);
  }
}

/**
 * Handle store provisioning (store.provisioned)
 */
async function handleStoreProvisioned(meta) {
  console.log(`\n🏪 STORE PROVISIONED`);
  console.log(`   Store has been granted access`);
  logAction("system", "store_provisioned", meta);
}

/**
 * Handle store deprovisioning (store.deprovisioned)
 */
async function handleStoreDeprovisioned(meta) {
  console.log(`\n🏪 STORE DEPROVISIONED`);
  console.log(`   Store access has been removed`);
  logAction("system", "store_deprovisioned", meta);
}

/**
 * Handle fulfillment issue resolved
 */
async function handleFulfillmentResolved(resourceHref, meta) {
  console.log(`\n✅ FULFILLMENT ISSUE RESOLVED`);
  const orderId = meta?.resource_id;

  try {
    const orderDetails = await fetchOrderDetails(orderId, resourceHref);
    saveOrderToStorage({
      order_id: orderId,
      event_type: "order.fulfillment_issues.resolved",
      resource_href: resourceHref,
      order_details: orderDetails,
      received_at: new Date().toISOString(),
      status: "fulfillment_resolved",
    });

    logAction(orderId, "fulfillment_resolved", {});
    console.log(`   Order ID: ${orderId}`);
  } catch (error) {
    console.error(`   ❌ Error handling fulfillment resolution:`, error.message);
  }
}

/**
 * Handle store status change
 */
async function handleStoreStatusChanged(meta) {
  console.log(`\n🏪 STORE STATUS CHANGED`);
  console.log(`   Status: ${meta?.status}`);
  logAction("system", "store_status_changed", meta);
}

/**
 * Fetch complete order details from Uber API
 * @param {string} orderId - The order ID
 * @param {string} resourceHref - The resource URL from webhook (optional)
 * @returns {Promise<Object>} Order details
 */
export async function fetchOrderDetails(orderId, resourceHref = null) {
  try {
    // Get a valid access token (will use cached or fetch new)
    const accessToken = await getAccessToken();

    // Use resource_href from webhook if provided, but convert to sandbox
    let url;
    if (resourceHref) {
      // Replace production domain with sandbox test domain
      url = resourceHref.replace(
        "https://api.uber.com",
        "https://test-api.uber.com"
      );
      console.log(`   📍 Using webhook resource_href: ${url}`);
    } else {
      // Fallback to constructing the URL
      url = `${UBER_API_BASE_URL}/${UBER_API_VERSION}/eats/orders/${orderId}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If it's a 401, the token might be invalid
      if (response.status === 401) {
        console.error(
          "⚠️ Authentication failed. Token may be invalid or expired."
        );
        console.log("Returning partial order data from webhook metadata");
        return { partial: true, order_id: orderId };
      }

      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`
      );
    }

    const orderData = await response.json();
    return orderData;
  } catch (error) {
    console.error(`   ⚠️ Error fetching order details: ${error.message}`);
    // Return partial data so webhook processing can continue
    return { partial: true, order_id: orderId, error: error.message };
  }
}

/**
 * Handle menu refresh request webhook
 * Triggered when Uber requests a menu refresh
 * This is typically used to notify the POS that menu data should be re-synced
 * @param {Object} webhookData - The webhook payload
 */
async function handleMenuRefreshRequest(webhookData) {
  console.log(`\n📋 MENU REFRESH REQUESTED`);
  
  const { store_id, partner_store_id, resource_href } = webhookData;
  
  console.log(`   Store ID: ${store_id}`);
  if (partner_store_id) console.log(`   Partner Store ID: ${partner_store_id}`);
  console.log(`   Resource: ${resource_href}`);
  
  try {
    // Log the menu refresh request for audit trail
    logAction(store_id, "menu_refresh_requested", {
      store_id,
      partner_store_id,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`   ✅ Menu refresh request logged`);
    console.log(`   ACTION: Re-fetch menu from Uber API using GET /v2/eats/stores/{store_id}/menus`);
    console.log(`   This is typically handled by the POS system automatically`);
  } catch (error) {
    console.error(`   ❌ Error handling menu refresh request:`, error.message);
  }
}