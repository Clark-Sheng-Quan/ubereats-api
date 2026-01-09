# Uber Eats 集成系统 - 完整部署指南

## 📋 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Admin 后台 (React)                   │
│  - 店铺管理 (/shops)                                        │
│  - Uber OAuth 连接                                          │
│  - 菜单同步 (/menu-sync/:shopId) ⭐ 核心功能                │
└──────────────────┬──────────────────────────────────────────┘
                   │ API 调用
┌──────────────────▼──────────────────────────────────────────┐
│           后端 Node.js 服务 (Port 3000)                     │
│  ┌────────────────────────────────────────────────┐         │
│  │ Express Routes:                                │         │
│  │ - /api/uber/oauth/callback                    │         │
│  │ - /api/uber/sync-menu                         │         │
│  │ - /api/uber/status                            │         │
│  │ - /api/uber/disconnect                        │         │
│  │ - /webhooks/uber/:shopId (Uber Events)        │         │
│  └────────────────────────────────────────────────┘         │
│  ┌────────────────────────────────────────────────┐         │
│  │ Services:                                      │         │
│  │ - orderService.js (Uber API 操作)             │         │
│  │ - webhookService.js (事件处理)                │         │
│  │ - menuSyncService.ts (菜单同步)               │         │
│  │ - localService.js (本地存储)                  │         │
│  └────────────────────────────────────────────────┘         │
└───────┬──────────────────────────┬──────────────────────────┘
        │                          │
        │ REST API                 │ Webhook Events
        │                          │
┌───────▼──────────────┐  ┌───────▼──────────────┐
│  POS 系统 API        │  │  Uber API Server    │
│ (Staff/Shop/Product) │  │  (Order Events)     │
└──────────────────────┘  └─────────────────────┘
        ▲
        │ React Native App
        │ (订单管理端)
┌───────┴──────────────┐
│  Mobile POS App      │
│  (店员操作)          │
└──────────────────────┘
```

## 🚀 快速开始

### Part 1: 后端 Node.js 服务

#### 安装依赖
```bash
cd /Users/pcm/Desktop/ubereats-api
npm install
```

#### 配置环境变量
编辑 `.env` 文件：
```env
# Uber OAuth Configuration
UBER_CLIENT_ID=your_uber_client_id
UBER_CLIENT_SECRET=your_uber_client_secret
UBER_REDIRECT_URI=http://localhost:3000/auth/uber/callback

# Server
PORT=3000
NODE_ENV=development

# POS API
POS_API_URL=http://localhost:8000/api

# Webhook
WEBHOOK_BASE_URL=http://localhost:3000
```

#### 启动服务
```bash
npm start
```

服务会在 `http://localhost:3000` 上运行

### Part 2: Web 管理后台

#### 安装依赖
```bash
cd /Users/pcm/Desktop/ubereats-api/web
npm install
```

#### 配置环境变量
创建 `.env.local` 文件：
```env
REACT_APP_POS_API_URL=http://localhost:8000/api
REACT_APP_BACKEND_URL=http://localhost:3000/api
REACT_APP_UBER_CLIENT_ID=your_uber_client_id
REACT_APP_UBER_CLIENT_SECRET=your_uber_client_secret
REACT_APP_UBER_REDIRECT_URI=http://localhost:3000/auth/uber/callback
```

#### 启动开发服务器
```bash
npm start
```

访问 `http://localhost:3000`

### Part 3: React Native POS App（已完成）

```bash
cd /Users/pcm/Desktop/ubereats-api/pos
npx expo start
```

## 🔄 工作流程

### 1. 店铺管理员设置流程

```
1. 访问 http://localhost:3000
   ↓
2. 登录 POS 系统账号
   ↓
3. 选择要集成 Uber 的店铺
   ↓
4. 点击 "Connect to Uber"
   ↓
5. Uber OAuth 授权页面（重定向到 Uber）
   ↓
6. 用户授权后重定向回来
   ↓
7. 系统获取 Uber Store ID 并保存
   ↓
8. 显示 "Connected to Uber" 状态
```

### 2. 菜单同步流程（核心功能）

```
1. 在店铺管理页点击 "Sync Menu"
   ↓
2. 系统从 POS API 获取该店铺的所有菜单
   ↓
3. 显示菜单列表（按分类组织）
   ↓
4. 管理员选择要同步的产品
   ↓
5. 点击 "Sync to Uber" 按钮
   ↓
6. 后端调用 Uber API 上传菜单数据
   ↓
7. 保存同步历史记录
   ↓
8. 返回同步结果（成功/失败/部分成功）
```

### 3. 订单管理流程（App 端）

```
店员打开 POS App
   ↓
看到 "Orders" 标签页
   ↓
显示实时 Uber 订单列表
   ↓
点击订单查看详情
   ↓
更新订单状态（Preparing → Ready → Completed）
   ↓
订单自动推送回 Uber
   ↓
客户在 Uber App 上看到最新状态
```

## 📁 文件结构

```
/Users/pcm/Desktop/ubereats-api/
├── web/                           # Web 管理后台
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx          # 登录页
│   │   │   ├── Shops.tsx          # 店铺管理
│   │   │   └── MenuSync.tsx       # 菜单同步 (核心)
│   │   ├── services/
│   │   │   ├── posApi.ts          # POS API 客户端
│   │   │   └── uberService.ts     # Uber 集成服务
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── .env.example
│
├── backend/                       # Node.js 后端
│   ├── routes/
│   │   ├── uberRoutes.ts          # Uber 集成路由
│   │   └── (其他路由)
│   ├── services/
│   │   ├── menuSyncService.ts     # 菜单同步服务
│   │   ├── orderService.js        # 订单服务
│   │   ├── webhookService.js      # Webhook 处理
│   │   └── localService.js        # 本地存储
│   └── (其他文件)
│
├── pos/                           # React Native POS App
│   ├── screens/
│   │   ├── orders/
│   │   │   ├── list.tsx           # 订单列表
│   │   │   └── [orderId].tsx      # 订单详情
│   │   ├── dashboard.tsx          # 仪表板
│   │   └── inventory.tsx          # 库存管理
│   ├── services/
│   │   ├── uberOrderService.ts    # Uber 订单服务
│   │   └── syncService.ts         # 同步服务
│   └── (其他文件)
│
├── data/                          # 本地存储
│   ├── orders.json
│   ├── webhooks.json
│   ├── uber_connections.json      # Uber 连接信息 (新)
│   ├── sync_history.json          # 同步历史 (新)
│   └── (其他文件)
│
├── services/                      # Node.js 共享服务
└── (其他文件)
```

## 🔑 核心 API 端点

### Web 后台 → POS 系统
```
POST /staff/login
  - 登录 POS 系统

POST /shop/list_shop
  - 获取用户的所有店铺

POST /product/list
  - 获取店铺的菜单列表

POST /category/list
  - 获取菜单分类
```

### Web 后台 → Node.js 后端
```
POST /api/uber/oauth/callback
  - 处理 Uber OAuth 授权
  - 获取并保存 access_token

POST /api/uber/status
  - 查询店铺的 Uber 连接状态

POST /api/uber/disconnect
  - 断开 Uber 连接

POST /api/uber/sync-menu
  - 同步菜单到 Uber (核心)

POST /api/uber/sync-history
  - 获取同步历史记录

POST /api/uber/webhook/verify
  - 验证 Webhook 配置
```

### 后端 → Uber API
```
POST /eats/v2/catalogs/stores/{storeId}/items
  - 上传菜单项

GET /eats/v2/catalogs/stores/{storeId}/items
  - 查询已上传的菜单

POST /webhooks
  - 接收 Uber 订单事件
```

## 📊 本地存储数据结构

### uber_connections.json
```json
[
  {
    "shop_id": "shop_123",
    "uber_store_id": "uber_store_456",
    "access_token": "token_xxx",
    "refresh_token": "refresh_xxx",
    "expires_at": "2026-01-10T12:00:00Z",
    "connected_at": "2026-01-09T12:00:00Z",
    "uber_store_name": "My Restaurant"
  }
]
```

### sync_history.json
```json
[
  {
    "id": "sync_1704816000000",
    "shop_id": "shop_123",
    "synced_at": "2026-01-09T12:00:00Z",
    "synced_count": 45,
    "status": "success",
    "errors": [],
    "product_count": 50
  }
]
```

## 🐛 故障排查

### 菜单同步失败
1. **检查 Uber 连接状态**
   - 访问 `/shops` 页面，检查是否显示 "Connected to Uber"

2. **检查产品数据**
   - 确保产品有：名称、价格、ID
   - 价格不能为 0

3. **检查 token 有效性**
   - 如果 token 过期，系统会自动刷新
   - 查看 `data/uber_connections.json` 的 `expires_at`

4. **查看错误信息**
   - 菜单同步页显示详细错误信息
   - 检查浏览器开发者工具的网络选项卡

### Uber OAuth 失败
1. 检查 Uber OAuth 凭证是否正确
2. 检查 redirect URI 配置是否与应用一致
3. 检查网络连接和防火墙

## 🔒 安全建议

1. **生产环境**
   - 使用 HTTPS 而非 HTTP
   - 将 token 存储在 httpOnly cookies
   - 定期轮换 OAuth 密钥

2. **API 请求**
   - 实现请求签名验证（HMAC）
   - 添加请求速率限制
   - 验证所有输入数据

3. **权限控制**
   - 店铺管理员只能管理自己的店铺
   - 实现角色基础访问控制（RBAC）

## 📝 日志和监控

- 所有 webhook 事件记录在 `data/webhooks.json`
- 所有操作记录在 `data/actions.json`
- 菜单同步历史记录在 `data/sync_history.json`

## 🚢 部署检查清单

- [ ] 配置所有环境变量
- [ ] 测试 POS API 连接
- [ ] 配置 Uber OAuth 应用
- [ ] 测试 OAuth 流程
- [ ] 测试菜单同步功能
- [ ] 配置 Webhook URL
- [ ] 测试 Webhook 接收
- [ ] 设置日志收集
- [ ] 配置数据备份
- [ ] 进行压力测试

