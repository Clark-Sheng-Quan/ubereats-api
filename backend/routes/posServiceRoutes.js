/**
 * POS Service Routes - Handle all POS API operations
 * Provides abstraction layer between frontend and actual POS API
 */
import express from "express";
import axios from "axios";

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

router.post("/shops", async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        status_code: 401,
        success: false,
        message: 'Token is required in Authorization header'
      });
    }

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
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        status_code: 401,
        success: false,
        message: 'Token is required in Authorization header'
      });
    }

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
 * GET /api/service/pos/products
 * Get all products for a shop/business
 * Query: { business_id, page_size, page_idx }
 * Authorization: Bearer {token} OR body.token
 */
router.get('/products', async (req, res) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
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

    // POS max_page is a 0-based max page index.
    // Normalize to page count for frontend usage.
    const rawMaxPage = Number(response.data?.max_page);
    const maxPage = Number.isFinite(rawMaxPage) ? rawMaxPage + 1 : 0;

    res.json({
      status_code: 200,
      success: true,
      data: {
        products: products,
        max_page: maxPage,
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
 * GET /api/service/pos/options - Get product options from POS system (with pagination)
 * Query params: business_id, page_size (default: 50), page_idx (default: 0)
 * Token from Authorization header
 */
router.get('/options', async (req, res) => {
  try {
    const { business_id, page_size = '50', page_idx = '0' } = req.query;
    const pageSize = parseInt(page_size);
    const pageIdx = parseInt(page_idx);
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

    if (!token) {
      return res.status(401).json({
        status_code: 401,
        success: false,
        message: 'Token is required in Authorization header'
      });
    }

    if (!business_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Business ID is required'
      });
    }

    console.log('[PosService] Fetching options - business:', business_id, 'page_idx:', pageIdx, 'page_size:', pageSize);

    const client = axios.create({
      baseURL: POS_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Call /search/option_search to get all options
    const response = await client.post('/search/option_search', {
      query: {
        business_id: business_id
      },
      detail: true
    });

    // Extract and format option data - preserve option item price fields (price_adjust)
    const allOptions = (response.data?.option || []).map(option => ({
      _id: option._id,
      name: option.name,
      option_items: (option.option_items || []).map(item => ({
        _id: item._id,
        name: item.name,
        price_adjust: item.price_adjust,
        price: item.price
      }))
    }));

    // Apply pagination on the formatted data
    const startIdx = pageIdx * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedOptions = allOptions.slice(startIdx, endIdx);
    const maxPage = Math.ceil(allOptions.length / pageSize) || 1;

    res.json({
      status_code: 200,
      success: true,
      data: {
        options: paginatedOptions,
        max_page: maxPage,
        page_idx: pageIdx,
        page_size: pageSize,
        total: allOptions.length
      }
    });
  } catch (error) {
    console.error('[PosService] Fetch options error:', error.message);

    res.status(error.response?.status || 500).json({
      status_code: error.response?.status || 500,
      success: false,
      message: error.response?.data?.message || 'Failed to fetch options',
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
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
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
