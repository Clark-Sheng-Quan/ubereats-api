# POS Frontend Architecture

## Overview

The POS (Point of Sale) Frontend is a standalone React-based order management system designed to independently operate from the main Uber Eats admin frontend. It provides a clean, intuitive interface for restaurant staff to receive, accept, and manage orders from the backend system.

## Key Differences from Main Frontend

| Aspect | Main Frontend | POS Frontend |
|--------|---------------|-------------|
| Purpose | Full admin dashboard | Order management only |
| Location | `/frontend` | `/pos-frontend` |
| Port | 5174 | 5175 |
| Features | Store config, analytics | Order operations |
| Target Users | Management | Kitchen staff |
| Dependencies | Independent | Independent |

## Architecture

### Directory Structure

```
pos-frontend/
├── src/
│   ├── components/          # React UI components
│   │   ├── POSTerminal.tsx  # Main container with polling
│   │   ├── OrderList.tsx    # Left sidebar - order list
│   │   └── OrderDetails.tsx # Right panel - order details
│   ├── context/
│   │   └── OrderContext.tsx # Global state management
│   ├── services/
│   │   └── orderService.ts  # Backend API calls
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   ├── index.css            # Tailwind + custom styles
│   └── vite-env.d.ts        # Type definitions
├── public/                  # Static assets
├── index.html              # HTML entry
├── vite.config.ts          # Vite build config
├── tailwind.config.js      # Tailwind CSS
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── .env.example            # Config template
```

### Component Hierarchy

```
App
└── OrderProvider (Context)
    └── POSTerminal
        ├── Header
        ├── OrderList
        │   └── OrderCard (reusable)
        └── OrderDetails
            ├── OrderHeader
            ├── ItemsList
            ├── SpecialInstructions
            └── ActionButtons
```

### State Management

Uses React Context API (no Redux needed for simplicity):

```
OrderContext
├── orders: Order[]              # All pending orders
├── selectedOrder: Order | null  # Currently selected
├── setSelectedOrder()
├── addOrder()
├── updateOrder()
└── removeOrder()
```

### Data Flow

```
1. POSTerminal mounts → schedules polling
2. orderService.fetchPendingOrders() → backend API
3. Response → OrderContext (add/update orders)
4. Selected order → OrderDetails panel
5. User action → orderService method
6. API response → OrderContext update
7. UI re-renders automatically
```

## API Integration

### Endpoints Used

1. **Fetch Orders**
   ```
   GET /api/local/orders?status=pending&limit=50
   ```

2. **Accept Order**
   ```
   POST /api/order/orders/{id}/accept
   ```

3. **Reject Order**
   ```
   POST /api/order/orders/{id}/deny
   Body: { reason: string }
   ```

4. **Update Status**
   ```
   PUT /api/order/orders/{id}/status
   Body: { status: 'preparing' | 'completed' }
   ```

### Auto-Polling

- Configurable interval (default: 5000ms)
- Runs continuously while app is open
- Updates orders and maintains selection
- Connection status indicator

## UI/UX Design

### Layout

**Split-view design** (responsive):
- Left: Order list (1/3 width on desktop, full on mobile)
- Right: Order details (2/3 width on desktop, hidden on mobile)

### Color Scheme

- **Primary**: Blue (selection, primary actions)
- **Success**: Green (accept, completed)
- **Warning**: Yellow (pending status)
- **Danger**: Red (reject)
- **Info**: Purple (preparing)

### User Interactions

1. **Browse Orders**
   - Search by order number or customer name
   - Click card to select
   - Visual feedback on selection

2. **View Details**
   - Full order information
   - Items with notes
   - Special instructions
   - Total pricing

3. **Manage Orders**
   - Accept → transitions to "accepted"
   - Mark Preparing → "preparing"
   - Mark Ready → "completed"
   - Reject → removes from list (with reason prompt)

## Technology Stack

- **Framework**: React 18.3
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State**: React Context API
- **Deployment**: Static hosting (dist/ folder)

## Performance Considerations

1. **Polling**: 5s interval balances freshness vs server load
2. **Memoization**: useCallback for event handlers
3. **Lazy Updates**: Only updates changed orders
4. **Search**: Client-side filtering (no API call)

## Deployment Strategies

### 1. Development
```bash
cd pos-frontend
npm install
npm run dev  # Runs on localhost:5175
```

### 2. Production Build
```bash
npm run build  # Creates dist/ folder
npm run preview  # Test production build locally
```

### 3. Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
ENV VITE_API_URL=http://api.example.com
EXPOSE 5175
CMD ["npm", "run", "preview"]
```

### 4. Nginx Serving
```nginx
server {
    listen 80;
    root /var/www/pos-frontend;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://backend:3000;
    }
}
```

## Configuration

### Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:3000
VITE_POLLING_INTERVAL=5000
```

## Scaling & Extensibility

### Future Features

1. **Voice Alerts**: Notify staff when new orders arrive
2. **Kitchen Display**: Large screen for kitchen viewing
3. **Multi-location**: Support multiple restaurant locations
4. **Queue Management**: Priority ordering
5. **Analytics**: Order metrics and timing
6. **Offline Support**: Service worker caching

### Extension Points

- Add more order statuses in `OrderContext`
- Extend `orderService` with new API methods
- Create new components (e.g., KitchenDisplay)
- Integrate with WebSocket for real-time updates

## Error Handling

1. **Network Errors**: Shows connection status indicator
2. **API Errors**: Displays user-friendly error messages
3. **Validation**: Client-side form validation
4. **Timeouts**: 30-second request timeout with abort

## Security

- ✅ HTTPS in production
- ✅ CORS configured on backend
- ✅ No credentials stored in frontend
- ✅ XSS protection via React
- ✅ CSRF tokens (if needed per backend)

## Maintenance

- Keep React and dependencies updated
- Monitor polling interval for performance
- Check browser console for errors
- Regular testing on various screen sizes

## Integration with start-all.sh

The updated `start-all.sh` automatically:
1. Installs dependencies for pos-frontend
2. Starts POS frontend on port 5175
3. Coordinates with backend (3000) and main frontend (5174)
4. Manages ngrok tunneling

Usage:
```bash
./start-all.sh
```

Services will be available at:
- Backend: http://localhost:3000
- Frontend: http://localhost:5174
- POS Frontend: http://localhost:5175
