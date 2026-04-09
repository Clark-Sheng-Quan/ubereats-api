# POS Frontend

A modern, simple, and efficient POS (Point of Sale) Terminal system for managing orders independently.

## Features

- **Real-time Order Management**: Automatically poll and display pending orders from the backend
- **Order Operations**: Accept, reject, and track order status (pending → accepted → preparing → completed)
- **Clean UI**: Intuitive split-view design with order list and details panel
- **Search & Filter**: Search orders by order number or customer name
- **Status Tracking**: Visual status indicators for each order
- **Responsive Design**: Works on desktop and tablet displays

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Context API** - State management

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will start on `http://localhost:5174`

### Environment Configuration

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:3000
VITE_POLLING_INTERVAL=5000
```

- `VITE_API_URL`: Backend API base URL
- `VITE_POLLING_INTERVAL`: Order polling interval in milliseconds

### Build

```bash
npm run build
```

Production-ready build output is in the `dist/` directory.

## Project Structure

```
src/
├── components/         # React components
│   ├── POSTerminal.tsx # Main terminal component
│   ├── OrderList.tsx   # Order list view
│   └── OrderDetails.tsx # Order details panel
├── context/           # React Context
│   └── OrderContext.tsx # Order state management
├── services/          # API services
│   └── orderService.ts # Order API calls
├── App.tsx           # Root component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## API Integration

The POS terminal connects to the following backend endpoints:

- `GET /api/local/orders?status=pending&limit=50` - Fetch pending orders
- `POST /api/order/orders/{id}/accept` - Accept an order
- `POST /api/order/orders/{id}/deny` - Reject an order with reason
- `PUT /api/order/orders/{id}/status` - Update order status

## Features in Detail

### Order List
- Displays all pending orders with quick preview
- Search functionality to filter by order number or customer name
- Shows item count and total price at a glance
- Click to select and view full details

### Order Details
- View complete order information
- See all items with quantities and notes
- Display special instructions and internal notes
- Action buttons based on order status:
  - **Pending**: Accept or Reject
  - **Accepted**: Mark as Preparing
  - **Preparing**: Mark as Ready/Completed
- Real-time status updates

### Auto-Polling
- Configurable polling interval
- Automatic refresh of order list
- Visual connection status indicator

## Usage Tips

1. **Accept Order Flow**: Click Accept → order moves to "Accepted" status
2. **Start Preparation**: Click "Mark Preparing" when you begin preparation
3. **Complete Order**: Click "Mark Ready" when order is complete
4. **Reject Order**: Click Reject and provide a reason if order cannot be prepared

## Styling

The UI uses Tailwind CSS with a clean, minimal design featuring:
- Consistent color scheme (blue for primary, green for success, red for alerts)
- Easy-to-read typography
- Responsive layout that adapts to different screen sizes
- Clear visual hierarchy and status indicators
