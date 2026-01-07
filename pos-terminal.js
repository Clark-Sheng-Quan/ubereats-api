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
const UBER_API = `${API_BASE_URL}/api/uber`;

console.log(`📡 API Endpoints:`);
console.log(`   Local API: ${LOCAL_API}`);
console.log(`   Uber API:  ${UBER_API}\n`);

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
  console.log("【本地数据操作 (Local)】");
  console.log("1. View Orders (查看本地订单)");
  console.log("2. Clear All Records (清空本地记录)");
  console.log("\n【Uber API 操作】");
  console.log("3. Get Order Details (获取单个订单详情)");
  console.log("4. List Store Orders (列出商店所有订单)");
  console.log("5. Accept Order (接受订单)");
  console.log("6. Deny Order (拒绝订单)");
  console.log("7. Cancel Order (取消订单)");
  console.log("8. Mark Order Ready (标记准备好)");
  console.log("9. Update Ready Time (更新准备时间)");
  console.log("10. Adjust Order Price (调整价格)");
  console.log("11. Resolve Fulfillment Issues (报告缺货)");
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
  console.log("2. Filter by state (PENDING/ACCEPTED/etc)");
  console.log("3. Filter by time range");
  
  const filterChoice = await question("Select filter option (1-3, default: 1): ");

  let queryParams = "expand=carts";
  
  if (filterChoice === "2") {
    console.log("\nAvailable states: PENDING, ACCEPTED, DENIED, FINISHED, CANCELED");
    const state = await question("Enter state: ");
    if (state) {
      queryParams += `&state=${state.toUpperCase()}`;
    }
  } else if (filterChoice === "3") {
    const hours = await question("Show orders from last X hours (e.g., 24): ");
    if (hours && !isNaN(hours)) {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      queryParams += `&start_time=${startTime}&end_time=${endTime}`;
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

// Start the POS terminal
console.log("🚀 Starting POS Terminal...\n");
mainMenu();
