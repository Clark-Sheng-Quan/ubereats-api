#!/usr/bin/env node

import fetch from "node-fetch";

// 基本认证令牌 (username:password base64编码)
const AUTH_TOKEN = Buffer.from("uber:UE_TEST_KEY_9f3aA72kL1").toString("base64");

// 本地webhook服务器URL
const WEBHOOK_URL = "http://localhost:3000/ubereats/webhook";

// 模拟订单创建webhook
async function sendOrderNotificationWebhook() {
  console.log("\n📨 发送订单创建webhook...");

  const payload = {
    event_id: "evt_" + Date.now(),
    event_type: "orders.notification",
    event_time: new Date().toISOString(),
    resource_href: "https://api.uber.com/v1/delivery/order/order-" + Date.now(),
    meta: {
      user_id: "user-123",
      resource_id: "order-" + Date.now(),
      status: "pending",
    },
    webhook_meta: {
      webhook_config_id: "eats-restaurant-order-experience.order-webhooks",
      webhook_msg_timestamp: Date.now(),
      webhook_msg_uuid: "uuid-" + Date.now(),
    },
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Webhook sent successfully");
      console.log(`   Status: ${response.status}`);
    } else {
      console.error(`❌ Webhook failed: ${response.status}`);
      const text = await response.text();
      console.error("   Response:", text);
    }
  } catch (error) {
    console.error("❌ Error sending webhook:", error.message);
  }
}

// 模拟订单取消webhook
async function sendOrderCancelWebhook() {
  console.log("\n📨 发送订单取消webhook...");

  const payload = {
    event_id: "evt_" + Date.now(),
    event_type: "orders.cancel",
    event_time: new Date().toISOString(),
    resource_href: "https://api.uber.com/v1/delivery/order/order-test-123",
    meta: {
      user_id: "user-123",
      resource_id: "order-test-123",
      status: "cancelled",
    },
    webhook_meta: {
      webhook_config_id: "eats-restaurant-order-experience.order-webhooks",
      webhook_msg_timestamp: Date.now(),
      webhook_msg_uuid: "uuid-" + Date.now(),
    },
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Webhook sent successfully");
    } else {
      console.error(`❌ Webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Error sending webhook:", error.message);
  }
}

// 模拟订单发布webhook (快递员到达地理围栏)
async function sendOrderReleaseWebhook() {
  console.log("\n📨 发送订单发布webhook (快递员已到达)...");

  const payload = {
    event_id: "evt_" + Date.now(),
    event_type: "orders.release",
    event_time: new Date().toISOString(),
    resource_href: "https://api.uber.com/v1/delivery/order/order-test-456",
    meta: {
      user_id: "user-123",
      resource_id: "order-test-456",
    },
    webhook_meta: {
      webhook_config_id: "eats-restaurant-order-experience.order-webhooks",
      webhook_msg_timestamp: Date.now(),
      webhook_msg_uuid: "uuid-" + Date.now(),
    },
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${AUTH_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Webhook sent successfully");
    } else {
      console.error(`❌ Webhook failed: ${response.status}`);
    }
  } catch (error) {
    console.error("❌ Error sending webhook:", error.message);
  }
}

// 获取订单列表
async function getOrders() {
  console.log("\n📊 获取订单列表...");

  try {
    const response = await fetch("http://localhost:3000/api/orders");
    const data = await response.json();

    console.log(`✅ 总订单数: ${data.total}`);
    console.log(`   返回数量: ${data.returned}`);

    if (data.orders && data.orders.length > 0) {
      console.log("\n最近订单:");
      data.orders.slice(0, 3).forEach((order) => {
        console.log(`   - ${order.order_id}: ${order.status}`);
      });
    }
  } catch (error) {
    console.error("❌ Error getting orders:", error.message);
  }
}

// 获取统计信息
async function getStats() {
  console.log("\n📈 获取统计信息...");

  try {
    const response = await fetch("http://localhost:3000/api/stats");
    const stats = await response.json();

    console.log(`✅ 总订单数: ${stats.total_orders}`);
    console.log("\n按状态统计:");
    Object.entries(stats.by_status).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    console.log("\n按事件类型统计:");
    Object.entries(stats.by_event_type).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  } catch (error) {
    console.error("❌ Error getting stats:", error.message);
  }
}

// 主函数
async function main() {
  console.log("🚀 Uber Eats Webhook Test Client");
  console.log("================================\n");

  // 检查server是否在运行
  try {
    const healthResponse = await fetch("http://localhost:3000/health");
    if (!healthResponse.ok) {
      console.error("❌ Server is not running on port 3000");
      console.error("   Please start the server first: node webhook.js");
      process.exit(1);
    }
    console.log("✅ Server is running\n");
  } catch (error) {
    console.error("❌ Cannot connect to server on port 3000");
    console.error("   Please start the server first: node webhook.js");
    process.exit(1);
  }

  // 发送测试webhooks
  await sendOrderNotificationWebhook();
  await new Promise((r) => setTimeout(r, 1000)); // 延迟1秒

  await sendOrderReleaseWebhook();
  await new Promise((r) => setTimeout(r, 1000)); // 延迟1秒

  await sendOrderCancelWebhook();
  await new Promise((r) => setTimeout(r, 1000)); // 延迟1秒

  // 获取数据
  await getOrders();
  await getStats();

  console.log("\n✅ Test completed!");
}

main().catch(console.error);
