/**
 * POS Service Routes - Handle all POS API operations
 * Provides abstraction layer between frontend and actual POS API
 */
import express from "express";
import axios from "axios";
import { verifyTokenMiddleware } from "../services/tokenService.js";

const router = express.Router();
const POS_API_BASE = "https://dev.vend88.com";

/**
 * POST /api/service/pos/login - User login
 * Body: { email, password }
 * From: apiDoc/apispec_1.json - /auth/login
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                status_code: 400,
                message: "Email and password are required",
            });
        }
        const response = await axios.post(`${POS_API_BASE}/admin/terminal_login`, {
            email,
            password,
        });
        res.json(response.data);
    }
    catch (error) {
        console.error("Login error:", error.message);
        res.status(error.response?.status || 500).json({
            status_code: error.response?.status || 500,
            message: error.response?.data?.message || "Login failed",
        });
    }
});

// Apply token verification middleware to all routes EXCEPT login
router.use(verifyTokenMiddleware());
router.post("/shops", async (req, res) => {
  try {
    const token = req.token;
    console.log('[PosService] Fetching shops for user');

    const response = await axios.post(`${POS_API_BASE}/shop/list_shop`, {
      token,
    });

    res.json({
      status_code: 200,
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('[PosService] Get shops error:', error.message);
    console.error('[PosService] POS API error response:', error.response?.data);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      success: false,
      message: error.response?.data?.message || "Failed to fetch shops",
    });
  }
});

/**
 * POST /api/service/pos/shop/:shopId - Get shop details from shops list
 * Params: { shopId }
 * Body: {} + Token from Authorization header or body.token
 * Note: POS API doesn't have a dedicated get_shop endpoint,
 * so we fetch the full shops list and filter by ID
 */
router.post("/shop/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const token = req.token;

    if (!shopId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: "Shop ID is required",
      });
    }

    console.log('[PosService] Getting shop details for:', shopId);

    // Call list_shop to get all shops and filter for the requested one
    const response = await axios.post(`${POS_API_BASE}/shop/list_shop`, {
      token,
    });

    console.log('[PosService] Got shops list, filtering for ID:', shopId);

    const allShops = response.data?.shops || [];
    const shop = allShops.find((s) => s._id === shopId);

    if (!shop) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: `Shop with ID ${shopId} not found`,
      });
    }

    // Return just the shop object with success indicator
    res.json({
      status_code: 200,
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('[PosService] Get shop detail error:', error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      success: false,
      message: error.response?.data?.message || "Failed to fetch shop details",
    });
  }
});
/**
 * GET /api/service/pos/search-products
 * Search products from POS system
 * Authorization: Bearer {token} OR Query: { business_id, page_size, page_idx }
 */
router.get('/search-products', async (req, res) => {
  try {
    const token = req.token;
    const { business_id, page_size = '20', page_idx = '0' } = req.query;
    const pageSize = parseInt(page_size);
    const pageIdx = parseInt(page_idx);

    if (!business_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Business ID is required'
      });
    }

    console.log('[PosService] Searching products - business:', business_id, 'page_idx:', pageIdx, 'page_size:', pageSize);

    const client = axios.create({
      baseURL: POS_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Call /search/product_search with business_id and pagination
    const response = await client.post('/search/product_search', {
      query: {
        business_id: business_id
      },
      page_size: pageSize,
      page_idx: pageIdx,
      detail: true
    });

    console.log('[PosService] Products searched successfully');

    res.json({
      status_code: 200,
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('[PosService] Search products error:', error.message);

    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      success: false,
      message: error.response?.data?.message || 'Failed to search products',
      error: error.message
    });
  }
});

/**
 * GET /api/service/pos/products
 * Get all products for a shop/business
 * Query: { business_id, page_size, page_idx }
 * Authorization: Bearer {token} OR body.token
 */
router.get('/products', async (req, res) => {
  try {
    const token = req.token;
    const { business_id, page_size = '50', page_idx = '0' } = req.query;
    const pageSize = parseInt(page_size);
    const pageIdx = parseInt(page_idx);

    if (!business_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Business ID is required'
      });
    }

    console.log('[PosService] Fetching products - business:', business_id, 'page_idx:', pageIdx, 'page_size:', pageSize);

    const client = axios.create({
      baseURL: POS_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Call /search/product_search to get full product list
    const response = await client.post('/search/product_search', {
      query: {
        business_id: business_id
      },
      page_size: pageSize,
      page_idx: pageIdx,
      detail: true
    });

    // Extract products from response - they are at top level of response.data
    const rawProducts = response.data?.products || [];

    // Extract and format product data - map POS fields to our schema
    const products = rawProducts.map(product => ({
      _id: product._id || product.product_id,
      name: product.name,
      price: product.price,
      sku: product.sku,
      category: Array.isArray(product.category) ? product.category[0] : product.category,
      active: product.active || true,
      image_url: Array.isArray(product.image_urls) ? product.image_urls[0] : product.image_urls,
      options: product.options || []
    }));

    res.json({
      status_code: 200,
      success: true,
      data: {
        products: products,
        max_page: response.data?.max_page,
        page_idx: pageIdx,
        page_size: pageSize
      }
    });
  } catch (error) {
    console.error('[PosService] Fetch products error:', error.message);

    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      success: false,
      message: error.response?.data?.message || 'Failed to fetch products',
      error: error.message
    });
  }
});

/**
 * POST /api/service/pos/categories - Get product categories
 * Body: { shop_id } + Token from Authorization header or body.token
 */
router.post("/categories", async (req, res) => {
  try {
    const token = req.token;
    const { shop_id } = req.body;

    if (!shop_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: "Shop ID is required",
      });
    }

    console.log('[PosService] Fetching categories for shop:', shop_id);

    const client = axios.create({
      baseURL: POS_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const response = await client.post(`/category/list`, {
      token,
      shop_id,
    });

    res.json({
      status_code: 200,
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error("[PosService] Get categories error:", error.message);
    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      success: false,
      message: error.response?.data?.message || "Failed to fetch categories",
    });
  }
});
export default router;
