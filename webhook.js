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

const app = express();
app.use(bodyParser.json());

// Register route groups
app.use("/api/local", localRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/menu", menuRoutes);
app.use("", webhookRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log("🚀 Uber Eats Webhook server running on port 3000");
  console.log("Listening for webhooks at: http://localhost:3000/ubereats/webhook");
});
