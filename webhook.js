import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import { handleWebhookEvent } from "./orderService.js";
import apiRoutes from "./apiRoutes.js";
import { PRIMARY_KEY, SECONDARY_KEY } from "./config.js";

const app = express();
app.use(bodyParser.json());
app.use("/api", apiRoutes);

/**
 * Verify Uber webhook signature using HMAC-SHA256
 * @param {string} signature - The signature from x-uber-signature header
 * @param {string} body - The raw request body as string
 * @param {string} signingKey - The signing key to verify against
 * @returns {boolean} True if signature is valid
 */
function verifyWebhookSignature(signature, body, signingKey) {
  try {
    const computed = crypto
      .createHmac("sha256", signingKey)
      .update(body)
      .digest("hex");

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
  } catch (error) {
    console.error("Error verifying signature:", error.message);
    return false;
  }
}

app.post("/ubereats/webhook", (req, res) => {
  const signature = req.headers["x-uber-signature"];
  const rawBody = JSON.stringify(req.body);

  console.log("🔍 Signature received:", signature);

  // Try to verify with primary key first, then secondary key
  const isValidPrimary = verifyWebhookSignature(signature, rawBody, PRIMARY_KEY);
  const isValidSecondary = verifyWebhookSignature(
    signature,
    rawBody,
    SECONDARY_KEY
  );

  if (!isValidPrimary && !isValidSecondary) {
    console.log("❌ Invalid webhook signature");
    return res.sendStatus(401);
  }

  console.log("✅ Valid webhook signature verified");

  (async () => {
    try {
      const webhookData = req.body;
      console.log("✅ Valid webhook received:", webhookData.event_type);
      console.log(
        "📊 Webhook details:",
        JSON.stringify(webhookData, null, 2)
      );

      // Handle the webhook event asynchronously
      await handleWebhookEvent(webhookData);

      // MUST return 200 or Uber will retry
      res.sendStatus(200);
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      // Still return 200 to acknowledge receipt, but log the error
      res.sendStatus(200);
    }
  })();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(3000, () => {
  console.log("🚀 Uber Eats Webhook server running on port 3000");
  console.log("Listening for webhooks at: http://localhost:3000/ubereats/webhook");
});
