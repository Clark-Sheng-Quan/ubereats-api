import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoreMenu } from "../services/uberService";
import { getPosProducts } from "../services/posService";
import { CheckCircle, AlertCircle, RefreshCw, ArrowLeft, X, Link2 } from "lucide-react";

interface MenuItem {
  id: string;
  title?: {
    translations?: Record<string, string>;
  };
  description?: {
    translations?: Record<string, string>;
  };
  image_url?: string;
  price_info?: {
    price?: number;
    overrides?: any[];
  };
  tax_info?: Record<string, any>;
  dish_info?: {
    classifications?: Record<string, any>;
  };
  product_info?: {
    product_traits?: any;
    countries_of_origin?: any;
  };
  suspension_info?: {
    suspended?: boolean;
  };
  bundled_items?: any;
}

interface Vend88Item {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
}

interface Mapping {
  id: string;
  vend88ItemId: string;
  uberItemId: string;
  vend88Item?: Vend88Item;
  uberItem?: MenuItem;
}

interface MenuEntity {
  id: string;
  type?: "ITEM" | "MODIFIER_GROUP";
}

interface MenuCategory {
  id: string;
  title?: {
    translations?: Record<string, string>;
  };
  subtitle?: {
    translations?: Record<string, string>;
  };
  entities?: MenuEntity[];
}

interface ServiceAvailability {
  day_of_week: string;
  time_periods: Array<{
    start_time: string;
    end_time: string;
  }>;
}

interface MenuMenu {
  id: string;
  title?: {
    translations?: Record<string, string>;
  };
  service_availability?: ServiceAvailability[];
  category_ids?: string[];
}

interface MenuData {
  menus?: MenuMenu[];
  categories?: MenuCategory[];
  items?: MenuItem[];
  modifier_groups?: any[];
}

type TabType = "mapped" | "unmapped-uber" | "unmapped-vend88";

export default function MenuSyncPage() {
  const { shopId, uberStoreId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("mapped");
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [vend88Items, setVend88Items] = useState<Vend88Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // 模拟映射数据（后续替换为API调用）
  const [mappings] = useState<Mapping[]>([]);

  useEffect(() => {
    if (!uberStoreId) {
      navigate("/shops");
      return;
    }

    loadData();
  }, [uberStoreId, shopId, navigate]);

  const loadData = async () => {
    if (!uberStoreId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Load Uber menu
      const uberMenuData = await getStoreMenu(uberStoreId);
      setMenuData(uberMenuData);

      // Load Vend88 products if shopId is available
      if (shopId) {
        try {
          const posToken = localStorage.getItem("posToken");
          if (!posToken) {
            console.warn("[MenuSync] No POS token found");
          } else {
            console.log("[MenuSync] Loading Vend88 products for shop:", shopId);
            const products = await getPosProducts(posToken, shopId);
            setVend88Items(products);
            console.log("[MenuSync] Vend88 products loaded:", products.length);
          }
        } catch (vend88Error: any) {
          console.error("[MenuSync] Failed to load Vend88 products:", vend88Error.message);
          // Don't show error to user - Vend88 is optional
        }
      }
    } catch (err: any) {
      console.error("[MenuSync] Failed to load Uber menu:", err);
      setError(err.response?.data?.error || err.message || "Failed to load menu");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!uberStoreId) return;

    try {
      setRefreshing(true);
      setError("");
      setSuccess("");

      await loadData();
      setSuccess("Data refreshed successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // 获取已映射的 Uber 商品
  const getMappedUberItems = () => {
    return menuData?.items?.filter((item) =>
      mappings.some((m) => m.uberItemId === item.id)
    ) || [];
  };

  // 获取未映射的 Uber 商品
  const getUnmappedUberItems = () => {
    return menuData?.items?.filter((item) =>
      !mappings.some((m) => m.uberItemId === item.id)
    ) || [];
  };

  // 获取已映射的 Vend88 商品
  const getMappedVend88Items = () => {
    return vend88Items.filter((item) =>
      mappings.some((m) => m.vend88ItemId === item.id)
    );
  };

  // 获取未映射的 Vend88 商品
  const getUnmappedVend88Items = () => {
    return vend88Items.filter((item) =>
      !mappings.some((m) => m.vend88ItemId === item.id)
    );
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  // Helper function to get translated text
  const getText = (textObj: any): string => {
    if (!textObj) return "—";
    if (typeof textObj === "string") return textObj;
    if (textObj.translations) {
      return textObj.translations["en_us"] || textObj.translations["en"] || Object.values(textObj.translations)[0] || "—";
    }
    return "—";
  };

  // Helper function to get category name for an item
  const getCategoryName = (): string => {
    // 从menuData中获取第一个category的subtitle
    if (menuData?.categories && menuData.categories.length > 0) {
      return getText(menuData.categories[0].subtitle) || "—";
    }
    return "—";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/shops")}
              className="text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black">Uber Menu Mapping</h1>
              <p className="text-sm text-gray-600 mt-1">
                Mapped: {getMappedUberItems().length} | Uber: {getUnmappedUberItems().length} | Vend88: {getUnmappedVend88Items().length}
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab("mapped")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "mapped"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Mapped ({getMappedUberItems().length})
          </button>
          <button
            onClick={() => setActiveTab("unmapped-uber")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "unmapped-uber"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Uber Items ({getUnmappedUberItems().length})
          </button>
          <button
            onClick={() => setActiveTab("unmapped-vend88")}
            className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "unmapped-vend88"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Vend88 Items ({getUnmappedVend88Items().length})
          </button>
        </div>
      </div>

      <div className="px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "mapped" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {getMappedVend88Items().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-48">Vend88 Item</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-28">Vend88 ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-48">Uber Item</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-28">Uber ID</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 flex-1 min-w-48">
                          <p className="text-sm font-semibold text-gray-900">{mapping.vend88Item?.name || "—"}</p>
                          {mapping.vend88Item?.sku && (
                            <p className="text-xs text-gray-600">SKU: {mapping.vend88Item.sku}</p>
                          )}
                        </td>
                        <td className="px-6 py-3 w-28">
                          <span className="text-xs text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                            {mapping.vend88ItemId.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="px-6 py-3 flex-1 min-w-48">
                          <p className="text-sm font-semibold text-gray-900">
                            {getText(mapping.uberItem?.title) || "—"}
                          </p>
                          {mapping.uberItem?.price_info && (
                            <p className="text-xs text-gray-600">
                              ${((mapping.uberItem.price_info.price || 0) / 100).toFixed(2)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-3 w-28">
                          <span className="text-xs text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                            {mapping.uberItemId.slice(0, 12)}...
                          </span>
                        </td>
                        <td className="px-6 py-3 w-24">
                          <button
                            onClick={() => {
                              // TODO: Implement delete mapping
                              setError("Delete mapping coming soon");
                            }}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold text-xs hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">No mapped items yet</p>
                <p className="text-sm text-gray-500 mt-1">Map Vend88 items to Uber items to see them here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "unmapped-uber" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {getUnmappedUberItems().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-40">Category</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-28">Item ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-48">Item Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-20">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-24">Status</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getUnmappedUberItems().map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 w-40 text-sm">
                          <span className="bg-gray-100 px-3 py-1 rounded text-xs font-medium inline-block">
                            {getCategoryName()}
                          </span>
                        </td>
                        <td className="px-6 py-3 w-28 text-xs text-gray-900 font-mono">
                          {item.id.slice(0, 16)}...
                        </td>
                        <td className="px-6 py-3 flex-1 min-w-48">
                          <p className="text-sm font-semibold text-gray-900">{getText(item.title)}</p>
                        </td>
                        <td className="px-6 py-3 w-20 text-sm font-bold text-gray-900">
                          ${((item.price_info?.price || 0) / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 w-24">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold inline-block ${
                              item.suspension_info?.suspended
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {item.suspension_info?.suspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-3 w-24 text-center">
                          <button
                            onClick={() => {
                              // TODO: Open mapping modal with this Uber item
                              setError("Mapping modal coming soon");
                            }}
                            className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs hover:bg-blue-50 px-2 py-1 rounded transition-colors w-full"
                          >
                            <Link2 className="w-3 h-3" />
                            Map
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">All Uber items are mapped!</p>
                <p className="text-sm text-gray-500 mt-1">Great job keeping your inventory synced</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "unmapped-vend88" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {getUnmappedVend88Items().length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-48">Item Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-28">SKU</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-20">Price</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {getUnmappedVend88Items().map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 flex-1 min-w-48">
                          <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-600">{item.description.slice(0, 60)}...</p>
                          )}
                        </td>
                        <td className="px-6 py-3 w-28 text-xs text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                          {item.sku || "—"}
                        </td>
                        <td className="px-6 py-3 w-20 text-sm font-bold text-gray-900">
                          ${(item.price / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 w-24 text-center">
                          <button
                            onClick={() => {
                              // TODO: Open mapping modal with this Vend88 item
                              setError("Mapping modal coming soon");
                            }}
                            className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-700 font-semibold text-xs hover:bg-blue-50 px-2 py-1 rounded transition-colors w-full"
                          >
                            Map
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">All Vend88 items are mapped!</p>
                <p className="text-sm text-gray-500 mt-1">Your POS inventory is fully synced to Uber</p>
              </div>
            )}
          </div>
        )}

        {/* Old Items List - Disabled for Tab Navigation */}
        {false && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden p-12 text-center">
            <p className="text-gray-500">Old table view</p>
          </div>
        )}
      </div>
    </div>
  );
}
