import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserShops, getShopDetail } from "../services/posApi";
import {
  generateUberAuthUrl,
  getUberConnectionStatus,
  disconnectUberAccount,
} from "../services/uberService";
import { AlertCircle, CheckCircle, LogOut, Link as LinkIcon } from "lucide-react";

interface Shop {
  _id: string;
  name: string;
  shop_key: string;
  description?: string;
}

interface ShopWithUber extends Shop {
  uberConnected?: boolean;
  uberStoreId?: string;
}

export default function ShopsPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<ShopWithUber[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<ShopWithUber | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");

  const posToken = localStorage.getItem("pos_token");

  useEffect(() => {
    if (!posToken) {
      navigate("/login");
      return;
    }

    loadShops();
  }, [posToken, navigate]);

  const loadShops = async () => {
    if (!posToken) return;

    try {
      setLoading(true);
      setError("");

      const shopsData = await getUserShops(posToken);

      // 检查每个店铺的Uber连接状态
      const shopsWithStatus = await Promise.all(
        shopsData.map(async (shop: Shop) => {
          const uberStatus = await getUberConnectionStatus(shop._id, posToken);
          return {
            ...shop,
            uberConnected: uberStatus.connected,
            uberStoreId: uberStatus.store_id,
          };
        })
      );

      setShops(shopsWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectUber = (shop: ShopWithUber) => {
    const authUrl = generateUberAuthUrl(shop._id);
    window.location.href = authUrl;
  };

  const handleDisconnect = async (shopId: string) => {
    if (!posToken) return;

    if (!window.confirm("确定要断开Uber连接吗？")) {
      return;
    }

    try {
      setDisconnecting(true);
      const success = await disconnectUberAccount(shopId, posToken);
      if (success) {
        await loadShops();
      } else {
        setError("Failed to disconnect Uber account");
      }
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSelectShop = (shop: ShopWithUber) => {
    setSelectedShop(shop);
    localStorage.setItem("selected_shop_id", shop._id);
    localStorage.setItem("selected_shop_name", shop.name);
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
          <h1 className="text-2xl font-bold text-black">Manage Shops</h1>
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Shops Grid */}
        {shops.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No shops found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shops.map((shop) => (
              <div
                key={shop._id}
                className={`bg-white rounded-lg border-2 p-6 transition-all cursor-pointer ${
                  selectedShop?._id === shop._id
                    ? "border-black"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleSelectShop(shop)}
              >
                {/* Shop Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-black mb-1">
                      {shop.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Code: {shop.shop_key}
                    </p>
                  </div>
                  {shop.uberConnected && (
                    <div className="bg-green-50 rounded-full p-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  )}
                </div>

                {shop.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {shop.description}
                  </p>
                )}

                {/* Uber Connection Status */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {shop.uberConnected ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">
                          Connected to Uber
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        Store ID: {shop.uberStoreId}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/menu-sync/${shop._id}`);
                          }}
                          className="flex-1 bg-black text-white py-2 rounded font-semibold text-sm hover:bg-gray-900 transition-colors"
                        >
                          Sync Menu
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(shop._id);
                          }}
                          disabled={disconnecting}
                          className="flex-1 bg-red-50 text-red-700 py-2 rounded font-semibold text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {disconnecting ? "Disconnecting..." : "Disconnect"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Not connected to Uber yet
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnectUber(shop);
                        }}
                        className="w-full bg-black text-white py-2 rounded font-semibold text-sm hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Connect to Uber
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/shop/${shop._id}`);
                  }}
                  className="w-full bg-gray-100 text-black py-2 rounded font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  View Details
                </button>
              </div>
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
