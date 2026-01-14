/**
 * OAuth Token Manager for Uber Eats API
 * Handles token generation, caching, and automatic refresh
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  UBER_CLIENT_ID,
  UBER_CLIENT_SECRET,
  TOKEN_CONFIG,
} from "../config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OAUTH_TOKEN_URL = "https://sandbox-login.uber.com/oauth/v2/token";
const TOKEN_SCOPE = "eats.order eats.store eats.store.status.write";
const TOKEN_BUFFER_SECONDS = TOKEN_CONFIG.bufferSeconds; // From config
const TOKEN_FILE = path.join(__dirname, "../data/oauth_token.json");

// In-memory token cache
let cachedToken = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Load token from file on startup
 */
function loadTokenFromFile() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = fs.readFileSync(TOKEN_FILE, "utf8");
      const token = JSON.parse(data);
      
      // Check if token is still valid (with buffer)
      if (token.expiresAt > Date.now() + TOKEN_BUFFER_SECONDS * 1000) {
        cachedToken = token;
        console.log(`✅ Loaded valid token from cache, expires: ${new Date(cachedToken.expiresAt).toISOString()}`);
        return true;
      } else {
        console.log("⚠️ Cached token expired, will fetch new one");
        return false;
      }
    }
  } catch (error) {
    console.error("Error loading token from file:", error.message);
  }
  return false;
}

/**
 * Save token to file for persistence across restarts
 */
function saveTokenToFile() {
  try {
    const dir = path.dirname(TOKEN_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(cachedToken, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving token to file:", error.message);
  }
}

/**
 * Get a valid access token, refreshing if necessary
 * Loads from file on first call, then uses in-memory cache
 * @returns {Promise<string>} Valid access token
 */
export async function getAccessToken() {
  // Load from file on first call (when cachedToken is empty)
  if (!cachedToken.accessToken && !cachedToken.expiresAt) {
    loadTokenFromFile();
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
    formData.append("client_id", UBER_CLIENT_ID);
    formData.append("client_secret", UBER_CLIENT_SECRET);
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
    saveTokenToFile();

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
  // Also delete the file
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      fs.unlinkSync(TOKEN_FILE);
    }
  } catch (error) {
    console.error("Error deleting token file:", error.message);
  }
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
