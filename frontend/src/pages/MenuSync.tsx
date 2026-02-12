import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoreMenu, updateMenuItem } from "../services/uberService";
import { CheckCircle, AlertCircle, RefreshCw, Edit2, X, Save, ArrowLeft } from "lucide-react";

interface MenuItem {
  id: string;
  title?: {
    translations?: Record<string, string>;
  };
  description?: {
    translations?: Record<string, string>;
  };
  price_info?: {
    price?: number;
  };
  suspension_info?: {
    suspended?: boolean;
  };
  product_info?: Record<string, any>;
  classifications?: Record<string, any>;
}

interface MenuEntity {
  id: string;
  type: "ITEM" | "MODIFIER_GROUP";
}

interface MenuCategory {
  id: string;
  title?: {
    translations?: Record<string, string>;
  };
  entities?: MenuEntity[];
}

interface MenuData {
  menus?: Array<{
    id: string;
    name: string;
  }>;
  categories?: MenuCategory[];
  items?: MenuItem[];
  modifier_groups?: any[];
}

interface EditingItem {
  storeId: string;
  itemId: string;
  field: string;
  value: any;
}

export default function MenuSyncPage() {
  const { uberStoreId } = useParams();
  const navigate = useNavigate();

  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editValue, setEditValue] = useState("");
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!uberStoreId) {
      navigate("/shops");
      return;
    }

    loadMenu();
  }, [uberStoreId, navigate]);

  const loadMenu = async () => {
    if (!uberStoreId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const data = await getStoreMenu(uberStoreId);
      setMenuData(data);
    } catch (err: any) {
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

      const data = await getStoreMenu(uberStoreId);
      setMenuData(data);
      setSuccess("Menu refreshed successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to refresh menu");
    } finally {
      setRefreshing(false);
    }
  };

  const startEditingItem = (storeId: string, itemId: string, field: string, currentValue: any) => {
    setEditingItem({ storeId, itemId, field, value: currentValue });
    setEditValue(String(currentValue));
  };

  const cancelEditing = () => {
    setEditingItem(null);
    setEditValue("");
  };

  const saveItemUpdate = async () => {
    if (!editingItem || !uberStoreId) return;

    try {
      setUpdatingItemId(editingItem.itemId);
      setError("");

      const updateData: Record<string, any> = {};
      
      // 根据字段类型构建更新数据
      if (editingItem.field === "price") {
        // Convert dollars to cents (e.g., 10.99 → 1099)
        const priceInCents = Math.round(parseFloat(editValue) * 100);
        updateData.price_info = { price: priceInCents };
      } else if (editingItem.field === "suspended") {
        updateData.suspension_info = { suspended: editValue === "true" };
      } else if (editingItem.field === "name") {
        updateData.product_info = { product_name: editValue };
      } else if (editingItem.field === "description") {
        updateData.product_info = { product_description: editValue };
      } else {
        updateData[editingItem.field] = editValue;
      }

      await updateMenuItem(uberStoreId, editingItem.itemId, updateData);

      // 更新本地状态
      setSuccess(`Item updated successfully`);
      setTimeout(() => setSuccess(""), 3000);
      
      // 重新加载菜单
      await loadMenu();
      setEditingItem(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update item");
    } finally {
      setUpdatingItemId(null);
    }
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
      // Try en_us first, then en, then first available
      return textObj.translations["en_us"] || textObj.translations["en"] || Object.values(textObj.translations)[0] || "—";
    }
    return "—";
  };

  // Build categories with their items
  const categories = (menuData?.categories || []).map((category) => {
    const categoryItems = (category.entities || [])
      .map((entity) => {
        const item = menuData?.items?.find((i) => i.id === entity.id);
        return item
          ? {
              ...item,
              name: getText(item.title),
              description: getText(item.description),
            }
          : null;
      })
      .filter(Boolean) as any[];

    return {
      id: category.id,
      name: getText(category.title),
      items: categoryItems,
    };
  });

  const totalItems = categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/shops")}
              className="text-gray-600 hover:text-black transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-black">Uber Menu</h1>
              <p className="text-sm text-gray-600 mt-1">
                {totalItems} items across {categories.length} categories
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Menu"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
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

        {/* Menu Categories */}
        {categories.length > 0 ? (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category.id}>
                <h2 className="text-xl font-bold text-black mb-4">{category.name}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {category.items?.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          {editingItem && editingItem.itemId === item.id && editingItem.field === "name" ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-bold text-black"
                              disabled={updatingItemId === item.id}
                            />
                          ) : (
                            <h3 className="font-bold text-black">{item.name}</h3>
                          )}
                        </div>
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ml-2 ${
                            item.suspension_info?.suspended
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.suspension_info?.suspended ? "Suspended" : "Active"}
                        </span>
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                      )}

                      {/* Item ID */}
                      <p className="text-xs text-gray-500 mb-4">ID: {item.id}</p>

                      {/* Price and Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Price</p>
                            {editingItem && editingItem.itemId === item.id && editingItem.field === "price" ? (
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                step="0.01"
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-bold text-black"
                                disabled={updatingItemId === item.id}
                              />
                            ) : (
                              <p className="font-bold text-black">
                                ${((item.price_info?.price || 0) / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Edit/Save/Cancel Buttons */}
                        {editingItem?.itemId === item.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={saveItemUpdate}
                              disabled={updatingItemId === item.id}
                              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={updatingItemId === item.id}
                              className="flex items-center gap-1 bg-gray-300 text-black px-3 py-1 rounded text-sm font-semibold hover:bg-gray-400 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditingItem(uberStoreId || "", item.id, "price", ((item.price_info?.price || 0) / 100).toFixed(2))}
                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-blue-700"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold">No menu items found</p>
            <p className="text-sm text-gray-500 mt-2">
              Your Uber store menu is empty. Contact Uber support to add menu items.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
