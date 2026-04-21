import axios from "axios";
import { dbQuery } from "../../db/client.js";
import { getShopBindingByUberStoreId } from "./bindingService.js";

const POS_API_BASE_URL = "https://dev.vend88.com";

function getOrderNode(orderDetails = {}) {
  if (orderDetails && typeof orderDetails.order === "object") {
    return orderDetails.order;
  }
  return orderDetails || {};
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function extractText(node) {
  if (typeof node === "string") {
    return node;
  }

  if (node && typeof node === "object") {
    if (typeof node.text === "string") {
      return node.text;
    }
    if (node.translations && typeof node.translations.en_us === "string") {
      return node.translations.en_us;
    }
    const firstTranslation = Object.values(node.translations || {}).find(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    if (typeof firstTranslation === "string") {
      return firstTranslation;
    }
  }

  return "";
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatAsVend88DateTime(value) {
  const parsed = value ? new Date(value) : new Date();
  const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = safe.getUTCFullYear();
  const month = String(safe.getUTCMonth() + 1).padStart(2, "0");
  const day = String(safe.getUTCDate()).padStart(2, "0");
  const hour = String(safe.getUTCHours()).padStart(2, "0");
  const minute = String(safe.getUTCMinutes()).padStart(2, "0");
  const second = String(safe.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function resolvePickMethod(orderDetails = {}) {
  const order = getOrderNode(orderDetails);
  const raw = [
    order?.fulfillment_type,
    order?.order_type,
    order?.type,
    order?.delivery?.type,
    orderDetails?.fulfillment_type,
    orderDetails?.order_type,
    orderDetails?.type,
    orderDetails?.delivery?.type,
  ]
    .map((value) => normalizeText(String(value || "")).toLowerCase())
    .find((value) => value.length > 0);

  if (raw?.includes("delivery")) {
    return "Delivery";
  }

  if (raw?.includes("pickup") || raw?.includes("take")) {
    return "Take-Away";
  }

  return "Take-Away";
}

function resolvePickTime(orderDetails = {}) {
  const order = getOrderNode(orderDetails);
  return formatAsVend88DateTime(
    order?.scheduled_pickup_time ||
      order?.scheduled_delivery_time ||
      order?.ready_for_pickup_time ||
      order?.preparation_time?.ready_for_pickup_time ||
      order?.created_time ||
      order?.created_at ||
      orderDetails?.scheduled_pickup_time ||
      orderDetails?.scheduled_delivery_time ||
      orderDetails?.ready_for_pickup_time ||
      orderDetails?.created_at ||
      new Date().toISOString()
  );
}

function resolveRequirements(orderDetails = {}) {
  const order = getOrderNode(orderDetails);
  const candidates = [
    order?.special_instructions,
    order?.cart?.special_instructions,
    order?.order_note,
    order?.customer_note,
    orderDetails?.special_instructions,
    orderDetails?.cart?.special_instructions,
    orderDetails?.order_note,
    orderDetails?.customer_note,
  ];

  const found = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return found ? found.trim() : "";
}

function resolveSurcharge(orderDetails = {}) {
  const order = getOrderNode(orderDetails);
  return toNumber(
    order?.charges?.surcharge?.amount ||
      order?.price_info?.surcharge ||
      order?.surcharge ||
    orderDetails?.charges?.surcharge?.amount ||
      orderDetails?.price_info?.surcharge ||
      orderDetails?.surcharge ||
      0,
    0
  );
}

function resolveStoreId(orderDetails = {}, meta = {}) {
  const order = getOrderNode(orderDetails);
  const candidates = [
    meta?.store_id,
    order?.store_id,
    order?.store?.id,
    order?.location?.store_id,
    orderDetails?.store_id,
    orderDetails?.store?.id,
    orderDetails?.location?.store_id,
  ];

  return candidates.map((value) => normalizeText(String(value || ""))).find((value) => value.length > 0) || "";
}

function resolveOrderItems(orderDetails = {}) {
  const order = getOrderNode(orderDetails);

  if (Array.isArray(order?.cart?.items)) {
    return order.cart.items;
  }

  if (Array.isArray(order?.carts)) {
    return order.carts.flatMap((cart) => (Array.isArray(cart?.items) ? cart.items : []));
  }

  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(orderDetails?.cart?.items)) {
    return orderDetails.cart.items;
  }

  if (Array.isArray(orderDetails?.carts)) {
    return orderDetails.carts.flatMap((cart) => (Array.isArray(cart?.items) ? cart.items : []));
  }

  if (Array.isArray(orderDetails?.items)) {
    return orderDetails.items;
  }

  return [];
}

function resolveUberItemCandidates(orderItem = {}) {
  const candidates = [
    orderItem?.id,
    orderItem?.item_id,
    orderItem?.item?.id,
    orderItem?.external_data,
    orderItem?.item?.external_data,
  ];

  return candidates
    .map((value) => normalizeText(String(value || "")))
    .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);
}

function resolveOrderItemName(orderItem = {}) {
  return (
    extractText(orderItem?.title) ||
    extractText(orderItem?.item?.title) ||
    normalizeText(String(orderItem?.name || "")) ||
    "Unknown item"
  );
}

function resolveOrderItemQty(orderItem = {}) {
  const qty = toNumber(
    orderItem?.quantity?.amount ?? orderItem?.quantity ?? orderItem?.qty ?? 1,
    1
  );
  if (qty <= 0) {
    return 1;
  }
  return Math.floor(qty);
}

function resolveSelectedOptionSelections(orderItem = {}) {
  const selections = [];
  const seen = new Set();

  const pushSelection = (uberOptionId, uberOptionItemId) => {
    const normalizedOptionId = normalizeText(String(uberOptionId || ""));
    const normalizedOptionItemId = normalizeText(String(uberOptionItemId || ""));
    if (!normalizedOptionItemId) {
      return;
    }

    const key = `${normalizedOptionId}::${normalizedOptionItemId}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    selections.push({
      uberOptionId: normalizedOptionId,
      uberOptionItemId: normalizedOptionItemId,
    });
  };

  const resolveOptionItemIdCandidates = (node = {}) => {
    const candidates = [node?.id, node?.item_id, node?.external_data];
    return candidates
      .map((value) => normalizeText(String(value || "")))
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);
  };

  const groups = Array.isArray(orderItem?.selected_modifier_groups)
    ? orderItem.selected_modifier_groups
    : [];

  groups.forEach((group) => {
    const uberOptionId = normalizeText(String(group?.id || group?.modifier_group_id || ""));

    const selectedItems = Array.isArray(group?.selected_items) ? group.selected_items : [];
    selectedItems.forEach((selectedItem) => {
      resolveOptionItemIdCandidates(selectedItem).forEach((optionItemId) => {
        pushSelection(uberOptionId, optionItemId);
      });
    });

    const modifierOptions = Array.isArray(group?.modifier_options) ? group.modifier_options : [];
    modifierOptions.forEach((option) => {
      resolveOptionItemIdCandidates(option).forEach((optionItemId) => {
        pushSelection(uberOptionId, optionItemId);
      });
    });
  });

  const selectedOptions = Array.isArray(orderItem?.selected_modifier_options)
    ? orderItem.selected_modifier_options
    : [];
  selectedOptions.forEach((option) => {
    resolveOptionItemIdCandidates(option).forEach((optionItemId) => {
      pushSelection("", optionItemId);
    });
  });

  const plainOptions = Array.isArray(orderItem?.options) ? orderItem.options : [];
  plainOptions.forEach((option) => {
    resolveOptionItemIdCandidates(option).forEach((optionItemId) => {
      pushSelection("", optionItemId);
    });
  });

  return selections;
}

async function getMappingContext(shopId) {
  const [itemMappingResult, optionMappingResult, optionItemMappingResult] = await Promise.all([
    dbQuery(
      `
        SELECT uber_item_id, pos_item_id
        FROM item_mappings
        WHERE shop_id = $1
      `,
      [shopId]
    ),
    dbQuery(
      `
        SELECT uber_option_id, pos_option_id
        FROM option_mappings
        WHERE shop_id = $1
      `,
      [shopId]
    ),
    dbQuery(
      `
        SELECT uber_option_id, uber_option_item_id, pos_option_id, pos_option_item_id
        FROM option_item_mappings
        WHERE shop_id = $1
      `,
      [shopId]
    ),
  ]);

  const posItemIdByUberItemId = new Map();
  itemMappingResult.rows.forEach((row) => {
    const uberItemId = normalizeText(row.uber_item_id);
    const posItemId = normalizeText(row.pos_item_id);
    if (uberItemId && posItemId) {
      posItemIdByUberItemId.set(uberItemId, posItemId);
    }
  });

  const posOptionIdByUberOptionId = new Map();
  optionMappingResult.rows.forEach((row) => {
    const uberOptionId = normalizeText(row.uber_option_id);
    const posOptionId = normalizeText(row.pos_option_id);
    if (uberOptionId && posOptionId) {
      posOptionIdByUberOptionId.set(uberOptionId, posOptionId);
    }
  });

  const optionItemMappingByOptionAndItem = new Map();
  const optionItemMappingsByUberOptionItemId = new Map();
  optionItemMappingResult.rows.forEach((row) => {
    const uberOptionId = normalizeText(row.uber_option_id);
    const uberOptionItemId = normalizeText(row.uber_option_item_id);
    const posOptionId = normalizeText(row.pos_option_id);
    const posOptionItemId = normalizeText(row.pos_option_item_id);
    if (uberOptionItemId && posOptionItemId) {
      if (uberOptionId) {
        optionItemMappingByOptionAndItem.set(`${uberOptionId}::${uberOptionItemId}`, {
          uberOptionId,
          uberOptionItemId,
          posOptionId,
          posOptionItemId,
        });
      }

      const existing = optionItemMappingsByUberOptionItemId.get(uberOptionItemId) || [];
      existing.push({
        uberOptionId,
        uberOptionItemId,
        posOptionId,
        posOptionItemId,
      });
      optionItemMappingsByUberOptionItemId.set(uberOptionItemId, existing);
    }
  });

  return {
    posItemIdByUberItemId,
    posOptionIdByUberOptionId,
    optionItemMappingByOptionAndItem,
    optionItemMappingsByUberOptionItemId,
  };
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") {
    return "";
  }
  // Remove all non-digit characters, keep only numbers
  const digits = phone.replace(/\D/g, "");
  
  // If starts with 61 (Australia country code), replace with 0
  if (digits.startsWith("61")) {
    return "0" + digits.slice(2);
  }
  
  return digits;
}

function normalizeName(name) {
  if (!name || typeof name !== "string") {
    return "";
  }
  // Keep only letters (a-z, A-Z) and spaces, remove all other characters including dots, dashes, etc.
  return name.replace(/[^a-zA-Z\s]/g, "").trim();
}

function resolveCustomerInfo(orderDetails = {}) {
  const order = getOrderNode(orderDetails);
  const customer = order?.customers?.[0] || {};
  const name = customer?.name || {};
  const contact = customer?.contact || {};
  const phone = contact?.phone || {};

  let firstName = normalizeName(String(name?.first_name || ""));
  let lastName = normalizeName(String(name?.last_name || ""));
  
  // Ensure non-empty names
  if (!firstName) firstName = "Uber";
  if (!lastName) lastName = "Order";

  const resolved = {
    email: normalizeText(String(customer?.email || "")),
    phone: normalizePhone(String(phone?.number || "")),
    first_name: firstName,
    last_name: lastName,
  };


  return resolved;
}

function buildVend88OrderPayload({ orderDetails, shopId, mappingContext }) {
  const orderItems = resolveOrderItems(orderDetails);

  if (orderItems.length === 0) {
    throw new Error("No order items found in Uber order payload");
  }

  const productIds = [];
  const productQtys = [];
  const optionItems = [];
  const unmappedProducts = [];
  const unmappedOptions = [];
  const unmappedOptionItems = [];

  for (const item of orderItems) {
    const uberItemCandidates = resolveUberItemCandidates(item);
    const matchedUberItemId = uberItemCandidates.find((candidate) =>
      mappingContext.posItemIdByUberItemId.has(candidate)
    );
    const posItemId = matchedUberItemId
      ? mappingContext.posItemIdByUberItemId.get(matchedUberItemId)
      : null;

    if (!posItemId) {
      unmappedProducts.push(
        `${resolveOrderItemName(item)} (${uberItemCandidates.join("|") || "missing_id"})`
      );
      continue;
    }

    const mappedOptionItemIds = [];
    const selectedOptionSelections = resolveSelectedOptionSelections(item);

    selectedOptionSelections.forEach(({ uberOptionId, uberOptionItemId }) => {
      let mappingEntry = null;

      if (uberOptionId) {
        const mappedPosOptionId = mappingContext.posOptionIdByUberOptionId.get(uberOptionId);
        if (!mappedPosOptionId) {
          unmappedOptions.push(`${resolveOrderItemName(item)} -> option ${uberOptionId}`);
          return;
        }

        mappingEntry = mappingContext.optionItemMappingByOptionAndItem.get(
          `${uberOptionId}::${uberOptionItemId}`
        );
        if (!mappingEntry) {
          unmappedOptionItems.push(
            `${resolveOrderItemName(item)} -> option ${uberOptionId} item ${uberOptionItemId}`
          );
          return;
        }

        if (
          mappingEntry.posOptionId &&
          mappingEntry.posOptionId !== mappedPosOptionId
        ) {
          unmappedOptionItems.push(
            `${resolveOrderItemName(item)} -> option ${uberOptionId} item ${uberOptionItemId} (option mismatch)`
          );
          return;
        }
      } else {
        const candidates = mappingContext.optionItemMappingsByUberOptionItemId.get(uberOptionItemId) || [];
        if (candidates.length !== 1) {
          unmappedOptionItems.push(
            `${resolveOrderItemName(item)} -> option item ${uberOptionItemId} (ambiguous_or_missing_option)`
          );
          return;
        }
        mappingEntry = candidates[0];
      }

      mappedOptionItemIds.push(mappingEntry.posOptionItemId);
    });

    productIds.push(posItemId);
    productQtys.push(resolveOrderItemQty(item));
    optionItems.push(mappedOptionItemIds.map(id => ({ option_item_id: id, qty: 1 })));
  }

  if (unmappedProducts.length > 0) {
    throw new Error(`Missing item mappings: ${unmappedProducts.join(", ")}`);
  }

  if (unmappedOptions.length > 0) {
    throw new Error(`Missing option mappings: ${unmappedOptions.join(", ")}`);
  }

  if (unmappedOptionItems.length > 0) {
    throw new Error(`Missing option-item mappings: ${unmappedOptionItems.join(", ")}`);
  }

  const customerInfo = resolveCustomerInfo(orderDetails);

  return {
    email: customerInfo.email,
    phone: customerInfo.phone,
    first_name: customerInfo.first_name,
    last_name: customerInfo.last_name,
    product_ids: productIds,
    product_qtys: productQtys,
    option_items: optionItems,
    shop_id: shopId,
    requirements: resolveRequirements(orderDetails),
    source: "online",
    surcharge: resolveSurcharge(orderDetails),
  };
}

function isErrorResponse(vend88Response = {}) {
  const statusCode = Number(vend88Response?.status_code);
  return Number.isFinite(statusCode) && statusCode >= 400;
}

async function submitVend88Order(payload) {
  console.log(`[posOrderBridgeService] COMPLETE PAYLOAD:`);
  console.log(JSON.stringify(payload, null, 2));
  
  const response = await axios.post(`${POS_API_BASE_URL}/order/add_none_user`, payload, {
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

export async function syncUberOrderToVend88({ orderId, orderDetails = {}, meta = {} }) {
  const storeId = resolveStoreId(orderDetails, meta);
  if (!storeId) {
    throw new Error("Unable to resolve Uber store ID from webhook/order payload");
  }

  const binding = await getShopBindingByUberStoreId(storeId);
  if (!binding?.pos_shop_id) {
    throw new Error(`No POS shop binding found for Uber store ${storeId}`);
  }

  const shopId = normalizeText(binding.pos_shop_id);

  const mappingContext = await getMappingContext(shopId);
  const payload = buildVend88OrderPayload({
    orderDetails,
    shopId,
    mappingContext,
  });

  let vend88Response;
  try {
    vend88Response = await submitVend88Order(payload);
  } catch (error) {
    console.error(`[posOrderBridgeService] ❌ API error:`, error.response?.data || error.message);
    throw error;
  }

  if (isErrorResponse(vend88Response)) {
    const statusCode = Number(vend88Response?.status_code);
    console.error(`[posOrderBridgeService] ❌ POS returned error:`, vend88Response);
    throw new Error(
      vend88Response?.message || `Vend88 API returned error status_code=${statusCode}`
    );
  }

  return {
    orderId,
    storeId,
    shopId,
    requestPayloadPreview: {
      ...payload,
      phone: payload.phone ? `${payload.phone.substring(0, 5)}***` : "",
    },
    vend88Response,
  };
}

export { buildVend88OrderPayload };
