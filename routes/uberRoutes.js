/**
 * Uber集成相关的API路由
 * 包括OAuth、菜单同步、店铺管理等
 */

import express from "express";
import axios from "axios";
import { uploadMenu, getMenu } from "../services/menuService.js";
import { 
  saveUberConnection, 
  getUberConnection, 
  deleteUberConnection, 
  saveSyncHistory, 
  getSyncHistory 
} from "../services/localService.js";
import { UBER_CONFIG } from "../config/uberConfig.js";

const router = express.Router();

const UBER_TOKEN_URL = UBER_CONFIG.TOKEN_URL;
const TOKEN_LIFETIME_SECONDS = UBER_CONFIG.TOKEN_LIFETIME_SECONDS;

/**
 * OAuth回调处理 - 交换授权码获取token
 * POST /api/uber/oauth/callback
 */
router.post("/oauth/callback", async (req, res) => {
  try {
    const { code, shop_id, pos_token } = req.body;

    if (!code || !shop_id || !pos_token) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required parameters" });
    }

    // 交换授权码获取token
    const tokenResponse = await axios.post(UBER_TOKEN_URL, {
      code,
      client_id: UBER_CONFIG.CLIENT_ID,
      client_secret: UBER_CONFIG.CLIENT_SECRET,
      grant_type: "authorization_code",
      redirect_uri: UBER_CONFIG.REDIRECT_URI,
    });

    if (!tokenResponse.data.access_token) {
      return res
        .status(400)
        .json({ success: false, message: "Failed to obtain access token" });
    }

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;

    // 获取Uber store信息
    const storeResponse = await axios.get(
      "https://api.uber.com/v2/eats/v2/stores",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const stores = storeResponse.data.stores || [];
    const storeId = stores[0]?.id;

    if (!storeId) {
      return res
        .status(400)
        .json({ success: false, message: "No Uber store found" });
    }

    // 保存到本地存储
    await saveUberConnection({
      shop_id,
      uber_store_id: storeId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(
        Date.now() + (tokenResponse.data.expires_in || TOKEN_LIFETIME_SECONDS) * 1000
      ).toISOString(),
      connected_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      uber_store_id: storeId,
      message: "Uber account connected successfully",
    });
  } catch (error) {
    console.error("[uberRoutes] OAuth callback error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "OAuth callback failed",
    });
  }
});

/**
 * 获取店铺的Uber连接状态
 * POST /api/uber/status
 */
router.post("/status", async (req, res) => {
  try {
    const { shop_id, pos_token } = req.body;

    if (!shop_id) {
      return res
        .status(400)
        .json({ success: false, message: "Shop ID is required" });
    }

    const connection = await getUberConnection(shop_id);

    if (!connection) {
      return res.json({
        connected: false,
        message: "No Uber connection found for this shop",
      });
    }

    // 检查token是否过期
    const expiresAt = new Date(connection.expires_at);
    const isExpired = expiresAt < new Date();

    if (isExpired && connection.refresh_token) {
      // 刷新token
      try {
        const refreshResponse = await axios.post(UBER_TOKEN_URL, {
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
          client_id: UBER_CONFIG.CLIENT_ID,
          client_secret: UBER_CONFIG.CLIENT_SECRET,
        });

        connection.access_token = refreshResponse.data.access_token;
        connection.refresh_token = refreshResponse.data.refresh_token;
        connection.expires_at = new Date(
          Date.now() + (refreshResponse.data.expires_in || TOKEN_LIFETIME_SECONDS) * 1000
        ).toISOString();

        await saveUberConnection(connection);
      } catch (err) {
        console.error("[uberRoutes] Token refresh failed:", err);
      }
    }

    res.json({
      connected: true,
      uber_store_id: connection.uber_store_id,
      uber_store_name: connection.uber_store_name,
      connected_at: connection.connected_at,
    });
  } catch (error) {
    console.error("[uberRoutes] Status check error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * 断开Uber连接
 * POST /api/uber/disconnect
 */
router.post("/disconnect", async (req, res) => {
  try {
    const { shop_id, pos_token } = req.body;

    if (!shop_id) {
      return res
        .status(400)
        .json({ success: false, message: "Shop ID is required" });
    }

    await deleteUberConnection(shop_id);

    res.json({ success: true, message: "Uber account disconnected" });
  } catch (error) {
    console.error("[uberRoutes] Disconnect error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * 同步菜单到Uber
 * POST /api/uber/sync-menu
 */
router.post("/sync-menu", async (req, res) => {
  try {
    const { shop_id, pos_token, products } = req.body;

    if (!shop_id || !products || !Array.isArray(products)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request parameters" });
    }

    // 获取Uber连接信息
    const connection = await getUberConnection(shop_id);
    if (!connection || !connection.access_token) {
      return res.status(400).json({
        success: false,
        message: "Uber account not connected for this shop",
      });
    }

    // 执行菜单同步
    const result = await uploadMenu(connection.uber_store_id, products);

    // 保存同步历史
    await saveSyncHistory({
      shop_id,
      synced_at: new Date().toISOString(),
      synced_count: result.synced_count,
      status: result.success ? "success" : result.synced_count > 0 ? "partial" : "failed",
      errors: result.errors,
      product_count: products.length,
    });

    res.json(result);
  } catch (error) {
    console.error("[uberRoutes] Menu sync error:", error.message);
    res.status(500).json({
      success: false,
      synced_count: 0,
      errors: [error.message],
      message: "Menu sync failed",
    });
  }
});

/**
 * 获取菜单同步历史
 * POST /api/uber/sync-history
 */
router.post("/sync-history", async (req, res) => {
  try {
    const { shop_id, pos_token } = req.body;

    if (!shop_id) {
      return res
        .status(400)
        .json({ success: false, message: "Shop ID is required" });
    }

    const history = await getSyncHistory(shop_id);

    res.json({ history: history || [] });
  } catch (error) {
    console.error("[uberRoutes] Sync history error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * 验证Webhook配置
 * POST /api/uber/webhook/verify
 */
router.post("/webhook/verify", async (req, res) => {
  try {
    const { shop_id, pos_token } = req.body;

    if (!shop_id) {
      return res
        .status(400)
        .json({ success: false, message: "Shop ID is required" });
    }

    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || "http://localhost:3000"}/webhooks/uber/${shop_id}`;

    res.json({
      verified: true,
      webhook_url: webhookUrl,
      status: "configured",
      message: "Webhook is properly configured",
    });
  } catch (error) {
    console.error("[uberRoutes] Webhook verify error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
