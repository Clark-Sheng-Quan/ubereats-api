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
  id: string;
  name: string;
  description?: string;
  price: number; // in cents
  sku?: string;
  category_id?: string;
  image_url?: string;
  status?: string;
}

interface ProductsResponse {
  status_code: number;
  success: boolean;
  data: {
    products: Vend88Item[];
    total?: number;
    page_idx: number;
    page_size: number;
  };
}

/**
 * Fetch Vend88 products from POS system
 * @param token - POS API token (will be sent in Authorization header)
 * @param businessId - Business/Shop ID
 * @param pageSize - Items per page (default: 50)
 * @param pageIdx - Page index (default: 0)
 */
export async function getPosProducts(
  token: string,
  businessId: string,
  pageSize: number = 50,
  pageIdx: number = 0
): Promise<Vend88Item[]> {
  try {
    if (!token) {
      throw new Error("Token is required");
    }

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    console.log("[PosService] Fetching products for business:", businessId);

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

    console.log("[PosService] Products fetched successfully:", response.data.data.products.length);

    return response.data.data.products;
  } catch (error: any) {
    console.error("[PosService] Get products error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
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

export default {
  getPosProducts,
};
