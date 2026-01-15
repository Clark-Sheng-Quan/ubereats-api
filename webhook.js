import express from "express";
import bodyParser from "body-parser";

// Polyfill for Object.hasOwn (Node.js < 16.9.0)
if (!Object.hasOwn) {
  Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}

import localRoutes from "./routes/localRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import posServiceRoutes from "./routes/posServiceRoutes.js";
import uberRoutes from "./routes/uberRoutes.js";

const app = express();
app.use(bodyParser.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  
  next();
});

// Register route groups
app.use("/api/local", localRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/service/pos", posServiceRoutes);
app.use("/api/uber", uberRoutes);
app.use("/ubereats", webhookRoutes);  // Uber webhooks at /ubereats/webhook

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log("Listening for webhooks at: http://localhost:3000/ubereats/webhook");
});
