import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { ArrowLeft, AlertCircle, CheckCircle, Link as LinkIcon } from "lucide-react";

interface ShopDetail {
  _id: string;
  name: string;
  shop_key: string;
  description?: string;
  address?: string;
  phone?: string;
  [key: string]: any;
}

export default function ShopDetailPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  const posToken = localStorage.getItem("posToken");

  useEffect(() => {
    if (!posToken || !shopId) {
      navigate("/shops");
      return;
    }

    loadShopDetail();
  }, [posToken, shopId, navigate]);

  const loadShopDetail = async () => {
    if (!posToken || !shopId) return;

    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${config.POS_API_BASE}/shop/${shopId}`,
        { token: posToken }
      );

      console.log("Shop detail response:", response.data);

      const shopData = response.data;
      if (shopData && shopData._id) {
        setShop(shopData);
      } else {
        setError("Failed to load shop details");
      }
    } catch (err: any) {
      console.error("Load shop detail error:", err);
      setError(err.response?.data?.message || err.message || "Failed to load shop");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectUber = async () => {
    if (!shop) return;
    
    try {
      setConnecting(true);
      // TODO: Implement Uber OAuth flow
      console.log("Connecting to Uber for shop:", shop._id);
      // For now, just redirect to Uber connect page
      // const authUrl = generateUberAuthUrl(shop._id);
      // window.location.href = authUrl;
    } catch (err) {
      console.error("Connect error:", err);
      setError("Failed to connect to Uber");
    } finally {
      setConnecting(false);
    }
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

        {/* Shop Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-black mb-6">Store Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shop.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <p className="text-gray-900">{shop.description}</p>
              </div>
            )}

            {shop.address && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <p className="text-gray-900">{shop.address}</p>
              </div>
            )}

            {shop.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <p className="text-gray-900">{shop.phone}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Code
              </label>
              <p className="text-gray-900 font-mono">{shop.shop_key}</p>
            </div>
          </div>
        </div>

        {/* Uber Integration */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-black mb-6">Uber Eats Integration</h2>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">U</span>
              </div>
              <div>
                <h3 className="font-semibold text-black">Connect to Uber Eats</h3>
                <p className="text-sm text-gray-600">Link this store to your Uber Eats account</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Connecting allows you to manage your menu and orders directly from this platform.
            </p>

            <button
              onClick={handleConnectUber}
              disabled={connecting}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-5 h-5" />
              {connecting ? "Connecting..." : "Connect to Uber Eats"}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate("/shops")}
            className="flex-1 bg-gray-100 text-black py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Back to Shops
          </button>
          <button
            onClick={() => navigate(`/menu-sync/${shop._id}`)}
            disabled={!shop}
            className="flex-1 bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            View Menu
          </button>
        </div>
      </div>
    </div>
  );
}
