import axios from "axios";
import { config } from "../config/api";

const posApi = axios.create({
  baseURL: config.POS_API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * POS系统用户登录
 */
export async function loginPOS(email: string, password: string) {
  try {
    const response = await posApi.post("/staff/login", {
      email,
      password,
    });

    if (response.data.status_code === 200) {
      const token = response.data.token;
      localStorage.setItem("pos_token", token);
      return { success: true, token };
    }

    return {
      success: false,
      error: response.data.message || "Login failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * 获取用户的所有店铺
 */
export async function getUserShops(token: string) {
  try {
    const response = await posApi.post("/shop/list_shop", {
      token,
    });

    if (response.data.status_code === 200) {
      return response.data.shops || [];
    }

    return [];
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return [];
  }
}

/**
 * 获取店铺详细信息
 */
export async function getShopDetail(token: string, shopId: string) {
  try {
    const response = await posApi.post("/shop/get_shop", {
      token,
      shop_id: shopId,
    });

    if (response.data.status_code === 200) {
      return response.data.shop;
    }

    return null;
  } catch (error) {
    console.error("Failed to fetch shop detail:", error);
    return null;
  }
}

/**
 * 获取店铺的所有菜单/产品
 */
export async function getShopProducts(token: string, shopId: string) {
  try {
    const response = await posApi.post("/product/list", {
      token,
      shop_id: shopId,
      page_idx: 1,
      page_size: 500,
    });

    if (response.data.status_code === 200) {
      return response.data.products || [];
    }

    return [];
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

/**
 * 获取菜单分类
 */
export async function getProductCategories(token: string, shopId: string) {
  try {
    const response = await posApi.post("/category/list", {
      token,
      shop_id: shopId,
    });

    if (response.data.status_code === 200) {
      return response.data.categories || [];
    }

    return [];
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}
