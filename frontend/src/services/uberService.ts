import { config, UBER_SCOPES } from "../config/api";
import axios from "axios";

const backendApi = axios.create({
  baseURL: config.BACKEND_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Type definitions for API responses
interface OAuthCallbackResponse {
  success: boolean;
  message: string;
  stores?: Array<{ id: string; name: string }>;
}

interface DisconnectResponse {
  success: boolean;
  message: string;
}

interface StatusResponse {
  connected: boolean;
  uber_store_id?: string;
  uber_store_name?: string;
  connected_at?: string;
}

interface SyncMenuResponse {
  success: boolean;
  synced_count: number;
  errors: string[];
  message: string;
}

interface WebhookVerifyResponse {
  verified: boolean;
  webhook_url: string;
  status: string;
}

interface SyncHistoryResponse {
  history: unknown[];
}

/**
 * 生成Uber OAuth授权URL
 */
export function generateUberAuthUrl(shopId: string): string {
  const params = new URLSearchParams({
    client_id: config.UBER_CLIENT_ID,
    response_type: "code",
    scope: UBER_SCOPES.join(" "),
    redirect_uri: config.UBER_REDIRECT_URI,
    state: shopId, // 用shopId作为state参数
  });

  return `${config.UBER_OAUTH_URL}?${params.toString()}`;
}

/**
 * 处理Uber OAuth回调，交换code换取token
 */
export async function handleUberOAuthCallback(
  code: string,
  shopId: string,
  posToken: string
) {
  try {
    const response = await backendApi.post<OAuthCallbackResponse>("/uber/oauth/callback", {
      code,
      shop_id: shopId,
      pos_token: posToken,
    });

    if (response.data.success) {
      return {
        success: true,
        stores: response.data.stores || [],
        message: "Uber account connected successfully",
      };
    }

    return {
      success: false,
      error: response.data.message || "OAuth callback failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * 断开Uber连接
 */
export async function disconnectUberAccount(shopId: string, posToken: string) {
  try {
    const response = await backendApi.post<DisconnectResponse>("/uber/disconnect", {
      shop_id: shopId,
      pos_token: posToken,
    });

    return response.data.success === true;
  } catch (error) {
    console.error("Failed to disconnect Uber account:", error);
    return false;
  }
}

/**
 * 获取店铺的Uber连接状态
 */
export async function getUberConnectionStatus(
  shopId: string,
  posToken: string
) {
  try {
    const response = await backendApi.post<StatusResponse>("/uber/status", {
      shop_id: shopId,
      pos_token: posToken,
    });

    return {
      connected: response.data.connected === true,
      store_id: response.data.uber_store_id,
      store_name: response.data.uber_store_name,
      connected_at: response.data.connected_at,
    };
  } catch (error) {
    return { connected: false };
  }
}

/**
 * 同步POS菜单到Uber
 */
export async function syncMenuToUber(
  shopId: string,
  posToken: string,
  products: Array<{
    product_id: string;
    product_name: string;
    unit_price: number;
    description?: string;
    category_name?: string;
  }>
) {
  try {
    const response = await backendApi.post<SyncMenuResponse>("/uber/sync-menu", {
      shop_id: shopId,
      pos_token: posToken,
      products,
    });

    return {
      success: response.data.success === true,
      synced_count: response.data.synced_count || 0,
      errors: response.data.errors || [],
      message: response.data.message,
    };
  } catch (error) {
    return {
      success: false,
      synced_count: 0,
      errors: [error instanceof Error ? error.message : "Network error"],
    };
  }
}

/**
 * 验证Webhook配置
 */
export async function verifyWebhookConfig(
  shopId: string,
  posToken: string
) {
  try {
    const response = await backendApi.post<WebhookVerifyResponse>("/uber/webhook/verify", {
      shop_id: shopId,
      pos_token: posToken,
    });

    return {
      verified: response.data.verified === true,
      webhook_url: response.data.webhook_url,
      status: response.data.status,
    };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

interface BindUberStoreResponse {
  success: boolean;
  binding?: unknown;
  message: string;
}

interface UnbindUberStoreResponse {
  success: boolean;
  message: string;
}

/**
 * Bind a Uber store to a POS shop
 */
export async function bindUberStore(
  shopId: string,
  uberStoreId: string,
  uberStoreName: string,
  posToken: string,
  posShopName: string
) {
  try {
    const response = await backendApi.post<BindUberStoreResponse>("/uber/bind", {
      shop_id: shopId,
      pos_token: posToken,
      uber_store_id: uberStoreId,
      uber_store_name: uberStoreName,
      pos_shop_name: posShopName,
    });

    if (response.data.success) {
      return {
        success: true,
        binding: response.data.binding,
        message: "Store bound successfully",
      };
    }

    throw new Error(response.data.message || "Binding failed");
  } catch (error) {
    throw error instanceof Error ? error : new Error("Network error");
  }
}

/**
 * Unbind a Uber store from a POS shop
 */
export async function unbindUberStore(
  shopId: string,
  posToken: string
) {
  try {
    const response = await backendApi.post<UnbindUberStoreResponse>("/uber/unbind", {
      shop_id: shopId,
      pos_token: posToken,
    });

    if (response.data.success) {
      return {
        success: true,
        message: "Store unbound successfully",
      };
    }

    throw new Error(response.data.message || "Unbinding failed");
  } catch (error) {
    throw error instanceof Error ? error : new Error("Network error");
  }
}

/**
 * 获取Uber菜单同步历史
 */
export async function getSyncHistory(shopId: string, posToken: string) {
  try {
    const response = await backendApi.post<SyncHistoryResponse>("/uber/sync-history", {
      shop_id: shopId,
      pos_token: posToken,
    });

    return response.data.history || [];
  } catch (error) {
    console.error("Failed to fetch sync history:", error);
    return [];
  }
}

/**
 * 更新店铺信息（联系方式、位置、取餐说明）
 */
export async function updateStoreInfo(
  storeId: string,
  updateData: {
    contact?: { email?: string; name?: string; phone_number?: string };
    location?: {
      latitude?: number;
      longitude?: number;
      street_address_line_one?: string;
      street_address_line_two?: string;
      city?: string;
      country?: string;
      postal_code?: string | number;
    };
    pickup_instructions?: string;
  }
) {
  try {
    const response = await axios.post(`${config.BACKEND_API}/store/${storeId}/info`, updateData);
    return { success: true, message: "Store info updated successfully", data: response.data };
  } catch (error: any) {
    throw error instanceof Error ? error : new Error("Failed to update store info");
  }
}

/**
 * 更新店铺状态（ONLINE/OFFLINE）
 */
export async function updateStoreStatus(
  storeId: string,
  status: "ONLINE" | "OFFLINE",
  reason?: string,
  is_offline_until?: string
) {
  try {
    const payload: any = { status };
    if (reason) payload.reason = reason;
    if (is_offline_until) payload.is_offline_until = is_offline_until;

    const response = await axios.post(`${config.BACKEND_API}/store/${storeId}/status`, payload);
    return { success: true, message: "Store status updated successfully", data: response.data };
  } catch (error: any) {
    throw error instanceof Error ? error : new Error("Failed to update store status");
  }
}

/**
 * 更新店铺准备时间
 */
export async function updateStorePrepTime(storeId: string, defaultPrepTimeMinutes: number) {
  try {
    const response = await axios.post(`${config.BACKEND_API}/store/${storeId}/prep-time`, {
      default_prep_time: defaultPrepTimeMinutes,
    });
    return { success: true, message: "Prep time updated successfully", data: response.data };
  } catch (error: any) {
    throw error instanceof Error ? error : new Error("Failed to update prep time");
  }
}

/**
 * 更新店铺配送配置
 */
export async function updateFulfillmentConfig(
  storeId: string,
  customMinEtdMinutes?: number
) {
  try {
    const payload: any = {};
    if (customMinEtdMinutes !== undefined) {
      payload.custom_min_etd_minutes = customMinEtdMinutes;
    }

    const response = await axios.post(
      `${config.BACKEND_API}/store/${storeId}/fulfillment-config`,
      payload
    );
    return { success: true, message: "Fulfillment config updated successfully", data: response.data };
  } catch (error: any) {
    throw error instanceof Error ? error : new Error("Failed to update fulfillment config");
  }
}
