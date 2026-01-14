#!/usr/bin/env node

/**
 * Simple Console POS Terminal
 * Allows manual order management through command line
 * 
 * API Structure:
 * - /api/local/* - Local data operations (查询本地存储)
 * - /api/uber/*  - Uber API operations (调用 Uber API)
 */

import readline from "readline";

// Configure API base URL - use environment variable or default to localhost
const API_BASE_URL = process.env.API_URL || "http://localhost:3000";
const LOCAL_API = `${API_BASE_URL}/api/local`;
const UBER_API = `${API_BASE_URL}/api/order`;
const STORE_API = `${API_BASE_URL}/api/store`;
const MENU_API = `${API_BASE_URL}/api/menu`;

console.log(`📡 API Endpoints:`);
console.log(`   Local API: ${LOCAL_API}`);
console.log(`   Uber API:  ${UBER_API}`);
console.log(`   Store API: ${STORE_API}`);
console.log(`   Menu API:  ${MENU_API}\n`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function fetchOrders(status = "pending") {
  try {
    const response = await fetch(`${LOCAL_API}/orders?status=${status}&limit=50`);
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error("❌ Error fetching orders:", error.message);
    return [];
  }
}

async function acceptOrder(orderId) {
  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Order accepted successfully! (Uber API)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to accept order:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function denyOrder(orderId, reasonType, info = "") {
  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        reason: reasonType,
        info: info || `Order denied: ${reasonType}`
      }),
    });

    if (response.ok) {
      console.log("✅ Order denied successfully! (Uber API)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to deny order:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function reportFulfillmentIssue(orderId, fulfillmentIssues) {
  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}/fulfillment-issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillment_issues: fulfillmentIssues }),
    });

    if (response.ok) {
      console.log("✅ Fulfillment issue reported successfully! (Uber API)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to report issue:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function clearAllOrders() {
  try {
    const response = await fetch(`${LOCAL_API}/orders/clear`, {
      method: "POST",
    });

    if (response.ok) {
      console.log("✅ All order records cleared! (Local)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to clear orders:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function cancelOrder(orderId, reasonType, info = "") {
  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        reason: reasonType,
        info: info || `Order cancelled: ${reasonType}`
      }),
    });

    if (response.ok) {
      console.log("✅ Order cancelled successfully! (Uber API)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to cancel order:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function markOrderReady(orderId) {
  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (response.ok) {
      console.log("✅ Order marked as ready! (Uber API)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to mark order ready:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function updateReadyTime(orderId, readyTime) {
  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}/update-ready-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ready_for_pickup_time: readyTime }),
    });

    if (response.ok) {
      console.log("✅ Ready time updated! (Uber API)");
      return true;
    } else {
      const error = await response.text();
      console.error("❌ Failed to update ready time:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

async function adjustPrice(orderId, amountE5, taxRate, reason, customReason) {
  try {
    const body = { amount_e5: amountE5 };
    if (taxRate !== undefined) body.tax_rate = taxRate;
    if (reason) {
      body.reason = reason;
      if (reason === "OTHER" && customReason) {
        body.custom_reason = customReason;
      }
    }

    const response = await fetch(`${UBER_API}/orders/${orderId}/adjust-price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Price adjusted successfully! (Uber API)");
      return result;
    } else {
      const error = await response.text();
      console.error("❌ Failed to adjust price:", error);
      return false;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

function displayOrders(orders) {
  console.log("\n📋 ========== PENDING ORDERS ==========");
  
  if (orders.length === 0) {
    console.log("   No pending orders.");
    return;
  }

  orders.forEach((order, index) => {
    const items = order.order_details?.cart?.items || [];
    const itemCount = items.length;
    const customerName = order.order_details?.customer?.[0]?.name?.display_name || "Unknown";
    
    console.log(`\n[${index + 1}] Order ID: ${order.order_id}`);
    console.log(`    Customer: ${customerName}`);
    console.log(`    Items: ${itemCount}`);
    console.log(`    Status: ${order.status}`);
    console.log(`    Received: ${order.received_at}`);
    
    // Display items in order
    if (items.length > 0) {
      console.log(`    Items:`);
      items.forEach((item) => {
        console.log(`      - ${item.title} (ID: ${item.id})`);
      });
    }
  });
}

async function mainMenu() {
  console.log("\n🎯 ===== MAIN MENU =====");
  console.log("【Local Data Operations】");
  console.log("1. View Orders");
  console.log("2. Clear All Records");
  console.log("\n【Uber API Operations】");
  console.log("3. Get Order Details");
  console.log("4. List Store Orders");
  console.log("5. Accept Order");
  console.log("6. Deny Order");
  console.log("7. Cancel Order");
  console.log("8. Mark Order Ready");
  console.log("9. Update Ready Time");
  console.log("10. Adjust Order Price");
  console.log("11. Resolve Fulfillment Issues");
  console.log("\n【Store Management】");
  console.log("12. List Stores");
  console.log("13. Get Store Details");
  console.log("14. Get Store Status");
  console.log("15. Update Store Status (Online/Offline)");
  console.log("16. Update Store Info");
  console.log("17. Update Prep Time");
  console.log("18. Update Fulfillment Config");
  console.log("\n【Menu Management】");
  console.log("19. Get Menu");
  console.log("20. Update Item (Price/Suspension)");
  console.log("21. Upload Menu");
  console.log("\n0. Exit");
  console.log("====================================\n");

  const choice = await question("Select an option: ");

  switch (choice.trim()) {
    case "1":
      await viewOrders();
      break;
    case "2":
      await clearAllOrdersFlow();
      break;
    case "3":
      await getOrderDetailsFlow();
      break;
    case "4":
      await listStoreOrdersFlow();
      break;
    case "5":
      await acceptOrderFlow();
      break;
    case "6":
      await denyOrderFlow();
      break;
    case "7":
      await cancelOrderFlow();
      break;
    case "8":
      await markReadyFlow();
      break;
    case "9":
      await updateReadyTimeFlow();
      break;
    case "10":
      await adjustPriceFlow();
      break;
    case "11":
      await reportIssueFlow();
      break;
    case "12":
      await listStoresFlow();
      break;
    case "13":
      await getStoreDetailsFlow();
      break;
    case "14":
      await getStoreStatusFlow();
      break;
    case "15":
      await updateStoreStatusFlow();
      break;
    case "16":
      await updateStoreInfoFlow();
      break;
    case "17":
      await updatePrepTimeFlow();
      break;
    case "18":
      await updateFulfillmentConfigFlow();
      break;
    case "19":
      await getMenuFlow();
      break;
    case "20":
      await updateItemFlow();
      break;
    case "21":
      await uploadMenuFlow();
      break;
    case "0":
      console.log("👋 Goodbye!");
      rl.close();
      process.exit(0);
      break;
    default:
      console.log("❌ Invalid option");
      await question("Press Enter to continue...");
      await mainMenu();
  }
}

// Get Order Details from Uber
async function getOrderDetailsFlow() {
  // First show local pending orders
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  const input = await question("Enter order number or Order ID to get details: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  // Check if input is a number (order index)
  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
    console.log(`\n📥 Fetching order details: ${orderId}`);
  } else {
    orderId = input.trim();
    console.log(`\n📥 Fetching order details: ${orderId}`);
  }

  try {
    const response = await fetch(`${UBER_API}/orders/${orderId}?expand=carts,deliveries,payment`);
    const result = await response.json();

    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(result).substring(0, 200)}...`);

    if (result.success && result.data) {
      const order = result.data.order || result.data;
      console.log("\n✅ (Uber API) Order Details fetched:\n");
      
      // Display basic order info
      console.log(`📦 Order ID: ${order.id || "N/A"}`);
      console.log(`State: ${order.state || "N/A"} | Status: ${order.status || "N/A"}`);
      console.log(`Fulfillment: ${order.fulfillment_type || "N/A"}`);
      console.log(`Platform: ${order.ordering_platform || "N/A"}`);
      
      // Display customer info
      if (order.customers && order.customers.length > 0) {
        const customer = order.customers[0];
        console.log(`\n👤 Customer: ${customer.name?.display_name || "N/A"}`);
        if (customer.contact?.phone?.number) {
          console.log(`   Phone: ${customer.contact.phone.number}`);
        }
      }
      
      // Display delivery info
      if (order.deliveries && order.deliveries.length > 0) {
        const delivery = order.deliveries[0];
        console.log(`\n🚚 Delivery Status: ${delivery.status || "N/A"}`);
        if (delivery.location?.street_address_line_one) {
          console.log(`   Address: ${delivery.location.street_address_line_one}`);
        }
        if (delivery.estimated_pick_up_time) {
          console.log(`   Est. Pickup: ${new Date(delivery.estimated_pick_up_time).toLocaleString()}`);
        }
        if (delivery.estimated_dropoff_time) {
          console.log(`   Est. Delivery: ${new Date(delivery.estimated_dropoff_time).toLocaleString()}`);
        }
      }
      
      // Display cart items
      if (order.carts && order.carts.length > 0) {
        const cart = order.carts[0];
        console.log(`\n🛒 Items (${cart.items?.length || 0}):`);
        if (cart.items && cart.items.length > 0) {
          cart.items.forEach((item) => {
            const qty = item.quantity?.amount || 1;
            console.log(`   - ${item.title} (x${qty})`);
            if (item.selected_modifier_groups && item.selected_modifier_groups.length > 0) {
              item.selected_modifier_groups.forEach((modGroup) => {
                if (modGroup.selected_items) {
                  modGroup.selected_items.forEach((mod) => {
                    console.log(`      • ${mod.title}`);
                  });
                }
              });
            }
          });
        }
      }
      
      // Display payment info
      if (order.payment?.payment_detail) {
        console.log(`\n💳 Payment:`);
        const detail = order.payment.payment_detail;
        if (detail.item_charges?.total?.gross) {
          const subtotal = detail.item_charges.total.gross.amount_e5 / 100000;
          console.log(`   Subtotal: ${detail.item_charges.total.gross.formatted}`);
        }
        if (detail.fees?.total?.gross) {
          const fees = detail.fees.total.gross.amount_e5 / 100000;
          console.log(`   Fees: ${detail.fees.total.gross.formatted}`);
        }
        if (detail.order_total?.gross) {
          console.log(`   Total: ${detail.order_total.gross.formatted}`);
        }
      }
      
      // Display timing
      if (order.created_time) {
        console.log(`\n⏰ Placed: ${new Date(order.created_time).toLocaleString()}`);
      }
      if (order.preparation_status) {
        console.log(`Prep Status: ${order.preparation_status}`);
      }
      if (order.action_eligibility?.cancel?.is_eligible) {
        console.log(`\n✅ This order can be canceled`);
      }
      
    } else {
      console.log(`\n❌ Failed to fetch order:`);
      console.log(`   Error: ${result.error || "Unknown error"}`);
      console.log(`   Full Response: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.log(`\n❌ Error fetching order: ${error.message}`);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

// List Store Orders from Uber
async function listStoreOrdersFlow() {
  console.log("\n📋 List Store Orders Options:");
  console.log("1. All orders (default)");
  console.log("2. Filter by state");
  console.log("3. Filter by status");
  console.log("4. Filter by time range");
  console.log("5. Advanced filters (combine multiple)");
  
  const filterChoice = await question("Select filter option (1-5, default: 1): ");

  let queryParams = "expand=carts,deliveries,payment";
  
  if (filterChoice === "2") {
    console.log("\n📌 Available states:");
    console.log("   • OFFERED - Order has been offered to the merchant");
    console.log("   • ACCEPTED - Merchant has accepted the order");
    console.log("   • HANDED_OFF - Order handed off to delivery partners");
    console.log("   • SUCCEEDED - Order was successfully delivered");
    console.log("   • FAILED - Order failed");
    console.log("   • UNKNOWN - Catch-all for unrecognized states");
    const state = await question("Enter state(s), comma-separated (e.g., OFFERED,ACCEPTED): ");
    if (state) {
      queryParams += `&state=${state.toUpperCase()}`;
    }
  } else if (filterChoice === "3") {
    console.log("\n📌 Available statuses:");
    console.log("   • SCHEDULED - Order is scheduled for a future time");
    console.log("   • ACTIVE - Order is active");
    console.log("   • COMPLETED - Order is completed");
    console.log("   • UNKNOWN - Catch-all for unrecognized statuses");
    const status = await question("Enter status(es), comma-separated (e.g., ACTIVE,COMPLETED): ");
    if (status) {
      queryParams += `&status=${status.toUpperCase()}`;
    }
  } else if (filterChoice === "4") {
    const hours = await question("Show orders from last X hours (e.g., 24): ");
    if (hours && !isNaN(hours)) {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      queryParams += `&start_time=${startTime}&end_time=${endTime}`;
    }
  } else if (filterChoice === "5") {
    console.log("\n🔍 Advanced Filtering:");
    
    const state = await question("State(s) (OFFERED/ACCEPTED/HANDED_OFF/SUCCEEDED/FAILED, optional): ");
    if (state) {
      queryParams += `&state=${state.toUpperCase()}`;
    }
    
    const status = await question("Status(es) (SCHEDULED/ACTIVE/COMPLETED, optional): ");
    if (status) {
      queryParams += `&status=${status.toUpperCase()}`;
    }
    
    const hours = await question("Show orders from last X hours (optional): ");
    if (hours && !isNaN(hours)) {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      queryParams += `&start_time=${startTime}&end_time=${endTime}`;
    }
    
    const pageSize = await question("Page size (max 50, default 50): ");
    if (pageSize && !isNaN(pageSize) && parseInt(pageSize) <= 50) {
      queryParams += `&page_size=${pageSize}`;
    }
  }

  try {
    const response = await fetch(`${UBER_API}/store/orders?${queryParams}`);
    const result = await response.json();

    if (result.success && result.data) {
      const orders = result.data?.data || result.data || [];
      console.log(`\n✅ (Uber API) Found ${orders.length} orders:`);
      
      if (orders.length > 0) {
        orders.forEach((order, index) => {
          const orderData = order.order || order; // Handle nested structure
          console.log(`\n${'═'.repeat(80)}`);
          console.log(`[${index + 1}] 📦 Order #${orderData.display_id || orderData.id.slice(0, 8)}`);
          console.log(`    Order ID: ${orderData.id}`);
          console.log(`    State: ${orderData.state || "N/A"} | Status: ${orderData.status || "N/A"}`);
          console.log(`    Platform: ${orderData.ordering_platform || "N/A"} | Fulfillment: ${orderData.fulfillment_type || "N/A"}`);
          
          // Store info
          if (orderData.store) {
            console.log(`    Store: ${orderData.store.name || "N/A"} (${orderData.store.id})`);
            if (orderData.store.timezone) {
              console.log(`    Timezone: ${orderData.store.timezone}`);
            }
          }
          
          // Customer info
          if (orderData.customers && orderData.customers.length > 0) {
            const customer = orderData.customers[0];
            console.log(`\n    👤 Customer: ${customer.name?.display_name || "N/A"}`);
            if (customer.name?.first_name && customer.name?.last_name) {
              console.log(`       Name: ${customer.name.first_name} ${customer.name.last_name}`);
            }
            if (customer.contact?.phone?.number) {
              console.log(`       Phone: ${customer.contact.phone.number}`);
              if (customer.contact.phone.country_iso2) {
                console.log(`       Country: ${customer.contact.phone.country_iso2}`);
              }
            }
            if (customer.order_history?.past_order_count !== undefined) {
              console.log(`       Past Orders: ${customer.order_history.past_order_count}`);
            }
            if (customer.can_respond_to_fulfillment_issues !== undefined) {
              console.log(`       Can Respond to Issues: ${customer.can_respond_to_fulfillment_issues}`);
            }
          }
          
          // Cart items with details
          if (orderData.carts && orderData.carts.length > 0) {
            const cart = orderData.carts[0];
            if (cart.items && cart.items.length > 0) {
              console.log(`\n    🛒 Items (${cart.items.length}):`);
              cart.items.forEach((item) => {
                const qty = item.quantity?.amount || 1;
                const unit = item.quantity?.unit || "PIECE";
                console.log(`       • ${item.title}`);
                console.log(`         Qty: ${qty} ${unit} | Cart ID: ${item.cart_item_id}`);
                if (item.id) {
                  console.log(`         Item ID: ${item.id}`);
                }
                if (item.external_data) {
                  console.log(`         External Data: ${item.external_data}`);
                }
                if (item.picture_url) {
                  console.log(`         Image: ${item.picture_url.substring(0, 60)}...`);
                }
                if (item.customer_request?.special_instructions) {
                  console.log(`         Instructions: ${item.customer_request.special_instructions}`);
                }
                if (item.selected_modifier_groups && item.selected_modifier_groups.length > 0) {
                  console.log(`         Modifiers: ${item.selected_modifier_groups.map(m => m.title).join(", ")}`);
                }
              });
            }
          }
          
          // Cart metadata
          if (orderData.carts && orderData.carts.length > 0) {
            const cart = orderData.carts[0];
            console.log(`\n    📦 Cart Details:`);
            console.log(`       Cart ID: ${cart.id}`);
            console.log(`       Revision: ${cart.revision_id}`);
            if (cart.restricted_items?.alcohol?.contain_alcoholic_item !== undefined) {
              console.log(`       Contains Alcohol: ${cart.restricted_items.alcohol.contain_alcoholic_item}`);
            }
            if (cart.include_single_use_items !== undefined) {
              console.log(`       Include Single Use Items: ${cart.include_single_use_items}`);
            }
          }
          
          // Deliveries info
          if (orderData.deliveries && orderData.deliveries.length > 0) {
            console.log(`\n    🚗 Delivery Info:`);
            orderData.deliveries.forEach((delivery, idx) => {
              console.log(`       Delivery ${idx + 1}:`);
              console.log(`         Status: ${delivery.status || "N/A"}`);
              if (delivery.estimated_pick_up_time) {
                console.log(`         Est. Pickup: ${new Date(delivery.estimated_pick_up_time).toLocaleString()}`);
              }
              if (delivery.estimated_dropoff_time) {
                console.log(`         Est. Dropoff: ${new Date(delivery.estimated_dropoff_time).toLocaleString()}`);
              }
            });
          }
          
          // Preparation time
          if (orderData.preparation_time) {
            console.log(`\n    ⏱️ Preparation:`);
            if (orderData.preparation_time.ready_for_pickup_time_secs) {
              const mins = Math.ceil(orderData.preparation_time.ready_for_pickup_time_secs / 60);
              console.log(`       Ready in: ${mins} minutes (${orderData.preparation_time.ready_for_pickup_time_secs}s)`);
            }
            if (orderData.preparation_time.source) {
              console.log(`       Source: ${orderData.preparation_time.source}`);
            }
            if (orderData.preparation_time.ready_for_pickup_time) {
              console.log(`       Ready at: ${new Date(orderData.preparation_time.ready_for_pickup_time).toLocaleString()}`);
            }
          }
          
          // Timestamps
          console.log(`\n    📅 Timeline:`);
          if (orderData.created_time) {
            console.log(`       Created: ${new Date(orderData.created_time).toLocaleString()}`);
          }
          if (orderData.estimated_unfulfilled_at) {
            console.log(`       Unfulfilled at: ${new Date(orderData.estimated_unfulfilled_at).toLocaleString()}`);
          }
          
          // Payment info
          if (orderData.payment?.payment_detail) {
            const paymentDetail = orderData.payment.payment_detail;
            console.log(`\n    💰 Payment:`);
            if (paymentDetail.order_total) {
              const total = paymentDetail.order_total;
              console.log(`       Order Total: ${total.display_amount || total.gross?.formatted || "N/A"}`);
              if (total.gross?.amount_e5) {
                console.log(`         (E5: ${total.gross.amount_e5})`);
              }
            }
            if (paymentDetail.item_charges?.total?.gross?.formatted) {
              console.log(`       Item Charges: ${paymentDetail.item_charges.total.gross.formatted}`);
            }
            if (paymentDetail.fees?.total?.gross?.formatted) {
              console.log(`       Fees: ${paymentDetail.fees.total.gross.formatted}`);
            }
            if (paymentDetail.tax?.total?.gross?.formatted) {
              console.log(`       Tax: ${paymentDetail.tax.total.gross.formatted}`);
            }
          }
          
          // Action eligibility
          if (orderData.action_eligibility) {
            console.log(`\n    ✅ Available Actions:`);
            const actions = orderData.action_eligibility;
            Object.entries(actions).forEach(([key, val]) => {
              if (val?.is_eligible) {
                console.log(`       • ${key} (${val.reason || "eligible"})`);
              } else if (val?.is_eligible === false) {
                console.log(`       ✗ ${key} (${val.reason || "not eligible"})`);
              }
            });
          }
          
          // Risk indicators
          if (orderData.is_order_accuracy_risk !== undefined) {
            console.log(`\n    ⚠️  Order Accuracy Risk: ${orderData.is_order_accuracy_risk}`);
          }
          
          // Additional metadata
          if (orderData.has_membership_pass !== undefined) {
            console.log(`    Membership Pass: ${orderData.has_membership_pass}`);
          }
        });
        console.log(`\n${'═'.repeat(80)}\n`);
      } else {
        console.log("   No orders found");
      }
    } else {
      console.log(`\n❌ Failed to list orders: ${result.error || "Unknown error"}`);
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

async function viewOrders() {
  console.log("\n📋 Fetching orders from local storage...");
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  console.log("\n(Local data)");
  await question("Press Enter to continue...");
  await mainMenu();
}

async function acceptOrderFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID to accept: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  // Check if input is a number (order index)
  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
    console.log(`\n📋 Accepting order: ${orderId}`);
  } else {
    orderId = input.trim();
  }
  
  await acceptOrder(orderId);
  
  await question("Press Enter to continue...");
  await mainMenu();
}

async function denyOrderFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID to deny: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  // Check if input is a number (order index)
  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
    console.log(`\n📋 Denying order: ${orderId}`);
  } else {
    orderId = input.trim();
  }

  console.log("\nDeny Reasons:");
  console.log("1. STORE_CLOSED - Store is closed");
  console.log("2. ITEM_ISSUE - Issue with item or modifier");
  console.log("3. RESTAURANT_TOO_BUSY - Restaurant is too busy");
  console.log("4. CAPACITY - Store order capacity is full");
  console.log("5. OTHER - Other reasons");
  
  const reasonChoice = await question("Select reason (1-5): ");
  
  const reasons = ["STORE_CLOSED", "ITEM_ISSUE", "RESTAURANT_TOO_BUSY", "CAPACITY", "OTHER"];
  const reasonType = reasons[parseInt(reasonChoice) - 1] || "OTHER";
  
  const info = await question("Enter additional explanation (optional): ");
  
  await denyOrder(orderId, reasonType, info);
  await question("Press Enter to continue...");
  await mainMenu();
}

async function reportIssueFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  // Check if input is a number (order index)
  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
    console.log(`\n📋 Reporting issue for order: ${orderId}`);
  } else {
    orderId = input.trim();
  }

  console.log("\n⚠️ Enter cart item IDs that are out of stock (comma-separated):");
  const cartItemIds = await question("Cart Item IDs: ");
  
  if (cartItemIds.trim()) {
    const cartItemIdArray = cartItemIds.split(",").map((id) => id.trim());
    
    // Build fulfillment_issues array per API spec
    const fulfillmentIssues = cartItemIdArray.map(cartItemId => ({
      root_item: {
        cart_item_id: cartItemId,
        quantity: 1
      },
      fulfillment_action: {
        action_type: "ASK_CUSTOMER"
      },
      fulfillment_issue_type: "OUT_OF_ITEM"
    }));
    
    await reportFulfillmentIssue(orderId, fulfillmentIssues);
  } else {
    console.log("❌ No items provided");
  }
  
  await question("Press Enter to continue...");
  await mainMenu();
}

async function clearAllOrdersFlow() {
  const confirm = await question("⚠️ Are you sure you want to clear ALL order records? (yes/no): ");
  
  if (confirm.trim().toLowerCase() === "yes") {
    await clearAllOrders();
  } else {
    console.log("❌ Cancelled");
  }
  
  await question("Press Enter to continue...");
  await mainMenu();
}

async function cancelOrderFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID to cancel: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
    console.log(`\n❌ Canceling order: ${orderId}`);
  } else {
    orderId = input.trim();
  }

  console.log("\nCancel Reasons:");
  console.log("1. ITEM_ISSUE - Issue with an item or modifier");
  console.log("2. STORE_CLOSED - Store is closed");
  console.log("3. CUSTOMER_CALLED_TO_CANCEL - Customer called to cancel");
  console.log("4. RESTAURANT_TOO_BUSY - Restaurant is too busy");
  console.log("5. OTHER - Other reasons");
  
  const reasonChoice = await question("Select reason (1-5): ");
  
  const reasons = ["ITEM_ISSUE", "STORE_CLOSED", "CUSTOMER_CALLED_TO_CANCEL", "RESTAURANT_TOO_BUSY", "OTHER"];
  const reasonType = reasons[parseInt(reasonChoice) - 1] || "OTHER";
  
  const info = await question("Enter additional explanation (optional): ");
  
  await cancelOrder(orderId, reasonType, info);
  await question("Press Enter to continue...");
  await mainMenu();
}

async function updateReadyTimeFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
  } else {
    orderId = input.trim();
  }

  const minutesInput = await question("Enter minutes from now (e.g., 15): ");
  const minutes = parseInt(minutesInput);
  
  if (isNaN(minutes) || minutes < 0) {
    console.log("❌ Invalid minutes");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  // Calculate ready time (RFC3339 format)
  const readyTime = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  
  console.log(`\n⏰ Setting ready time to: ${readyTime}`);
  await updateReadyTime(orderId, readyTime);
  await question("Press Enter to continue...");
  await mainMenu();
}

async function adjustPriceFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
  } else {
    orderId = input.trim();
  }

  const amountInput = await question("Enter adjustment amount in dollars (e.g., 5.50 or -2.00): ");
  const amount = parseFloat(amountInput);
  
  if (isNaN(amount)) {
    console.log("❌ Invalid amount");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  // Convert to E5 format (multiply by 100000)
  const amountE5 = Math.round(amount * 100000);
  
  // Get tax rate (required by Uber API)
  const taxRateInput = await question("Enter tax rate percentage (e.g., 8.75 for 8.75%): ");
  const taxRate = taxRateInput.trim() ? taxRateInput : "0";
  
  console.log("\nAdjustment Reasons:");
  console.log("1. REQUESTED_ADD_ONS - Customer requested add on");
  console.log("2. BIGGER_SIZE - Customer requested bigger size");
  console.log("3. NEW_ITEM_ADDED - New item added");
  console.log("4. ITEM_SOLD_OUT - Item sold out");
  console.log("5. REMOVED_ITEM - Item removed");
  console.log("6. OTHER - Other reason");
  
  const reasonChoice = await question("Select reason (1-6, or press Enter to skip): ");
  
  let reason, customReason;
  if (reasonChoice.trim()) {
    const reasons = ["REQUESTED_ADD_ONS", "BIGGER_SIZE", "NEW_ITEM_ADDED", "ITEM_SOLD_OUT", "REMOVED_ITEM", "OTHER"];
    reason = reasons[parseInt(reasonChoice) - 1];
    
    if (reason === "OTHER") {
      customReason = await question("Enter custom reason (required for OTHER): ");
    }
  }
  
  console.log(`\n💰 Adjusting price by $${amount} (${amountE5} E5)`);
  await adjustPrice(orderId, amountE5, taxRate, reason, customReason);
  await question("Press Enter to continue...");
  await mainMenu();
}

async function markReadyFlow() {
  const orders = await fetchOrders("pending");
  displayOrders(orders);
  
  if (orders.length === 0) {
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const input = await question("Enter order number or Order ID to mark ready: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  const orderIndex = parseInt(input.trim()) - 1;
  let orderId;

  if (!isNaN(orderIndex) && orderIndex >= 0 && orderIndex < orders.length) {
    orderId = orders[orderIndex].order_id;
    console.log(`\n🍽️ Marking order ready: ${orderId}`);
  } else {
    orderId = input.trim();
  }
  
  await markOrderReady(orderId);
  await question("Press Enter to continue...");
  await mainMenu();
}

async function fetchFromUberFlow() {
  const input = await question("Enter Order ID to fetch from Uber API: ");
  
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  const orderId = input.trim();
  
  try {
    console.log(`\n📥 Fetching order ${orderId} from Uber...`);
    const response = await fetch(`${UBER_API}/orders/${orderId}?expand=carts,deliveries,payment`);

    if (response.ok) {
      const orderData = await response.json();
      console.log("\n✅ Order fetched successfully from Uber!");
      console.log(JSON.stringify(orderData, null, 2));
    } else {
      const error = await response.text();
      console.error("❌ Failed to fetch order:", error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
  
  await question("Press Enter to continue...");
  await mainMenu();
}

async function fetchAndDisplayStores() {
  console.log("\n📋 Fetching stores...");
  try {
    const response = await fetch(`${STORE_API}/list`);
    const result = await response.json();

    if (result.stores) {
      console.log(`\n✅ Found ${result.stores.length} stores:`);
      result.stores.forEach((store, index) => {
        console.log(`\n[${index + 1}] ${store.name || "N/A"}`);
        console.log(`    ID: ${store.id}`);
        console.log(`    Status: ${store.onboarding_status || "N/A"}`);
        if (store.location) {
          console.log(`    Address: ${store.location.street_address_line_one}, ${store.location.city}`);
        }
      });
      return result.stores;
    } else {
      console.error("❌ Failed to list stores:", result.error || "Unknown error");
      return [];
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    return [];
  }
}

async function listStoresFlow() {
  await fetchAndDisplayStores();
  await question("Press Enter to continue...");
  await mainMenu();
}

async function getStoreDetailsFlow() {
  // Reuse listStores to help user pick an ID
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  // Check if input is a number (store index)
  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  try {
    console.log(`\n📥 Fetching details for store: ${storeId}`);
    const response = await fetch(`${STORE_API}/${storeId}`);
    const result = await response.json();

    // Handle both { store: {...} } and direct object formats
    const store = result.store || result;

    if (store && store.id) {
      console.log("\n✅ Store Details:");
      console.log(`   Name: ${store.name}`);
      console.log(`   ID: ${store.id}`);
      console.log(`   Timezone: ${store.timezone}`);
      console.log(`   Support: ${store.support_number || "N/A"}`);
      
      if (store.contact) {
        console.log(`   Contact: ${store.contact.name} (${store.contact.email || "No email"})`);
      }
      
      if (store.location) {
        console.log(`   Location: ${store.location.street_address_line_one}, ${store.location.city}, ${store.location.postal_code}`);
      }

      if (store.orderability) {
        console.log("\n   Orderability:");
        console.log(`     Status: ${store.orderability.status}`);
        console.log(`     Visible: ${store.orderability.is_visible}`);
        console.log(`     Orderable: ${store.orderability.is_orderable}`);
        if (store.orderability.offline_reason) {
          console.log(`     Offline Reason: ${store.orderability.offline_reason}`);
        }
        if (store.orderability.is_offline_until) {
          console.log(`     Offline Until: ${store.orderability.is_offline_until}`);
        }
      }

      if (store.fulfillment_type_availability) {
        console.log("\n   Fulfillment Types:");
        Object.entries(store.fulfillment_type_availability).forEach(([type, avail]) => {
          console.log(`     - ${type}: ${avail ? "✅" : "❌"}`);
        });
      }

      if (store.prep_times) {
        console.log("\n   Preparation Time:");
        console.log(`     Default: ${store.prep_times.default_value ? Math.round(store.prep_times.default_value / 60) + " min" : "N/A"}`);
      }

    } else {
      console.error("❌ Failed to get store details:", result.error || "Unknown error");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

async function updateStoreStatusFlow() {
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }
  
  // Check if input is a number (store index)
  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  console.log("\nSelect Status:");
  console.log("1. ONLINE");
  console.log("2. OFFLINE");
  
  const statusChoice = await question("Choice (1-2): ");
  const status = statusChoice.trim() === "1" ? "ONLINE" : "OFFLINE";
  
  let reason, is_offline_until;
  
  if (status === "OFFLINE") {
    console.log("\nOffline Reasons:");
    console.log("1. TEMPORARILY_CLOSED - Temporarily closed");
    console.log("2. PERMANENTLY_CLOSED - Permanently closed");
    console.log("3. KITCHEN_CLOSED - Kitchen closed");
    console.log("4. OTHER - Other reason");
    
    const reasonChoice = await question("Select reason (1-4, or press Enter to skip): ");
    
    const offlineReasons = {
      "1": "TEMPORARILY_CLOSED",
      "2": "PERMANENTLY_CLOSED",
      "3": "KITCHEN_CLOSED",
      "4": "OTHER",
    };
    
    if (reasonChoice.trim() && offlineReasons[reasonChoice.trim()]) {
      reason = offlineReasons[reasonChoice.trim()];
    }
    
    // Ask for offline duration (required when setting to OFFLINE)
    let validDuration = false;
    while (!validDuration) {
      const durationInput = await question("\nHow long offline? (minutes, default 15, or press Enter for 15 min): ");
      
      let minutes = 15; // Default to 15 minutes
      
      if (durationInput.trim()) {
        minutes = parseInt(durationInput.trim());
        
        if (isNaN(minutes) || minutes <= 0) {
          console.log("   ⚠️ Invalid input. Please enter a positive number or press Enter for default (15 min)");
          continue;
        }
      }
      
      // Calculate offline until timestamp (RFC3339 format)
      is_offline_until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      console.log(`   ⏰ Will be offline until: ${is_offline_until} (${minutes} minutes from now)`);
      validDuration = true;
    }
  }

  try {
    console.log(`\n🔄 Updating status to ${status}...`);
    
    const body = { status };
    if (reason) body.reason = reason;
    if (is_offline_until) body.is_offline_until = is_offline_until;
    
    const response = await fetch(`${STORE_API}/${storeId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Store status updated successfully!");
      if (result.status) console.log(`   Status: ${result.status}`);
      if (result.reason) console.log(`   Reason: ${result.reason}`);
      if (result.is_offline_until) console.log(`   Offline Until: ${result.is_offline_until}`);
    } else {
      console.error("❌ Failed to update status:", result.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

async function getStoreStatusFlow() {
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }
  
  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  try {
    console.log(`\n📥 Fetching store status: ${storeId}`);
    const response = await fetch(`${STORE_API}/${storeId}/status`);
    const result = await response.json();

    if (response.ok) {
      console.log("\n✅ Store Status:");
      console.log(`   Status: ${result.status}`);
      if (result.offline_reason) console.log(`   Offline Reason: ${result.offline_reason}`);
      if (result.is_offline_until) console.log(`   Offline Until: ${result.is_offline_until}`);
      if (result.next_open_time) console.log(`   Next Open Time: ${result.next_open_time}`);
      if (result.next_close_time) console.log(`   Next Close Time: ${result.next_close_time}`);
    } else {
      console.error("❌ Failed to get store status:", result.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

async function updateStoreInfoFlow() {
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }
  
  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  console.log("\nUpdate Store Information:");
  console.log("1. Update Contact Info");
  console.log("2. Update Location");
  console.log("3. Update Pickup Instructions");
  console.log("4. Update All");
  
  const choice = await question("Select what to update (1-4): ");

  const updateData = {};

  try {
    if (choice === "1" || choice === "4") {
      const email = await question("Enter contact email (or press Enter to skip): ");
      const name = await question("Enter contact name (or press Enter to skip): ");
      const phone = await question("Enter contact phone (or press Enter to skip): ");
      
      if (email.trim() || name.trim() || phone.trim()) {
        updateData.contact = {};
        if (email.trim()) updateData.contact.email = email.trim();
        if (name.trim()) updateData.contact.name = name.trim();
        if (phone.trim()) updateData.contact.phone_number = phone.trim();
      }
    }

    if (choice === "2" || choice === "4") {
      const address = await question("Enter street address (or press Enter to skip): ");
      const city = await question("Enter city (or press Enter to skip): ");
      const postalCode = await question("Enter postal code (or press Enter to skip): ");
      const latInput = await question("Enter latitude (optional, press Enter to skip): ");
      const longInput = await question("Enter longitude (optional, press Enter to skip): ");
      
      if (address.trim() || city.trim() || postalCode.trim() || latInput.trim() || longInput.trim()) {
        updateData.location = {};
        if (address.trim()) updateData.location.street_address_line_one = address.trim();
        if (city.trim()) updateData.location.city = city.trim();
        if (postalCode.trim()) updateData.location.postal_code = postalCode.trim();
        
        // Only add coordinates if explicitly provided
        if (latInput.trim()) {
          updateData.location.latitude = parseFloat(latInput.trim());
        }
        if (longInput.trim()) {
          updateData.location.longitude = parseFloat(longInput.trim());
        }
      }
    }

    if (choice === "3" || choice === "4") {
      const instructions = await question("Enter pickup instructions (or press Enter to skip): ");
      if (instructions.trim()) {
        updateData.pickup_instructions = instructions.trim();
      }
    }

    if (Object.keys(updateData).length === 0) {
      console.log("   ⚠️ No updates provided");
    } else {
      console.log(`\n🔄 Updating store info...`);
      const response = await fetch(`${STORE_API}/${storeId}/info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Store info updated successfully!");
      } else {
        console.error("❌ Failed to update:", result.error || "Unknown error");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

async function updatePrepTimeFlow() {
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }
  
  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  const prepTimeInput = await question("Enter new preparation time in minutes (e.g., 15, max 180): ");
  
  if (!prepTimeInput.trim()) {
    console.log("   ⚠️ No time provided");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const prepTime = parseInt(prepTimeInput.trim());
  
  if (isNaN(prepTime) || prepTime <= 0 || prepTime > 180) {
    console.log("   ⚠️ Invalid time. Please enter a number between 1 and 180 minutes");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  try {
    console.log(`\n🔄 Updating prep time to ${prepTime} minutes (${prepTime * 60} seconds)...`);
    const response = await fetch(`${STORE_API}/${storeId}/prep-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_prep_time: prepTime }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Prep time updated successfully!");
      if (result.prep_times) {
        console.log(`   Default prep time: ${result.prep_times.default_value ? Math.round(result.prep_times.default_value / 60) + " min" : "N/A"}`);
      }
    } else {
      console.error("❌ Failed to update:", result.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

async function updateFulfillmentConfigFlow() {
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }
  
  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  console.log("\n⚠️ Note: This feature requires the 'eats.byoc.fulfillment.config' scope");
  console.log("   It is only available for stores configured with BYOC (Bring Your Own Courier)");

  const etdInput = await question("\nEnter custom minimum ETD in minutes (1-160, or press Enter to skip): ");
  
  if (!etdInput.trim()) {
    console.log("   ⚠️ No ETD provided, skipping update");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const etd = parseInt(etdInput.trim());
  
  if (isNaN(etd) || etd < 1 || etd > 160) {
    console.log("   ⚠️ Invalid ETD. Please enter a number between 1 and 160 minutes");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  try {
    console.log(`\n🔄 Updating fulfillment config with custom ETD: ${etd} minutes...`);
    const response = await fetch(`${STORE_API}/${storeId}/fulfillment-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_min_etd_minutes: etd }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Fulfillment config updated successfully!");
      if (result.override_config) {
        console.log(`   Custom Min ETD: ${result.override_config.custom_min_etd_minutes || "N/A"} minutes`);
      }
    } else {
      // Provide detailed error messages
      if (result.code === "unauthorized") {
        console.error("❌ Authorization Error:");
        console.error("   Your token does not have the required scope for this operation");
        console.error("   Required scope: eats.byoc.fulfillment.config");
        console.error("   Please verify your store is configured for BYOC fulfillment");
      } else {
        console.error("❌ Failed to update:", result.error || result.message || "Unknown error");
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

// ========== Menu Management Flows ==========

/**
 * Get Menu Flow
 * Retrieves the complete menu for a store with all item details
 */
async function getMenuFlow() {
  const stores = await fetchAndDisplayStores();
  
  const input = await question("\nEnter Store ID (or number from list): ");
  if (!input.trim()) {
    await mainMenu();
    return;
  }

  const storeIndex = parseInt(input.trim()) - 1;
  let storeId;

  if (!isNaN(storeIndex) && storeIndex >= 0 && storeIndex < stores.length) {
    storeId = stores[storeIndex].id;
  } else {
    storeId = input.trim();
  }

  const menuType = await question("\nMenu Type (press Enter for DELIVERY, or enter PICK_UP/DINE_IN): ");
  const finalMenuType = menuType.trim() ? `MENU_TYPE_FULFILLMENT_${menuType.toUpperCase()}` : null;

  try {
    console.log(`\n🔄 Fetching menu...`);
    const response = await fetch(`${MENU_API}/${storeId}${finalMenuType ? `?menu_type=${finalMenuType}` : ""}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Failed to fetch menu:", error);
    } else {
      const menu = await response.json();
      
      console.log("\n✅ Menu Retrieved:");
      console.log(`   Menus: ${menu.menus?.length || 0}`);
      console.log(`   Categories: ${menu.categories?.length || 0}`);
      console.log(`   Items: ${menu.items?.length || 0}`);
      console.log(`   Modifier Groups: ${menu.modifier_groups?.length || 0}`);
      
      // Display items with details
      if (menu.items && menu.items.length > 0) {
        console.log("\n📋 Items List:");
        console.log("═".repeat(120));
        menu.items.forEach((item, index) => {
          const price = item.price_info?.price ? `$${(item.price_info.price / 100).toFixed(2)}` : "N/A";
          const isSuspended = item.suspension_info?.suspension?.suspend_until ? "🚫" : "✅";
          const description = item.description?.translations ? Object.values(item.description.translations)[0] : "";
          console.log(`${String(index + 1).padStart(3, "0")}. [${isSuspended}] ${item.title?.translations?.en_us || item.title || "Unknown"} - ${price}`);
          if (description) {
            console.log(`     └─ ${description.substring(0, 80)}${description.length > 80 ? "..." : ""}`);
          }
        });
        console.log("═".repeat(120));
        
        // Store menu for Update Item flow
        global.lastMenuData = { storeId, menu };
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

/**
 * Update Item Flow
 * Updates a menu item using item number from Get Menu list
 * Supports all updateable fields from Uber API
 */
async function updateItemFlow() {
  // Check if we have recent menu data
  if (!global.lastMenuData || !global.lastMenuData.menu.items) {
    console.log("⚠️  No menu data available. Please run 'Get Menu' first to load items.");
    await question("Press Enter to continue...");
    await mainMenu();
    return;
  }

  const { storeId, menu } = global.lastMenuData;
  const items = menu.items;

  console.log("\n📝 Update Item");
  console.log(`Store: ${storeId}`);
  console.log(`Total items: ${items.length}\n`);

  // Show items list again for quick reference
  items.forEach((item, index) => {
    const price = item.price_info?.price ? `$${(item.price_info.price / 100).toFixed(2)}` : "N/A";
    const isSuspended = item.suspension_info?.suspension?.suspend_until ? "🚫" : "✅";
    console.log(`${String(index + 1).padStart(3, "0")}. [${isSuspended}] ${item.title?.translations?.en_us || item.title} - ${price}`);
  });

  const itemChoice = await question(`\nEnter item number (1-${items.length}), or ID, or 0 to cancel: `);
  if (!itemChoice.trim() || itemChoice === "0") {
    await mainMenu();
    return;
  }

  let selectedItem;
  const itemNum = parseInt(itemChoice.trim());

  if (!isNaN(itemNum) && itemNum > 0 && itemNum <= items.length) {
    selectedItem = items[itemNum - 1];
  } else {
    // Try as ID
    selectedItem = items.find(i => i.id === itemChoice.trim());
    if (!selectedItem) {
      console.error(`❌ Item not found: ${itemChoice}`);
      await question("Press Enter to continue...");
      await mainMenu();
      return;
    }
  }

  console.log(`\n✅ Selected: ${selectedItem.title?.translations?.en_us || selectedItem.title}`);
  console.log(`ID: ${selectedItem.id}\n`);

  // Update type menu
  console.log("📝 What to update:");
  console.log("1.  💰 Price Info");
  console.log("2.  🚫 Suspension/Availability");
  console.log("3.  📋 Menu Type");
  console.log("4.  📦 Product Info (GTIN/UPC/PLU)");
  console.log("5.  🏷️  Classifications (Dietary, Allergies, etc)");
  console.log("6.  ☕ Beverage Info (Caffeine, Alcohol)");
  console.log("7.  📦 Physical Properties (Packaging, Storage)");
  console.log("8.  💊 Medication Info");
  console.log("9.  🥗 Nutritional Info");
  console.log("10. 💼 Selling Info");
  console.log("0.  Cancel");

  const updateChoice = await question("\nSelect option (0-10): ");

  try {
    const updateData = {};

    switch (updateChoice.trim()) {
      case "1":
        await handlePriceInfo(updateData);
        break;
      case "2":
        await handleSuspensionInfo(updateData);
        break;
      case "3":
        await handleMenuType(updateData);
        break;
      case "4":
        await handleProductInfo(updateData);
        break;
      case "5":
        await handleClassifications(updateData);
        break;
      case "6":
        await handleBeverageInfo(updateData);
        break;
      case "7":
        await handlePhysicalProperties(updateData);
        break;
      case "8":
        await handleMedicationInfo(updateData);
        break;
      case "9":
        await handleNutritionalInfo(updateData);
        break;
      case "10":
        await handleSellingInfo(updateData);
        break;
      case "0":
        await mainMenu();
        return;
      default:
        console.log("❌ Invalid option");
        await question("Press Enter to continue...");
        await mainMenu();
        return;
    }

    if (Object.keys(updateData).length === 0) {
      console.log("❌ No updates provided");
    } else {
      console.log(`\n🔄 Updating item...`);
      const response = await fetch(`${MENU_API}/${storeId}/items/${selectedItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok || response.status === 204) {
        console.log("✅ Item updated successfully!");
      } else {
        const error = await response.text();
        console.error("❌ Failed to update item:", error);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

/**
 * Handle Price Info update
 */
async function handlePriceInfo(updateData) {
  console.log("\n💰 Price Info Update:");
  
  const priceStr = await question("Price in cents (required, e.g., 1299 for $12.99): ");
  const price = parseInt(priceStr.trim());
  
  if (isNaN(price) || price < 0) {
    console.error("❌ Invalid price");
    return;
  }

  const priceInfo = { price };

  const corePriceStr = await question("Core price in cents (optional, for refunds): ");
  if (corePriceStr.trim()) {
    const corePrice = parseInt(corePriceStr.trim());
    if (!isNaN(corePrice) && corePrice >= price) {
      priceInfo.core_price = corePrice;
    }
  }

  const depositStr = await question("Container deposit in cents (optional): ");
  if (depositStr.trim()) {
    const deposit = parseInt(depositStr.trim());
    if (!isNaN(deposit) && deposit >= 0) {
      priceInfo.container_deposit = deposit;
    }
  }

  updateData.price_info = priceInfo;
  console.log(`   ✅ Price updated: $${(price/100).toFixed(2)}`);
}

/**
 * Handle Suspension Info update
 */
async function handleSuspensionInfo(updateData) {
  console.log("\n🚫 Suspension/Availability:");
  
  const choice = await question("Suspend item? (y/n): ");
  
  if (choice.toLowerCase() === 'y') {
    const reason = await question("Reason (e.g., OUT_OF_STOCK): ");
    updateData.suspension_info = {
      suspension: {
        suspend_until: null,
        reason: reason.trim() || "OUT_OF_STOCK",
      },
    };
    console.log(`   ✅ Item suspended: ${reason.trim() || "OUT_OF_STOCK"}`);
  } else {
    updateData.suspension_info = {
      suspension: {
        suspend_until: null,
        reason: null,
      },
    };
    console.log(`   ✅ Item will be available`);
  }
}

/**
 * Handle Menu Type update
 */
async function handleMenuType(updateData) {
  console.log("\n📋 Menu Type:");
  console.log("1. MENU_TYPE_FULFILLMENT_DELIVERY");
  console.log("2. MENU_TYPE_FULFILLMENT_PICK_UP");
  console.log("3. MENU_TYPE_FULFILLMENT_DINE_IN (AU/NZ only)");
  
  const choice = await question("Select menu type (1-3): ");
  
  const menuTypes = {
    "1": "MENU_TYPE_FULFILLMENT_DELIVERY",
    "2": "MENU_TYPE_FULFILLMENT_PICK_UP",
    "3": "MENU_TYPE_FULFILLMENT_DINE_IN"
  };
  
  if (menuTypes[choice]) {
    updateData.menu_type = menuTypes[choice];
    console.log(`   ✅ Menu type: ${menuTypes[choice]}`);
  }
}

/**
 * Handle Product Info update (GTIN/UPC codes, etc)
 */
async function handleProductInfo(updateData) {
  console.log("\n📦 Product Info:");
  
  const productInfo = {};

  const gtin = await question("GTIN/UPC/EAN code (optional): ");
  if (gtin.trim()) productInfo.gtin = gtin.trim();

  const plu = await question("PLU code for fresh produce (optional): ");
  if (plu.trim()) productInfo.plu = plu.trim();

  const merchantId = await question("Merchant ID (optional): ");
  if (merchantId.trim()) productInfo.merchant_id = merchantId.trim();

  const targetMarket = await question("Target market - ISO 3166 code or 'ALL'/'EU' (optional): ");
  if (targetMarket.trim()) productInfo.target_market = targetMarket.trim();

  const productType = await question("Product type (optional): ");
  if (productType.trim()) productInfo.product_type = productType.trim();

  const traits = await question("Product traits, comma-separated (optional): ");
  if (traits.trim()) productInfo.product_traits = traits.split(",").map(t => t.trim());

  const origin = await question("Countries of origin, comma-separated (optional): ");
  if (origin.trim()) productInfo.countries_of_origin = origin.split(",").map(c => c.trim());

  if (Object.keys(productInfo).length > 0) {
    updateData.product_info = productInfo;
    console.log(`   ✅ Product info updated`);
  }
}

/**
 * Handle Classifications (dietary, allergies, etc)
 */
async function handleClassifications(updateData) {
  console.log("\n🏷️  Classifications:");
  
  const classifications = {};

  const canServe = await question("Can serve alone? (y/n): ");
  if (canServe.trim()) classifications.can_serve_alone = canServe.toLowerCase() === 'y';

  const alcoholic = await question("Alcoholic items count (0 for non-alcoholic, or number): ");
  if (alcoholic.trim()) {
    const count = parseInt(alcoholic.trim());
    if (!isNaN(count)) classifications.alcoholic_items = count;
  }

  const dietary = await question("Dietary labels - VEGAN/VEGETARIAN/GLUTEN_FREE, comma-separated (optional): ");
  if (dietary.trim()) {
    classifications.dietary_label_info = {
      labels: dietary.split(",").map(d => d.trim())
    };
  }

  const ingredients = await question("Ingredients, comma-separated (max 50, optional): ");
  if (ingredients.trim()) {
    classifications.ingredients = ingredients.split(",").map(i => i.trim()).slice(0, 50);
  }

  const additives = await question("Additives, comma-separated (optional): ");
  if (additives.trim()) classifications.additives = additives.split(",").map(a => a.trim());

  const instructions = await question("Instructions for use (max 200 chars, optional): ");
  if (instructions.trim()) classifications.instructions_for_use = instructions.trim().substring(0, 200);

  const prep = await question("Preparation type - PREPACKAGED or empty (optional): ");
  if (prep.trim()) classifications.preparation_type = prep.trim();

  const highFat = await question("High fat/salt/sugar? (y/n): ");
  if (highFat.trim()) classifications.is_high_fat_salt_sugar = highFat.toLowerCase() === 'y';

  if (Object.keys(classifications).length > 0) {
    updateData.classifications = classifications;
    console.log(`   ✅ Classifications updated`);
  }
}

/**
 * Handle Beverage Info
 */
async function handleBeverageInfo(updateData) {
  console.log("\n☕ Beverage Info:");
  
  const beverageInfo = {};

  const caffeine = await question("Caffeine amount in mg (optional): ");
  if (caffeine.trim()) {
    const amount = parseInt(caffeine.trim());
    if (!isNaN(amount)) beverageInfo.caffeine_amount = amount;
  }

  const alcohol = await question("Alcohol by volume in E2 format (e.g., 1275 for 12.75%, optional): ");
  if (alcohol.trim()) {
    const abv = parseInt(alcohol.trim());
    if (!isNaN(abv)) beverageInfo.alcohol_by_volume = abv;
  }

  const coffeeOrigin = await question("Coffee bean origins, comma-separated (optional): ");
  if (coffeeOrigin.trim()) {
    beverageInfo.coffee_info = {
      coffee_bean_origin: coffeeOrigin.split(",").map(o => o.trim())
    };
  }

  if (Object.keys(beverageInfo).length > 0) {
    updateData.beverage_info = beverageInfo;
    console.log(`   ✅ Beverage info updated`);
  }
}

/**
 * Handle Physical Properties
 */
async function handlePhysicalProperties(updateData) {
  console.log("\n📦 Physical Properties:");
  
  const physicalProps = {};

  const reusable = await question("Reusable packaging? (y/n): ");
  if (reusable.trim()) physicalProps.reusable_packaging = reusable.toLowerCase() === 'y';

  const storage = await question("Storage instructions (max 200 chars, optional): ");
  if (storage.trim()) physicalProps.storage_instructions = storage.trim().substring(0, 200);

  if (Object.keys(physicalProps).length > 0) {
    updateData.physical_properties_info = physicalProps;
    console.log(`   ✅ Physical properties updated`);
  }
}

/**
 * Handle Medication Info
 */
async function handleMedicationInfo(updateData) {
  console.log("\n💊 Medication Info:");
  
  const medicationInfo = {};

  const prescription = await question("Medical prescription required? (y/n): ");
  if (prescription.trim()) medicationInfo.medical_prescription_required = prescription.toLowerCase() === 'y';

  if (Object.keys(medicationInfo).length > 0) {
    updateData.medication_info = medicationInfo;
    console.log(`   ✅ Medication info updated`);
  }
}

/**
 * Handle Nutritional Info
 */
async function handleNutritionalInfo(updateData) {
  console.log("\n🥗 Nutritional Info:");
  
  const nutritionalInfo = {};

  const calories = await question("Calories (per serving, optional): ");
  if (calories.trim()) {
    const cal = parseInt(calories.trim());
    if (!isNaN(cal)) {
      nutritionalInfo.calories = {
        energy_interval: { lower: cal }
      };
    }
  }

  const servingSize = await question("Serving size (optional, e.g., '100g'): ");
  if (servingSize.trim()) nutritionalInfo.serving_size = { measurement_type: "MEASUREMENT_TYPE_WEIGHT" };

  const numServings = await question("Number of servings (optional): ");
  if (numServings.trim()) {
    const num = parseInt(numServings.trim());
    if (!isNaN(num)) nutritionalInfo.number_of_servings = num;
  }

  const protein = await question("Protein amount (optional): ");
  if (protein.trim()) nutritionalInfo.protein = { amount: { interval: { lower: parseInt(protein.trim()) || 0 } } };

  const fat = await question("Fat amount (optional): ");
  if (fat.trim()) nutritionalInfo.fat = { amount: { interval: { lower: parseInt(fat.trim()) || 0 } } };

  const carbs = await question("Carbohydrates amount (optional): ");
  if (carbs.trim()) nutritionalInfo.carbohydrates = { amount: { interval: { lower: parseInt(carbs.trim()) || 0 } } };

  const sugar = await question("Sugar amount (optional): ");
  if (sugar.trim()) nutritionalInfo.sugar = { amount: { interval: { lower: parseInt(sugar.trim()) || 0 } } };

  const salt = await question("Salt amount (optional): ");
  if (salt.trim()) nutritionalInfo.salt = { amount: { interval: { lower: parseInt(salt.trim()) || 0 } } };

  const allergens = await question("Allergens, comma-separated (optional): ");
  if (allergens.trim()) nutritionalInfo.allergens = allergens.split(",").map(a => a.trim());

  if (Object.keys(nutritionalInfo).length > 0) {
    updateData.nutritional_info = nutritionalInfo;
    console.log(`   ✅ Nutritional info updated`);
  }
}

/**
 * Handle Selling Info
 */
async function handleSellingInfo(updateData) {
  console.log("\n💼 Selling Info:");
  console.log("Selling options configuration (complex structure)");
  
  const sellingOptions = [];
  const addMore = await question("Add selling option? (y/n): ");
  
  if (addMore.toLowerCase() === 'y') {
    const option = {};
    
    const measurement = await question("Measurement type (COUNT/WEIGHT/VOLUME/LENGTH, optional): ");
    if (measurement.trim()) {
      option.sold_by_unit = {
        measurement_type: `MEASUREMENT_TYPE_${measurement.toUpperCase()}`
      };
    }

    const minQty = await question("Min permitted quantity (optional): ");
    const maxQty = await question("Max permitted quantity (optional): ");
    
    if (minQty.trim() || maxQty.trim()) {
      option.quantity_constraints = {};
      if (minQty.trim()) option.quantity_constraints.min_permitted = parseFloat(minQty.trim());
      if (maxQty.trim()) option.quantity_constraints.max_permitted = parseFloat(maxQty.trim());
    }

    if (Object.keys(option).length > 0) {
      sellingOptions.push(option);
    }
  }

  if (sellingOptions.length > 0) {
    updateData.selling_info = { selling_options: sellingOptions };
    console.log(`   ✅ Selling info updated`);
  }
}


/**
 * Upload Menu Flow
 * Upload/replace complete menu for a store
 */
async function uploadMenuFlow() {
  console.log("\n📤 Upload Complete Menu");
  console.log("This will upload a complete MenuConfiguration for a store.\n");

  const storeId = await question("Enter Store ID: ");
  if (!storeId.trim()) {
    await mainMenu();
    return;
  }

  console.log("\n📝 Menu Configuration Options:");
  console.log("1. Input JSON directly (paste complete MenuConfiguration)");
  console.log("2. Build menu step-by-step (interactive mode)");
  console.log("0. Cancel");

  const choice = await question("\nSelect option (0-2): ");

  try {
    let menuConfig;

    if (choice === "1") {
      // Direct JSON input
      console.log("\n📋 Paste your MenuConfiguration JSON (Ctrl+D or empty line to finish):");
      console.log("Required fields: menus[], categories[], items[], modifier_groups[]");
      
      let jsonInput = "";
      const jsonLines = [];
      
      const readJsonLines = () => {
        return new Promise((resolve) => {
          const lineReader = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          
          lineReader.on('line', (line) => {
            if (line.trim() === '') {
              lineReader.close();
              resolve(jsonLines.join('\n'));
            } else {
              jsonLines.push(line);
            }
          });
        });
      };
      
      jsonInput = await readJsonLines();
      
      if (!jsonInput.trim()) {
        console.log("❌ No JSON provided");
        await question("Press Enter to continue...");
        await mainMenu();
        return;
      }

      try {
        menuConfig = JSON.parse(jsonInput);
      } catch (error) {
        console.error("❌ Invalid JSON:", error.message);
        await question("Press Enter to continue...");
        await mainMenu();
        return;
      }
    } else if (choice === "2") {
      // Interactive mode - build menu step by step
      menuConfig = await buildMenuInteractive();
      if (!menuConfig) {
        await mainMenu();
        return;
      }
    } else if (choice === "0") {
      await mainMenu();
      return;
    } else {
      console.log("❌ Invalid option");
      await question("Press Enter to continue...");
      await mainMenu();
      return;
    }

    // Validate MenuConfiguration
    if (!menuConfig.menus || !Array.isArray(menuConfig.menus) ||
        !menuConfig.categories || !Array.isArray(menuConfig.categories) ||
        !menuConfig.items || !Array.isArray(menuConfig.items) ||
        !menuConfig.modifier_groups || !Array.isArray(menuConfig.modifier_groups)) {
      console.error("❌ Invalid MenuConfiguration: missing required arrays (menus, categories, items, modifier_groups)");
      await question("Press Enter to continue...");
      await mainMenu();
      return;
    }

    console.log(`\n🔄 Uploading menu to store ${storeId}...`);
    console.log(`   Menus: ${menuConfig.menus.length}`);
    console.log(`   Categories: ${menuConfig.categories.length}`);
    console.log(`   Items: ${menuConfig.items.length}`);
    console.log(`   Modifier Groups: ${menuConfig.modifier_groups.length}`);

    const response = await fetch(`${MENU_API}/${storeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuConfig),
    });

    if (response.ok || response.status === 204) {
      console.log("✅ Menu uploaded successfully!");
      // Cache the uploaded menu
      global.lastMenuData = { storeId, menu: menuConfig };
    } else {
      const error = await response.text();
      console.error("❌ Failed to upload menu:", error);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }

  await question("Press Enter to continue...");
  await mainMenu();
}

/**
 * Build menu configuration interactively
 */
async function buildMenuInteractive() {
  const config = {
    menus: [],
    categories: [],
    items: [],
    modifier_groups: []
  };

  const menuTypeChoice = await question("\nMenu type (1=DELIVERY, 2=PICKUP, 3=DINE_IN, 0=DEFAULT): ");
  const menuTypeMap = {
    "1": "MENU_TYPE_FULFILLMENT_DELIVERY",
    "2": "MENU_TYPE_FULFILLMENT_PICK_UP",
    "3": "MENU_TYPE_FULFILLMENT_DINE_IN"
  };
  if (menuTypeMap[menuTypeChoice]) {
    config.menu_type = menuTypeMap[menuTypeChoice];
  }

  // Build Menus
  console.log("\n🍽️  Configure Menus:");
  const addMenu = await question("Add a menu? (y/n): ");
  if (addMenu.toLowerCase() === 'y') {
    const menu = await buildMenu();
    if (menu) config.menus.push(menu);
  }

  // Build Categories
  console.log("\n📂 Configure Categories:");
  const addCategory = await question("Add a category? (y/n): ");
  if (addCategory.toLowerCase() === 'y') {
    const category = await buildCategory();
    if (category) config.categories.push(category);
  }

  // Build Items
  console.log("\n🍕 Configure Items:");
  const addItem = await question("Add items? (y/n): ");
  if (addItem.toLowerCase() === 'y') {
    let addMore = true;
    while (addMore) {
      const item = await buildItem();
      if (item) {
        config.items.push(item);
        addMore = await question("Add another item? (y/n): ");
        addMore = addMore.toLowerCase() === 'y';
      } else {
        addMore = false;
      }
    }
  }

  // Build Modifier Groups
  console.log("\n⚙️  Configure Modifier Groups:");
  const addModifier = await question("Add modifier groups? (y/n): ");
  if (addModifier.toLowerCase() === 'y') {
    let addMore = true;
    while (addMore) {
      const modifierGroup = await buildModifierGroup();
      if (modifierGroup) {
        config.modifier_groups.push(modifierGroup);
        addMore = await question("Add another modifier group? (y/n): ");
        addMore = addMore.toLowerCase() === 'y';
      } else {
        addMore = false;
      }
    }
  }

  return config;
}

/**
 * Build a Menu object
 */
async function buildMenu() {
  const id = await question("Menu ID (unique identifier): ");
  if (!id.trim()) return null;

  const title = await question("Menu title (e.g., 'Breakfast', 'Lunch'): ");
  if (!title.trim()) return null;

  const subtitle = await question("Menu subtitle (optional): ");

  const menu = {
    id: id.trim(),
    title: { translations: { en_us: title.trim() } },
    category_ids: []
  };

  if (subtitle.trim()) {
    menu.subtitle = { translations: { en_us: subtitle.trim() } };
  }

  // Service Availability
  console.log("\n⏰ Service Availability:");
  const addAvailability = await question("Configure service availability? (y/n): ");
  if (addAvailability.toLowerCase() === 'y') {
    const availability = await buildServiceAvailability();
    if (availability) menu.service_availability = availability;
  }

  // Category IDs
  const categoryIds = await question("Category IDs (comma-separated): ");
  if (categoryIds.trim()) {
    menu.category_ids = categoryIds.split(",").map(id => id.trim());
  }

  return menu;
}

/**
 * Build service availability
 */
async function buildServiceAvailability() {
  const availability = [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const hasDay = await question(`Available on ${day}? (y/n): `);
    if (hasDay.toLowerCase() === 'y') {
      const startTime = await question(`  Start time (HH:MM, e.g., 08:00): `);
      const endTime = await question(`  End time (HH:MM, e.g., 23:00): `);
      
      if (startTime.match(/^\d{2}:\d{2}$/) && endTime.match(/^\d{2}:\d{2}$/)) {
        availability.push({
          day_of_week: day,
          time_periods: [{ start_time: startTime, end_time: endTime }]
        });
      }
    }
  }

  return availability.length > 0 ? availability : null;
}

/**
 * Build a Category object
 */
async function buildCategory() {
  const id = await question("Category ID (unique identifier): ");
  if (!id.trim()) return null;

  const title = await question("Category title (e.g., 'Appetizers'): ");
  if (!title.trim()) return null;

  const subtitle = await question("Category subtitle (optional): ");

  const category = {
    id: id.trim(),
    title: { translations: { en_us: title.trim() } },
    entities: []
  };

  if (subtitle.trim()) {
    category.subtitle = { translations: { en_us: subtitle.trim() } };
  }

  // Add items/modifier groups to this category
  const itemIds = await question("Item IDs in this category (comma-separated): ");
  if (itemIds.trim()) {
    itemIds.split(",").forEach(itemId => {
      category.entities.push({
        id: itemId.trim(),
        type: "ITEM"
      });
    });
  }

  return category;
}

/**
 * Build an Item object with all supported parameters
 */
async function buildItem() {
  const id = await question("Item ID (unique identifier, avoid / and ;): ");
  if (!id.trim()) return null;

  const title = await question("Item title: ");
  if (!title.trim()) return null;

  const description = await question("Item description (optional): ");

  const item = {
    id: id.trim(),
    title: { translations: { en_us: title.trim() } }
  };

  if (description.trim()) {
    item.description = { translations: { en_us: description.trim() } };
  }

  // Price Info (REQUIRED)
  console.log("\n💰 Price Info:");
  const priceStr = await question("Price in cents (required): ");
  const price = parseInt(priceStr.trim());
  if (!isNaN(price)) {
    item.price_info = { price };

    const corePriceStr = await question("Core price in cents (optional): ");
    if (corePriceStr.trim()) {
      const corePrice = parseInt(corePriceStr.trim());
      if (!isNaN(corePrice)) item.price_info.core_price = corePrice;
    }

    const depositStr = await question("Container deposit in cents (optional): ");
    if (depositStr.trim()) {
      const deposit = parseInt(depositStr.trim());
      if (!isNaN(deposit)) item.price_info.container_deposit = deposit;
    }
  } else {
    console.error("❌ Invalid price");
    return null;
  }

  // Image URL
  const imageUrl = await question("Image URL (optional): ");
  if (imageUrl.trim()) item.image_url = imageUrl.trim();

  // External Data
  const externalData = await question("External data for POS integration (optional, max 1024 chars): ");
  if (externalData.trim()) item.external_data = externalData.trim().substring(0, 1024);

  // Tax Info (REQUIRED)
  console.log("\n🧾 Tax Info:");
  const taxChoice = await question("Tax type: 1=tax_rate (added on top), 2=vat_rate (included), 0=none: ");
  if (taxChoice === "1") {
    const taxRate = await question("Tax rate (0-100): ");
    const rate = parseFloat(taxRate);
    if (!isNaN(rate)) item.tax_info = { tax_rate: rate };
  } else if (taxChoice === "2") {
    const vatRate = await question("VAT rate (0-100): ");
    const rate = parseFloat(vatRate);
    if (!isNaN(rate)) item.tax_info = { vat_rate_percentage: rate };
  } else {
    item.tax_info = { tax_rate: 0 };
  }

  // Suspension Info
  console.log("\n🚫 Suspension Info (optional):");
  const suspendChoice = await question("Suspend item? (y/n): ");
  if (suspendChoice.toLowerCase() === 'y') {
    const reason = await question("Suspension reason: ");
    item.suspension_info = {
      suspension: {
        suspend_until: null,
        reason: reason.trim() || "OUT_OF_STOCK"
      }
    };
  }

  // Quantity Info
  const addQuantity = await question("\n📊 Add quantity constraints? (y/n): ");
  if (addQuantity.toLowerCase() === 'y') {
    const quantityInfo = await buildQuantityInfo();
    if (quantityInfo) item.quantity_info = quantityInfo;
  }

  // Nutritional Info
  const addNutritional = await question("\n🥗 Add nutritional info? (y/n): ");
  if (addNutritional.toLowerCase() === 'y') {
    item.nutritional_info = await buildNutritionalInfo();
  }

  // Classifications / Dish Info
  const addClassifications = await question("\n🏷️  Add classifications? (y/n): ");
  if (addClassifications.toLowerCase() === 'y') {
    const classifications = await buildClassifications();
    if (classifications) {
      item.dish_info = { classifications };
    }
  }

  // Beverage Info
  const addBeverage = await question("\n☕ Add beverage info? (y/n): ");
  if (addBeverage.toLowerCase() === 'y') {
    item.beverage_info = await buildBeverageInfo();
  }

  // Product Info
  const addProductInfo = await question("\n📦 Add product info (GTIN/UPC)? (y/n): ");
  if (addProductInfo.toLowerCase() === 'y') {
    item.product_info = await buildProductInfo();
  }

  // Physical Properties
  const addPhysical = await question("\n📦 Add physical properties? (y/n): ");
  if (addPhysical.toLowerCase() === 'y') {
    item.physical_properities_info = await buildPhysicalProperties();
  }

  // Visibility Info
  const addVisibility = await question("\n👁️  Add visibility info? (y/n): ");
  if (addVisibility.toLowerCase() === 'y') {
    item.visibility_info = await buildVisibilityInfo();
  }

  // Modifier Groups
  const modifierIds = await question("\n⚙️  Modifier group IDs (comma-separated, optional): ");
  if (modifierIds.trim()) {
    item.modifier_group_ids = {
      ids: modifierIds.split(",").map(id => id.trim())
    };
  }

  return item;
}

/**
 * Build Quantity Info
 */
async function buildQuantityInfo() {
  const minQty = await question("Min quantity (optional): ");
  const maxQty = await question("Max quantity (optional): ");
  const defaultQty = await question("Default quantity (optional): ");

  const quantityInfo = { quantity: {} };
  
  if (minQty.trim()) {
    const min = parseInt(minQty.trim());
    if (!isNaN(min)) quantityInfo.quantity.min_permitted = min;
  }
  if (maxQty.trim()) {
    const max = parseInt(maxQty.trim());
    if (!isNaN(max)) quantityInfo.quantity.max_permitted = max;
  }
  if (defaultQty.trim()) {
    const def = parseInt(defaultQty.trim());
    if (!isNaN(def)) quantityInfo.quantity.default_quantity = def;
  }

  return Object.keys(quantityInfo.quantity).length > 0 ? quantityInfo : null;
}

/**
 * Build Nutritional Info
 */
async function buildNutritionalInfo() {
  const nutritionalInfo = {};

  const calories = await question("Calories (optional): ");
  if (calories.trim()) {
    const cal = parseInt(calories.trim());
    if (!isNaN(cal)) {
      nutritionalInfo.calories = { energy_interval: { lower: cal } };
    }
  }

  const servingSize = await question("Serving size (optional, e.g., '100g'): ");
  if (servingSize.trim()) nutritionalInfo.serving_size = { measurement_type: "MEASUREMENT_TYPE_WEIGHT" };

  const numServings = await question("Number of servings (optional): ");
  if (numServings.trim()) {
    const num = parseInt(numServings.trim());
    if (!isNaN(num)) nutritionalInfo.number_of_servings = num;
  }

  const protein = await question("Protein (g, optional): ");
  if (protein.trim()) {
    nutritionalInfo.protein = {
      amount: { interval: { lower: parseInt(protein.trim()) || 0 } }
    };
  }

  const fat = await question("Fat (g, optional): ");
  if (fat.trim()) {
    nutritionalInfo.fat = {
      amount: { interval: { lower: parseInt(fat.trim()) || 0 } }
    };
  }

  const carbs = await question("Carbohydrates (g, optional): ");
  if (carbs.trim()) {
    nutritionalInfo.carbohydrates = {
      amount: { interval: { lower: parseInt(carbs.trim()) || 0 } }
    };
  }

  const sugar = await question("Sugar (g, optional): ");
  if (sugar.trim()) {
    nutritionalInfo.sugar = {
      amount: { interval: { lower: parseInt(sugar.trim()) || 0 } }
    };
  }

  const salt = await question("Salt (g, optional): ");
  if (salt.trim()) {
    nutritionalInfo.salt = {
      amount: { interval: { lower: parseInt(salt.trim()) || 0 } }
    };
  }

  const allergens = await question("Allergens (comma-separated, optional): ");
  if (allergens.trim()) {
    nutritionalInfo.allergens = allergens.split(",").map(a => a.trim());
  }

  return Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : null;
}

/**
 * Build Classifications
 */
async function buildClassifications() {
  const classifications = {};

  const canServe = await question("Can serve alone? (y/n): ");
  if (canServe.trim()) classifications.can_serve_alone = canServe.toLowerCase() === 'y';

  const dietary = await question("Dietary labels (VEGAN/VEGETARIAN/GLUTEN_FREE, comma-separated, optional): ");
  if (dietary.trim()) {
    classifications.dietary_label_info = {
      labels: dietary.split(",").map(d => d.trim())
    };
  }

  const ingredients = await question("Ingredients (comma-separated, max 50, optional): ");
  if (ingredients.trim()) {
    classifications.ingredients = ingredients.split(",").map(i => i.trim()).slice(0, 50);
  }

  const additives = await question("Additives (comma-separated, optional): ");
  if (additives.trim()) {
    classifications.additives = additives.split(",").map(a => a.trim());
  }

  const instructions = await question("Instructions for use (max 200 chars, optional): ");
  if (instructions.trim()) {
    classifications.instructions_for_use = instructions.trim().substring(0, 200);
  }

  const prep = await question("Preparation type - PREPACKAGED or empty (optional): ");
  if (prep.trim()) {
    classifications.preparation_type = prep.trim();
  }

  const alcoholic = await question("Alcoholic items count (0 for non-alcoholic, optional): ");
  if (alcoholic.trim()) {
    const count = parseInt(alcoholic.trim());
    if (!isNaN(count)) classifications.alcoholic_items = count;
  }

  const highFat = await question("High fat/salt/sugar? (y/n): ");
  if (highFat.trim()) classifications.is_high_fat_salt_sugar = highFat.toLowerCase() === 'y';

  return Object.keys(classifications).length > 0 ? classifications : null;
}

/**
 * Build Beverage Info
 */
async function buildBeverageInfo() {
  const beverageInfo = {};

  const caffeine = await question("Caffeine amount (mg, optional): ");
  if (caffeine.trim()) {
    const amount = parseInt(caffeine.trim());
    if (!isNaN(amount)) beverageInfo.caffeine_amount = amount;
  }

  const alcohol = await question("Alcohol by volume - E2 format (e.g., 1275 for 12.75%, optional): ");
  if (alcohol.trim()) {
    const abv = parseInt(alcohol.trim());
    if (!isNaN(abv)) beverageInfo.alcohol_by_volume = abv;
  }

  const coffeeOrigin = await question("Coffee bean origins (comma-separated, optional): ");
  if (coffeeOrigin.trim()) {
    beverageInfo.coffee_info = {
      coffee_bean_origin: coffeeOrigin.split(",").map(o => o.trim())
    };
  }

  return Object.keys(beverageInfo).length > 0 ? beverageInfo : null;
}

/**
 * Build Product Info
 */
async function buildProductInfo() {
  const productInfo = {};

  const gtin = await question("GTIN/UPC code (optional): ");
  if (gtin.trim()) productInfo.gtin = gtin.trim();

  const plu = await question("PLU code (optional): ");
  if (plu.trim()) productInfo.plu = plu.trim();

  const merchantId = await question("Merchant ID (optional): ");
  if (merchantId.trim()) productInfo.merchant_id = merchantId.trim();

  const targetMarket = await question("Target market (ALL/EU or ISO code, optional): ");
  if (targetMarket.trim()) productInfo.target_market = targetMarket.trim();

  const productType = await question("Product type (optional): ");
  if (productType.trim()) productInfo.product_type = productType.trim();

  const traits = await question("Product traits (comma-separated, optional): ");
  if (traits.trim()) productInfo.product_traits = traits.split(",").map(t => t.trim());

  const origin = await question("Countries of origin (comma-separated, optional): ");
  if (origin.trim()) productInfo.countries_of_origin = origin.split(",").map(c => c.trim());

  return Object.keys(productInfo).length > 0 ? productInfo : null;
}

/**
 * Build Physical Properties
 */
async function buildPhysicalProperties() {
  const physicalProps = {};

  const reusable = await question("Reusable packaging? (y/n): ");
  if (reusable.trim()) physicalProps.reusable_packaging = reusable.toLowerCase() === 'y';

  const storage = await question("Storage instructions (max 200 chars, optional): ");
  if (storage.trim()) physicalProps.storage_instructions = storage.trim().substring(0, 200);

  return Object.keys(physicalProps).length > 0 ? physicalProps : null;
}

/**
 * Build Visibility Info
 */
async function buildVisibilityInfo() {
  const visibilityInfo = { hours: { hours_of_week: [] } };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    const hasDay = await question(`Visible on ${day}? (y/n): `);
    if (hasDay.toLowerCase() === 'y') {
      const startTime = await question(`  Start time (HH:MM): `);
      const endTime = await question(`  End time (HH:MM): `);
      
      if (startTime.match(/^\d{2}:\d{2}$/) && endTime.match(/^\d{2}:\d{2}$/)) {
        visibilityInfo.hours.hours_of_week.push({
          day_of_week: day,
          time_periods: [{ start_time: startTime, end_time: endTime }]
        });
      }
    }
  }

  return visibilityInfo.hours.hours_of_week.length > 0 ? visibilityInfo : null;
}

/**
 * Build a Modifier Group object
 */
async function buildModifierGroup() {
  const id = await question("Modifier Group ID (unique identifier): ");
  if (!id.trim()) return null;

  const title = await question("Modifier Group title (e.g., 'Size', 'Toppings'): ");
  if (!title.trim()) return null;

  const modifierGroup = {
    id: id.trim(),
    title: { translations: { en_us: title.trim() } },
    modifier_options: []
  };

  const displayType = await question("Display type (1=expanded, 2=collapsed, default=expanded): ");
  if (displayType === "2") {
    modifierGroup.display_type = "collapsed";
  }

  // Quantity Info
  const minQty = await question("Min quantity (optional): ");
  const maxQty = await question("Max quantity (optional): ");
  
  if (minQty.trim() || maxQty.trim()) {
    modifierGroup.quantity_info = {
      quantity: {}
    };
    if (minQty.trim()) {
      const min = parseInt(minQty.trim());
      if (!isNaN(min)) modifierGroup.quantity_info.quantity.min_permitted = min;
    }
    if (maxQty.trim()) {
      const max = parseInt(maxQty.trim());
      if (!isNaN(max)) modifierGroup.quantity_info.quantity.max_permitted = max;
    }
  }

  // Modifier Options (Items)
  const optionIds = await question("Modifier option IDs (comma-separated, these should be item IDs): ");
  if (optionIds.trim()) {
    optionIds.split(",").forEach(optionId => {
      modifierGroup.modifier_options.push({
        id: optionId.trim(),
        type: "ITEM"
      });
    });
  }

  return modifierGroup;
}

// Start the POS terminal
console.log("🚀 Starting POS Terminal...\n");
mainMenu();
