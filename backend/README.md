# Uber Eats Webhook Integration & POS Management System

A comprehensive backend service for receiving and managing Uber Eats orders through webhooks, with an integrated POS terminal for order operations.

## Project Structure

```
.
├── webhook.js               # Webhook server and event handler
├── config.js                # Configuration (authentication keys, API settings)
├── orderService.js          # Core order processing logic
├── orderActions.js          # Uber API client library (all endpoints)
├── apiRoutes.js             # Express route handlers for REST API
├── uberRoutes.js            # Uber API integration routes
├── pos-terminal.js          # Interactive CLI for POS operations
├── test-webhook.js          # Webhook testing utility
├── package.json             # Dependencies
├── apiDoc/                  # API documentation (OpenAPI/Swagger specs)
│   ├── Order Fulfillment API.json
│   ├── Marketplace Reporting API.json
│   ├── Integration Activation & Configuration API Suite.json
│   └── ...
└── data/                    # Data storage directory
    ├── orders.json          # Order records
    ├── webhook_logs.json    # Webhook event logs
    └── actions.json         # Operation audit logs
```

## Features Overview

### 1. Webhook Event Processing
Handles all major Uber Eats webhook events:

| Event | Description | Purpose |
|-------|-------------|---------|
| `orders.notification` | New order received | Fetch order details, push to POS |
| `orders.scheduled.notification` | Scheduled order | Handle future orders |
| `orders.release` | Delivery partner near geofence | Prepare for handoff |
| `orders.cancel` | Order cancelled | Update order status |
| `orders.failure` | Order failed | Log failures |
| `delivery.state_changed` | Delivery status updated | Track delivery progress |
| `orders.fulfillment_issues.resolved` | Issue resolved by customer | Continue processing |

### 2. Uber API Endpoints (Fully Implemented)
- **GET** `/v1/delivery/order/{order_id}` - Fetch single order details
- **GET** `/v1/delivery/store/{store_id}/orders` - List all store orders
- **POST** `/v1/delivery/order/{order_id}/accept` - Accept order
- **POST** `/v1/delivery/order/{order_id}/deny` - Deny order with reason
- **POST** `/v1/delivery/order/{order_id}/cancel` - Cancel order
- **POST** `/v1/delivery/order/{order_id}/ready` - Mark order ready
- **POST** `/v1/delivery/order/{order_id}/adjust-price` - Adjust pricing
- **POST** `/v1/delivery/order/{order_id}/update-ready-time` - Update ready time
- **POST** `/v1/delivery/order/{order_id}/resolve-fulfillment-issues` - Handle out of stock items

### 3. POS Terminal Interface
Interactive CLI for managing orders:
- View orders (local storage)
- Get detailed order information from Uber API
- List all store orders with complete details
- Accept/Deny orders with proper reason codes
- Mark orders as ready for pickup
- Update preparation times
- Adjust prices with tax rates
- Report fulfillment issues

### 4. Data Storage
- File-based JSON storage (easily upgradeable to database)
- Webhook event logging for audit trails
- Operation history tracking
- Easy debugging and data inspection

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Uber Eats Marketplace Account with API access
- ngrok (for exposing local server to internet)

### 1. Environment Configuration

Edit `config.js` with your credentials:

```javascript
// Webhook authentication keys (from Uber Dashboard)
export const PRIMARY_KEY = "UE_TEST_KEY_9f3aA72kL1";
export const SECONDARY_KEY = "UE_TEST_KEY_b81Qp55zX9";

// Your store ID
export const STORE_ID = "your_store_id_here";

// Uber OAuth access token (for API calls)
export const UBER_ACCESS_TOKEN = process.env.UBER_ACCESS_TOKEN || "your_access_token_here";
```

### 2. Set Environment Variables (Recommended)

```bash
export UBER_ACCESS_TOKEN="your_actual_token_here"
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start Webhook Server

```bash
node webhook.js
```

Expected output:
```
🚀 Uber Eats Webhook server running on port 3000
Listening for webhooks at: http://localhost:3000/ubereats/webhook
📡 API Endpoints:
   Local: http://localhost:3000/api/local
   Uber: http://localhost:3000/api/uber
```

### 5. Expose to Internet with ngrok

```bash
ngrok http 3000
```

Copy the `https://xxxx-xx-xxx-xx-xx.ngrok.io` URL to your Uber Developer Dashboard Webhook URL configuration.

### 6. Run POS Terminal (separate terminal)

```bash
node pos-terminal.js
```

## REST API Endpoints

### Local Order Management

**Get all orders**
```bash
curl http://localhost:3000/api/local/orders
```

**Filter by status**
```bash
curl http://localhost:3000/api/local/orders?status=pending&limit=20
```

**Get specific order**
```bash
curl http://localhost:3000/api/local/orders/{orderId}
```

**Clear all records**
```bash
curl -X POST http://localhost:3000/api/local/orders/clear
```

### Uber API Operations

**Get order details from Uber**
```bash
curl http://localhost:3000/api/uber/orders/{orderId}?expand=carts,deliveries,payment
```

**List store orders**
```bash
curl http://localhost:3000/api/uber/store/orders?expand=carts&state=OFFERED
```

**Accept order**
```bash
curl -X POST http://localhost:3000/api/uber/orders/{orderId}/accept \
  -H "Content-Type: application/json" \
  -d '{"ready_for_pickup_time": "2026-01-07T17:30:00Z"}'
```

**Deny order**
```bash
curl -X POST http://localhost:3000/api/uber/orders/{orderId}/deny \
  -H "Content-Type: application/json" \
  -d '{"deny_reason": "STORE_CLOSED"}'
```

**Mark order ready**
```bash
curl -X POST http://localhost:3000/api/uber/orders/{orderId}/ready \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Adjust order price**
```bash
curl -X POST http://localhost:3000/api/uber/orders/{orderId}/adjust-price \
  -H "Content-Type: application/json" \
  -d '{
    "amount_e5": 100000,
    "tax_rate": "8.75",
    "reason": "NEW_ITEM_ADDED"
  }'
```

**Update ready time**
```bash
curl -X POST http://localhost:3000/api/uber/orders/{orderId}/update-ready-time \
  -H "Content-Type: application/json" \
  -d '{"ready_for_pickup_time": "2026-01-07T17:45:00Z"}'
```

**Report fulfillment issues**
```bash
curl -X POST http://localhost:3000/api/uber/orders/{orderId}/resolve-fulfillment-issues \
  -H "Content-Type: application/json" \
  -d '{
    "fulfillment_issues": [{
      "root_item": {"cart_item_id": "item_123"},
      "fulfillment_action": {"action_type": "ASK_CUSTOMER"},
      "fulfillment_issue_type": "OUT_OF_ITEM"
    }]
  }'
```

### Health & Stats

**Health check**
```bash
curl http://localhost:3000/health
```

**Get statistics**
```bash
curl http://localhost:3000/api/local/stats
```

## Order Lifecycle

### Typical Order Flow

1. **Order Received** → `orders.notification` webhook
   - Server validates webhook signature
   - Fetches complete order details from Uber API
   - Saves to local storage
   - Logs to webhook audit trail

2. **Order Processing** → POS Terminal
   - View order in POS terminal
   - Accept or deny order
   - Update preparation status

3. **Delivery Partner Arrives** → `orders.release` webhook
   - Delivery partner is near pickup location
   - Prepare order for handoff

4. **Order Completion**
   - Mark as ready for pickup
   - Delivery partner picks up and delivers
   - System receives delivery updates

5. **Order Fulfillment**
   - `orders.failure` webhook if issues occur
   - `delivery.state_changed` updates
   - Order stored for records

## Data Storage Details

### orders.json Format
```json
{
  "order_id": "504f22ed-abde-44f5-96a4-5fce03c80c08",
  "display_id": "80C08",
  "state": "OFFERED",
  "status": "ACTIVE",
  "ordering_platform": "UBER_EATS",
  "store": {
    "id": "f9b63b20-ad76-46bc-93bb-76c9e86e9e22",
    "name": "Store Name",
    "timezone": "Australia/Sydney"
  },
  "customers": [{
    "id": "37dfb351-e48b-5fb5-a52c-7c7c817178d7",
    "name": {"display_name": "Customer Name"},
    "contact": {"phone": {"number": "+61 480 020 263"}}
  }],
  "carts": [{
    "items": [{
      "id": "item_123",
      "title": "Best Burger",
      "quantity": {"amount": 1, "unit": "PIECE"},
      "picture_url": "https://..."
    }]
  }],
  "payment": {
    "payment_detail": {
      "order_total": {"gross": {"formatted": "A$15.00"}},
      "item_charges": {...},
      "fees": {...}
    }
  },
  "created_time": "2026-01-07T16:24:52+11:00",
  "preparation_time": {
    "ready_for_pickup_time_secs": 900,
    "ready_for_pickup_time": "2026-01-07T16:39:52+11:00"
  },
  "action_eligibility": {
    "cancel": {"is_eligible": true},
    "adjust_ready_for_pickup_time": {"is_eligible": true}
  }
}
```

### webhook_logs.json
Records all received webhook events with:
- Event ID and type
- Event timestamp
- Resource reference
- Full event payload
- Processing status

### actions.json
Audit trail of all system operations:
- Order acceptance/denial
- Price adjustments
- Status updates
- Error records
- API responses

## POS Terminal Usage

### Main Menu Options

```
【Local Operations】
1. View Orders (local storage)
2. Clear All Records

【Uber API Operations】
3. Get Order Details (single order)
4. List Store Orders (all orders)
5. Accept Order
6. Deny Order
7. Cancel Order
8. Mark Order Ready
9. Update Ready Time
10. Adjust Order Price
11. Resolve Fulfillment Issues

0. Exit
```

### Example: Accept Order

```
Enter order ID: order-uuid-here
✅ Order accepted successfully! (Uber API)
```

### Example: Deny Order

```
Enter order ID: order-uuid-here
Select deny reason:
1. STORE_CLOSED
2. ITEM_ISSUE
3. RESTAURANT_TOO_BUSY
4. CAPACITY
5. OTHER

Enter reason: 1
✅ Order denied successfully! (Uber API)
```

## Debugging

### View webhook logs
```bash
tail -f data/webhook_logs.json
```

### View order data
```bash
cat data/orders.json | jq '.' | less
```

### Check console output
The webhook server logs all events and API calls to console in real-time.

### Test webhook locally
```bash
node test-webhook.js
```

## Error Handling

All API responses follow a consistent format:

**Success Response**
```json
{
  "success": true,
  "data": {...}
}
```

**Error Response**
```json
{
  "error": "Error message describing what went wrong"
}
```

## Common Issues & Solutions

### Q: Not receiving webhooks?
A:
1. Verify Webhook URL is correctly configured in Uber Dashboard
2. Check Basic Auth credentials match (PRIMARY_KEY/SECONDARY_KEY)
3. Ensure ngrok is running and URL is current
4. Check server logs for request errors
5. Test with `test-webhook.js`

### Q: Cannot fetch order details?
A:
1. Verify UBER_ACCESS_TOKEN is set and valid
2. Check token has `eats.order` scope
3. Verify order ID is correct
4. Check error message in response

### Q: "Order not in correct state" error?
A:
1. Some operations require specific order states (e.g., OFFERED)
2. Check current order state: `State: OFFERED | Status: ACTIVE`
3. Only eligible actions are available per `action_eligibility`

### Q: Clear all order data?
A:
```bash
rm data/*.json
```

Or use POS terminal: Option 2 → Confirm

## Configuration Options

### config.js
```javascript
export const PRIMARY_KEY = ""; // Webhook primary auth key
export const SECONDARY_KEY = ""; // Webhook secondary auth key
export const STORE_ID = ""; // Your Uber store ID
export const UBER_ACCESS_TOKEN = ""; // OAuth access token
export const WEBHOOK_PORT = 3000; // Server port
```

### Command Line Options
```bash
# Custom API URL
API_URL=http://other-server:3000 node pos-terminal.js

# Custom store ID (if needed)
STORE_ID=custom_id node webhook.js
```

## Next Steps

1. **Database Migration** - Move from JSON to SQLite/PostgreSQL
2. **Error Recovery** - Add retry logic and error handling
3. **Monitoring** - Integrate logging and alerting systems
4. **Enhanced Auth** - Implement OAuth flow
5. **Testing** - Add comprehensive unit/integration tests
6. **Deployment** - Docker containerization and cloud deployment

## API Reference

Complete OpenAPI/Swagger specifications available in `apiDoc/`:
- **Order Fulfillment API.json** - All order operations
- **Integration Activation & Configuration API Suite.json** - Webhook configuration
- **Marketplace Reporting API.json** - Analytics and reporting

## Documentation

- [Uber Eats Developer Docs](https://developer.uber.com/docs/eats)
- [Order Fulfillment API Reference](https://developer.uber.com/docs/eats/references/api/v1/delivery-order)
- [Integration Configuration](https://developer.uber.com/docs/eats/references/api/integration_activation_suite)

## License

MIT
