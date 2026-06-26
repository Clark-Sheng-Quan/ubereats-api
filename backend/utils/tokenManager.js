/**
 * OAuth Token Manager for Uber Eats API
 * Handles token loading, caching, and automatic refresh via refresh_token
 */

import {
  UBER_CONFIG,
  TOKEN_CONFIG,
} from "../config/config.js";
import { dbQuery } from "../db/client.js";

const TOKEN_URL = UBER_CONFIG.TOKEN_URL;
const TOKEN_BUFFER_SECONDS = TOKEN_CONFIG.bufferSeconds;

// In-memory token cache
let cachedToken = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
};

// Prevent concurrent refresh races
let refreshPromise = null;

/**
 * Load token from database on startup
 */
async function loadTokenFromDb() {
  try {
    const { rows } = await dbQuery(
      "SELECT access_token, refresh_token, expires_at FROM uber_oauth_tokens WHERE id = 1"
    );

    const token = rows[0];
    if (!token?.access_token || !token?.expires_at) {
      return false;
    }

    cachedToken = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || null,
      expiresAt: Number(token.expires_at),
    };

    const isValid = cachedToken.expiresAt > Date.now() + TOKEN_BUFFER_SECONDS * 1000;
    if (isValid) {
      console.log(`✅ Loaded valid Uber OAuth token from DB cache, expires: ${new Date(cachedToken.expiresAt).toISOString()}`);
    } else {
      console.log("⚠️ Cached token expired, will refresh on next request");
    }
    return true;
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
      INSERT INTO uber_oauth_tokens (id, access_token, refresh_token, expires_at, updated_at)
      VALUES (1, $1, $2, $3, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, uber_oauth_tokens.refresh_token),
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      `,
      [cachedToken.accessToken, cachedToken.refreshToken, cachedToken.expiresAt]
    );
  } catch (error) {
    console.error("Error saving token to database:", error.message);
  }
}

/**
 * Use refresh_token to get a new access_token from Uber
 */
async function refreshAccessToken() {
  if (!cachedToken.refreshToken) {
    throw new Error(
      "No refresh_token available. Please re-authorize via the web UI (Connect Uber Account)."
    );
  }

  console.log("[tokenManager] 🔄 Refreshing Uber access token with refresh_token...");

  const formData = new URLSearchParams();
  formData.append("grant_type", "refresh_token");
  formData.append("refresh_token", cachedToken.refreshToken);
  formData.append("client_id", UBER_CONFIG.CLIENT_ID);
  formData.append("client_secret", UBER_CONFIG.CLIENT_SECRET);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
  }

  const data = await response.json();

  cachedToken = {
    accessToken: data.access_token,
    // Uber may or may not return a new refresh_token — keep old one if not
    refreshToken: data.refresh_token || cachedToken.refreshToken,
    expiresAt: Date.now() + (data.expires_in || TOKEN_CONFIG.lifetimeSeconds) * 1000,
  };

  await saveTokenToDb();

  console.log(`[tokenManager] ✅ Token refreshed, expires: ${new Date(cachedToken.expiresAt).toISOString()}`);
  return cachedToken.accessToken;
}

/**
 * Get a valid access token, refreshing automatically if expired
 */
export async function getAccessToken() {
  // Load from database on first call
  if (!cachedToken.accessToken && !cachedToken.expiresAt) {
    await loadTokenFromDb();
  }

  // Token is still valid
  if (
    cachedToken.accessToken &&
    cachedToken.expiresAt > Date.now() + TOKEN_BUFFER_SECONDS * 1000
  ) {
    return cachedToken.accessToken;
  }

  // Token expired — refresh using refresh_token (deduplicated)
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/**
 * Save a new token set (called after OAuth authorization_code exchange)
 * This is the entry point when user re-connects their Uber account
 */
export async function saveOAuthTokens({ accessToken, refreshToken, expiresIn }) {
  cachedToken = {
    accessToken,
    refreshToken: refreshToken || cachedToken.refreshToken,
    expiresAt: Date.now() + (expiresIn || TOKEN_CONFIG.lifetimeSeconds) * 1000,
  };
  await saveTokenToDb();
  console.log(`[tokenManager] ✅ OAuth tokens saved, expires: ${new Date(cachedToken.expiresAt).toISOString()}`);
}

/**
 * Invalidate cached token
 */
export function invalidateToken() {
  cachedToken = { accessToken: null, refreshToken: null, expiresAt: null };
  dbQuery("DELETE FROM uber_oauth_tokens WHERE id = 1").catch((error) => {
    console.error("Error deleting token from database:", error.message);
  });
}

/**
 * Get token cache status (for debugging/UI)
 */
export function getTokenStatus() {
  if (!cachedToken.accessToken) {
    return { cached: false, message: "No token cached. Please connect Uber account." };
  }

  const now = Date.now();
  const expiresIn = Math.round((cachedToken.expiresAt - now) / 1000);

  return {
    cached: true,
    hasRefreshToken: !!cachedToken.refreshToken,
    expiresIn,
    expiresAt: new Date(cachedToken.expiresAt).toISOString(),
    isValid: expiresIn > TOKEN_BUFFER_SECONDS,
  };
}
