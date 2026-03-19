import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const POS_API_BASE = "https://dev.vend88.com";

/**
 * Verify POS token by calling POS API's /auth/profile endpoint
 * @param {string} token - The token to verify
 * @returns {Promise<Object>} - User profile data if valid, null if invalid
 */
export async function verifyPOSToken(token) {
  try {
    if (!token) {
      console.warn('[TokenService] No token provided');
      return null;
    }

    console.log('[TokenService] Verifying token with POS API');

    // Call POS API's /auth/profile endpoint
    const response = await axios.post(
      `${POS_API_BASE}/auth/profile`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (response.status === 200 && response.data) {
      console.log('[TokenService] Token verified successfully');
      return response.data;
    }

    console.warn('[TokenService] Invalid response from POS API');
    return null;
  } catch (error) {
    console.error('[TokenService] Token verification failed:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });

    // Distinguish between different error types
    if (error.response?.status === 401) {
      console.warn('[TokenService] Token expired or invalid (401)');
    } else if (error.response?.status === 403) {
      console.warn('[TokenService] Token forbidden (403)');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('[TokenService] Cannot connect to POS API at:', POS_API_BASE);
    }

    return null;
  }
}

/**
 * Extract token from Authorization header
 * Expects format: "Bearer <token>"
 * @param {string} authHeader - The Authorization header value
 * @returns {string|null} - The token, or null if not found
 */
export function extractToken(authHeader) {
  if (!authHeader) {
    return null;
  }

  // Handle both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * Middleware to verify POS token
 * Extracts token from Authorization header and verifies with POS API
 * Adds user data to req.user if token is valid
 * @returns {Function} Express middleware
 */
export function verifyTokenMiddleware() {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractToken(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token is required in Authorization header'
        });
      }

      // Verify token with POS API
      const userData = await verifyPOSToken(token);

      if (!userData) {
        return res.status(401).json({
          success: false,
          message: 'Token is invalid or expired'
        });
      }

      // Attach user data to request
      req.user = userData;
      req.token = token;

      next();
    } catch (error) {
      console.error('[TokenService] Middleware error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Token verification error'
      });
    }
  };
}
