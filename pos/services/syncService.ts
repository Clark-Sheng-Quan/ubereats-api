import { getToken } from "../utils/auth";
import { BASE_API } from "../config/api";

/**
 * 获取店铺的菜单/产品列表
 */
export async function getShopProducts(shopId: string) {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/product/list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        shop_id: shopId,
        page_idx: 1,
        page_size: 100,
      }),
    });

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error("Failed to fetch products:", error);
    throw error;
  }
}

/**
 * 获取店铺的库存信息
 */
export async function getShopInventory(shopId: string) {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/warehouse/stock_list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        shop_id: shopId,
      }),
    });

    const data = await response.json();
    return data.stock || [];
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    throw error;
  }
}

/**
 * 更新库存
 */
export async function updateInventory(
  shopId: string,
  productId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/pos/update_stock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        shop_id: shopId,
        product_id: productId,
        quantity,
      }),
    });

    const data = await response.json();
    if (data.status_code === 200) {
      return { success: true };
    } else {
      return { success: false, error: data.message };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 同步Uber菜单到POS系统
 */
export async function syncUberMenuToPOS(
  shopId: string,
  uberMenu: Array<{
    product_id: string;
    product_name: string;
    price: number;
    description?: string;
  }>
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  for (const item of uberMenu) {
    try {
      const token = await getToken();
      const response = await fetch(`${BASE_API}/product/add_product`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          shop_id: shopId,
          product_name: item.product_name,
          product_code: item.product_id, // Uber product ID
          unit_price: item.price,
          description: item.description || "",
          source: "ubereats",
        }),
      });

      const data = await response.json();
      if (data.status_code !== 200) {
        errors.push(`Failed to sync ${item.product_name}: ${data.message}`);
      }
    } catch (error) {
      errors.push(
        `Failed to sync ${item.product_name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 检查库存是否充足（用于接受订单前验证）
 */
export async function checkInventoryAvailability(
  shopId: string,
  items: Array<{ product_id: string; quantity: number }>
): Promise<{
  available: boolean;
  insufficientItems?: Array<{ product_id: string; required: number; available: number }>;
}> {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/warehouse/stock_list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        shop_id: shopId,
      }),
    });

    const data = await response.json();
    const stock = data.stock || [];

    const insufficientItems = [];

    for (const item of items) {
      const stockInfo = stock.find(
        (s: any) => s.product_id === item.product_id
      );
      const availableQty = stockInfo?.quantity || 0;

      if (availableQty < item.quantity) {
        insufficientItems.push({
          product_id: item.product_id,
          required: item.quantity,
          available: availableQty,
        });
      }
    }

    return {
      available: insufficientItems.length === 0,
      insufficientItems:
        insufficientItems.length > 0 ? insufficientItems : undefined,
    };
  } catch (error) {
    console.error("Failed to check inventory:", error);
    return { available: false };
  }
}

/**
 * 批量更新多个产品的库存
 */
export async function updateBatchInventory(
  shopId: string,
  items: Array<{ product_id: string; quantity: number }>
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    try {
      const result = await updateInventory(
        shopId,
        item.product_id,
        item.quantity
      );
      if (!result.success) {
        errors.push(`Failed to update ${item.product_id}: ${result.error}`);
      }
    } catch (error) {
      errors.push(
        `Failed to update ${item.product_id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * 获取配置的配送方式和取餐时间选项
 */
export async function getDeliveryOptions(shopId: string) {
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_API}/shop/get_shop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        shop_id: shopId,
      }),
    });

    const data = await response.json();
    const shop = data.shop || {};

    return {
      pickup_available: shop.allow_pick_up !== false,
      dine_in_available: shop.allow_dine_in !== false,
      delivery_available: shop.allow_delivery !== false,
      opening_hours: shop.opening_hours || {},
      preparation_time: shop.preparation_time || 20, // 默认20分钟
    };
  } catch (error) {
    console.error("Failed to get delivery options:", error);
    return {
      pickup_available: true,
      dine_in_available: true,
      delivery_available: false,
      preparation_time: 20,
    };
  }
}
