/**
 * Auth Middleware
 * Validates POS token ownership for specific shops
 */

/**
 * Verify that the pos_token belongs to the specified shop
 * In production, you'd verify against your auth system
 */
export async function verifyShopOwnership(req, res, next) {
  try {
    const { shop_id, pos_token } = req.body;

    // TODO: Verify pos_token against POS API
    // For now, just check if both exist
    if (!shop_id || !pos_token) {
      return res.status(400).json({
        success: false,
        message: "Missing shop_id or pos_token",
      });
    }

    // Store in request for use in route handlers
    req.shopId = shop_id;
    req.posToken = pos_token;

    next();
  } catch (error) {
    console.error("[authMiddleware] Verification error:", error.message);
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}

/**
 * Verify shop ownership for query parameters (for GET requests)
 */
export async function verifyShopOwnershipQuery(req, res, next) {
  try {
    const { shop_id, pos_token } = req.query;

    if (!shop_id || !pos_token) {
      return res.status(400).json({
        success: false,
        message: "Missing shop_id or pos_token",
      });
    }

    req.shopId = shop_id;
    req.posToken = pos_token;

    next();
  } catch (error) {
    console.error("[authMiddleware] Verification error:", error.message);
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}
