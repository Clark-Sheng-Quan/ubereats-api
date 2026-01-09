/**
 * Uber菜单同步服务 - 与POS系统菜单映射
 */

import axios from "axios";

const UBER_API_BASE = "https://api.uber.com/v2";

export interface UberProduct {
  external_data: {
    external_product_id: string;
  };
  title: string;
  description?: string;
  price_info: {
    price: number;
  };
  category_uuid?: string;
}

/**
 * 将POS菜单同步到Uber
 */
export async function syncMenuToUber(
  uberToken: string,
  storeId: string,
  products: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    description?: string;
  }>
) {
  try {
    const uberProducts: UberProduct[] = products.map((p) => ({
      external_data: {
        external_product_id: p.product_id,
      },
      title: p.product_name,
      description: p.description || "",
      price_info: {
        price: Math.round(p.unit_price * 100), // 转换为分
      },
    }));

    // 分批上传产品（Uber API可能有数量限制）
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < uberProducts.length; i += batchSize) {
      batches.push(uberProducts.slice(i, i + batchSize));
    }

    let syncedCount = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      try {
        const response = await axios.post(
          `${UBER_API_BASE}/eats/v2/catalogs/stores/${storeId}/items`,
          {
            items: batch,
          },
          {
            headers: {
              Authorization: `Bearer ${uberToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        syncedCount += batch.length;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || err.message;
        errors.push(`Batch sync failed: ${errorMsg}`);
      }
    }

    return {
      success: errors.length === 0 || syncedCount > 0,
      synced_count: syncedCount,
      errors,
      message:
        errors.length === 0
          ? `Successfully synced ${syncedCount} products to Uber`
          : `Synced ${syncedCount} products with ${errors.length} errors`,
    };
  } catch (error: any) {
    return {
      success: false,
      synced_count: 0,
      errors: [error.message || "Unknown error occurred"],
      message: "Menu sync failed",
    };
  }
}

/**
 * 从Uber获取菜单（查询已同步的产品）
 */
export async function getUberMenu(
  uberToken: string,
  storeId: string
) {
  try {
    const response = await axios.get(
      `${UBER_API_BASE}/eats/v2/catalogs/stores/${storeId}/items`,
      {
        headers: {
          Authorization: `Bearer ${uberToken}`,
        },
      }
    );

    return response.data.items || [];
  } catch (error: any) {
    console.error("Failed to fetch Uber menu:", error.message);
    return [];
  }
}

/**
 * 删除Uber上的某个产品
 */
export async function deleteUberProduct(
  uberToken: string,
  storeId: string,
  itemId: string
) {
  try {
    await axios.delete(
      `${UBER_API_BASE}/eats/v2/catalogs/stores/${storeId}/items/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${uberToken}`,
        },
      }
    );

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * 更新Uber菜单项
 */
export async function updateUberProduct(
  uberToken: string,
  storeId: string,
  itemId: string,
  updates: Partial<UberProduct>
) {
  try {
    await axios.patch(
      `${UBER_API_BASE}/eats/v2/catalogs/stores/${storeId}/items/${itemId}`,
      updates,
      {
        headers: {
          Authorization: `Bearer ${uberToken}`,
        },
      }
    );

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}
