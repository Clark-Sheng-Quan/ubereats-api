# POS Terminal Frontend - Quick Start Guide

## 🚀 What's New?

A brand new **independent POS (Point of Sale) Frontend** has been created! It's a standalone React application designed specifically for restaurant kitchen staff to manage orders in real-time.

### Key Features
✅ **Independent**: Completely separate from the main admin frontend  
✅ **Real-time**: Auto-polls backend every 5 seconds  
✅ **Simple UI**: Clean, intuitive interface focused on order management  
✅ **Full Control**: Accept, reject, and track order status  
✅ **Search Ready**: Find orders by number or customer name  
✅ **Responsive**: Works on desktop and tablet  

---

## 📁 Location & Structure

```
ubereats-api/
├── pos-frontend/              NEW! POS Terminal Frontend
│   ├── src/                   React source code
│   ├── package.json
│   ├── vite.config.ts
│   ├── README.md              Full documentation
│   └── SETUP.md               Setup guide
├── frontend/                  Existing admin frontend
├── backend/                   Existing backend
└── start-all.sh              Updated - starts all 3 services
```

---

## Quick Start

### Run POS Frontend Only

```bash
cd pos-frontend
npm install
npm run dev
```

Open: **http://localhost:5175**

### Run Everything Together

```bash
./start-all.sh
```

Services will be available at:
- Backend: http://localhost:3000
- Admin Frontend: http://localhost:5174
- POS Terminal: http://localhost:5175

---

## UI Features

- **Split-view layout**: Order list (left) + Details (right)
- **Real-time updates**: Auto-polls backend every 5 seconds
- **Search & filter**: Find orders by number or customer name
- **Order workflow**: Accept → Preparing → Completed
- **Status indicators**: Visual badges for each order state
- **Connection status**: Green dot = connected
- **Responsive design**: Works on desktop and tablets

---

## Configuration

Create `.env` in `pos-frontend/`:

```env
VITE_API_URL=http://localhost:3000
VITE_POLLING_INTERVAL=5000
```

---

## Production Deployment

### Build

```bash
cd pos-frontend
npm run build
```

Creates optimized `dist/` folder.

### Docker

```bash
docker build -t pos-frontend .
docker run -p 5175:5175 \
  -e VITE_API_URL=http://api.example.com \
  pos-frontend
```

### Nginx

```nginx
server {
    listen 80;
    root /var/www/pos-frontend;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Documentation

- `pos-frontend/README.md` - Full features and architecture
- `pos-frontend/SETUP.md` - Detailed setup and API specs
- `POS_FRONTEND_ARCHITECTURE.md` - Technical design
- This file - Quick reference

---

## Support & Troubleshooting

**No orders showing?**
- Check `.env` VITE_API_URL is correct
- Verify backend is running
- Open browser console (F12) for errors

**Connection red?**
- Is backend running at configured URL?
- Check CORS is enabled on backend

**Build fails?**
- Run `npm install` again
- Delete `node_modules` and `dist` folders
- Try building again

---

## Technology

- React 18 + TypeScript
- Vite (fast build)
- Tailwind CSS (styling)
- Context API (state)

---

**The new POS Frontend is production-ready for real restaurant environments!**
