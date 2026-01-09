import { getToken } from "../utils/auth";
import { BASE_API } from "../config/api";

export interface UberOrder {
  order_id: string;
  order_num: string;
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
  };
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    special_instructions?: string;
  }>;
  total_amount: number;
  pick_method: "dine_in" | "pick_up";
  pick_time: string;
  status: string;
  created_at: string;
}

/**
 * 获取所有Uber订单
 */
export async function getUberOrders(shopId: string): Promise<UberOrder[]> {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/search/order_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        query: {
          key: "shop_id",
          value: shopId,
        },
        detail: true,
        page_size: 50,
        page_idx: 1,
      }),
    });

    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error("Failed to fetch Uber orders:", error);
    throw error;
  }
}

/**
 * 获取单个订单详情
 */
export async function getOrderDetails(orderId: string): Promise<UberOrder> {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/search/order_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        order_id: orderId,
      }),
    });

    const data = await response.json();
    return data.statuses[0] || null;
  } catch (error) {
    console.error("Failed to fetch order details:", error);
    throw error;
  }
}

/**
 * 接受Uber订单 - 创建POS订单
 */
export async function acceptUberOrder(
  shopId: string,
  order: UberOrder,
  staffId: string
): Promise<{ success: boolean; order_id?: string; error?: string }> {
  try {
    const token = await getToken();

    // 转换Uber订单格式到POS订单格式
    const posOrder = {
      shop_id: shopId,
      staff_id: staffId,
      pick_method: order.pick_method,
      pick_time: order.pick_time,
      product_ids: order.items.map((item) => item.product_id),
      product_qtys: order.items.map((item) => item.quantity),
      requirements: order.items
        .filter((item) => item.special_instructions)
        .map((item) => `${item.product_name}: ${item.special_instructions}`)
        .join("\n"),
      source: "ubereats",
      user_id: `uber_${order.customer.first_name}`,
    };

    const response = await fetch(`${BASE_API}/pos/add_order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        ...posOrder,
      }),
    });

    const data = await response.json();
    if (data.status_code === 200) {
      return { success: true, order_id: data.order_id };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    console.error("Failed to accept order:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 拒绝Uber订单
 */
export async function rejectUberOrder(
  orderId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 这里调用Uber API拒绝订单
    // 需要与Uber服务集成
    console.log(`Order ${orderId} rejected: ${reason}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 更新订单状态
 */
export async function updateOrderStatus(
  orderId: string,
  status: "preparing" | "ready" | "completed" | "cancelled"
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken();

    // 映射状态
    const statusMap = {
      preparing: "preparing",
      ready: "ready_for_pickup",
      completed: "completed",
      cancelled: "cancelled",
    };

    const response = await fetch(`${BASE_API}/search/order_status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        order_id: orderId,
        status: statusMap[status],
      }),
    });

    const data = await response.json();
    return { success: data.status_code === 200 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
