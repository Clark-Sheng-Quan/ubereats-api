import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { unbindUberStore, updateStoreInfo, updateStoreStatus, updateStorePrepTime, updateFulfillmentConfig } from "../services/uberService";
import { AlertCircle, ArrowLeft, Trash2, MapPin, Phone, Mail, Clock, Truck, Edit2, Check, X } from "lucide-react";

interface StoreDetails {
  id: string;
  name: string;
  contact?: {
    email?: string;
    name?: string;
    phone_number?: string;
  };
  location?: {
    street_address_line_one?: string;
    street_address_line_two?: string;
    city?: string;
    country?: string;
    postal_code?: string | number;
    latitude?: string | number;
    longitude?: string | number;
  };
  pickup_instructions?: string;
  timezone?: string;
  fulfillment_type_availability?: {
    DELIVERY?: boolean;
    DELIVERY_API?: boolean;
    DELIVERY_OVER_THE_TOP?: boolean;
    DELIVERY_OVER_THE_TOP_ORDER_AHEAD?: boolean;
    DELIVERY_THIRD_PARTY?: boolean;
    DINE_IN?: boolean;
    PICKUP?: boolean;
  };
  prep_times?: {
    default_value?: number;
  };
  auto_accept?: boolean;
  max_delivery_partners_allowed?: number;
  orderability?: {
    status?: string;
    is_visible?: boolean;
    is_orderable?: boolean;
    is_offline_until?: string;
  };
}

export default function ShopDashboard() {
  const { shopId, uberStoreId } = useParams();
  const navigate = useNavigate();
  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unbinding, setUnbinding] = useState(false);
  const [showUnbindConfirm, setShowUnbindConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  // Modal states
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPrepTimeModal, setShowPrepTimeModal] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);

  // Edit form states
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editPickupInstructions, setEditPickupInstructions] = useState("");
  const [editPrepTime, setEditPrepTime] = useState("");
  const [editCustomMinEtd, setEditCustomMinEtd] = useState("");
  const [editStatus, setEditStatus] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [editStatusReason, setEditStatusReason] = useState("");
  const [editOfflineUntil, setEditOfflineUntil] = useState("");

  const posToken = localStorage.getItem("posToken");

  useEffect(() => {
    console.log("[ShopDashboard] useEffect triggered");
    console.log("[ShopDashboard] shopId:", shopId);
    console.log("[ShopDashboard] uberStoreId:", uberStoreId);
    console.log("[ShopDashboard] posToken:", posToken ? "exists" : "missing");
    
    if (!posToken || !shopId || !uberStoreId) {
      console.log("[ShopDashboard] Missing required data, redirecting to /shops");
      navigate("/shops");
      return;
    }

    loadStoreDetails();
  }, [posToken, shopId, uberStoreId, navigate]);

  const loadStoreDetails = async () => {
    if (!uberStoreId) return;
    try {
      setLoading(true);
      setError("");

      console.log(`[ShopDashboard] Loading store details for: ${uberStoreId}`);
      console.log(`[ShopDashboard] API endpoint: ${config.BACKEND_API}/store/${uberStoreId}`);

      const response = await axios.get(`${config.BACKEND_API}/store/${uberStoreId}`);

      console.log(`[ShopDashboard] Response received:`, response.data);
      console.log(`[ShopDashboard] Response keys:`, Object.keys(response.data as Record<string, any>));
      
      // Uber API returns data wrapped in a 'store' object
      const storeData = (response.data as any).store || response.data;
      console.log(`[ShopDashboard] Store data:`, storeData);
      
      setStoreDetails(storeData as StoreDetails);
    } catch (err: any) {
      console.error("[ShopDashboard] Failed to load store details:", err);
      console.error("[ShopDashboard] Error response:", err.response?.data);
      console.error("[ShopDashboard] Error message:", err.message);
      setError(err.response?.data?.error || err.message || "Failed to load store details");
    } finally {
      setLoading(false);
    }
  };

  const handleUnbind = async () => {
    if (!shopId) return;

    setUnbinding(true);
    try {
      await unbindUberStore(shopId, posToken || "");
      navigate("/shops");
    } catch (err: any) {
      setError(err.message || "Failed to unbind store");
    } finally {
      setUnbinding(false);
      setShowUnbindConfirm(false);
    }
  };

  // Update functions
  const handleUpdateStoreInfo = async () => {
    if (!uberStoreId) return;
    setUpdating(true);
    try {
      const updateData: any = {};
      if (editContactEmail || editContactName || editContactPhone) {
        updateData.contact = {
          email: editContactEmail || storeDetails?.contact?.email,
          name: editContactName || storeDetails?.contact?.name,
          phone_number: editContactPhone || storeDetails?.contact?.phone_number,
        };
      }
      if (editPickupInstructions) {
        updateData.pickup_instructions = editPickupInstructions;
      }

      await (await import("../services/uberService")).updateStoreInfo(uberStoreId, updateData);
      setUpdateMessage("Store information updated successfully!");
      setShowStoreInfoModal(false);
      setTimeout(() => {
        loadStoreDetails();
        setUpdateMessage("");
      }, 1000);
    } catch (err: any) {
      setUpdateMessage("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!uberStoreId) return;
    setUpdating(true);
    try {
      await (await import("../services/uberService")).updateStoreStatus(
        uberStoreId,
        editStatus,
        editStatusReason || undefined,
        editOfflineUntil || undefined
      );
      setUpdateMessage("Store status updated successfully!");
      setShowStatusModal(false);
      setTimeout(() => {
        loadStoreDetails();
        setUpdateMessage("");
      }, 1000);
    } catch (err: any) {
      setUpdateMessage("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePrepTime = async () => {
    if (!uberStoreId || !editPrepTime) return;
    setUpdating(true);
    try {
      await (await import("../services/uberService")).updateStorePrepTime(
        uberStoreId,
        parseInt(editPrepTime)
      );
      setUpdateMessage("Prep time updated successfully!");
      setShowPrepTimeModal(false);
      setTimeout(() => {
        loadStoreDetails();
        setUpdateMessage("");
      }, 1000);
    } catch (err: any) {
      setUpdateMessage("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateFulfillment = async () => {
    if (!uberStoreId) return;
    setUpdating(true);
    try {
      await (await import("../services/uberService")).updateFulfillmentConfig(
        uberStoreId,
        editCustomMinEtd ? parseInt(editCustomMinEtd) : undefined
      );
      setUpdateMessage("Fulfillment configuration updated successfully!");
      setShowFulfillmentModal(false);
      setTimeout(() => {
        loadStoreDetails();
        setUpdateMessage("");
      }, 1000);
    } catch (err: any) {
      setUpdateMessage("Error: " + (err.message || "Failed to update"));
    } finally {
      setUpdating(false);
    }
  };

  const openStoreInfoModal = () => {
    setEditContactEmail(storeDetails?.contact?.email || "");
    setEditContactName(storeDetails?.contact?.name || "");
    setEditContactPhone(storeDetails?.contact?.phone_number || "");
    setEditPickupInstructions(storeDetails?.pickup_instructions || "");
    setShowStoreInfoModal(true);
  };

  const openStatusModal = () => {
    setEditStatus((storeDetails?.orderability?.status as "ONLINE" | "OFFLINE") || "ONLINE");
    setShowStatusModal(true);
  };

  const openPrepTimeModal = () => {
    setEditPrepTime(String((storeDetails?.prep_times?.default_value || 0) / 60));
    setShowPrepTimeModal(true);
  };

  const openFulfillmentModal = () => {
    setEditCustomMinEtd("");
    setShowFulfillmentModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading store details...</p>
        </div>
      </div>
    );
  }

  if (!storeDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate("/shops")}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error || "Store details not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  const prepTimeMinutes = storeDetails.prep_times?.default_value
    ? Math.round(storeDetails.prep_times.default_value / 60)
    : 0;

  const statusColor =
    storeDetails.orderability?.status === "ONLINE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  const statusIcon = storeDetails.orderability?.status === "ONLINE" ? "🟢" : "🔴";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/shops")}
              className="text-gray-600 hover:text-black transition-colors"
              title="Back to shops"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-black">{storeDetails?.name || "Store Details"}</h1>
          </div>
          <button
            onClick={() => setShowUnbindConfirm(true)}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 size={18} />
            Unbind
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

        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📋</span> BASIC INFORMATION
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Store ID</p>
              <p className="text-base font-mono text-gray-900 break-all">{storeDetails.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Business Name</p>
              <p className="text-base text-gray-900">{storeDetails.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Timezone</p>
              <p className="text-base text-gray-900">{storeDetails.timezone || "—"}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        {storeDetails.contact && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>👤</span> CONTACT INFORMATION
              </h2>
              <button
                onClick={openStoreInfoModal}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storeDetails.contact.name && (
                <div>
                  <p className="text-sm text-gray-600">Contact Name</p>
                  <p className="text-base text-gray-900">{storeDetails.contact.name}</p>
                </div>
              )}
              {storeDetails.contact.email && (
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${storeDetails.contact.email}`} className="text-base text-blue-600 hover:text-blue-700 flex items-center gap-2">
                    <Mail size={16} />
                    {storeDetails.contact.email}
                  </a>
                </div>
              )}
              {storeDetails.contact.phone_number && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <a href={`tel:${storeDetails.contact.phone_number}`} className="text-base text-blue-600 hover:text-blue-700 flex items-center gap-2">
                    <Phone size={16} />
                    {storeDetails.contact.phone_number}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Location Information */}
        {storeDetails.location && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={20} /> LOCATION
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="text-base text-gray-900">
                  {storeDetails.location.street_address_line_one}
                  {storeDetails.location.street_address_line_two && `, ${storeDetails.location.street_address_line_two}`}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {storeDetails.location.city && (
                  <div>
                    <p className="text-sm text-gray-600">City</p>
                    <p className="text-base text-gray-900">{storeDetails.location.city}</p>
                  </div>
                )}
                {storeDetails.location.country && (
                  <div>
                    <p className="text-sm text-gray-600">Country</p>
                    <p className="text-base text-gray-900">{storeDetails.location.country}</p>
                  </div>
                )}
                {storeDetails.location.postal_code && (
                  <div>
                    <p className="text-sm text-gray-600">Postal Code</p>
                    <p className="text-base text-gray-900">{storeDetails.location.postal_code}</p>
                  </div>
                )}
              </div>
              {storeDetails.location.latitude && storeDetails.location.longitude && (
                <div>
                  <p className="text-sm text-gray-600">Coordinates</p>
                  <a
                    href={`https://maps.google.com/?q=${storeDetails.location.latitude},${storeDetails.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:text-blue-700"
                  >
                    {parseFloat(String(storeDetails.location.latitude)).toFixed(6)}, {parseFloat(String(storeDetails.location.longitude)).toFixed(6)} 🗺️
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orderability Status */}
        {storeDetails.orderability && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">🟢 ORDERABILITY STATUS</h2>
              <button
                onClick={openStatusModal}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                  {statusIcon} {storeDetails.orderability.status || "UNKNOWN"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Visible</p>
                <span className="text-base text-gray-900">{storeDetails.orderability.is_visible ? "✅ Yes" : "❌ No"}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Orderable</p>
                <span className="text-base text-gray-900">{storeDetails.orderability.is_orderable ? "✅ Yes" : "❌ No"}</span>
              </div>
              {storeDetails.orderability.is_offline_until && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Offline Until</p>
                  <span className="text-base text-gray-900">
                    {new Date(storeDetails.orderability.is_offline_until).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fulfillment Options */}
        {storeDetails.fulfillment_type_availability && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Truck size={20} /> FULFILLMENT OPTIONS
              </h2>
              <button
                onClick={openFulfillmentModal}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(storeDetails.fulfillment_type_availability).map(([key, value]) => {
                let displayName = key;
                if (key === "DELIVERY" || key === "DELIVERY_API" || key === "DELIVERY_OVER_THE_TOP" || key === "DELIVERY_OVER_THE_TOP_ORDER_AHEAD" || key === "DELIVERY_THIRD_PARTY") {
                  displayName = "Delivery";
                } else if (key === "DINE_IN") {
                  displayName = "Dine In";
                } else if (key === "PICKUP") {
                  displayName = "Pickup";
                }
                
                return (
                  <div key={key}>
                    <p className="text-sm text-gray-600">{displayName}</p>
                    <p className="text-base text-gray-900">{value ? "✅ Available" : "❌ Not Available"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preparation & Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={20} /> PREPARATION & CONFIGURATION
            </h2>
            <button
              onClick={openPrepTimeModal}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
            >
              <Edit2 size={16} />
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Default Prep Time</p>
              <p className="text-base text-gray-900">{prepTimeMinutes} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Auto Accept Orders</p>
              <p className="text-base text-gray-900">{storeDetails.auto_accept ? "✅ Yes" : "❌ No"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Delivery Partners</p>
              <p className="text-base text-gray-900">{storeDetails.max_delivery_partners_allowed || "—"}</p>
            </div>
          </div>
        </div>

        {/* Pickup Instructions */}
        {storeDetails.pickup_instructions && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 PICKUP INSTRUCTIONS</h2>
            <p className="text-base text-gray-700 leading-relaxed">{storeDetails.pickup_instructions}</p>
          </div>
        )}
      </div>

      {/* Update Message */}
      {updateMessage && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${updateMessage.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {updateMessage}
        </div>
      )}

      {/* Store Info Modal */}
      {showStoreInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Store Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={storeDetails?.contact?.email}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={storeDetails?.contact?.name}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={storeDetails?.contact?.phone_number}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Instructions</label>
                <textarea
                  value={editPickupInstructions}
                  onChange={(e) => setEditPickupInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={storeDetails?.pickup_instructions}
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowStoreInfoModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStoreInfo}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg font-medium"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Store Status</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "ONLINE" | "OFFLINE")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Store status"
                >
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </div>
              {editStatus === "OFFLINE" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <input
                      type="text"
                      value={editStatusReason}
                      onChange={(e) => setEditStatusReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Scheduled maintenance"
                      title="Reason for offline status"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Offline Until (ISO 8601)</label>
                    <input
                      type="datetime-local"
                      value={editOfflineUntil}
                      onChange={(e) => setEditOfflineUntil(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Offline until datetime"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg font-medium"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prep Time Modal */}
      {showPrepTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Preparation Time</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Prep Time (minutes)</label>
                <input
                  type="number"
                  value={editPrepTime}
                  onChange={(e) => setEditPrepTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  placeholder="minutes"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowPrepTimeModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePrepTime}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg font-medium"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Config Modal */}
      {showFulfillmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Update Fulfillment Configuration</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom Min ETD (minutes)</label>
                <input
                  type="number"
                  value={editCustomMinEtd}
                  onChange={(e) => setEditCustomMinEtd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="160"
                  placeholder="minutes (max 160)"
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowFulfillmentModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFulfillment}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg font-medium"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unbind Confirmation Modal */}
      {showUnbindConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unbind Store?</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to unbind <span className="font-medium">{storeDetails.name}</span> from your POS system?
                This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-red-700">
                  ⚠️ All existing orders and configurations will remain but the store will no longer be synced.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowUnbindConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnbind}
                disabled={unbinding}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {unbinding ? "Unbinding..." : "Unbind"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
