import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { AlertCircle, ChevronRight } from "lucide-react";

interface Shop {
  _id: string;
  name: string;
  shop_key: string;
  description?: string;
}

export default function ShopsPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const posToken = localStorage.getItem("posToken");

  useEffect(() => {
    if (!posToken) {
      navigate("/login");
      return;
    }

    loadShops();
  }, [posToken, navigate]);

  const loadShops = async () => {
    if (!posToken) return;
    console.log("[Shops] Loading shops with POS token");
    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${config.POS_API_BASE}/shops`,
        { token: posToken }
      );

      console.log("[Shops] Response:", response.data);

      // Backend response format: { status_code, shops: [...], permissions: [...] }
      const responseData = response.data as any;
      const shopsData: Shop[] = responseData.shops || [];

      setShops(shopsData);
    } catch (err: any) {
      console.error("[Shops] Load error:", err);
      setError(err.response?.data?.message || err.message || "Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShop = (shop: Shop) => {
    // Store shop info in localStorage for use in ShopDetail
    localStorage.setItem("selected_shop_id", shop._id);
    localStorage.setItem("selected_shop_name", shop.name);
    localStorage.setItem("selected_shop_key", shop.shop_key);
    if (shop.description) {
      localStorage.setItem("selected_shop_description", shop.description);
    }
    
    // Navigate to shop detail page
    navigate(`/shop/${shop._id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Select a Shop</h1>
          <button
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            Logout
          </button>
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

        {/* Shops List */}
        {shops.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No shops found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shops.map((shop) => (
              <button
                key={shop._id}
                onClick={() => handleSelectShop(shop)}
                className="w-full bg-white rounded-lg border border-gray-200 p-4 hover:border-black hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-black group-hover:text-gray-800">
                    {shop.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Code: {shop.shop_key}
                  </p>
                  {shop.description && (
                    <p className="text-sm text-gray-500 mt-1">{shop.description}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadShops}
            className="text-sm text-gray-600 hover:text-black transition-colors underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
