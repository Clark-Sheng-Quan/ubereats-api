/**
 * POS Service Routes - Handle all POS API operations
 * Provides abstraction layer between frontend and actual POS API
 */

import express, { Router } from "express";
import type { Request, Response } from "express";
import axios from "axios";

const router: Router = express.Router();

const POS_API_BASE = "https://dev.vend88.com/api";

/**
 * POST /api/service/pos/login - User login
 * Body: { email, password }
 * From: apiDoc/apispec_1.json - /auth/login
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status_code: 400,
        message: "Email and password are required",
      });
    }

    const response = await axios.post(`${POS_API_BASE}/auth/login`, {
      email,
      password,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Login error:", error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      message: error.response?.data?.message || "Login failed",
    });
  }
});

/**
 * POST /api/service/pos/shops - Get user's shops
 * Body: { token }
 */
router.post("/shops", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        status_code: 400,
        message: "Token is required",
      });
    }

    const response = await axios.post(`${POS_API_BASE}/shop/list_shop`, {
      token,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Get shops error:", error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      message: error.response?.data?.message || "Failed to fetch shops",
    });
  }
});

/**
 * POST /api/service/pos/shop/:shopId - Get shop details
 * Body: { token }
 */
router.post("/shop/:shopId", async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    const { token } = req.body;

    if (!token || !shopId) {
      return res.status(400).json({
        status_code: 400,
        message: "Token and shop ID are required",
      });
    }

    const response = await axios.post(`${POS_API_BASE}/shop/get_shop`, {
      token,
      shop_id: shopId,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Get shop detail error:", error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      message: error.response?.data?.message || "Failed to fetch shop details",
    });
  }
});

/**
 * POST /api/service/pos/products - Get shop products
 * Body: { token, shop_id, page_idx, page_size }
 */
router.post("/products", async (req: Request, res: Response) => {
  try {
    const { token, shop_id, page_idx = 1, page_size = 500 } = req.body;

    if (!token || !shop_id) {
      return res.status(400).json({
        status_code: 400,
        message: "Token and shop ID are required",
      });
    }

    const response = await axios.post(`${POS_API_BASE}/product/list`, {
      token,
      shop_id,
      page_idx,
      page_size,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Get products error:", error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      message: error.response?.data?.message || "Failed to fetch products",
    });
  }
});

/**
 * POST /api/service/pos/categories - Get product categories
 * Body: { token, shop_id }
 */
router.post("/categories", async (req: Request, res: Response) => {
  try {
    const { token, shop_id } = req.body;

    if (!token || !shop_id) {
      return res.status(400).json({
        status_code: 400,
        message: "Token and shop ID are required",
      });
    }

    const response = await axios.post(`${POS_API_BASE}/category/list`, {
      token,
      shop_id,
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Get categories error:", error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      message:
        error.response?.data?.message || "Failed to fetch categories",
    });
  }
});

export default router;
