import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { generateUberAuthUrl } from "../services/uberService";
import { AlertCircle, LogOut, LogIn, X } from "lucide-react";
import { bindUberStore, unbindUberStore } from "../services/uberService";

interface Shop {
  _id: string;
  name: string;
  shop_key: string;
  description?: string;
}

interface UberStore {
  id: string;
  name: string;
}

interface ShopsResponse {
  shops: Shop[];
}

interface StoresResponse {
  stores: UberStore[];
}

interface BindingResponse {
  binding: any;
}

export default function ShopsPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [uberStores, setUberStores] = useState<UberStore[]>([]);
  const [bindings, setBindings] = useState<{ [shopId: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authorizing, setAuthorizing] = useState(false);
  const [isUberAuthorized, setIsUberAuthorized] = useState(false);
  const [unauthorizing, setUnauthorizing] = useState(false);
  
  // Modal state for binding
  const [showBindModal, setShowBindModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [bindingInProgress, setBindingInProgress] = useState(false);

  const posToken = localStorage.getItem("posToken");

  useEffect(() => {
    if (!posToken) {
      navigate("/login");
      return;
    }

    loadData();
  }, [posToken, navigate]);

  const loadData = async () => {
    if (!posToken) return;
    try {
      setLoading(true);
      setError("");

      // Load POS shops
      const shopsResponse = await axios.post<ShopsResponse>(
        `${config.POS_API_BASE}/shops`,
        { token: posToken }
      );
      const shopsData: Shop[] = shopsResponse.data.shops || [];
      setShops(shopsData);

      let storesData: UberStore[] = [];
      const bindingsMap: { [shopId: string]: any } = {};

      // Load binding info for ALL shops
      if (shopsData.length > 0) {
        // Query binding for each shop
        for (const shop of shopsData) {
          try {
            const bindingResponse = await axios.get<BindingResponse>(
              `${config.BACKEND_API}/uber/binding?shop_id=${shop._id}&pos_token=${posToken}`
            );
            bindingsMap[shop._id] = bindingResponse.data.binding;
          } catch (err) {
            // If binding query fails for this shop, just set it to null
            bindingsMap[shop._id] = null;
          }
        }
        setBindings(bindingsMap);

        // Always try to fetch Uber stores if user has authorized
        // If not authorized, API will return empty array
        try {
          const storesResponse = await axios.post<StoresResponse>(
            `${config.BACKEND_API}/uber/stores`,
            { shop_id: shopsData[0]._id, pos_token: posToken }
          );
          storesData = storesResponse.data.stores || [];
        } catch (err) {
          // If stores fetch fails, just use empty array
          storesData = [];
        }
      }

      // Update state with stores data
      setUberStores(storesData);
      // Update authorization status based on whether stores were fetched
      setIsUberAuthorized(storesData.length > 0);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeUber = () => {
    if (shops.length === 0) {
      setError("No shops available");
      return;
    }

    const shop = shops[0];
    setAuthorizing(true);
    const authUrl = generateUberAuthUrl(shop._id);
    window.location.href = authUrl;
  };

  const handleUnauthorizeUber = async () => {
    if (!window.confirm("Are you sure you want to disconnect from Uber? All Uber stores will become unavailable.")) {
      return;
    }

    if (shops.length === 0) {
      setError("No shops available");
      return;
    }

    setUnauthorizing(true);
    try {
      const shop = shops[0];
      // Call disconnect/unauthorize API
      await axios.post(`${config.BACKEND_API}/uber/disconnect`, {
        shop_id: shop._id,
        pos_token: posToken,
      });

      // Clear Uber data
      setUberStores([]);
      setIsUberAuthorized(false);
      setBindings({});
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to disconnect Uber");
    } finally {
      setUnauthorizing(false);
    }
  };

  const handleOpenBindModal = (shop: Shop) => {
    if (uberStores.length === 0) {
      setError("No Uber stores available. Please authorize Uber first.");
      return;
    }
    setSelectedShop(shop);
    setSelectedStoreId("");
    setShowBindModal(true);
  };

  const handleCloseBindModal = () => {
    setShowBindModal(false);
    setSelectedShop(null);
    setSelectedStoreId("");
  };

  const handleBind = async () => {
    if (!selectedShop || !selectedStoreId) {
      setError("Please select a store to bind");
      return;
    }

    setBindingInProgress(true);
    try {
      const selectedStore = uberStores.find((s) => s.id === selectedStoreId);
      if (!selectedStore) {
        setError("Selected store not found");
        return;
      }

      await bindUberStore(
        selectedShop._id,
        selectedStoreId,
        selectedStore.name,
        posToken || "",
        selectedShop.name  // Pass the actual shop name
      );

      setError("");
      handleCloseBindModal();
      // Reload data to refresh binding status
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to bind store");
    } finally {
      setBindingInProgress(false);
    }
  };

  const handleUnbind = async (shop: Shop) => {
    if (!window.confirm(`Are you sure you want to unbind ${shop.name}?`)) {
      return;
    }

    try {
      await unbindUberStore(shop._id, posToken || "");
      setError("");
      // Reload data to refresh binding status
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to unbind store");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Locations</h1>
          <div className="flex gap-3">
            {isUberAuthorized ? (
              <button
                onClick={handleUnauthorizeUber}
                disabled={unauthorizing}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut size={18} />
                {unauthorizing ? "Unauthorizing..." : "Unauthorize Uber"}
              </button>
            ) : (
              <button
                onClick={handleAuthorizeUber}
                disabled={authorizing || !shops.length}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <LogIn size={18} />
                {authorizing ? "Redirecting..." : "Authorize Uber"}
              </button>
            )}
            <button
              onClick={() => {
                localStorage.clear();
                navigate("/login");
              }}
              className="px-4 py-2 text-gray-600 hover:text-black transition-colors flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
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

        {/* POS Locations Table */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">POS Locations</h2>
            <button
              onClick={loadData}
              className="text-sm text-gray-600 hover:text-black transition-colors underline"
            >
              Refresh
            </button>
          </div>
          {shops.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">No locations found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uber Store ID</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uber Store Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {shops.map((shop) => {
                    const shopBinding = bindings[shop._id];
                    return (
                    <tr key={shop._id} className={shopBinding ? "bg-blue-50" : ""}>
                      <td className="px-6 py-4 text-sm text-gray-900">{shop._id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{shop.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {shopBinding ? (
                          <span className="font-mono">{shopBinding.uber_store_id}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {shopBinding ? (
                          shopBinding.uber_store_name
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {shopBinding ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Bound
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            Unbound
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {shopBinding ? (
                          <button
                            onClick={() => handleUnbind(shop)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Unbind
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenBindModal(shop)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Bind
                          </button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Available Uber Stores Table */}
        {(() => {
          // Filter out stores already bound by ANY shop
          const boundStoreIds = new Set(
            Object.values(bindings)
              .filter((b) => b && b.uber_store_id)
              .map((b) => b.uber_store_id)
          );
          const availableStores = uberStores.filter(
            (store) => !boundStoreIds.has(store.id)
          );
          
          return availableStores.length > 0 ? (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Uber Stores</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Store ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Store Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {availableStores.map((store) => (
                      <tr key={store.id} className="bg-green-50">
                        <td className="px-6 py-4 text-sm text-gray-900">{store.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{store.name}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                            Available
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Bind Modal */}
      {showBindModal && selectedShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Bind Uber Store</h3>
              <button
                onClick={handleCloseBindModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Binding <span className="font-medium">{selectedShop.name}</span> to Uber store
              </p>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                {uberStores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="uber-store"
                      value={store.id}
                      checked={selectedStoreId === store.id}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-500">{store.id}</p>
                    </div>
                  </label>
                ))}
              </div>

              {uberStores.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No Uber stores available. Please authorize Uber first.
                </p>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleCloseBindModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBind}
                disabled={!selectedStoreId || bindingInProgress}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {bindingInProgress ? "Binding..." : "Bind"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
