import { dbQuery, withDbTransaction } from "../db/client.js";

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function extractUberText(node) {
  if (typeof node === "string") {
    return node;
  }

  const translated = node?.translations?.en_us;
  if (typeof translated === "string") {
    return translated;
  }

  return "";
}

function resolveStatus(item) {
  return item?.suspension_info?.suspended ? "SUSPENDED" : "ACTIVE";
}

function resolvePriceMinor(item) {
  const raw = Number(item?.price_info?.price ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

function mergeDefinedFields(base = {}, extra = {}) {
  const merged = { ...(base || {}) };
  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      merged[key] = value;
    }
  });
  return merged;
}

function buildCategoryByItemId(menuConfig = {}) {
  const map = new Map();
  const categories = Array.isArray(menuConfig.categories) ? menuConfig.categories : [];

  categories.forEach((category) => {
    const categoryName = extractUberText(category?.title);
    const entities = Array.isArray(category?.entities) ? category.entities : [];

    entities.forEach((entity) => {
      if (!entity?.id) {
        return;
      }

      const type = String(entity?.type || "ITEM").toUpperCase();
      if (type !== "ITEM") {
        return;
      }

      const existing = map.get(entity.id) || [];
      if (categoryName && !existing.includes(categoryName)) {
        existing.push(categoryName);
      }
      map.set(entity.id, existing);
    });
  });

  return map;
}

function buildModifierGroupNameById(menuConfig = {}) {
  const map = new Map();
  const groups = Array.isArray(menuConfig.modifier_groups) ? menuConfig.modifier_groups : [];

  groups.forEach((group) => {
    if (!group?.id) {
      return;
    }

    map.set(group.id, extractUberText(group?.title));
  });

  return map;
}

export async function upsertUberItemsFromMenu(shopId, menuConfig = {}) {
  const normalizedShopId = normalizeText(shopId);
  if (!normalizedShopId) {
    throw new Error("shop_id is required");
  }

  const menus = Array.isArray(menuConfig.menus) ? menuConfig.menus : [];
  const categories = Array.isArray(menuConfig.categories) ? menuConfig.categories : [];
  const modifierGroups = Array.isArray(menuConfig.modifier_groups) ? menuConfig.modifier_groups : [];
  const optionItemIds = new Set(
    modifierGroups
      .flatMap((group) => (Array.isArray(group?.modifier_options) ? group.modifier_options : []))
      .filter((option) => {
        if (!option?.id) {
          return false;
        }
        const type = String(option?.type || "ITEM").toUpperCase();
        return type === "ITEM";
      })
      .map((option) => option.id)
  );
  const itemToCategories = buildCategoryByItemId(menuConfig);
  const modifierGroupNames = buildModifierGroupNameById(menuConfig);
  const items = Array.isArray(menuConfig.items) ? menuConfig.items : [];
  const optionItemsById = new Map();

  // Source A: modifier_groups[].modifier_options[] (often contains canonical option-item payload)
  modifierGroups.forEach((group) => {
    const options = Array.isArray(group?.modifier_options) ? group.modifier_options : [];
    options.forEach((option) => {
      const optionId = normalizeText(option?.id);
      const type = String(option?.type || "ITEM").toUpperCase();
      if (!optionId || type !== "ITEM") {
        return;
      }

      const existing = optionItemsById.get(optionId) || {};
      optionItemsById.set(optionId, mergeDefinedFields(existing, { ...option, id: optionId }));
    });
  });

  // Source B: items[] entries that are referenced by modifier options
  items.forEach((item) => {
    const uberItemId = normalizeText(item?.id);
    if (!uberItemId || !optionItemIds.has(uberItemId)) {
      return;
    }

    const existing = optionItemsById.get(uberItemId) || {};
    optionItemsById.set(uberItemId, mergeDefinedFields(existing, { ...item, id: uberItemId }));
  });

  let baseItemCount = 0;
  let optionItemCount = 0;

  await withDbTransaction(async (client) => {
    await client.query("DELETE FROM uber_menus_local WHERE shop_id = $1", [normalizedShopId]);
    await client.query("DELETE FROM uber_categories_local WHERE shop_id = $1", [normalizedShopId]);
    await client.query("DELETE FROM uber_items_local WHERE shop_id = $1", [normalizedShopId]);
    await client.query("DELETE FROM uber_option_items_local WHERE shop_id = $1", [normalizedShopId]);
    await client.query("DELETE FROM uber_modifier_groups_local WHERE shop_id = $1", [normalizedShopId]);

    const insertMenuQuery = `
      INSERT INTO uber_menus_local (
        shop_id,
        uber_menu_id,
        menu_title,
        category_ids,
        service_availability,
        raw_menu,
        synced_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, NOW(), NOW())
    `;

    for (const menu of menus) {
      const menuId = normalizeText(menu?.id);
      if (!menuId) {
        continue;
      }

      await client.query(insertMenuQuery, [
        normalizedShopId,
        menuId,
        extractUberText(menu?.title) || null,
        JSON.stringify(Array.isArray(menu?.category_ids) ? menu.category_ids : []),
        JSON.stringify(Array.isArray(menu?.service_availability) ? menu.service_availability : []),
        JSON.stringify(menu || {}),
      ]);
    }

    const insertCategoryQuery = `
      INSERT INTO uber_categories_local (
        shop_id,
        uber_category_id,
        category_name,
        raw_category,
        synced_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
    `;

    for (const category of categories) {
      const categoryId = normalizeText(category?.id);
      if (!categoryId) {
        continue;
      }

      await client.query(insertCategoryQuery, [
        normalizedShopId,
        categoryId,
        extractUberText(category?.title) || null,
        JSON.stringify(category || {}),
      ]);
    }

    const insertModifierGroupQuery = `
      INSERT INTO uber_modifier_groups_local (
        shop_id,
        uber_modifier_group_id,
        modifier_group_name,
        raw_modifier_group,
        synced_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
    `;

    for (const modifierGroup of modifierGroups) {
      const modifierGroupId = normalizeText(modifierGroup?.id);
      if (!modifierGroupId) {
        continue;
      }

      await client.query(insertModifierGroupQuery, [
        normalizedShopId,
        modifierGroupId,
        extractUberText(modifierGroup?.title) || null,
        JSON.stringify(modifierGroup || {}),
      ]);
    }

    const insertItemQuery = `
      INSERT INTO uber_items_local (
        shop_id,
        uber_item_id,
        item_name,
        category,
        option_summary,
        modifier_group_ids,
        price_minor,
        status,
        raw_item,
        synced_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, NOW(), NOW())
    `;

    const insertOptionItemQuery = `
      INSERT INTO uber_option_items_local (
        shop_id,
        uber_item_id,
        item_name,
        price_minor,
        status,
        raw_item,
        synced_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
    `;

    for (const [uberItemId, optionItem] of optionItemsById.entries()) {
      await client.query(insertOptionItemQuery, [
        normalizedShopId,
        uberItemId,
        extractUberText(optionItem?.title) || "Untitled Item",
        resolvePriceMinor(optionItem),
        resolveStatus(optionItem),
        JSON.stringify(optionItem || {}),
      ]);
      optionItemCount += 1;
    }

    for (const item of items) {
      const uberItemId = normalizeText(item?.id);
      if (!uberItemId || optionItemIds.has(uberItemId)) {
        continue;
      }

      const category = (itemToCategories.get(uberItemId) || []).join(", ");
      const optionIds = Array.isArray(item?.modifier_group_ids?.ids)
        ? item.modifier_group_ids.ids
        : [];
      const optionSummary = optionIds
        .map((id) => modifierGroupNames.get(id) || id)
        .filter((value) => typeof value === "string" && value.length > 0)
        .join(", ");

      await client.query(insertItemQuery, [
        normalizedShopId,
        uberItemId,
        extractUberText(item?.title) || "Untitled Item",
        category || null,
        optionSummary || null,
        JSON.stringify(optionIds),
        resolvePriceMinor(item),
        resolveStatus(item),
        JSON.stringify(item || {}),
      ]);
      baseItemCount += 1;
    }
  });

  return {
    menuCount: menus.length,
    categoryCount: categories.length,
    itemCount: baseItemCount,
    optionItemCount,
    totalItemCount: baseItemCount + optionItemCount,
    modifierGroupCount: modifierGroups.length,
  };
}

export async function listUberItems(shopId) {
  const normalizedShopId = normalizeText(shopId);
  const { rows } = await dbQuery(
    `
      SELECT
        shop_id,
        item_name,
        uber_item_id AS item_id,
        category,
        option_summary AS option,
        price_minor,
        status,
        synced_at
      FROM uber_items_local
      WHERE shop_id = $1
      ORDER BY item_name ASC
    `,
    [normalizedShopId]
  );

  return rows;
}

export async function getUberMenuSnapshot(
  shopId,
  itemPage = 1,
  optionPage = 1,
  itemsPerPage = 15,
  optionItemsPerPage = 50,
  itemSearch = ""
) {
  const normalizedShopId = normalizeText(shopId);
  const normalizedItemSearch = normalizeText(itemSearch);
  const itemOffset = Math.max(0, (itemPage - 1) * itemsPerPage);

  const itemsCountPromise = normalizedItemSearch
    ? dbQuery(
        `
      SELECT COUNT(*) as count
      FROM uber_items_local ui
      WHERE ui.shop_id = $1
        AND ui.item_name ILIKE $2
        AND NOT EXISTS (
          SELECT 1
          FROM item_mappings im
          WHERE im.shop_id = ui.shop_id
            AND im.uber_item_id = ui.uber_item_id
        )
      `,
        [normalizedShopId, `%${normalizedItemSearch}%`]
      )
    : dbQuery(
        `
      SELECT COUNT(*) as count
      FROM uber_items_local ui
      WHERE ui.shop_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM item_mappings im
          WHERE im.shop_id = ui.shop_id
            AND im.uber_item_id = ui.uber_item_id
        )
      `,
        [normalizedShopId]
      );

  const itemsResultPromise = normalizedItemSearch
    ? dbQuery(
        `
      SELECT ui.raw_item
      FROM uber_items_local ui
      WHERE ui.shop_id = $1
        AND ui.item_name ILIKE $2
        AND NOT EXISTS (
          SELECT 1
          FROM item_mappings im
          WHERE im.shop_id = ui.shop_id
            AND im.uber_item_id = ui.uber_item_id
        )
      ORDER BY ui.uber_item_id ASC
      LIMIT $3 OFFSET $4
      `,
        [normalizedShopId, `%${normalizedItemSearch}%`, itemsPerPage, itemOffset]
      )
    : dbQuery(
        `
      SELECT ui.raw_item
      FROM uber_items_local ui
      WHERE ui.shop_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM item_mappings im
          WHERE im.shop_id = ui.shop_id
            AND im.uber_item_id = ui.uber_item_id
        )
      ORDER BY ui.uber_item_id ASC
      LIMIT $2 OFFSET $3
      `,
        [normalizedShopId, itemsPerPage, itemOffset]
      );

  const [menusResult, categoriesResult, itemsCountResult, itemsResult, modifierGroupsResult, optionItemsCountResult, optionItemsResult] = await Promise.all([
    dbQuery(
      `SELECT raw_menu FROM uber_menus_local WHERE shop_id = $1 ORDER BY uber_menu_id ASC`,
      [normalizedShopId]
    ),
    dbQuery(
      `SELECT raw_category FROM uber_categories_local WHERE shop_id = $1 ORDER BY uber_category_id ASC`,
      [normalizedShopId]
    ),
    itemsCountPromise,
    itemsResultPromise,
    dbQuery(
      `SELECT raw_modifier_group FROM uber_modifier_groups_local WHERE shop_id = $1 ORDER BY uber_modifier_group_id ASC`,
      [normalizedShopId]
    ),
    dbQuery(
      `SELECT COUNT(*) as count FROM uber_option_items_local WHERE shop_id = $1`,
      [normalizedShopId]
    ),
    dbQuery(
      `SELECT raw_item FROM uber_option_items_local WHERE shop_id = $1 ORDER BY uber_item_id ASC`,
      [normalizedShopId]
    ),
  ]);

  const menus = menusResult.rows.map((row) => row.raw_menu || {});
  const categories = categoriesResult.rows.map((row) => row.raw_category || {});
  const items = itemsResult.rows.map((row) => row.raw_item || {});
  const modifier_groups = modifierGroupsResult.rows.map((row) => row.raw_modifier_group || {});
  const option_items = optionItemsResult.rows.map((row) => row.raw_item || {});

  const itemsTotalCount = parseInt(itemsCountResult.rows[0]?.count || 0, 10);
  const optionItemsTotalCount = parseInt(optionItemsCountResult.rows[0]?.count || 0, 10);
  const itemsTotalPages = Math.ceil(itemsTotalCount / itemsPerPage) || 1;

  return {
    menus,
    categories,
    items,
    modifier_groups,
    option_items,
    pagination: {
      items: {
        page: itemPage,
        per_page: itemsPerPage,
        total_count: itemsTotalCount,
        total_pages: itemsTotalPages,
      },
      option_items: {
        page: 1,
        per_page: optionItemsTotalCount,
        total_count: optionItemsTotalCount,
        total_pages: 1,
      },
    },
  };
}

export async function upsertItemMapping(payload) {
  const query = `
    INSERT INTO item_mappings (
      shop_id,
      pos_item_id,
      pos_item_name,
      pos_item_price,
      pos_item_options,
      uber_item_id,
      uber_item_name,
      uber_item_price,
      uber_item_options,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (shop_id, pos_item_id)
    DO UPDATE SET
      pos_item_name = EXCLUDED.pos_item_name,
      pos_item_price = EXCLUDED.pos_item_price,
      pos_item_options = EXCLUDED.pos_item_options,
      uber_item_id = EXCLUDED.uber_item_id,
      uber_item_name = EXCLUDED.uber_item_name,
      uber_item_price = EXCLUDED.uber_item_price,
      uber_item_options = EXCLUDED.uber_item_options,
      updated_at = NOW()
    RETURNING *
  `;

  const { rows } = await dbQuery(query, [
    normalizeText(payload.shop_id),
    normalizeText(payload.pos_item_id),
    normalizeText(payload.pos_item_name) || null,
    payload.pos_item_price !== undefined ? payload.pos_item_price : null,
    payload.pos_item_options ? JSON.stringify(payload.pos_item_options) : null,
    normalizeText(payload.uber_item_id),
    normalizeText(payload.uber_item_name) || null,
    payload.uber_item_price !== undefined ? payload.uber_item_price : null,
    payload.uber_item_options ? JSON.stringify(payload.uber_item_options) : null,
  ]);

  return rows[0];
}

export async function deleteItemMapping(shopId, mappingId) {
  const normalizedShopId = normalizeText(shopId);
  const normalizedMappingId = Number(mappingId);

  if (!normalizedShopId) {
    throw new Error("shop_id is required");
  }
  if (!Number.isInteger(normalizedMappingId) || normalizedMappingId <= 0) {
    throw new Error("mapping id must be a positive integer");
  }

  const { rows } = await dbQuery(
    `
      DELETE FROM item_mappings
      WHERE shop_id = $1 AND id = $2
      RETURNING *
    `,
    [normalizedShopId, normalizedMappingId]
  );

  return rows[0] || null;
}

export async function deleteOptionMapping(shopId, mappingId) {
  const normalizedShopId = normalizeText(shopId);
  const normalizedMappingId = Number(mappingId);

  if (!normalizedShopId) {
    throw new Error("shop_id is required");
  }
  if (!Number.isInteger(normalizedMappingId) || normalizedMappingId <= 0) {
    throw new Error("mapping id must be a positive integer");
  }

  return withDbTransaction(async (client) => {
    const existingMappingResult = await client.query(
      `
        SELECT *
        FROM option_mappings
        WHERE shop_id = $1 AND id = $2
      `,
      [normalizedShopId, normalizedMappingId]
    );

    const existingMapping = existingMappingResult.rows[0];
    if (!existingMapping) {
      return null;
    }

    await client.query(
      `
        DELETE FROM option_item_mappings
        WHERE shop_id = $1
          AND pos_option_id = $2
          AND uber_option_id = $3
      `,
      [normalizedShopId, existingMapping.pos_option_id, existingMapping.uber_option_id]
    );

    const deletedMappingResult = await client.query(
      `
        DELETE FROM option_mappings
        WHERE shop_id = $1 AND id = $2
        RETURNING *
      `,
      [normalizedShopId, normalizedMappingId]
    );

    return deletedMappingResult.rows[0] || null;
  });
}

export async function upsertOptionMapping(payload) {
  const query = `
    INSERT INTO option_mappings (
      shop_id,
      pos_option_id,
      pos_option_name,
      uber_option_id,
      uber_option_name,
      vend88_item_count,
      uber_item_count,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (shop_id, pos_option_id)
    DO UPDATE SET
      pos_option_name = EXCLUDED.pos_option_name,
      uber_option_id = EXCLUDED.uber_option_id,
      uber_option_name = EXCLUDED.uber_option_name,
      vend88_item_count = EXCLUDED.vend88_item_count,
      uber_item_count = EXCLUDED.uber_item_count,
      updated_at = NOW()
    RETURNING *
  `;

  const vend88ItemCount = Number(payload.vend88_item_count || 0);
  const uberItemCount = Number(payload.uber_item_count || 0);

  const { rows } = await dbQuery(query, [
    normalizeText(payload.shop_id),
    normalizeText(payload.pos_option_id),
    normalizeText(payload.pos_option_name) || null,
    normalizeText(payload.uber_option_id),
    normalizeText(payload.uber_option_name) || null,
    vend88ItemCount,
    uberItemCount,
  ]);

  return rows[0];
}

export async function upsertOptionItemMapping(payload) {
  const query = `
    INSERT INTO option_item_mappings (
      shop_id,
      pos_option_id,
      pos_option_item_id,
      pos_option_item_name,
      uber_option_id,
      uber_option_item_id,
      uber_option_item_name,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (shop_id, pos_option_item_id)
    DO UPDATE SET
      pos_option_id = EXCLUDED.pos_option_id,
      pos_option_item_name = EXCLUDED.pos_option_item_name,
      uber_option_id = EXCLUDED.uber_option_id,
      uber_option_item_id = EXCLUDED.uber_option_item_id,
      uber_option_item_name = EXCLUDED.uber_option_item_name,
      updated_at = NOW()
    RETURNING *
  `;

  const { rows } = await dbQuery(query, [
    normalizeText(payload.shop_id),
    normalizeText(payload.pos_option_id),
    normalizeText(payload.pos_option_item_id),
    normalizeText(payload.pos_option_item_name) || null,
    normalizeText(payload.uber_option_id),
    normalizeText(payload.uber_option_item_id),
    normalizeText(payload.uber_option_item_name) || null,
  ]);

  return rows[0];
}

export async function getMappings(shopId) {
  const normalizedShopId = normalizeText(shopId);

  const [itemMappings, optionMappings, optionItemMappings] = await Promise.all([
    dbQuery("SELECT * FROM item_mappings WHERE shop_id = $1 ORDER BY updated_at DESC", [normalizedShopId]),
    dbQuery("SELECT * FROM option_mappings WHERE shop_id = $1 ORDER BY updated_at DESC", [normalizedShopId]),
    dbQuery("SELECT * FROM option_item_mappings WHERE shop_id = $1 ORDER BY updated_at DESC", [normalizedShopId]),
  ]);

  return {
    items: itemMappings.rows,
    options: optionMappings.rows,
    option_items: optionItemMappings.rows,
  };
}

export async function deleteAllItemMappings(shopId) {
  const normalizedShopId = normalizeText(shopId);

  if (!normalizedShopId) {
    throw new Error("shop_id is required");
  }

  const { rows } = await dbQuery(
    `DELETE FROM item_mappings WHERE shop_id = $1 RETURNING *`,
    [normalizedShopId]
  );

  return rows;
}

export async function deleteAllOptionMappings(shopId) {
  const normalizedShopId = normalizeText(shopId);

  if (!normalizedShopId) {
    throw new Error("shop_id is required");
  }

  return withDbTransaction(async (client) => {
    // Delete all option_item_mappings first
    const optionItemResults = await client.query(
      `DELETE FROM option_item_mappings WHERE shop_id = $1 RETURNING *`,
      [normalizedShopId]
    );

    // Then delete all option_mappings
    const optionResults = await client.query(
      `DELETE FROM option_mappings WHERE shop_id = $1 RETURNING *`,
      [normalizedShopId]
    );

    return {
      option_items: optionItemResults.rows,
      options: optionResults.rows,
    };
  });
}
