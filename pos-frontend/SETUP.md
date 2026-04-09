# POS Frontend - Setup & Deployment Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development
```bash
npm run dev
```
The dev server runs on `http://localhost:5174`

### 3. Production Build
```bash
npm run build
npm run preview
```

## Configuration

### Environment Variables
Create `.env` file from `.env.example`:

```env
VITE_API_URL=http://localhost:3000
VITE_POLLING_INTERVAL=5000
```

- **VITE_API_URL**: Backend API base URL (default: http://localhost:3000)
- **VITE_POLLING_INTERVAL**: Order polling interval in milliseconds (default: 5000)

## API Requirements

The POS terminal requires these backend endpoints to be available:

### 1. Fetch Pending Orders
```
GET /api/local/orders?status=pending&limit=50
```
Response:
```json
{
  "orders": [
    {
      "id": "order-123",
      "orderNumber": "#1001",
      "customerId": "customer-456",
      "customerName": "John Doe",
      "items": [
        {
          "id": "item-1",
          "name": "Burger",
          "quantity": 2,
          "price": 12.99,
          "notes": "No onions"
        }
      ],
      "totalPrice": 25.98,
      "specialInstructions": "Please prepare quickly",
      "status": "pending",
      "createdAt": "2024-04-09T06:42:40.551Z",
      "notes": "VIP customer"
    }
  ]
}
```

### 2. Accept Order
```
POST /api/order/orders/{orderId}/accept
```

### 3. Reject Order
```
POST /api/order/orders/{orderId}/deny
Body: { "reason": "Out of stock" }
```

### 4. Update Order Status
```
PUT /api/order/orders/{orderId}/status
Body: { "status": "preparing" | "completed" }
```

## Features

- **Order List Panel**: Left sidebar showing all pending orders
- **Search & Filter**: Find orders by order number or customer name
- **Order Details**: Full order information with items and pricing
- **Status Workflow**: 
  - Pending → Accept/Reject
  - Accepted → Mark Preparing
  - Preparing → Mark Ready/Completed
- **Real-time Updates**: Auto-polls backend every 5 seconds
- **Connection Status**: Visual indicator (green = connected, red = disconnected)

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ POS Terminal Header (Title + Order Count + Status)      │
├──────────────────────┬──────────────────────────────────┤
│   Order List Panel   │     Order Details Panel          │
│                      │                                  │
│ - Search bar         │ - Order header                   │
│ - Order cards        │ - Items list                     │
│   (clickable)        │ - Special instructions           │
│ - Status badges      │ - Action buttons                 │
│ - Price display      │ - Status indicator               │
└──────────────────────┴──────────────────────────────────┘
```

## Status Colors

- **Pending**: Yellow background
- **Accepted**: Blue background
- **Preparing**: Purple background
- **Completed**: Green background
- **Rejected**: Red background

## Troubleshooting

### No orders appearing?
1. Check API URL in `.env` is correct
2. Verify backend is running and accessible
3. Check browser console for API errors
4. Ensure backend has pending orders

### Connection status showing red?
1. Verify `VITE_API_URL` is correct
2. Check if backend API is running
3. Check network connectivity
4. Look for CORS issues in browser console

### Build errors?
1. Run `npm install` to ensure dependencies are installed
2. Clear `dist` and `node_modules` folders if needed
3. Run `npm run build` again

## Deployment

### Using Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV VITE_API_URL=http://api.example.com
EXPOSE 5174

CMD ["npm", "run", "preview"]
```

Build and run:
```bash
docker build -t pos-frontend .
docker run -p 5174:5174 \
  -e VITE_API_URL=http://api.example.com \
  pos-frontend
```

### Using Nginx

1. Build the project: `npm run build`
2. Copy `dist/` contents to nginx serving directory
3. Configure nginx to serve `index.html` for all routes

```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
}
```

## File Structure

```
pos-frontend/
├── src/
│   ├── components/           # React components
│   │   ├── POSTerminal.tsx  # Main container
│   │   ├── OrderList.tsx    # Order list view
│   │   └── OrderDetails.tsx # Order details panel
│   ├── context/
│   │   └── OrderContext.tsx # Global state management
│   ├── services/
│   │   └── orderService.ts  # API calls
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   ├── index.css            # Global styles
│   └── vite-env.d.ts        # Type definitions
├── public/                   # Static assets
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies
└── .env.example             # Environment template
```
