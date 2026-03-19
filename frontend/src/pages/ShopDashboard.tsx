import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { config } from "../config/api";
import { unbindUberStore } from "../services/uberService";
import { AlertCircle, ArrowLeft, Trash2, MapPin, Phone, Mail, Clock, Truck, Edit2 } from "lucide-react";

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
  support_number?: string;
  onboarding_status?: string;
  uber_merchant_type?: {
    type?: string;
  };
  fulfillment_type_availability?: {
    DELIVERY?: boolean;
    DELIVERY_API?: boolean;
    DELIVERY_OVER_THE_TOP?: boolean;
    DELIVERY_OVER_THE_TOP_ORDER_AHEAD?: boolean;
    DELIVERY_THIRD_PARTY?: boolean;
    DINE_IN?: boolean;
    PICKUP?: boolean;
  };
  delivery_settings?: {
    enable_uber_delivery?: boolean;
    enable_uber_delivery_extended?: boolean;
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
    next_close_time?: string;
  };
  ooi_config?: {
    is_substitute_item_enabled?: boolean;
    is_store_replace_item_enabled?: boolean;
    is_cancel_order_enabled?: boolean;
    is_remove_item_enabled?: boolean;
  };
  adjustment_config?: {
    is_price_adjustment_enabled?: boolean;
    maximum_price_adjustment?: number;
    is_tax_inclusive?: boolean;
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
        <div className="px-8 py-8">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-white shadow-lg sticky top-0 z-50">
        <div className="px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/shops")}
              className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to shops"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-black">{storeDetails?.name || "Store Details"}</h1>
              <p className="text-sm text-gray-500 mt-1">Store ID: {storeDetails?.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUnbindConfirm(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
              <Trash2 size={18} />
              Unbind Store
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 w-full">
        {/* Error Alert */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Primary Information */}
          <div className="xl:col-span-2 space-y-8">
            {/* Basic Information Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Name</p>
                  <p className="text-lg font-semibold text-gray-900">{storeDetails.name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timezone</p>
                  <p className="text-lg font-semibold text-gray-900">{storeDetails.timezone || "—"}</p>
                </div>
                {storeDetails.onboarding_status && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</p>
                    <p className={`text-lg font-semibold px-3 py-1 rounded-full inline-block ${
                      storeDetails.onboarding_status === "ACTIVE" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {storeDetails.onboarding_status}
                    </p>
                  </div>
                )}
                {storeDetails.uber_merchant_type && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Merchant Type</p>
                    <p className="text-lg font-semibold text-gray-900">{storeDetails.uber_merchant_type.type?.replace("MERCHANT_TYPE_", "") || "—"}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Store ID</p>
                <p className="text-sm font-mono text-gray-700 break-all p-3 bg-gray-50 rounded-lg">{storeDetails.id}</p>
              </div>
            </div>

            {/* Contact & Pickup Information Card */}
            {storeDetails.contact && (
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-purple-500">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Contact & Instructions</h2>
                      <p className="text-xs text-gray-500 mt-1">Contact info & pickup instructions</p>
                    </div>
                  </div>
                  <button
                    onClick={openStoreInfoModal}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors font-medium"
                  >
                    <Edit2 size={16} />
                    Edit Both
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Name</p>
                    <p className="text-lg font-semibold text-gray-900">{storeDetails.contact.name || "—"}</p>
                  </div>
                  {storeDetails.contact.email && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                      <div className="text-base text-gray-700 font-semibold flex items-center gap-2">
                        <Mail size={18} />
                        {storeDetails.contact.email}
                      </div>
                    </div>
                  )}
                  {storeDetails.contact.phone_number && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</p>
                      <div className="text-base text-gray-700 font-semibold flex items-center gap-2">
                        <Phone size={18} />
                        {storeDetails.contact.phone_number}
                      </div>
                    </div>
                  )}
                  {storeDetails.support_number && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Support Number</p>
                      <div className="text-base text-gray-700 font-semibold flex items-center gap-2">
                        <Phone size={18} />
                        {storeDetails.support_number}
                      </div>
                    </div>
                  )}
                </div>
                {storeDetails.pickup_instructions && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Pickup Instructions</p>
                    <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{storeDetails.pickup_instructions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Pickup Instructions - Only show if no contact info */}
            {!storeDetails.contact && storeDetails.pickup_instructions && (
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-orange-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Pickup Instructions</h2>
                </div>
                <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{storeDetails.pickup_instructions}</p>
              </div>
            )}

            {/* Location Information Card */}
            {storeDetails.location && (
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-green-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin size={24} className="text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Location</h2>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</p>
                    <div className="text-lg font-semibold text-gray-900">
                      <p>{storeDetails.location.street_address_line_one}</p>
                      {storeDetails.location.street_address_line_two && (
                        <p className="text-gray-700">{storeDetails.location.street_address_line_two}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {storeDetails.location.city && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">City</p>
                        <p className="text-base font-semibold text-gray-900">{storeDetails.location.city}</p>
                      </div>
                    )}
                    {storeDetails.location.country && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Country</p>
                        <p className="text-base font-semibold text-gray-900">{storeDetails.location.country}</p>
                      </div>
                    )}
                    {storeDetails.location.postal_code && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Postal Code</p>
                        <p className="text-base font-semibold text-gray-900">{storeDetails.location.postal_code}</p>
                      </div>
                    )}
                  </div>

                  {storeDetails.location.latitude && storeDetails.location.longitude && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Coordinates</p>
                      <a
                        href={`https://maps.google.com/?q=${storeDetails.location.latitude},${storeDetails.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
                      >
                        <span className="text-lg">🗺️</span>
                        {parseFloat(String(storeDetails.location.latitude)).toFixed(6)}, {parseFloat(String(storeDetails.location.longitude)).toFixed(6)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Status & Configuration */}
          <div className="space-y-8">
            {/* Orderability Status Card */}
            {storeDetails.orderability && (
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Orderability</h2>
                  <button
                    onClick={openStatusModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors font-medium"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${storeDetails.orderability.status === "ONLINE" ? "bg-green-500" : "bg-red-500"}`}></span>
                      <span className="text-lg font-bold text-gray-900">{storeDetails.orderability.status || "UNKNOWN"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Visible</p>
                      <p className="text-base font-bold text-gray-900">{storeDetails.orderability.is_visible ? "✅" : "❌"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Orderable</p>
                      <p className="text-base font-bold text-gray-900">{storeDetails.orderability.is_orderable ? "✅" : "❌"}</p>
                    </div>
                  </div>

                  {storeDetails.orderability.is_offline_until && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Offline Until</p>
                      <p className="text-sm font-semibold text-red-700">
                        {new Date(storeDetails.orderability.is_offline_until).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {storeDetails.orderability.next_close_time && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Next Close Time</p>
                      <p className="text-sm font-semibold text-blue-700">
                        {new Date(storeDetails.orderability.next_close_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Preparation Time Settings Card */}
            <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-indigo-500">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Clock size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Preparation Time</h2>
                    <p className="text-xs text-gray-500 mt-1">Default prep time for orders</p>
                  </div>
                </div>
                <button
                  onClick={openPrepTimeModal}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors font-medium"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Prep Time</p>
                  <p className="text-2xl font-bold text-gray-900">{prepTimeMinutes} <span className="text-lg text-gray-600">min</span></p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Auto Accept</p>
                  <p className="text-lg font-bold text-gray-900">{storeDetails.auto_accept ? "✅ Yes" : "❌ No"}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Max Delivery Partners</p>
                  <p className="text-lg font-bold text-gray-900">{storeDetails.max_delivery_partners_allowed || "—"}</p>
                </div>
              </div>
            </div>

            {/* Fulfillment Options Card */}
            {storeDetails.fulfillment_type_availability && (
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-teal-500">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Truck size={20} className="text-teal-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Fulfillment</h2>
                  </div>
                  <button
                    onClick={openFulfillmentModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors font-medium"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Delivery Section */}
                  {(() => {
                    const deliveryTypes = {
                      DELIVERY: storeDetails.fulfillment_type_availability.DELIVERY,
                      DELIVERY_API: storeDetails.fulfillment_type_availability.DELIVERY_API,
                      DELIVERY_OVER_THE_TOP: storeDetails.fulfillment_type_availability.DELIVERY_OVER_THE_TOP,
                      DELIVERY_OVER_THE_TOP_ORDER_AHEAD: storeDetails.fulfillment_type_availability.DELIVERY_OVER_THE_TOP_ORDER_AHEAD,
                      DELIVERY_THIRD_PARTY: storeDetails.fulfillment_type_availability.DELIVERY_THIRD_PARTY,
                    };
                    const hasAnyDelivery = Object.values(deliveryTypes).some(v => v);
                    
                    return (
                      <div>
                        <div className={`flex items-center justify-between p-4 rounded-lg mb-3 ${
                          hasAnyDelivery ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">Delivery</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {Object.entries(deliveryTypes).filter(([, v]) => v).map(([k]) => {
                                if (k === "DELIVERY") return "Standard";
                                if (k === "DELIVERY_API") return "API";
                                if (k === "DELIVERY_OVER_THE_TOP") return "Over The Top";
                                if (k === "DELIVERY_OVER_THE_TOP_ORDER_AHEAD") return "OTT Order Ahead";
                                if (k === "DELIVERY_THIRD_PARTY") return "3rd Party";
                                return k;
                              }).join(", ") || "Disabled"}
                            </p>
                          </div>
                          <span className={`text-lg font-bold ${hasAnyDelivery ? "text-green-600" : "text-gray-400"}`}>
                            {hasAnyDelivery ? "✅" : "❌"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dine In */}
                  {(
                    <div className={`flex items-center justify-between p-4 rounded-lg ${
                      storeDetails.fulfillment_type_availability.DINE_IN ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                    }`}>
                      <p className="text-sm font-semibold text-gray-700">Dine In</p>
                      <span className={`text-lg font-bold ${storeDetails.fulfillment_type_availability.DINE_IN ? "text-green-600" : "text-gray-400"}`}>
                        {storeDetails.fulfillment_type_availability.DINE_IN ? "✅" : "❌"}
                      </span>
                    </div>
                  )}

                  {/* Pickup */}
                  {(
                    <div className={`flex items-center justify-between p-4 rounded-lg ${
                      storeDetails.fulfillment_type_availability.PICKUP ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                    }`}>
                      <p className="text-sm font-semibold text-gray-700">Pickup</p>
                      <span className={`text-lg font-bold ${storeDetails.fulfillment_type_availability.PICKUP ? "text-green-600" : "text-gray-400"}`}>
                        {storeDetails.fulfillment_type_availability.PICKUP ? "✅" : "❌"}
                      </span>
                    </div>
                  )}

                  {/* Uber Delivery Settings */}
                  {storeDetails.delivery_settings && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Uber Delivery</p>
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.delivery_settings.enable_uber_delivery ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Uber Delivery</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.delivery_settings.enable_uber_delivery ? "✅" : "❌"}</span>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.delivery_settings.enable_uber_delivery_extended ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Extended Area</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.delivery_settings.enable_uber_delivery_extended ? "✅" : "❌"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Handling & Adjustments Card */}
            {(storeDetails.ooi_config || storeDetails.adjustment_config) && (
              <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-amber-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Order Processing</h2>
                    <p className="text-xs text-gray-500 mt-1">Order handling & adjustment settings</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {storeDetails.ooi_config && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Order Options</p>
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.ooi_config.is_substitute_item_enabled ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Substitute Items</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.ooi_config.is_substitute_item_enabled ? "✅" : "❌"}</span>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.ooi_config.is_store_replace_item_enabled ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Replace Items</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.ooi_config.is_store_replace_item_enabled ? "✅" : "❌"}</span>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.ooi_config.is_cancel_order_enabled ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Cancel Orders</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.ooi_config.is_cancel_order_enabled ? "✅" : "❌"}</span>
                        </div>
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.ooi_config.is_remove_item_enabled ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Remove Items</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.ooi_config.is_remove_item_enabled ? "✅" : "❌"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {storeDetails.adjustment_config && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Price Adjustments</p>
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.adjustment_config.is_price_adjustment_enabled ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Adjustments Enabled</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.adjustment_config.is_price_adjustment_enabled ? "✅" : "❌"}</span>
                        </div>
                        {storeDetails.adjustment_config.maximum_price_adjustment && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Max Adjustment</p>
                            <p className="text-base font-bold text-gray-900">{storeDetails.adjustment_config.maximum_price_adjustment}%</p>
                          </div>
                        )}
                        <div className={`flex items-center justify-between p-3 rounded-lg ${
                          storeDetails.adjustment_config.is_tax_inclusive ? "bg-orange-50 border border-orange-200" : "bg-gray-50 border border-gray-200"
                        }`}>
                          <p className="text-sm font-semibold text-gray-700">Tax Inclusive</p>
                          <span className="text-lg font-bold text-gray-600">{storeDetails.adjustment_config.is_tax_inclusive ? "✅" : "❌"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Message Toast */}
      {updateMessage && (
        <div
          className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl font-semibold text-white z-50 animate-pulse ${
            updateMessage.startsWith("Error") ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {updateMessage}
        </div>
      )}

      {/* Store Info Modal - Contact & Pickup Instructions */}
      {showStoreInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 p-6 border-b border-purple-600">
              <h3 className="text-2xl font-bold text-white">Edit Contact & Instructions</h3>
              <p className="text-purple-100 text-sm mt-1">Update contact information and pickup instructions</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Contact Email</label>
                <input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder={storeDetails?.contact?.email || "your@email.com"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Contact Name</label>
                <input
                  type="text"
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder={storeDetails?.contact?.name || "John Doe"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Contact Phone</label>
                <input
                  type="tel"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder={storeDetails?.contact?.phone_number || "+1234567890"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Pickup Instructions</label>
                <textarea
                  value={editPickupInstructions}
                  onChange={(e) => setEditPickupInstructions(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  rows={4}
                  placeholder={storeDetails?.pickup_instructions || "Enter pickup instructions..."}
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowStoreInfoModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStoreInfo}
                disabled={updating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 border-b border-red-600">
              <h3 className="text-2xl font-bold text-white">Update Store Status</h3>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "ONLINE" | "OFFLINE")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                  title="Store status"
                >
                  <option value="ONLINE">🟢 Online</option>
                  <option value="OFFLINE">🔴 Offline</option>
                </select>
              </div>
              {editStatus === "OFFLINE" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Reason (Optional)</label>
                    <input
                      type="text"
                      value={editStatusReason}
                      onChange={(e) => setEditStatusReason(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                      placeholder="e.g., Scheduled maintenance"
                      title="Reason for offline status"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Offline Until (Optional)</label>
                    <input
                      type="datetime-local"
                      value={editOfflineUntil}
                      onChange={(e) => setEditOfflineUntil(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                      title="Offline until datetime"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prep Time Modal */}
      {showPrepTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 border-b border-indigo-600">
              <h3 className="text-2xl font-bold text-white">Update Preparation Time</h3>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Default Prep Time (minutes)</label>
                <input
                  type="number"
                  value={editPrepTime}
                  onChange={(e) => setEditPrepTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  min="0"
                  max="180"
                  placeholder="Enter minutes"
                />
                <p className="text-xs text-gray-500 mt-2">Maximum 180 minutes (3 hours)</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowPrepTimeModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePrepTime}
                disabled={updating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fulfillment Config Modal */}
      {showFulfillmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 border-b border-teal-600">
              <h3 className="text-2xl font-bold text-white">Update Fulfillment Configuration</h3>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Custom Min ETD (minutes)</label>
                <input
                  type="number"
                  value={editCustomMinEtd}
                  onChange={(e) => setEditCustomMinEtd(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                  min="0"
                  max="160"
                  placeholder="Enter minutes (max 160)"
                />
                <p className="text-xs text-gray-500 mt-2">Estimated Time to Delivery (ETD) in minutes</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowFulfillmentModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFulfillment}
                disabled={updating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unbind Confirmation Modal */}
      {showUnbindConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 border-b border-red-600">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>⚠️</span> Unbind Store
              </h3>
            </div>
            <div className="p-8">
              <p className="text-base text-gray-700 mb-4">
                Are you sure you want to unbind <span className="font-bold text-gray-900">{storeDetails?.name}</span> from your Uber Eats account?
              </p>
              
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-semibold mb-2">⚠️ This action cannot be undone</p>
                <ul className="text-xs text-red-700 space-y-1 ml-4 list-disc">
                  <li>Store will stop syncing with Uber Eats</li>
                  <li>Existing orders and settings will remain</li>
                  <li>You can rebind the store again later</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowUnbindConfirm(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUnbind}
                disabled={unbinding}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                {unbinding ? "Unbinding..." : "Confirm Unbind"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
