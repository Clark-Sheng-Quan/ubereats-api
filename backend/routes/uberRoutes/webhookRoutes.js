/**
 * Webhook Routes
 * Handles Uber Eats webhook events
 * Path: /ubereats/webhook
 */

import express from "express";
import crypto from "crypto";
import { handleWebhookEvent } from "../../services/uberServices/webhookService.js";
import { PRIMARY_KEY, SECONDARY_KEY } from "../../config/config.js";

const router = express.Router();

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

/**
 * POST /webhook or /ubereats/webhook
 * Receive webhook events from Uber Eats
 */
router.post("/webhook", (req, res) => {
  const signature = req.headers["x-uber-signature"];
  const rawBody = JSON.stringify(req.body);

  // Try to verify with primary key first, then secondary key
  const isValidPrimary = verifyWebhookSignature(signature, rawBody, PRIMARY_KEY);
  const isValidSecondary = verifyWebhookSignature(
    signature,
    rawBody,
    SECONDARY_KEY
  );

  if (!isValidPrimary && !isValidSecondary) {
    console.log("[webhookRoutes]❌ Invalid webhook signature");
    return res.sendStatus(401);
  }

  (async () => {
    try {
      const webhookData = req.body;
      console.log("[webhookRoutes]Valid webhook received:", webhookData.event_type);

      // Handle the webhook event asynchronously
      await handleWebhookEvent(webhookData);

      // MUST return 200 or Uber will retry
      res.sendStatus(200);
    } catch (error) {
      console.error("[webhookRoutes]❌ Error processing webhook:", error);
      res.sendStatus(200);
    }
  })();
});

export default router;
