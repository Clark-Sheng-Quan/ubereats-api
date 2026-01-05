import express from "express";
import bodyParser from "body-parser";
import { handleWebhookEvent } from "./orderService.js";
import apiRoutes from "./apiRoutes.js";
import { PRIMARY_KEY, SECONDARY_KEY, USERNAME } from "./config.js";

const app = express();
app.use(bodyParser.json());
app.use("/api", apiRoutes);

function isValidBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.replace("Basic ", "");
  const decoded = Buffer.from(base64Credentials, "base64").toString("utf8");

  // decoded format: "username:password"
  const [username, password] = decoded.split(":");

  if (username !== USERNAME) return false;

  // Accept either primary or secondary key
  return password === PRIMARY_KEY || password === SECONDARY_KEY;
}

app.post("/ubereats/webhook", async (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!isValidBasicAuth(authHeader)) {
    console.log("❌ Invalid Basic Auth");
    return res.sendStatus(401);
  }

  try {
    const webhookData = req.body;
    console.log("✅ Valid webhook received:", webhookData.event_type);
    console.log("📊 Webhook details:", JSON.stringify(webhookData, null, 2));

    // Handle the webhook event asynchronously
    await handleWebhookEvent(webhookData);

    // MUST return 200 or Uber will retry
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    // Still return 200 to acknowledge receipt, but log the error
    res.sendStatus(200);
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log("🚀 Uber Eats Webhook server running on port 3000");
  console.log("Listening for webhooks at: http://localhost:3000/ubereats/webhook");
});
