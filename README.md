# Uber Eats Webhook Integration - Backend Setup

这是一个Uber Eats订单获取的后端服务，用于接收Uber Eats订单webhook并处理订单数据。

## 项目结构

```
.
├── webhook.js           # 主webhook服务器和路由
├── config.js            # 配置文件（认证密钥、API配置）
├── orderService.js      # 订单处理核心逻辑
├── apiRoutes.js         # 管理API端点
├── package.json         # 依赖配置
└── data/                # 数据存储目录
    ├── orders.json      # 订单数据
    ├── webhook_logs.json # webhook日志
    └── actions.json     # 操作审计日志
```

## 功能概览

### 1. Webhook事件处理
支持以下Uber Eats webhook事件：

| 事件 | 说明 | 用途 |
|-----|------|------|
| `orders.notification` | 新订单创建 | 获取新订单，推送到POS |
| `orders.scheduled.notification` | 预定订单 | 处理预定订单 |
| `orders.release` | 快递员到达地理围栏 | 订单准备交付 |
| `orders.cancel` | 订单取消 | 更新订单状态 |
| `orders.failure` | 订单失败 | 记录失败订单 |
| `store.provisioned` | 门店授权 | 门店接入 |
| `store.deprovisioned` | 门店撤销授权 | 门店移除 |
| `order.fulfillment_issues.resolved` | 履行问题已解决 | 继续处理订单 |
| `store.status.changed` | 门店状态改变 | 更新门店状态 |

### 2. 订单详情获取
- 自动从Uber API获取完整订单信息
- 包含客户信息、商品清单、支付信息等
- 使用Bearer token认证

### 3. 数据存储
- 基于文件的存储（JSON格式）
- 方便调试和查看
- 可以后续迁移到数据库

### 4. 管理API
提供REST API接口管理订单和查看统计数据

## 快速开始

### 1. 环境配置

编辑 `config.js` 文件，更新以下信息：

```javascript
// 你的认证密钥（从Uber Dashboard获取）
export const PRIMARY_KEY = "UE_TEST_KEY_9f3aA72kL1";
export const SECONDARY_KEY = "UE_TEST_KEY_b81Qp55zX9";

// 你的门店ID
export const STORE_ID = "your_store_id_here";

// Uber OAuth访问令牌（用于API调用）
export const UBER_ACCESS_TOKEN = process.env.UBER_ACCESS_TOKEN || "your_access_token_here";
```

### 2. 设置环境变量（推荐）

```bash
export UBER_ACCESS_TOKEN="your_actual_token_here"
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动服务

```bash
node webhook.js
```

输出示例：
```
🚀 Uber Eats Webhook server running on port 3000
Listening for webhooks at: http://localhost:3000/ubereats/webhook
```

### 5. 使用ngrok暴露到公网

```bash
ngrok http 3000
```

复制`https://xxxx-xx-xxx-xx-xx.ngrok.io`到Uber Developer Dashboard的Webhook URL。

## API使用示例

### 获取所有订单
```bash
curl http://localhost:3000/api/orders
```

### 按状态筛选订单
```bash
curl http://localhost:3000/api/orders?status=pending&limit=20
```

### 获取特定订单
```bash
curl http://localhost:3000/api/orders/{orderId}
```

### 获取订单详情（从Uber API）
```bash
curl http://localhost:3000/api/orders/{orderId}/details
```

### 更新订单状态
```bash
curl -X PATCH http://localhost:3000/api/orders/{orderId}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "sent_to_pos"}'
```

### 获取统计信息
```bash
curl http://localhost:3000/api/stats
```

### 健康检查
```bash
curl http://localhost:3000/health
```

## 订单流程

### 典型的订单生命周期

1. **新订单到达** → `orders.notification` webhook
   - 服务器接收webhook
   - 验证Basic Auth认证
   - 从Uber API获取完整订单详情
   - 保存订单到本地存储
   - 推送到你的POS系统

2. **订单准备** → 手动更新状态
   - 通过API更新订单状态

3. **快递员接近** → `orders.release` webhook
   - 收到消息表示快递员到达地理围栏
   - 准备订单交付

4. **订单完成/取消**
   - `orders.cancel` - 订单被取消
   - `orders.failure` - 订单失败

## 数据存储位置

### orders.json
```json
[
  {
    "order_id": "uuid",
    "event_type": "orders.notification",
    "resource_href": "https://api.uber.com/v1/delivery/order/...",
    "order_details": {
      "customer": { ... },
      "cart": { "items": [...] },
      "status": "...",
      ...
    },
    "received_at": "2024-01-05T10:30:00Z",
    "status": "pending",
    "updated_at": "2024-01-05T10:31:00Z"
  }
]
```

### webhook_logs.json
记录所有接收的webhook事件，用于调试和审计。

### actions.json
记录系统执行的所有操作，包括订单接收、推送到POS等。

## 与POS系统集成

当前代码在`orderService.js`的`handleNewOrder()`函数中有以下注释：

```javascript
// TODO: Push to POS system here
```

这是你需要添加POS推送逻辑的地方。例如：

```javascript
// 推送到POS系统示例
const posResponse = await pushOrderToPOS(orderDetails);
if (posResponse.success) {
  updateOrderStatus(orderId, "sent_to_pos");
}
```

## 调试技巧

### 1. 查看最新webhook日志
```bash
tail -f data/webhook_logs.json
```

### 2. 查看订单数据
```bash
cat data/orders.json | jq '.' | less
```

### 3. 启用详细日志
在terminal中观察控制台输出，所有webhook事件都会被打印。

### 4. 使用Postman测试webhook
- 导入Uber提供的Postman Collection
- 用你的localhost + ngrok URL测试webhook

## 常见问题

### Q: 收不到webhook？
A: 
1. 检查Webhook URL是否在Uber Dashboard中正确配置
2. 确认Basic Auth密钥与Dashboard一致
3. 检查ngrok是否正常运行
4. 查看控制台日志是否显示请求

### Q: 无法获取订单详情？
A:
1. 确认UBER_ACCESS_TOKEN已正确设置
2. 检查token是否有`eats.order`权限
3. 查看错误信息中的HTTP状态码

### Q: 如何清除订单数据？
A:
```bash
rm data/orders.json data/webhook_logs.json data/actions.json
```

## 下一步

1. **POS集成** - 实现`pushOrderToPOS()`函数
2. **数据库迁移** - 从文件存储迁移到SQLite/PostgreSQL
3. **错误处理** - 添加重试机制和错误恢复
4. **监控告警** - 集成monitoring和alerting
5. **认证增强** - 添加更复杂的认证机制
6. **单元测试** - 添加测试覆盖

## 参考文档

- [Uber Eats Marketplace API文档](https://developer.uber.com/docs/eats)
- [Order Fulfillment API](https://developer.uber.com/docs/eats/references/api/v1/delivery-order)
- [Integration Configuration API](https://developer.uber.com/docs/eats/references/api/integration_activation_suite)

## 许可证

MIT
