import { getPosProducts, getPosOptions } from "./posService";
import { getStoreMenu, uploadMenu } from "./uberService";

export type UploadMode = "replace" | "merge" | "test";

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
const TEST_SUFFIX = "-uber";
const TEST_PRICE_MULTIPLIER = 1.2;

function toMinorUnitInt(rawPrice: unknown, multiplier: number = 1): number {
  const value = Number(rawPrice);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  // Vend88 prices are in major currency units (e.g. 6639 => 6639.00).
  // Uber requires minor units (cents), so always multiply by 100.
  const normalized = Math.round(value * 100 * Math.max(0, multiplier));

  if (normalized > UBER_MAX_PRICE_CENTS) {
    return UBER_MAX_PRICE_CENTS;
  }
  return normalized;
}

async function fetchAllVend88Products(token: string, businessId: string): Promise<Vend88Product[]> {
  const allProducts = await getPosProducts(token, businessId);
  return allProducts.products || [];
}

async function fetchAllVend88Options(token: string, businessId: string): Promise<Vend88Option[]> {
  // Backend now returns all options in a single response (no pagination)
  const response = await getPosOptions(token, businessId, 10000, 0);
  return response.options || [];
}

function buildVend88MenuConfig(
  products: Vend88Product[],
  options: Vend88Option[],
  mode: UploadMode
): UberMenuConfig {
  const isTestMode = mode === "test";
  const priceMultiplier = isTestMode ? TEST_PRICE_MULTIPLIER : 1;

  // Deduplicate options by _id to ensure stable transformations
  const uniqueOptionsMap = new Map<string, Vend88Option>();
  options.forEach((opt) => {
    if (opt._id && !uniqueOptionsMap.has(opt._id)) {
      uniqueOptionsMap.set(opt._id, opt);
    }
  });
  const uniqueOptions = Array.from(uniqueOptionsMap.values());

  const optionTransformedIdBySourceId = new Map<string, string>();
  const optionTransformedNameBySourceId = new Map<string, string>();
  uniqueOptions.forEach((option, index) => {
    const sourceId = option._id;
    const sourceName = option.name || "Option Group";

    // Test rule for option groups:
    // even index: name + -uber (ID unchanged)
    // odd index: ID + -uber (name unchanged)
    const transformedId = isTestMode && index % 2 === 1 ? `${sourceId}${TEST_SUFFIX}` : sourceId;
    const transformedName = isTestMode && index % 2 === 0 ? `${sourceName}${TEST_SUFFIX}` : sourceName;

    optionTransformedIdBySourceId.set(sourceId, transformedId);
    optionTransformedNameBySourceId.set(sourceId, transformedName);
  });

  const resolveOptionId = (option: Vend88Option) =>
    optionTransformedIdBySourceId.get(option._id) || option._id;
  const resolveOptionName = (option: Vend88Option) =>
    optionTransformedNameBySourceId.get(option._id) || option.name || "Option Group";
  const resolveOptionItemId = (item: { _id: string }) =>
    isTestMode ? `${item._id}${TEST_SUFFIX}` : item._id;
  const resolveOptionItemName = (item: { name?: string }) =>
    item.name || "Option Item";

  const optionIdBySourceId = new Map<string, string>();
  const optionIdBySourceName = new Map<string, string>();
  uniqueOptions.forEach((opt) => {
    const transformedId = resolveOptionId(opt);
    optionIdBySourceId.set(opt._id, transformedId);
    if (opt.name) {
      optionIdBySourceName.set(opt.name.trim().toLowerCase(), transformedId);
    }
  });

  const optionItems: any[] = [];
  const optionItemsBySourceId = new Map<string, string>();

  uniqueOptions.forEach((opt) => {
    (opt.option_items || []).forEach((item) => {
      const sourceId = item._id;
      if (optionItemsBySourceId.has(sourceId)) {
        return;
      }

      const uberItemId = resolveOptionItemId(item);
      optionItemsBySourceId.set(sourceId, uberItemId);

      optionItems.push({
        id: uberItemId,
        title: {
          translations: {
            en_us: resolveOptionItemName(item),
          },
        },
        description: {
          translations: {
            en_us: "",
          },
        },
        price_info: {
          price: toMinorUnitInt(item.price_adjust ?? item.price ?? 0, priceMultiplier),
          overrides: [],
        },
        suspension_info: {
          suspended: false,
        },
      });
    });
  });

  const modifierGroups = uniqueOptions.map((opt) => ({
    id: resolveOptionId(opt),
    title: {
      translations: {
        en_us: resolveOptionName(opt),
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
          title: {
            translations: {
              en_us: resolveOptionItemName(item),
            },
          },
          price_info: {
            price: toMinorUnitInt(item.price_adjust ?? item.price ?? 0, priceMultiplier),
            overrides: [],
          },
        };
      })
      .filter(Boolean),
  }));

  // Deduplicate products by _id to ensure stable transformations
  const uniqueProductsMap = new Map<string, Vend88Product>();
  products.forEach((p) => {
    if (p._id && !uniqueProductsMap.has(p._id)) {
      uniqueProductsMap.set(p._id, p);
    }
  });
  const uniqueProducts = Array.from(uniqueProductsMap.values());

  const baseItems = uniqueProducts.map((product, index) => {
    const transformedProductId =
      isTestMode && index % 2 === 1 ? `${product._id}${TEST_SUFFIX}` : product._id;
    const transformedProductName =
      isTestMode && index % 2 === 0 ? `${product.name || "Untitled Item"}${TEST_SUFFIX}` : product.name || "Untitled Item";

    const linkedGroupIds = Array.from(
      new Set(
        (product.options || [])
          .map((o) => {
            const rawId = o?._id || o?.id;
            const rawName = typeof o?.name === "string" ? o.name.trim().toLowerCase() : "";

            if (rawId && optionIdBySourceId.has(rawId)) {
              return optionIdBySourceId.get(rawId) || null;
            }

            if (rawName && optionIdBySourceName.has(rawName)) {
              return optionIdBySourceName.get(rawName) || null;
            }

            return null;
          })
          .filter((groupId): groupId is string => Boolean(groupId))
      )
    );

    return {
      id: transformedProductId,
      title: {
        translations: {
          en_us: transformedProductName,
        },
      },
      description: {
        translations: {
          en_us: product.description || "",
        },
      },
      image_url: product.image_url || undefined,
      price_info: {
        price: toMinorUnitInt(product.price, priceMultiplier),
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
      const index = products.findIndex((p) => p._id === product._id);
      const transformedProductId =
        isTestMode && index % 2 === 1 ? `${product._id}${TEST_SUFFIX}` : product._id;
      existing.push(transformedProductId);
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
            en_us: isTestMode ? "Vend88 Menu Test" : "Vend88 Menu",
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

function getCategoryName(category: any): string {
  const translatedName = category?.title?.translations?.en_us;
  const rawName = typeof translatedName === "string" ? translatedName : category?.title;
  return String(rawName || "").trim().toLowerCase();
}

function remapCategoryIds(categoryIds: any, idRemap: Map<string, string>): any {
  if (!Array.isArray(categoryIds)) {
    return categoryIds;
  }

  return Array.from(
    new Set(
      categoryIds
        .map((id) => {
          const key = String(id || "");
          return idRemap.get(key) || key;
        })
        .filter((id) => id.length > 0)
    )
  );
}

function mergeMenuConfigs(existing: UberMenuConfig, vend88Config: UberMenuConfig): UberMenuConfig {
  const existingCategories = existing.categories || [];
  const incomingCategories = vend88Config.categories || [];

  const existingCategoryIdByName = new Map<string, string>();
  existingCategories.forEach((category) => {
    const categoryId = category?.id;
    const name = getCategoryName(category);
    if (categoryId && name) {
      existingCategoryIdByName.set(name, categoryId);
    }
  });

  const categoryIdRemap = new Map<string, string>();
  const normalizedIncomingCategories = incomingCategories.map((category) => {
    const incomingId = category?.id;
    const name = getCategoryName(category);
    const matchedExistingId = name ? existingCategoryIdByName.get(name) : undefined;
    const resolvedId = matchedExistingId || incomingId;

    if (incomingId && resolvedId) {
      categoryIdRemap.set(incomingId, resolvedId);
    }

    return {
      ...category,
      id: resolvedId,
    };
  });

  const mergedCategoriesById = new Map<string, any>();
  [...existingCategories, ...normalizedIncomingCategories].forEach((category) => {
    const categoryId = category?.id;
    if (!categoryId) {
      return;
    }

    const existingCategory = mergedCategoriesById.get(categoryId);
    const entities = Array.isArray(category?.entities) ? category.entities : [];

    if (!existingCategory) {
      mergedCategoriesById.set(categoryId, {
        ...category,
        entities,
      });
      return;
    }

    const existingEntities = Array.isArray(existingCategory.entities) ? existingCategory.entities : [];
    const mergedEntitiesById = new Map<string, any>();
    [...existingEntities, ...entities].forEach((entity) => {
      const entityId = entity?.id;
      if (entityId) {
        mergedEntitiesById.set(entityId, entity);
      }
    });

    mergedCategoriesById.set(categoryId, {
      ...existingCategory,
      ...category,
      entities: Array.from(mergedEntitiesById.values()),
    });
  });

  const categories = Array.from(mergedCategoriesById.values());

  const existingMenus = existing.menus || [];
  const incomingMenus = vend88Config.menus || [];
  const primaryExistingMenuId = existingMenus[0]?.id;
  const normalizedIncomingMenus = incomingMenus.map((menu, index) => {
    const shouldReuseExistingMenuId = Boolean(primaryExistingMenuId) && index === 0;
    return {
      ...menu,
      id: shouldReuseExistingMenuId ? primaryExistingMenuId : menu?.id,
      category_ids: remapCategoryIds(menu?.category_ids, categoryIdRemap),
    };
  });

  const menus = mergeById(existingMenus, normalizedIncomingMenus);
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

  const vend88Config = buildVend88MenuConfig(allProducts, allOptions, mode);

  let menuToUpload: UberMenuConfig;
  if (mode === "replace" || mode === "test") {
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
