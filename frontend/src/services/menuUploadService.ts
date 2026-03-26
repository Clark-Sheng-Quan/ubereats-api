import { getPosProducts, getPosProductsCount, getPosOptions, getPosOptionsCount } from "./posService";
import { getStoreMenu, uploadMenu } from "./uberService";

export type UploadMode = "replace" | "merge";

interface Vend88Product {
  _id: string;
  name: string;
  price: number;
  description?: string;
  calorie?: number;
  sku?: string;
  category?: string | string[];
  image_url?: string;
  active?: boolean;
  options?: Array<{ _id?: string; id?: string; name?: string }>;
}

interface Vend88Option {
  _id: string;
  name: string;
  option_items?: Array<{ _id: string; name: string; price_adjust?: number; price?: number }>;
}

interface UberMenuConfig {
  menus?: any[];
  categories?: any[];
  items?: any[];
  modifier_groups?: any[];
  menu_type?: string;
}

interface UploadMenuParams {
  storeId: string;
  businessId: string;
  posToken: string;
  mode: UploadMode;
}

interface UploadMenuResult {
  mode: UploadMode;
  productCount: number;
  optionGroupCount: number;
  optionItemCount: number;
}

const UBER_MAX_PRICE_CENTS = 50000;

function toMinorUnitInt(rawPrice: unknown): number {
  const value = Number(rawPrice);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  // Vend88 prices are in major currency units (e.g. 6639 => 6639.00).
  // Uber requires minor units (cents), so always multiply by 100.
  const normalized = Math.round(value * 100);

  if (normalized > UBER_MAX_PRICE_CENTS) {
    return UBER_MAX_PRICE_CENTS;
  }
  return normalized;
}

async function fetchAllVend88Products(token: string, businessId: string): Promise<Vend88Product[]> {
  const pageSize = 100;
  const expectedTotal = await getPosProductsCount(token, businessId);
  const allProducts: Vend88Product[] = [];
  const seenIds = new Set<string>();

  for (let pageIdx = 0; pageIdx < 1000; pageIdx++) {
    const page = await getPosProducts(token, businessId, pageSize, pageIdx);
    const pageItems = page.products || [];

    if (pageItems.length === 0) {
      break;
    }

    let newItemsInThisPage = 0;
    pageItems.forEach((item) => {
      if (!item?._id || seenIds.has(item._id)) {
        return;
      }
      seenIds.add(item._id);
      allProducts.push(item);
      newItemsInThisPage += 1;
    });

    if (newItemsInThisPage === 0) {
      break;
    }

    if (expectedTotal > 0 && allProducts.length >= expectedTotal) {
      break;
    }

    if (pageItems.length < pageSize) {
      break;
    }
  }

  return allProducts;
}

async function fetchAllVend88Options(token: string, businessId: string): Promise<Vend88Option[]> {
  const pageSize = 100;
  const expectedTotal = await getPosOptionsCount(token, businessId);
  const allOptions: Vend88Option[] = [];
  const seenIds = new Set<string>();

  for (let pageIdx = 0; pageIdx < 1000; pageIdx++) {
    const page = await getPosOptions(token, businessId, pageSize, pageIdx);
    const pageItems = page.options || [];

    if (pageItems.length === 0) {
      break;
    }

    let newItemsInThisPage = 0;
    pageItems.forEach((item) => {
      if (!item?._id || seenIds.has(item._id)) {
        return;
      }
      seenIds.add(item._id);
      allOptions.push(item);
      newItemsInThisPage += 1;
    });

    if (newItemsInThisPage === 0) {
      break;
    }

    if (expectedTotal > 0 && allOptions.length >= expectedTotal) {
      break;
    }

    if (pageItems.length < pageSize) {
      break;
    }
  }

  return allOptions;
}

function buildVend88MenuConfig(products: Vend88Product[], options: Vend88Option[]): UberMenuConfig {
  const optionMapById = new Map<string, Vend88Option>();
  const optionMapByName = new Map<string, Vend88Option>();
  options.forEach((opt) => {
    optionMapById.set(opt._id, opt);
    if (opt.name) {
      optionMapByName.set(opt.name.trim().toLowerCase(), opt);
    }
  });

  const optionItems: any[] = [];
  const optionItemsBySourceId = new Map<string, string>();

  options.forEach((opt) => {
    (opt.option_items || []).forEach((item) => {
      const sourceId = item._id;
      if (optionItemsBySourceId.has(sourceId)) {
        return;
      }

      const uberItemId = sourceId;
      optionItemsBySourceId.set(sourceId, uberItemId);

      optionItems.push({
        id: uberItemId,
        external_data: sourceId,
        title: {
          translations: {
            en_us: item.name || "Option Item",
          },
        },
        description: {
          translations: {
            en_us: "",
          },
        },
        price_info: {
          price: toMinorUnitInt(item.price_adjust ?? item.price ?? 0),
          overrides: [],
        },
        suspension_info: {
          suspended: false,
        },
      });
    });
  });

  const modifierGroups = options.map((opt) => ({
    id: opt._id,
    external_data: opt._id,
    title: {
      translations: {
        en_us: opt.name || "Option Group",
      },
    },
    display_type: "expanded",
    modifier_options: (opt.option_items || [])
      .map((item) => {
        const mappedItemId = optionItemsBySourceId.get(item._id);
        if (!mappedItemId) return null;

        return {
          id: mappedItemId,
          type: "ITEM",
        };
      })
      .filter(Boolean),
  }));

  const baseItems = products.map((product) => {
    const linkedGroupIds = Array.from(
      new Set(
        (product.options || [])
          .map((o) => {
            const rawId = o?._id || o?.id;
            const rawName = typeof o?.name === "string" ? o.name.trim().toLowerCase() : "";

            if (rawId && optionMapById.has(rawId)) {
              return rawId;
            }

            if (rawName && optionMapByName.has(rawName)) {
              return optionMapByName.get(rawName)!._id;
            }

            return null;
          })
          .filter((groupId): groupId is string => Boolean(groupId))
      )
    );

    return {
      id: product._id,
      external_data: product.sku || undefined,
      title: {
        translations: {
          en_us: product.name || "Untitled Item",
        },
      },
      description: {
        translations: {
          en_us: product.description || "",
        },
      },
      image_url: product.image_url || undefined,
      price_info: {
        price: toMinorUnitInt(product.price),
        overrides: [],
      },
      nutritional_info:
        typeof product.calorie === "number" && product.calorie > 0
          ? {
              calories: {
                lower_range: Math.round(product.calorie),
                display_type: "single_item",
              },
            }
          : undefined,
      suspension_info: {
        suspended: product.active === false,
      },
      modifier_group_ids: linkedGroupIds.length
        ? {
            ids: linkedGroupIds,
            overrides: [],
          }
        : undefined,
    };
  });

  const allItems = [...baseItems, ...optionItems];

  const categoryToItemIds = new Map<string, string[]>();
  products.forEach((product) => {
    const rawCategories = Array.isArray(product.category)
      ? product.category
      : product.category
      ? [product.category]
      : [];

    const normalizedCategories = rawCategories
      .map((name) => String(name || "").trim())
      .filter((name) => name.length > 0);

    if (normalizedCategories.length === 0) {
      return;
    }

    normalizedCategories.forEach((categoryName) => {
      const existing = categoryToItemIds.get(categoryName) || [];
      existing.push(product._id);
      categoryToItemIds.set(categoryName, existing);
    });
  });

  const buildCategoryId = () => {
    // Generate random 24-char hex ID like MongoDB ObjectId
    let id = "";
    for (let i = 0; i < 24; i++) {
      id += Math.floor(Math.random() * 16).toString(16);
    }
    return id;
  };

  const generatedCategories = Array.from(categoryToItemIds.entries()).map(([categoryName, itemIds]) => ({
    id: buildCategoryId(),
    title: {
      translations: {
        en_us: categoryName,
      },
    },
    entities: Array.from(new Set(itemIds)).map((id) => ({
      id,
      type: "ITEM",
    })),
  }));

  const menuCategoryIds = generatedCategories.map((category) => category.id);
  const vend88MenuId = "vend88_menu";

  return {
    menus: [
      {
        id: vend88MenuId,
        title: {
          translations: {
            en_us: "Vend88 Menu",
          },
        },
        service_availability: [
          {
            day_of_week: "monday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
          {
            day_of_week: "tuesday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
          {
            day_of_week: "wednesday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
          {
            day_of_week: "thursday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
          {
            day_of_week: "friday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
          {
            day_of_week: "saturday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
          {
            day_of_week: "sunday",
            time_periods: [{ start_time: "00:00", end_time: "23:59" }],
          },
        ],
        category_ids: menuCategoryIds,
      },
    ],
    categories: generatedCategories,
    items: allItems,
    modifier_groups: modifierGroups,
  };
}

function mergeById(current: any[] = [], incoming: any[] = []): any[] {
  const merged = new Map<string, any>();

  current.forEach((entity) => {
    if (entity?.id) {
      merged.set(entity.id, entity);
    }
  });

  incoming.forEach((entity) => {
    if (entity?.id) {
      merged.set(entity.id, entity);
    }
  });

  return Array.from(merged.values());
}

function mergeMenuConfigs(existing: UberMenuConfig, vend88Config: UberMenuConfig): UberMenuConfig {
  const menus = mergeById(existing.menus || [], vend88Config.menus || []);
  const categories = mergeById(existing.categories || [], vend88Config.categories || []);
  const items = mergeById(existing.items || [], vend88Config.items || []);
  const modifierGroups = mergeById(existing.modifier_groups || [], vend88Config.modifier_groups || []);

  return {
    menus,
    categories,
    items,
    modifier_groups: modifierGroups,
  };
}

export async function uploadVend88MenuToUber(params: UploadMenuParams): Promise<UploadMenuResult> {
  const { storeId, businessId, posToken, mode } = params;

  const [allProducts, allOptions] = await Promise.all([
    fetchAllVend88Products(posToken, businessId),
    fetchAllVend88Options(posToken, businessId),
  ]);

  const vend88Config = buildVend88MenuConfig(allProducts, allOptions);

  let menuToUpload: UberMenuConfig;
  if (mode === "replace") {
    menuToUpload = vend88Config;
  } else {
    const existing = (await getStoreMenu(storeId)) as UberMenuConfig;
    menuToUpload = mergeMenuConfigs(existing || {}, vend88Config);
  }

  await uploadMenu(storeId, menuToUpload);

  const optionItemCount = allOptions.reduce((sum, opt) => sum + (opt.option_items?.length || 0), 0);

  return {
    mode,
    productCount: allProducts.length,
    optionGroupCount: allOptions.length,
    optionItemCount,
  };
}
