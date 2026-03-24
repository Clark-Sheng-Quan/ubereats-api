import { config } from "../config/api";
import axios from "axios";

const backendApi = axios.create({
  baseURL: config.BACKEND_API,
  headers: {
    "Content-Type": "application/json",
  },
});

// Type definitions for Vend88 products
interface Vend88Item {
  _id: string;
  name: string;
  price: number; // in cents
  description?: string;
  calorie?: number;
  sku?: string;
  category?: string;
  active?: boolean;
  image_url?: string;
  options?: any[];
}

interface ProductsResponse {
  status_code: number;
  success: boolean;
  data: {
    message: string;
    products: Vend88Item[];
    max_page?: number;
    page_idx: number;
    page_size: number;
  };
}

interface PosProductsResponse {
  products: Vend88Item[];
  max_page: number;
}

// Type definitions for Vend88 options
interface OptionItem {
  _id: string;
  name: string;
}

interface Option {
  _id: string;
  name: string;
  option_items: OptionItem[];
}

interface OptionsResponse {
  status_code: number;
  success: boolean;
  data: {
    message: string;
    options: Option[];
    max_page?: number;
    page_idx: number;
    page_size: number;
    total?: number;
  };
}

interface PosOptionsResponse {
  options: Option[];
  max_page: number;
}

/**
 * Fetch Vend88 products from POS system for a specific page
 * @param token - POS API token (will be sent in Authorization header)
 * @param businessId - Business/Shop ID
 * @param pageSize - Items per page (default: 15)
 * @param pageIdx - Page index (default: 0)
 */
export async function getPosProducts(
  token: string,
  businessId: string,
  pageSize: number = 15,
  pageIdx: number = 0
): Promise<PosProductsResponse> {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    console.log(`[PosService] Fetching products for business ${businessId}, page ${pageIdx}, size ${pageSize}`);

    const response = await backendApi.get<ProductsResponse>(
      "/service/pos/products",
      {
        params: {
          business_id: businessId,
          page_size: pageSize,
          page_idx: pageIdx,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.data?.message || "Failed to fetch products");
    }

    const products = response.data.data.products || [];
    const maxPage = response.data.data?.max_page || 1;
    console.log(`[PosService] Fetched page ${pageIdx}: ${products.length} products, max_page: ${maxPage}`);

    return { products, max_page: maxPage };
  } catch (error: any) {
    console.error("[PosService] Get products error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      fullError: error.response?.data,
    });

    // Handle specific error types
    if (error.response?.status === 401) {
      throw new Error("Token expired or invalid. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || "Invalid parameters");
    } else {
      throw new Error(error.response?.data?.message || error.message || "Failed to fetch products");
    }
  }
}

/**
 * Get total count of products using pagesize=1 to quickly retrieve max_page
 * @param token - POS API token
 * @param businessId - Business/Shop ID
 */
export async function getPosProductsCount(
  token: string,
  businessId: string
): Promise<number> {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    console.log(`[PosService] Fetching product count for business ${businessId}`);

    const response = await backendApi.get<ProductsResponse>(
      "/service/pos/products",
      {
        params: {
          business_id: businessId,
          page_size: 1,
          page_idx: 0,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.data?.message || "Failed to fetch product count");
    }

    const totalCount = response.data.data?.max_page || 0;
    console.log(`[PosService] Total product count: ${totalCount}`);

    return totalCount;
  } catch (error: any) {
    console.error("[PosService] Get product count error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    return 0;
  }
}

/**
 * Fetch options from POS system for a specific page
 * @param token - POS API token (will be sent in Authorization header)
 * @param businessId - Business/Shop ID
 * @param pageSize - Items per page (default: 15)
 * @param pageIdx - Page index (default: 0)
 */
export async function getPosOptions(
  token: string,
  businessId: string,
  pageSize: number = 15,
  pageIdx: number = 0
): Promise<PosOptionsResponse> {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    console.log(`[PosService] Fetching options for business ${businessId}, page ${pageIdx}, size ${pageSize}`);

    const response = await backendApi.get<OptionsResponse>(
      "/service/pos/options",
      {
        params: {
          business_id: businessId,
          page_size: pageSize,
          page_idx: pageIdx,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.data?.message || "Failed to fetch options");
    }

    const options = response.data.data.options || [];
    const maxPage = response.data.data?.max_page || 1;
    console.log(`[PosService] Fetched page ${pageIdx}: ${options.length} options, max_page: ${maxPage}`);

    return { options, max_page: maxPage };
  } catch (error: any) {
    console.error("[PosService] Get options error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      fullError: error.response?.data,
    });

    // Handle specific error types
    if (error.response?.status === 401) {
      throw new Error("Token expired or invalid. Please login again.");
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || "Invalid parameters");
    } else {
      throw new Error(error.response?.data?.message || error.message || "Failed to fetch options");
    }
  }
}

/**
 * Get total count of options using pagesize=1 to quickly retrieve max_page
 * @param token - POS API token
 * @param businessId - Business/Shop ID
 */
export async function getPosOptionsCount(
  token: string,
  businessId: string
): Promise<number> {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    console.log(`[PosService] Fetching option count for business ${businessId}`);

    const response = await backendApi.get<OptionsResponse>(
      "/service/pos/options",
      {
        params: {
          business_id: businessId,
          page_size: 1,
          page_idx: 0,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.data?.message || "Failed to fetch option count");
    }

    const totalCount = response.data.data?.max_page || 0;
    console.log(`[PosService] Total option count: ${totalCount}`);

    return totalCount;
  } catch (error: any) {
    console.error("[PosService] Get option count error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
    });

    return 0;
  }
}

export default {
  getPosProducts,
  getPosProductsCount,
  getPosOptions,
  getPosOptionsCount,
};
