import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { ArrowLeft, AlertCircle, Info } from "lucide-react";
import { generateUberAuthUrl } from "../services/uberService";

/**
 * ShopDetail Page
 * 
 * This page displays core shop information and Uber Eats integration status.
 * 
 * Two-Phase Uber Integration Flow:
 * ================================
 * 
 * Phase 1: Merchant Authorization (OAuth)
 * - User clicks "Authorize Uber Eats Merchant Account" button
 * - Redirects to Uber OAuth page
 * - User logs in and grants permission
 * - We receive access_token and refresh_token
 * - We can now call GET /stores to list all merchant's Uber stores
 * - This is platform-level authorization (not bound to specific store yet)
 * 
 * Phase 2: Store Authorization Binding  
 * - After Phase 1, merchant can choose which Uber store to bind
 * - We call GET /stores to show available stores
 * - User selects one store
 * - We call POST /pos_data to activate the binding
 * - Uber sends store.provisioned webhook
 * - Store is now fully configured and can receive orders
 */

interface ShopDetail {
  _id: string;
  name: string;
  shop_key: string;
  description?: string;
  [key: string]: any;
}

interface UberConnection {
  connected: boolean;
  store_id?: string;
  store_name?: string;
  authorization_type?: string;
  operating_config?: any;
}

export default function ShopDetailPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [uberConnection, setUberConnection] = useState<UberConnection>({
    connected: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const posToken = localStorage.getItem("posToken");

  useEffect(() => {
    if (!posToken || !shopId) {
      navigate("/shops");
      return;
    }

    loadShopDetail();
  }, [posToken, shopId, navigate]);

  const loadShopDetail = async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      setError("");

      // Get shop info from localStorage (passed from Shops page)
      const selectedShopId = localStorage.getItem("selected_shop_id");
      const selectedShopName = localStorage.getItem("selected_shop_name");
      const selectedShopKey = localStorage.getItem("selected_shop_key");
      const selectedShopDescription = localStorage.getItem("selected_shop_description");

      if (selectedShopId === shopId) {
        const shopData: ShopDetail = {
          _id: selectedShopId,
          name: selectedShopName || "",
          shop_key: selectedShopKey || "",
          description: selectedShopDescription || undefined,
        };
        setShop(shopData);
      } else {
        setError("Shop information not found");
      }
    } catch (err: any) {
      console.error("[ShopDetail] Load error:", err);
      setError(err.message || "Failed to load shop");
    } finally {
      setLoading(false);
    }
  };

  const [connecting, setConnecting] = useState(false);

  const handleConnectUber = () => {
    if (!shop || connecting) return;
    console.log("[ShopDetail] Connecting to Uber for shop:", shop._id);
    setConnecting(true);
    const authUrl = generateUberAuthUrl(shop._id);
    window.location.href = authUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop details...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/shops")}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Shops
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error || "Shop not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate("/shops")}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Shops
          </button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">{shop.name}</h1>
            <p className="text-gray-600">Store Code: {shop.shop_key}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Shop Core Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Store Information
          </h2>

          <div className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop ID
                </label>
                <p className="text-gray-900 font-mono bg-gray-50 px-4 py-2 rounded">
                  {shop._id}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name
                </label>
                <p className="text-gray-900 font-semibold">
                  {shop.name}
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Authorization Business Type
                </label>
                <p className="text-gray-900">
                  {/* TODO: Get this from Uber connection data */}
                  Not configured
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Third-party Platform Shop ID (Uber)
                </label>
                <p className="text-gray-900">
                  {uberConnection.connected && uberConnection.store_id ? (
                    <span className="font-mono">{uberConnection.store_id}</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </p>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Third-party Platform Location Name (Uber)
                </label>
                <p className="text-gray-900">
                  {uberConnection.connected && uberConnection.store_name ? (
                    uberConnection.store_name
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating Config
                </label>
                <p className="text-gray-900">
                  {uberConnection.connected && uberConnection.operating_config ? (
                    <span className="bg-green-50 text-green-700 px-3 py-1 rounded text-sm font-medium">
                      Configured
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </p>
              </div>
            </div>

            {/* Description */}
            {shop.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-900">{shop.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Uber Integration Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-black mb-6">Uber Eats Integration</h2>

          {/* Phase 1: Merchant Authorization */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
              Merchant Authorization (Phase 1)
            </h3>
            <p className="text-sm text-blue-800 mb-4">
              Authorize your app to access your Uber Eats merchant account. This is the first step of OAuth integration.
            </p>
            <div className="bg-blue-100 rounded p-3 mb-4 text-xs text-blue-900">
              <p className="font-semibold mb-1">What happens:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>You'll be redirected to Uber to authorize</li>
                <li>We'll receive an access token</li>
                <li>You can then select which store to bind</li>
              </ul>
            </div>
            <button
              onClick={handleConnectUber}
              disabled={connecting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {connecting ? "Redirecting..." : "Authorize Uber Eats Merchant Account"}
            </button>
          </div>

          {/* Phase 2: Store Binding (Info only for now) */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="bg-gray-400 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
              Store Authorization Binding (Phase 2)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              After merchant authorization, select which store to bind to this location.
            </p>
            <div className="bg-gray-100 rounded p-3 text-xs text-gray-700">
              <p className="font-semibold mb-1">Available after Phase 1:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>View available Uber stores</li>
                <li>Select and bind a specific store</li>
                <li>Complete store configuration</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Complete Phase 1 to proceed with store binding
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/shops")}
            className="flex-1 bg-gray-100 text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Back to Shops
          </button>
        </div>
      </div>
    </div>
  );
}
