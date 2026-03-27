/**
 * OAuth Token Manager for Uber Eats API
 * Handles token generation, caching, and automatic refresh
 */

import {
  UBER_CONFIG,
  TOKEN_CONFIG,
} from "../config/config.js";
import { dbQuery } from "../db/client.js";

const OAUTH_TOKEN_URL = UBER_CONFIG.TOKEN_URL;
const TOKEN_SCOPE = "eats.order eats.store eats.store.status.write";
const TOKEN_BUFFER_SECONDS = TOKEN_CONFIG.bufferSeconds; // From config

// In-memory token cache
let cachedToken = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Load token from database on startup
 */
async function loadTokenFromDb() {
  try {
    const { rows } = await dbQuery(
      "SELECT access_token, expires_at FROM uber_oauth_tokens WHERE id = 1"
    );

    const token = rows[0];
    if (!token?.access_token || !token?.expires_at) {
      return false;
    }

    const expiresAt = Number(token.expires_at);
    if (expiresAt > Date.now() + TOKEN_BUFFER_SECONDS * 1000) {
      cachedToken = {
        accessToken: token.access_token,
        expiresAt,
      };
      console.log(`✅ Loaded valid token from database cache, expires: ${new Date(cachedToken.expiresAt).toISOString()}`);
      return true;
    }

    console.log("⚠️ Cached token expired, will fetch new one");
    return false;
  } catch (error) {
    console.error("Error loading token from database:", error.message);
  }
  return false;
}

/**
 * Save token to database for persistence across restarts
 */
async function saveTokenToDb() {
  try {
    await dbQuery(
      `
      INSERT INTO uber_oauth_tokens (id, access_token, expires_at, updated_at)
      VALUES (1, $1, $2, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      `,
      [cachedToken.accessToken, cachedToken.expiresAt]
    );
  } catch (error) {
    console.error("Error saving token to database:", error.message);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 * Loads from file on first call, then uses in-memory cache
 * @returns {Promise<string>} Valid access token
 */
export async function getAccessToken() {
  // Load from database on first call (when cachedToken is empty)
  if (!cachedToken.accessToken && !cachedToken.expiresAt) {
    await loadTokenFromDb();
  }

  // Check if cached token is still valid
  if (
    cachedToken.accessToken &&
    cachedToken.expiresAt > Date.now() + TOKEN_BUFFER_SECONDS * 1000
  ) {
    return cachedToken.accessToken;
  }

  return await fetchNewToken();
}

/**
 * Fetch a new token from Uber OAuth endpoint
 * @returns {Promise<string>} New access token
 */
async function fetchNewToken() {
  try {
    const formData = new URLSearchParams();
    formData.append("client_id", UBER_CONFIG.CLIENT_ID);
    formData.append("client_secret", UBER_CONFIG.CLIENT_SECRET);
    formData.append("grant_type", "client_credentials");
    formData.append("scope", TOKEN_SCOPE);

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `OAuth token request failed: ${response.status} ${errorData}`
      );
    }

    const data = await response.json();

    // Cache the token both in memory and in file
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    await saveTokenToDb();

    console.log(`   ✅ New token obtained, expires: ${new Date(cachedToken.expiresAt).toISOString()}`);

    return data.access_token;
  } catch (error) {
    console.error("❌ Error fetching OAuth token:", error.message);
    throw error;
  }
}

/**
 * Invalidate cached token (useful for testing or if token becomes invalid)
 */
export function invalidateToken() {
  cachedToken = {
    accessToken: null,
    expiresAt: null,
  };
  dbQuery("DELETE FROM uber_oauth_tokens WHERE id = 1").catch((error) => {
    console.error("Error deleting token from database:", error.message);
  });
  console.log("🗑️ Cached token invalidated");
}

/**
 * Get token cache status (for debugging)
 */
export function getTokenStatus() {
  if (!cachedToken.accessToken) {
    return "No token cached";
  }

  const now = Date.now();
  const expiresIn = Math.round((cachedToken.expiresAt - now) / 1000);

  return {
    cached: true,
    expiresIn: expiresIn,
    expiresAt: new Date(cachedToken.expiresAt).toISOString(),
    isValid: expiresIn > TOKEN_BUFFER_SECONDS,
  };
}
