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
  uber_store_id?: string;
  message: string;
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
        store_id: response.data.uber_store_id,
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
