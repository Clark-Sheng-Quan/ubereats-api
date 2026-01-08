# Uber Eats Menu Management API - 完整实现

## 📋 API 概览

根据官方 Uber Eats Menu Management API 文档，共有 **3个核心 REST API** 和 **1个 Webhook**：

### REST APIs

| 方法 | 端点 | 功能 | 实现状态 |
|------|------|------|--------|
| GET | `/v2/eats/stores/{store_id}/menus` | Get Menu - 获取完整菜单 | ✅ 完整实现 |
| POST | `/v2/eats/stores/{store_id}/menus/items/{item_id}` | Update Item - 更新单个菜单项 | ✅ 完整实现 |
| PUT | `/v2/eats/stores/{store_id}/menus` | Upload Menu - 上传/替换完整菜单 | ✅ 完整实现 |

### Webhook

| 事件 | 功能 | 实现状态 |
|------|------|--------|
| `store.menu_refresh_request` | 菜单刷新请求 webhook | ✅ 完整实现 |

---

## 1️⃣ Get Menu API

**GET** `/v2/eats/stores/{store_id}/menus`

### 功能
- 获取店铺的完整菜单配置
- 支持按菜单类型过滤（DELIVERY/PICK_UP/DINE_IN）
- 返回值：MenuConfiguration（菜单、分类、项目、修饰符组）

### 查询参数
- `menu_type` (可选): 
  - `MENU_TYPE_FULFILLMENT_DELIVERY` (默认)
  - `MENU_TYPE_FULFILLMENT_PICK_UP`
  - `MENU_TYPE_FULFILLMENT_DINE_IN`

### 实现位置
- **Service:** [services/menuService.js](services/menuService.js#L21) - `getMenu(storeId, menuType)`
- **Route:** [routes/menuRoutes.js](routes/menuRoutes.js#L24) - `GET /:storeId`
- **POS Terminal:** [pos-terminal.js](pos-terminal.js#L1598) - 选项 19 `getMenuFlow()`

### 示例
```bash
curl -X GET "https://api.uber.com/v2/eats/stores/store-uuid/menus?menu_type=MENU_TYPE_FULFILLMENT_DELIVERY" \
  -H "Authorization: Bearer <token>" \
  -H "Accept-Encoding: gzip"
```

---

## 2️⃣ Update Item API

**POST** `/v2/eats/stores/{store_id}/menus/items/{item_id}`

### 功能
- 更新菜单中的单个项目
- **稀疏更新**（Sparse Update）- 只更新提供的字段
- 支持更新多种项目属性

### 支持的更新字段

| 字段 | 用途 | 示例 |
|------|------|------|
| `price_info` | 价格信息（包括容器押金） | `{price: 1299, core_price: 1299, container_deposit: 100}` |
| `suspension_info` | 暂停销售（缺货） | `{suspension: {suspend_until: null, reason: "OUT_OF_STOCK"}}` |
| `menu_type` | 菜单类型 | `MENU_TYPE_FULFILLMENT_DELIVERY` |
| `product_info` | 产品识别（GTIN/UPC/PLU码） | `{gtin: "...", plu: "...", merchant_id: "..."}` |
| `classifications` | 分类信息（素食、含酒精、成分等） | `{alcoholic_items: 0, ingredients: ["..."]}` |
| `beverage_info` | 饮料信息（咖啡因、酒精含量） | `{caffeine_amount: 95, alcohol_by_volume: 500}` |
| `physical_properties_info` | 物理属性（可重复使用包装、储存说明） | `{reusable_packaging: true, storage_instructions: "..."}` |
| `medication_info` | 药物信息 | `{medical_prescription_required: true}` |
| `nutritional_info` | 营养信息（卡路里、大量营养素、过敏原） | `{calories: {...}, allergens: ["..."]}` |
| `selling_info` | 销售信息 | `{...}` |

### 实现位置
- **Service:** [services/menuService.js](services/menuService.js#L51) - `updateItem(storeId, itemId, updateData)`
- **Route:** [routes/menuRoutes.js](routes/menuRoutes.js#L44) - `POST /:storeId/items/:itemId`

### 常见使用场景

#### 更新价格
```javascript
POST /api/menu/store-uuid/items/item-id
Body: {
  "price_info": {
    "price": 1299,
    "core_price": 1299,
    "container_deposit": 100
  }
}
```

#### 暂停项目（标记为缺货）
```javascript
POST /api/menu/store-uuid/items/item-id
Body: {
  "suspension_info": {
    "suspension": {
      "suspend_until": null,
      "reason": "OUT_OF_STOCK"
    }
  }
}
```

#### 恢复项目（恢复销售）
```javascript
POST /api/menu/store-uuid/items/item-id
Body: {
  "suspension_info": {
    "suspension": {
      "suspend_until": null,
      "reason": null
    }
  }
}
```

#### 更新分类（如酒精含量）
```javascript
POST /api/menu/store-uuid/items/item-id
Body: {
  "classifications": {
    "alcoholic_items": 1,
    "can_serve_alone": true
  }
}
```

---

## 3️⃣ Upload Menu API

**PUT** `/v2/eats/stores/{store_id}/menus`

### 功能
- 创建或覆盖店铺的完整菜单
- 支持按菜单类型上传不同的菜单配置
- 大请求体支持 gzip 压缩

### 菜单类型参数
- `menu_type` (可选): 
  - `MENU_TYPE_FULFILLMENT_DELIVERY` (默认)
  - `MENU_TYPE_FULFILLMENT_PICK_UP`
  - `MENU_TYPE_FULFILLMENT_DINE_IN`

### 请求体结构
```javascript
{
  "menus": [
    {
      "id": "menu-id",
      "title": {"translations": {"en_us": "Lunch Menu"}},
      "subtitle": {"translations": {"en_us": "11am-3pm"}},
      "service_availability": [...],
      "category_ids": ["cat1", "cat2"]
    }
  ],
  "categories": [
    {
      "id": "cat-id",
      "title": {"translations": {"en_us": "Burgers"}},
      "entities": [{"id": "item1", "type": "ITEM"}]
    }
  ],
  "items": [
    {
      "id": "item-id",
      "title": {"translations": {"en_us": "Cheeseburger"}},
      "description": {"translations": {"en_us": "Classic burger"}},
      "price_info": {"price": 1299},
      "image_url": "https://...",
      "tax_info": {...}
    }
  ],
  "modifier_groups": [...]
}
```

### 实现位置
- **Service:** [services/menuService.js](services/menuService.js#L117) - `uploadMenu(storeId, menuConfig)`
- **Route:** [routes/menuRoutes.js](routes/menuRoutes.js#L74) - `PUT /:storeId`

### 重要注意事项
- **菜单分割规则**：Delivery 菜单必须首先上传。菜单在第一次按类型分割后，必须分别管理。
- **酒精产品标记**：一旦标记为酒精产品，就无法通过 API 改回非酒精。需要联系 Uber 支持。
- **压缩**：大请求体应使用 gzip 压缩（`Content-Encoding: gzip`）

---

## 4️⃣ Webhook - Menu Refresh Request

**事件类型:** `store.menu_refresh_request`

### 功能
- Uber 通知店铺需要刷新菜单
- 店铺应该检索最新菜单并重新上传

### Webhook 结构
```javascript
{
  "event_type": "store.menu_refresh_request",
  "partner_store_id": "merchant-store-id",
  "store_id": "store-uuid",
  "resource_href": "https://api.uber.com/v1/eats/stores/...",
  "webhook_meta": {
    "client_id": "...",
    "webhook_config_id": "...",
    "webhook_msg_timestamp": 1622813397,
    "webhook_msg_uuid": "..."
  }
}
```

### 实现位置
- **Handler:** [services/orderService.js](services/orderService.js) - `handleMenuRefreshRequest()`
- **Config:** [config/config.js](config/config.js) - `WEBHOOK_EVENTS.MENU_REFRESH_REQUEST`

### 响应要求
- 必须返回 HTTP 200
- 空响应体
- 如果未及时返回 200，Uber 将使用指数退避算法重试（最多7次）

---

## 📱 POS 终端集成

### 菜单选项
- **选项 19: Get Menu** - 查询完整菜单配置

### Get Menu Flow
1. 选择店铺
2. 输入菜单类型（可选，默认为 DELIVERY）
3. 显示菜单摘要：菜单数、分类数、项目数、修饰符组数
4. 可选查看详细菜单结构

---

## ✅ 实现清单

### 核心功能
- ✅ Get Menu API 与菜单类型过滤
- ✅ Update Item API 支持 10+ 字段类别
- ✅ Upload Menu API 完整菜单替换
- ✅ Webhook 处理和日志记录
- ✅ gzip 压缩支持
- ✅ 稀疏更新支持（仅更新提供的字段）
- ✅ 完整错误处理
- ✅ OAuth 2.0 Bearer 令牌认证

### 安全性
- ✅ 令牌自动刷新
- ✅ Webhook HMAC-SHA256 签名验证
- ✅ 请求头验证

### 日志和审计
- ✅ 所有 API 调用日志记录
- ✅ Webhook 事件审计追踪
- ✅ 错误消息和堆栈跟踪

---

## 🔗 API 文档

- **Get Menu:** [Get Menu.md](apiDoc/Get%20Menu.md)
- **Update Item:** [Update Item.md](apiDoc/Update%20Item.md)
- **Upload Menu:** [Upload Menu.md](apiDoc/Upload%20Menu.md)
- **Menu Refresh Webhook:** [Menu Refresh.md](apiDoc/Menu%20Refresh.md)

---

## 📝 技术栈

- **Runtime:** Node.js with ES Modules
- **HTTP Client:** node-fetch
- **Framework:** Express.js 5.x
- **Authentication:** OAuth 2.0 Bearer tokens
- **Compression:** gzip (optional for large payloads)
- **Data Storage:** File-based JSON
