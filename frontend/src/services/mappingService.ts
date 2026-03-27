import axios from "axios";
import { config } from "../config/api";

const backendApi = axios.create({
  baseURL: config.BACKEND_API,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface LocalUberItemRow {
  shop_id: string;
  item_name: string;
  item_id: string;
  category: string | null;
  option: string | null;
  price_minor: number;
  status: string;
  synced_at: string;
}

export interface ItemMappingRecord {
  id: number;
  shop_id: string;
  pos_item_id: string;
  pos_item_name: string | null;
  uber_item_id: string;
  uber_item_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OptionMappingRecord {
  id: number;
  shop_id: string;
  pos_option_id: string;
  pos_option_name: string | null;
  uber_option_id: string;
  uber_option_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface OptionItemMappingRecord {
  id: number;
  shop_id: string;
  pos_option_id: string;
  pos_option_item_id: string;
  pos_option_item_name: string | null;
  uber_option_id: string;
  uber_option_item_id: string;
  uber_option_item_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalUberMenuSnapshot {
  menus: any[];
  categories: any[];
  items: any[];
  modifier_groups: any[];
  option_items?: any[];
  pagination?: {
    items: {
      page: number;
      per_page: number;
      total_count: number;
      total_pages: number;
    };
    option_items: {
      page: number;
      per_page: number;
      total_count: number;
      total_pages: number;
    };
  };
}

export async function syncUberMenuSnapshot(shopId: string, storeId: string) {
  const response = await backendApi.post("/mapping/uber-items/sync", {
    shop_id: shopId,
    store_id: storeId,
  });

  return response.data;
}

export async function getLocalUberMenuSnapshot(
  shopId: string,
  itemPage: number = 1,
  optionPage: number = 1,
  itemsPerPage: number = 15,
  optionItemsPerPage: number = 50
): Promise<LocalUberMenuSnapshot> {
  const response = await backendApi.get("/mapping/uber-menu/local", {
    params: {
      shop_id: shopId,
      item_page: itemPage,
      option_page: optionPage,
      items_per_page: itemsPerPage,
      option_items_per_page: optionItemsPerPage,
    },
  });

  return response.data?.data || {
    menus: [],
    categories: [],
    items: [],
    modifier_groups: [],
    option_items: [],
    pagination: {
      items: { page: 1, per_page: itemsPerPage, total_count: 0, total_pages: 1 },
      option_items: { page: 1, per_page: optionItemsPerPage, total_count: 0, total_pages: 1 },
    },
  };
}

export async function getLocalUberItems(shopId: string): Promise<LocalUberItemRow[]> {
  const response = await backendApi.get("/mapping/uber-items", {
    params: { shop_id: shopId },
  });

  return response.data?.data || [];
}

export async function getAllMappings(shopId: string): Promise<{
  items: ItemMappingRecord[];
  options: OptionMappingRecord[];
  option_items: OptionItemMappingRecord[];
}> {
  const response = await backendApi.get("/mapping/all", {
    params: { shop_id: shopId },
  });

  return response.data?.data || {
    items: [],
    options: [],
    option_items: [],
  };
}

export async function saveItemMapping(payload: {
  shop_id: string;
  pos_item_id: string;
  pos_item_name?: string;
  uber_item_id: string;
  uber_item_name?: string;
}) {
  const response = await backendApi.put("/mapping/item", payload);
  return response.data?.data;
}

export async function saveOptionMapping(payload: {
  shop_id: string;
  pos_option_id: string;
  pos_option_name?: string;
  uber_option_id: string;
  uber_option_name?: string;
}) {
  const response = await backendApi.put("/mapping/option", payload);
  return response.data?.data;
}

export async function saveOptionItemMapping(payload: {
  shop_id: string;
  pos_option_id: string;
  pos_option_item_id: string;
  pos_option_item_name?: string;
  uber_option_id: string;
  uber_option_item_id: string;
  uber_option_item_name?: string;
}) {
  const response = await backendApi.put("/mapping/option-item", payload);
  return response.data?.data;
}
