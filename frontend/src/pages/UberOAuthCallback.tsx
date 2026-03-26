import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleUberOAuthCallback } from "../services/uberService";

/**
 * OAuth Callback Handler Page
 * 
 * This page handles the redirect from Uber after user authorization
 * Path: /auth/uber/callback?code=xxx&state=shopId
 * 
 * Flow:
 * 1. Uber redirects here with authorization code
 * 2. Extract code and shop_id from URL parameters
 * 3. Call backend to exchange code for token
 * 4. Redirect back to ShopDetail on success
 */
export default function UberOAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const hasRunEffect = useRef(false);  // Persist across React StrictMode remounts

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasRunEffect.current) return;
    hasRunEffect.current = true;
    
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get("code");
      const state = searchParams.get("state"); // state contains shopId
      const error = searchParams.get("error");

      console.log("[UberOAuthCallback] Received params:", {
        code: code ? "present" : "missing",
        state,
        error,
      });

      // Check for OAuth errors
      if (error) {
        setStatus("error");
        setMessage(`Authorization failed: ${error}`);
        setTimeout(() => {
          if (state) {
            navigate(`/shop/${state}`);
          } else {
            navigate("/shops");
          }
        }, 3000);
        return;
      }

      // Validate code and state
      if (!code || !state) {
        setStatus("error");
        setMessage("Invalid OAuth callback: missing code or state parameter");
        setTimeout(() => {
          navigate("/shops");
        }, 3000);
        return;
      }

      // Get posToken from localStorage
      const posToken = localStorage.getItem("posToken");
      if (!posToken) {
        setStatus("error");
        setMessage("Session expired: POS token not found");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
        return;
      }

      // Exchange code for token via backend
      const result = await handleUberOAuthCallback(code, state, posToken);

      if (result.success) {
        setStatus("success");
        setMessage("Authorization successful! Redirecting...");
        
        // Backend has already saved the access_token to database
        // No need for temporary localStorage storage
        
        // Redirect back to shops page - it will fetch stores from backend
        setTimeout(() => {
          navigate("/shops", { replace: true });
        }, 2000);
      } else {
        setStatus("error");
        setMessage(`Authorization failed: ${result.error}`);
        console.error("[UberOAuthCallback] Error:", result.error);
        
        setTimeout(() => {
          navigate(`/shop/${state}`);
        }, 3000);
      }
    } catch (err) {
      console.error("[UberOAuthCallback] Unexpected error:", err);
      setStatus("error");
      setMessage("An unexpected error occurred");
      setTimeout(() => {
        navigate("/shops");
      }, 3000);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Processing Authorization
            </h2>
            <p className="text-gray-600">Please wait...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-green-600 mb-2">
              Authorization Successful
            </h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              Authorization Failed
            </h2>
            <p className="text-gray-600">{message}</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
