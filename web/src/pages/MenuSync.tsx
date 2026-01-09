import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShopProducts, getProductCategories } from "../services/posApi";
import { syncMenuToUber, getSyncHistory } from "../services/uberService";
import { CheckCircle, AlertCircle, Upload, ArrowLeft } from "lucide-react";

interface Product {
  product_id: string;
  product_name: string;
  unit_price: number;
  description?: string;
  category_name?: string;
}

interface SyncHistoryItem {
  synced_at: string;
  synced_count: number;
  status: "success" | "partial" | "failed";
}

export default function MenuSyncPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([]);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message?: string;
    count?: number;
    errors?: string[];
  } | null>(null);

  const posToken = localStorage.getItem("pos_token");

  useEffect(() => {
    if (!posToken || !shopId) {
      navigate("/shops");
      return;
    }

    loadMenuData();
  }, [posToken, shopId, navigate]);

  const loadMenuData = async () => {
    if (!posToken || !shopId) return;

    try {
      setLoading(true);
      setError("");

      const [productsData, historyData] = await Promise.all([
        getShopProducts(posToken, shopId),
        getSyncHistory(shopId, posToken),
      ]);

      setProducts(productsData);
      setSyncHistory(historyData);

      // 默认选中所有产品
      const allIds = new Set(productsData.map((p) => p.product_id));
      setSelectedProducts(allIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.product_id)));
    }
  };

  const handleSync = async () => {
    if (!posToken || !shopId || selectedProducts.size === 0) {
      setError("Please select at least one product to sync");
      return;
    }

    const productsToSync = products.filter((p) =>
      selectedProducts.has(p.product_id)
    );

    try {
      setSyncing(true);
      setSyncResult(null);
      setError("");

      const result = await syncMenuToUber(shopId, posToken, productsToSync);

      setSyncResult({
        success: result.success,
        message: result.message,
        count: result.synced_count,
        errors: result.errors,
      });

      if (result.success) {
        setTimeout(() => loadMenuData(), 1000);
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu data...</p>
        </div>
      </div>
    );
  }

  const categories = Array.from(
    new Set(products.map((p) => p.category_name || "Uncategorized"))
  );
  const groupedProducts = categories.map((category) => ({
    category,
    products: products.filter((p) => (p.category_name || "Uncategorized") === category),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/shops")}
            className="text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-black">Sync Menu to Uber</h1>
            <p className="text-sm text-gray-600 mt-1">
              Select products to sync from your POS system
            </p>
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

        {/* Sync Result */}
        {syncResult && (
          <div
            className={`mb-6 rounded-lg p-4 flex items-start gap-3 border ${
              syncResult.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            {syncResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-semibold ${
                  syncResult.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {syncResult.message}
              </p>
              {syncResult.count !== undefined && (
                <p className={`text-sm mt-1 ${
                  syncResult.success ? "text-green-600" : "text-red-600"
                }`}>
                  Synced: {syncResult.count} products
                </p>
              )}
              {syncResult.errors && syncResult.errors.length > 0 && (
                <ul className="text-xs text-red-600 mt-2 space-y-1">
                  {syncResult.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {syncResult.errors.length > 3 && (
                    <li>• ... and {syncResult.errors.length - 3} more</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Selection Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={selectedProducts.size === products.length}
              onChange={toggleAll}
              className="w-5 h-5 text-black rounded cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-700">
              {selectedProducts.size} of {products.length} selected
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || selectedProducts.size === 0}
            className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            {syncing ? "Syncing..." : "Sync to Uber"}
          </button>
        </div>

        {/* Products List */}
        <div className="space-y-6">
          {groupedProducts.map(({ category, products: categoryProducts }) => (
            <div key={category}>
              <h3 className="text-lg font-bold text-black mb-3">{category}</h3>
              <div className="space-y-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
                {categoryProducts.map((product, index) => (
                  <div
                    key={product.product_id}
                    className={`p-4 flex items-start gap-4 border-b last:border-b-0 ${
                      selectedProducts.has(product.product_id)
                        ? "bg-blue-50"
                        : "bg-white"
                    } hover:bg-gray-50 transition-colors cursor-pointer`}
                    onClick={() => toggleProduct(product.product_id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.product_id)}
                      onChange={() => toggleProduct(product.product_id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 text-black rounded cursor-pointer mt-0.5"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-black mb-1">
                        {product.product_name}
                      </h4>
                      {product.description && (
                        <p className="text-sm text-gray-600 mb-2">
                          {product.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        ID: {product.product_id}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">
                        ${product.unit_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-black mb-4">Sync History</h3>
            <div className="space-y-3">
              {syncHistory.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {new Date(item.synced_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {item.synced_count} products
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      item.status === "success"
                        ? "bg-green-100 text-green-700"
                        : item.status === "partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
