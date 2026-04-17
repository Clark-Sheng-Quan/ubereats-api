import express from "express";
import bodyParser from "body-parser";

// Polyfill for Object.hasOwn (Node.js < 16.9.0)
if (!Object.hasOwn) {
  Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}

import localRoutes from "./routes/localRoutes.js";
import orderRoutes from "./routes/uberRoutes/orderRoutes.js";
import storeRoutes from "./routes/uberRoutes/storeRoutes.js";
import menuRoutes from "./routes/uberRoutes/menuRoutes.js";
import webhookRoutes from "./routes/uberRoutes/webhookRoutes.js";
import posServiceRoutes from "./routes/posServiceRoutes.js";
import uberRoutes from "./routes/uberRoutes/uberRoutes.js";
import mappingRoutes from "./routes/mappingRoutes.js";
import { initDatabase } from "./db/client.js";
import { verifyPOSToken } from "./services/tokenService.js";
import {
  clearStoredPosToken,
  getStoredPosToken,
  getValidPosToken,
} from "./services/posAuthService.js";

const app = express();
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

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
app.use("/api/mapping", mappingRoutes);
app.use("/ubereats", webhookRoutes);  // Uber webhooks at /ubereats/webhook

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function ensurePosTokenOnStartup() {
  console.log("[startup] Checking POS token for backend workflow...");

  const stored = getStoredPosToken();
  if (!stored?.pos_token) {
    console.warn("[startup] POS token not found, attempting backend auto-login...");
    await getValidPosToken({ forceRefresh: true });
    console.log("[startup] POS token obtained via backend auto-login");
    return;
  }

  const verified = await verifyPOSToken(stored.pos_token);
  if (verified) {
    console.log("[startup] Existing POS token verified");
    return;
  }

  console.warn("[startup] Stored POS token is invalid, refreshing via backend auto-login...");
  clearStoredPosToken("startup-token-invalid");
  await getValidPosToken({ forceRefresh: true });
  console.log("[startup] POS token refreshed at startup");
}

await initDatabase();

try {
  await ensurePosTokenOnStartup();
} catch (error) {
  console.error("[startup] POS token bootstrap failed:", error.message);
}

app.listen(3000, () => {
  console.log("Listening for webhooks at: http://localhost:3000/ubereats/webhook");
});
