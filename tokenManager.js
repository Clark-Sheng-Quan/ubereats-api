/**
 * OAuth Token Manager for Uber Eats API
 * Handles token generation, caching, and automatic refresh
 */

import {
  UBER_CLIENT_ID,
  UBER_CLIENT_SECRET,
} from "./config.js";

const OAUTH_TOKEN_URL = "https://sandbox-login.uber.com/oauth/v2/token";
const TOKEN_SCOPE = "eats.order";
const TOKEN_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiration

// In-memory token cache
let cachedToken = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Get a valid access token, refreshing if necessary
 * @returns {Promise<string>} Valid access token
 */
export async function getAccessToken() {
  // Check if cached token is still valid
  if (
    cachedToken.accessToken &&
    cachedToken.expiresAt > Date.now() + TOKEN_BUFFER_SECONDS * 1000
  ) {
    console.log("✅ Using cached token");
    return cachedToken.accessToken;
  }

  console.log("🔄 Fetching new OAuth token...");
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

    // Cache the token
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    console.log(
      `✅ New token obtained, expires in ${data.expires_in} seconds`
    );
    console.log(`   Token valid until: ${new Date(cachedToken.expiresAt).toISOString()}`);

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
