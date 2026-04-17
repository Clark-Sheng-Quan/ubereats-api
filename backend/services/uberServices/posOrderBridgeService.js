import axios from "axios";
import { dbQuery } from "../../db/client.js";
import { getValidPosToken, clearStoredPosToken } from "../posAuthService.js";
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

function resolveSelectedOptionItemIds(orderItem = {}) {
  const ids = new Set();

  const addId = (value) => {
    const id = normalizeText(String(value || ""));
    if (id) {
      ids.add(id);
    }
  };

  const groups = Array.isArray(orderItem?.selected_modifier_groups)
    ? orderItem.selected_modifier_groups
    : [];

  groups.forEach((group) => {
    const selectedItems = Array.isArray(group?.selected_items) ? group.selected_items : [];
    selectedItems.forEach((selectedItem) => {
      addId(selectedItem?.id);
      addId(selectedItem?.item_id);
      addId(selectedItem?.external_data);
    });

    const modifierOptions = Array.isArray(group?.modifier_options) ? group.modifier_options : [];
    modifierOptions.forEach((option) => {
      addId(option?.id);
      addId(option?.item_id);
      addId(option?.external_data);
    });
  });

  const selectedOptions = Array.isArray(orderItem?.selected_modifier_options)
    ? orderItem.selected_modifier_options
    : [];
  selectedOptions.forEach((option) => {
    addId(option?.id);
    addId(option?.item_id);
    addId(option?.external_data);
  });

  const plainOptions = Array.isArray(orderItem?.options) ? orderItem.options : [];
  plainOptions.forEach((option) => {
    addId(option?.id);
    addId(option?.item_id);
    addId(option?.external_data);
  });

  return Array.from(ids);
}

async function getMappingContext(shopId) {
  const [itemMappingResult, optionItemMappingResult] = await Promise.all([
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
        SELECT uber_option_item_id, pos_option_item_id
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

  const posOptionItemIdByUberOptionItemId = new Map();
  optionItemMappingResult.rows.forEach((row) => {
    const uberOptionItemId = normalizeText(row.uber_option_item_id);
    const posOptionItemId = normalizeText(row.pos_option_item_id);
    if (uberOptionItemId && posOptionItemId) {
      posOptionItemIdByUberOptionItemId.set(uberOptionItemId, posOptionItemId);
    }
  });

  return {
    posItemIdByUberItemId,
    posOptionItemIdByUberOptionItemId,
  };
}

function buildVend88OrderPayload({ orderDetails, shopId, posToken, mappingContext }) {
  const orderItems = resolveOrderItems(orderDetails);

  if (orderItems.length === 0) {
    throw new Error("No order items found in Uber order payload");
  }

  const productIds = [];
  const productQtys = [];
  const optionItems = [];
  const unmappedProducts = [];
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
    const selectedOptionItemIds = resolveSelectedOptionItemIds(item);

    selectedOptionItemIds.forEach((uberOptionItemId) => {
      const posOptionItemId = mappingContext.posOptionItemIdByUberOptionItemId.get(uberOptionItemId);
      if (!posOptionItemId) {
        unmappedOptionItems.push(`${resolveOrderItemName(item)} -> ${uberOptionItemId}`);
        return;
      }
      mappedOptionItemIds.push(posOptionItemId);
    });

    productIds.push(posItemId);
    productQtys.push(resolveOrderItemQty(item));
    optionItems.push(mappedOptionItemIds);
  }

  if (unmappedProducts.length > 0) {
    throw new Error(`Missing item mappings: ${unmappedProducts.join(", ")}`);
  }

  if (unmappedOptionItems.length > 0) {
    throw new Error(`Missing option-item mappings: ${unmappedOptionItems.join(", ")}`);
  }

  return {
    token: posToken,
    product_ids: productIds,
    product_qtys: productQtys,
    option_items: optionItems,
    pick_method: resolvePickMethod(orderDetails),
    pick_time: resolvePickTime(orderDetails),
    shop_id: shopId,
    requirements: resolveRequirements(orderDetails),
    source: "online",
    surcharge: resolveSurcharge(orderDetails),
  };
}

function isInvalidTokenResponse(vend88Response = {}) {
  const message = normalizeText(String(vend88Response?.message || "")).toLowerCase();
  const statusCode = Number(vend88Response?.status_code);
  return message.includes("invalid token") || statusCode === 401;
}

function isErrorResponse(vend88Response = {}) {
  const statusCode = Number(vend88Response?.status_code);
  return Number.isFinite(statusCode) && statusCode >= 400;
}

function prettyToken(token) {
  if (!token || token.length < 10) return token;
  return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
}

async function submitVend88Order(payload) {
  const tokenPreview = payload.token ? `${payload.token.substring(0, 20)}...` : "NO_TOKEN";
  console.log(`[posOrderBridgeService] 📤 Submitting order to POS with token: ${tokenPreview}`);
  
  const response = await axios.post(`${POS_API_BASE_URL}/order/add`, payload, {
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
  const posToken = await getValidPosToken();
  console.log(`[posOrderBridgeService] 🔑 Got initial token for order sync: ${posToken?.substring(0, 20)}...`);

  const mappingContext = await getMappingContext(shopId);
  const payload = buildVend88OrderPayload({
    orderDetails,
    shopId,
    posToken,
    mappingContext,
  });

  let vend88Response = await submitVend88Order(payload);

  // If token is invalid, force refresh and retry once.
  if (isInvalidTokenResponse(vend88Response)) {
    console.log(`[posOrderBridgeService] 🔄 Invalid token detected in response:`, {
      status_code: vend88Response?.status_code,
      message: vend88Response?.message,
    });
    clearStoredPosToken("invalid-token-response");
    console.log(`[posOrderBridgeService] 🔓 Attempting auto-login for fresh token...`);
    const refreshedToken = await getValidPosToken({ forceRefresh: true });
    console.log(`[posOrderBridgeService] ✅ Fresh token obtained: ${prettyToken(refreshedToken)}`);
    payload.token = refreshedToken;
    console.log(`[posOrderBridgeService] 🔄 Retrying order submission with fresh token...`);
    vend88Response = await submitVend88Order(payload);
    console.log(`[posOrderBridgeService] Response on retry:`, {
      status_code: vend88Response?.status_code,
      message: vend88Response?.message,
    });
  }

  if (isErrorResponse(vend88Response)) {
    const statusCode = Number(vend88Response?.status_code);
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
      token: "***",
    },
    vend88Response,
  };
}

export { buildVend88OrderPayload };
