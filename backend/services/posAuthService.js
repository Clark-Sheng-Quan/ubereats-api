import fs from "fs";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import { STORAGE_CONFIG } from "../config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "../data");
const authFile = path.join(dataDir, STORAGE_CONFIG.posAuthFile || "pos_auth.json");
const POS_API_BASE_URL = "https://dev.vend88.com";

const tokenLock = {
  promise: null,
};

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readAuthFile() {
  try {
    if (!fs.existsSync(authFile)) {
      return null;
    }
    const content = fs.readFileSync(authFile, "utf8");
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error("[posAuthService] Failed to read pos auth file:", error.message);
    return null;
  }
}

function writeAuthFile(payload) {
  ensureDataDir();
  fs.writeFileSync(authFile, JSON.stringify(payload, null, 2), "utf8");
}

function normalizeToken(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function extractPosTokenFromLoginResponse(payload = {}) {
  const candidates = [
    payload?.token,
    payload?.access_token,
    payload?.auth_token,
    payload?.data?.token,
    payload?.data?.access_token,
    payload?.data?.auth_token,
    payload?.data?.data?.token,
    payload?.data?.data?.access_token,
    payload?.data?.data?.auth_token,
    payload?.result?.token,
    payload?.result?.access_token,
    payload?.result?.auth_token,
  ];

  const token = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return normalizeToken(token);
}

export function savePosToken(token, source = "unknown") {
  const normalized = normalizeToken(token);
  if (!normalized) {
    return false;
  }

  const ttlSeconds = Number(process.env.POS_TOKEN_TTL_SECONDS || "86400");
  const expiresAt = new Date(Date.now() + Math.max(ttlSeconds, 60) * 1000).toISOString();

  writeAuthFile({
    pos_token: normalized,
    source,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  return true;
}

export function getStoredPosToken() {
  const auth = readAuthFile();
  if (!auth) {
    return null;
  }

  const token = normalizeToken(auth.pos_token);
  if (!token) {
    return null;
  }

  return {
    pos_token: token,
    expires_at: auth.expires_at || null,
    source: auth.source || null,
    updated_at: auth.updated_at || null,
  };
}

function isTokenExpired(expiresAt) {
  if (!expiresAt) {
    return true;
  }

  const bufferSeconds = Number(process.env.POS_TOKEN_BUFFER_SECONDS || "300");
  const targetTime = new Date(expiresAt).getTime() - Math.max(bufferSeconds, 0) * 1000;
  return !Number.isFinite(targetTime) || Date.now() >= targetTime;
}

async function loginWithAdminCredentials() {
  const email = normalizeToken(process.env.POS_ADMIN_EMAIL);
  const password = normalizeToken(process.env.POS_ADMIN_PASSWORD);

  if (!email || !password) {
    throw new Error("Missing POS_ADMIN_EMAIL or POS_ADMIN_PASSWORD in environment");
  }

  const response = await axios.post(`${POS_API_BASE_URL}/admin/terminal_login`, {
    email,
    password,
  });

  const loginPayload = response?.data || {};
  const statusCode = Number(loginPayload?.status_code);
  const message = normalizeToken(String(loginPayload?.message || ""));

  // Vend88 may return HTTP 200 with business error status_code/message.
  if (Number.isFinite(statusCode) && statusCode >= 400) {
    throw new Error(message || `POS login failed with status_code=${statusCode}`);
  }

  const posToken = extractPosTokenFromLoginResponse(loginPayload);
  if (!posToken) {
    throw new Error(
      message || "POS login succeeded but did not return token"
    );
  }

  console.log(`[posAuthService] 🎫 Login response payload keys:`, Object.keys(loginPayload));
  console.log(`[posAuthService] 🎫 Token obtained (length=${posToken?.length}):`, posToken?.substring(0, 50));

  savePosToken(posToken, "auto-login");
  console.log("[posAuthService] ✅ POS token refreshed and saved");
  return posToken;
}

export async function getValidPosToken(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  const cached = getStoredPosToken();
  if (!forceRefresh && cached?.pos_token && !isTokenExpired(cached.expires_at)) {
    return cached.pos_token;
  }

  if (!tokenLock.promise) {
    tokenLock.promise = loginWithAdminCredentials().finally(() => {
      tokenLock.promise = null;
    });
  }

  return tokenLock.promise;
}

export function clearStoredPosToken(reason = "manual") {
  try {
    if (fs.existsSync(authFile)) {
      fs.unlinkSync(authFile);
      console.warn(`[posAuthService] Cleared stored pos token (${reason})`);
    }
  } catch (error) {
    console.error("[posAuthService] Failed to clear pos auth file:", error.message);
  }
}
