import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { ArrowLeft, AlertCircle, Info, Check } from "lucide-react";
import { bindUberStore } from "../services/uberService";

/**
 * ShopDetail Page
 * 
 * This page displays shop information and Uber Eats integration status.
 * 
 * Two-Phase Uber Integration Flow:
 * ================================
 * 
 * Phase 1: Merchant Authorization (OAuth) - Done in Locations page
 * - Redirects to Uber OAuth page
 * - User logs in and grants permission
 * - We receive access_token and refresh_token
 * - We can now call GET /stores to list all merchant's Uber stores
 * 
 * Phase 2: Store Binding (on this page)
 * - Display list of available Uber stores
 * - User selects one store and clicks "Bind"
 * - We call POST /bind to create the binding
 * - Store is now bound to this location
 */

interface ShopDetail {
  _id: string;
  name: string;
  shop_key: string;
  description?: string;
  [key: string]: any;
}

interface UberStore {
  id: string;
  name: string;
  address?: string;
}

interface Binding {
  pos_shop_id: string;
  pos_shop_name: string;
  uber_store_id: string;
  uber_store_name: string;
}

export default function ShopDetailPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [uberStores, setUberStores] = useState<UberStore[]>([]);
  const [binding, setBinding] = useState<Binding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [binding_error, setBindingError] = useState("");
  const [bindingInProgress, setBindingInProgress] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  const posToken = localStorage.getItem("posToken");

  useEffect(() => {
    if (!posToken || !shopId) {
      navigate("/shops");
      return;
    }

    loadShopDetail();
  }, [posToken, shopId, navigate]);

  const loadShopDetail = async () => {
    if (!shopId || !posToken) return;

    try {
      setLoading(true);
      setError("");
      setBindingError("");

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

        // Load binding info and available Uber stores
        try {
          const bindingResponse = await axios.get(
            `${config.BACKEND_API}/uber/binding?shop_id=${selectedShopId}&pos_token=${posToken}`
          );
          const bindingData = bindingResponse.data.binding;
          setBinding(bindingData);

          // Fetch available Uber stores
          const storesResponse = await axios.post(
            `${config.BACKEND_API}/uber/stores`,
            { shop_id: selectedShopId, pos_token: posToken }
          );
          const stores = storesResponse.data.stores || [];
          setUberStores(stores);

          // Pre-select first unbound store
          if (stores.length > 0 && !bindingData) {
            setSelectedStoreId(stores[0].id);
          }
        } catch (err: any) {
          console.warn("[ShopDetail] Failed to load Uber stores:", err.message);
          // Not critical - continue loading shop detail
        }
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

  const handleBindStore = async () => {
    if (!shop || !selectedStoreId || !posToken) return;

    try {
      setBindingInProgress(true);
      setBindingError("");

      const selectedStore = uberStores.find((s) => s.id === selectedStoreId);
      if (!selectedStore) {
        setBindingError("Selected store not found");
        return;
      }

      console.log("[ShopDetail] Binding store:", selectedStoreId);

      const result = await bindUberStore(
        shop._id,
        posToken,
        selectedStoreId,
        selectedStore.name,
        shop.name
      );

      if (result.success) {
        setBinding(result.binding as any);
        setBindingError("");
        // Refresh the page after a short delay
        setTimeout(() => {
          loadShopDetail();
        }, 1500);
      } else {
        setBindingError(result.error || "Binding failed");
      }
    } catch (err: any) {
      console.error("[ShopDetail] Bind error:", err);
      setBindingError(err.message || "Failed to bind store");
    } finally {
      setBindingInProgress(false);
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
                  {binding && binding.uber_store_id ? (
                    <span className="font-mono">{binding.uber_store_id}</span>
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
                  {binding && binding.uber_store_name ? (
                    binding.uber_store_name
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
                  {binding ? (
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

          {/* Binding Error Alert */}
          {binding_error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{binding_error}</p>
            </div>
          )}

          {/* Binding Status or Store Selection */}
          {binding ? (
            // Already Bound
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Check className="w-6 h-6" />
                Store Bound Successfully
              </h3>
              <div className="space-y-3 text-sm text-green-800">
                <p>
                  <span className="font-semibold">POS Location:</span> {binding.pos_shop_name}
                </p>
                <p>
                  <span className="font-semibold">Uber Store:</span> {binding.uber_store_name}
                </p>
                <p>
                  <span className="font-semibold">Uber Store ID:</span> <span className="font-mono text-xs">{binding.uber_store_id}</span>
                </p>
              </div>
              <button
                onClick={() => setBinding(null)}
                className="mt-4 text-sm text-green-700 hover:text-green-800 underline"
              >
                Bind a Different Store
              </button>
            </div>
          ) : uberStores.length > 0 ? (
            // Show Store Selection
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                Select and Bind Uber Store
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                Choose which Uber store to bind to this location.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Available Stores
                </label>
                <div className="space-y-2">
                  {uberStores.map((store) => (
                    <label key={store.id} className="flex items-center gap-3 p-3 bg-white rounded border border-blue-100 hover:bg-blue-50 cursor-pointer">
                      <input
                        type="radio"
                        name="uber_store"
                        value={store.id}
                        checked={selectedStoreId === store.id}
                        onChange={(e) => setSelectedStoreId(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.id}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBindStore}
                disabled={bindingInProgress || !selectedStoreId}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {bindingInProgress ? "Binding..." : "Bind Selected Store"}
              </button>
            </div>
          ) : (
            // No Stores Available
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <Info className="w-6 h-6" />
                No Uber Stores Available
              </h3>
              <p className="text-sm text-yellow-800 mb-4">
                Please authorize a Uber merchant account first. Go to the Locations page and click "Authorize Uber" to complete merchant authorization.
              </p>
              <button
                onClick={() => navigate("/shops")}
                className="text-sm text-yellow-700 hover:text-yellow-800 font-medium underline"
              >
                Go to Locations Page
              </button>
            </div>
          )}
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
