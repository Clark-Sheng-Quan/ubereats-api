import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPosProducts, getPosProductsCount, getPosOptions } from "../services/posService";
import { uploadVend88MenuToUber } from "../services/menuUploadService";
import { CheckCircle, AlertCircle, RefreshCw, ArrowLeft, X } from "lucide-react";
import {
  deleteItemMapping,
  deleteOptionMapping,
  getAllMappings,
  getLocalUberItems,
  getLocalUberMenuSnapshot,
  ItemMappingRecord,
  OptionItemMappingRecord,
  OptionMappingRecord,
  saveItemMapping,
  saveOptionItemMapping,
  saveOptionMapping,
  syncUberMenuSnapshot,
} from "../services/mappingService";
import { buildExactNamePairs, buildOptionPairs, normalizeMappingName } from "../services/menuMappingService";

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
  modifier_group_ids?: {
    ids?: string[];
    overrides?: any[];
  };
  bundled_items?: any;
}

interface Vend88Item {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  category?: string | string[];
  active?: boolean;
  image_url?: string;
  options?: any[];
}

interface Vend88OptionItem {
  _id: string;
  name: string;
  price_adjust?: number;
  price?: number;
}

interface Vend88Option {
  _id: string;
  name: string;
  option_items?: Vend88OptionItem[];
}

interface MenuEntity {
  id: string;
  type?: "ITEM" | "MODIFIER_GROUP";
}

interface ModifierOption {
  id: string;
  type?: "ITEM" | "MODIFIER_GROUP";
}

interface ModifierGroup {
  id: string;
  title?: {
    translations?: Record<string, string>;
  };
  external_data?: string;
  modifier_options?: ModifierOption[];
  display_type?: "expanded" | "collapsed";
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
  option_items?: MenuItem[];
}

type ItemTabType = "item-mapped" | "item-unmapped-uber" | "item-unmapped-vend88";
type OptionTabType = "option-mapped" | "option-unmapped-uber" | "option-unmapped-vend88";

export default function MenuSyncPage() {
  const { businessId, uberStoreId } = useParams();
  const navigate = useNavigate();

  // Item tab state
  const [itemActiveTab, setItemActiveTab] = useState<ItemTabType>("item-mapped");
  
  // Option tab state
  const [optionActiveTab, setOptionActiveTab] = useState<OptionTabType>("option-mapped");
  
  // Track which section is active
  const [activeSection, setActiveSection] = useState<"items" | "options">("items");
  
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  
  // Uber backend pagination state
  const [uberBackendPagedItems, setUberBackendPagedItems] = useState<MenuItem[]>([]);
  const [uberBackendPagedOptions, setUberBackendPagedOptions] = useState<ModifierGroup[]>([]);
  const [uberItemsPagination, setUberItemsPagination] = useState({
    page: 1,
    per_page: 15,
    total_count: 0,
    total_pages: 1,
  });
  const [uberOptionsPagination, setUberOptionsPagination] = useState({
    page: 1,
    per_page: 50,
    total_count: 0,
    total_pages: 1,
  });
  
  // Uber Options state
  const [uberOptions, setUberOptions] = useState<ModifierGroup[]>([]);
  
  // Vend88 Items state
  const [vend88Items, setVend88Items] = useState<Vend88Item[]>([]);
  const [vend88CurrentPage, setVend88CurrentPage] = useState(0);
  const [vend88MaxPage, setVend88MaxPage] = useState(0);
  const [vend88TotalCount, setVend88TotalCount] = useState(0);
  
  // Vend88 Options state
  const [vend88Options, setVend88Options] = useState<Vend88Option[]>([]);
  const [optionsCurrentPage, setOptionsCurrentPage] = useState(0);
  const [optionsMaxPage, setOptionsMaxPage] = useState(0);
  const [optionsTotalCount, setOptionsTotalCount] = useState(0);
  const [uberOptionsCurrentPage, setUberOptionsCurrentPage] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingUberCache, setSyncingUberCache] = useState(false);
  const [uploadingMenu, setUploadingMenu] = useState(false);
  const [loadingVend88Products, setLoadingVend88Products] = useState(false);
  const [loadingUberPagination, setLoadingUberPagination] = useState(false);
  const [showUploadModeModal, setShowUploadModeModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uberCurrentPage, setUberCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const optionItemsPerPage = 50;
  
  const [itemMappings, setItemMappings] = useState<ItemMappingRecord[]>([]);
  const [optionMappings, setOptionMappings] = useState<OptionMappingRecord[]>([]);
  const [optionItemMappings, setOptionItemMappings] = useState<OptionItemMappingRecord[]>([]);
  const [autoMapping, setAutoMapping] = useState(false);
  const [locallyMappedPosItemIds, setLocallyMappedPosItemIds] = useState<Set<string>>(new Set());
  const [expandedOptionMappingIds, setExpandedOptionMappingIds] = useState<Set<number>>(new Set());

  const [showItemMapModal, setShowItemMapModal] = useState(false);
  const [itemMapSource, setItemMapSource] = useState<{ type: "uber" | "vend88"; uberItem?: MenuItem; vendItem?: Vend88Item } | null>(null);
  const [itemMapSearch, setItemMapSearch] = useState("");
  const [itemModalUberPage, setItemModalUberPage] = useState(1);
  const [itemModalUberCandidates, setItemModalUberCandidates] = useState<Array<{ id: string; name: string; subtitle: string }>>([]);
  const [itemModalUberCandidatesRaw, setItemModalUberCandidatesRaw] = useState<MenuItem[]>([]);
  const [itemModalUberTotalPages, setItemModalUberTotalPages] = useState(1);

  const [showOptionMapModal, setShowOptionMapModal] = useState(false);
  const [optionMapSource, setOptionMapSource] = useState<{ type: "uber" | "vend88"; uberOption?: ModifierGroup; vendOption?: Vend88Option } | null>(null);
  const [optionMapSearch, setOptionMapSearch] = useState("");
  const [optionMapStep, setOptionMapStep] = useState<"group" | "items">("group");
  const [optionModalUberPage, setOptionModalUberPage] = useState(1);
  const [selectedTargetOptionId, setSelectedTargetOptionId] = useState("");
  const [optionItemSelections, setOptionItemSelections] = useState<Record<string, string>>({});
  const [optionItemSearchByVendId, setOptionItemSearchByVendId] = useState<Record<string, string>>({});

  // Load initial data only when component mounts or store/business changes
  useEffect(() => {
    if (!uberStoreId) {
      navigate("/shops");
      return;
    }

    loadData();
  }, [uberStoreId, businessId, navigate]);

  // Only reload current page items when pagination changes (no need to reload mappings)
  useEffect(() => {
    if (!businessId || !uberStoreId || !menuData) return;

    // Only load the current page of items, don't reload mappings or Vend88 data
    const loadPagedItems = async () => {
      try {
        const uberMenuData = await getLocalUberMenuSnapshot(
          businessId,
          uberCurrentPage,
          uberOptionsCurrentPage,
          15,
          50
        );
        setUberBackendPagedItems(uberMenuData.items || []);
        setUberBackendPagedOptions(uberMenuData.modifier_groups || []);
        if (uberMenuData.pagination) {
          setUberItemsPagination(uberMenuData.pagination.items);
          setUberOptionsPagination(uberMenuData.pagination.option_items);
        }
      } catch (err: any) {
        console.error("[MenuSync] Failed to load paged items:", err.message);
      }
    };

    loadPagedItems();
  }, [uberCurrentPage, uberOptionsCurrentPage, businessId, uberStoreId, menuData]);

  // Load Vend88 products with pagination
  const loadVend88Products = async (pageIdx: number = 0) => {
    try {
      setLoadingVend88Products(true);
      const posToken = localStorage.getItem("posToken");
      if (!posToken) {
        console.warn("[MenuSync] No POS token found");
        return;
      }

      if (!businessId) {
        console.warn("[MenuSync] No business ID");
        return;
      }

      
      const response = await getPosProducts(posToken, businessId, itemsPerPage, pageIdx);
      const products = response.products || [];
      const maxPage = response.max_page || 0;

      setVend88Items(products);
      setVend88CurrentPage(pageIdx);
      setVend88MaxPage(maxPage);
    } catch (err: any) {
      console.error("[MenuSync] Failed to load Vend88 products:", err.message);
    } finally {
      setLoadingVend88Products(false);
    }
  };

  // Load Vend88 options with pagination
  const loadVend88Options = async (pageIdx: number = 0) => {
    try {
      const posToken = localStorage.getItem("posToken");
      if (!posToken) {
        console.warn("[MenuSync] No POS token found");
        return;
      }

      if (!businessId) {
        console.warn("[MenuSync] No business ID");
        return;
      }

      // Fetch all options in a single request (backend now returns all)
      const response = await getPosOptions(posToken, businessId, 10000, 0);
      const options = response.options || [];

      setVend88Options(options);
      setOptionsCurrentPage(0);
      setOptionsMaxPage(1);
      setOptionsTotalCount(options.length);
    } catch (err: any) {
      console.error("[MenuSync] Failed to load Vend88 options:", err.message);
    }
  };

  // Load Vend88 products when page changes
  useEffect(() => {
    if (!businessId) return;
    loadVend88Products(vend88CurrentPage);
  }, [vend88CurrentPage, businessId]);

  // Load Vend88 options when page changes
  useEffect(() => {
    if (!businessId) return;
    loadVend88Options(optionsCurrentPage);
  }, [optionsCurrentPage, businessId]);

  // Clear Uber pagination loading state when page changes
  useEffect(() => {
    if (loadingUberPagination) {
      const timer = setTimeout(() => {
        setLoadingUberPagination(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [uberCurrentPage, loadingUberPagination]);

  useEffect(() => {
    if (!showItemMapModal || !itemMapSource || itemMapSource.type !== "vend88" || !businessId) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const uberMenuData = await getLocalUberMenuSnapshot(
          businessId,
          itemModalUberPage,
          1,
          itemsPerPage,
          optionItemsPerPage,
          itemMapSearch
        );

        const candidates = (uberMenuData.items || []).map((item) => ({
          id: item.id,
          name: getText(item.title),
          subtitle: item.id,
        }));

        setItemModalUberCandidates(candidates);
        setItemModalUberCandidatesRaw(uberMenuData.items || []);
        setItemModalUberTotalPages(uberMenuData.pagination?.items?.total_pages || 1);
      } catch (err: any) {
        console.error("[MenuSync] Failed to search Uber items:", err.message);
        setItemModalUberCandidates([]);
        setItemModalUberCandidatesRaw([]);
        setItemModalUberTotalPages(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [showItemMapModal, itemMapSource, businessId, itemModalUberPage, itemMapSearch, itemsPerPage, optionItemsPerPage]);

  const loadData = async () => {
    if (!uberStoreId || !businessId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      // Load local cached Uber menu snapshot with pagination
      const uberMenuData = await getLocalUberMenuSnapshot(businessId, uberCurrentPage, uberOptionsCurrentPage, 15, 50);
      setMenuData(uberMenuData);
      
      // Store backend-paged items and options
      setUberBackendPagedItems(uberMenuData.items || []);
      setUberBackendPagedOptions(uberMenuData.modifier_groups || []);
      
      // Store pagination metadata
      if (uberMenuData.pagination) {
        setUberItemsPagination(uberMenuData.pagination.items);
        setUberOptionsPagination(uberMenuData.pagination.option_items);
      }
      
      // Extract and set Uber modifier groups as options (for mapping UI)
      const modifierGroups = uberMenuData?.modifier_groups || [];
      setUberOptions(modifierGroups);

      const mappingData = await getAllMappings(businessId);
      setItemMappings(mappingData.items || []);
      setOptionMappings(mappingData.options || []);
      setOptionItemMappings(mappingData.option_items || []);
      
      try {
        const posToken = localStorage.getItem("posToken");
        if (!posToken) {
          console.warn("[MenuSync] No POS token found");
        } else {
          const totalCount = await getPosProductsCount(posToken, businessId);
          setVend88TotalCount(totalCount);

          await loadVend88Products(0);
          await loadVend88Options(0);
        }
      } catch (err: any) {
        console.error("[MenuSync] Failed to load Vend88 data:", err.message);
      }
    } catch (err: any) {
      console.error("[MenuSync] Failed to load menu data:", err);
      setError(err.response?.data?.error || err.message || "Failed to load menu data");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncUberCache = async () => {
    if (!uberStoreId || !businessId) {
      setError("Missing store or business information");
      return;
    }

    try {
      setSyncingUberCache(true);
      setError("");
      setSuccess("");

      await syncUberMenuSnapshot(businessId, uberStoreId);
      await loadData();
      setSuccess("Uber menu synced to local cache");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to sync Uber cache");
    } finally {
      setSyncingUberCache(false);
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

  const handleUploadMenu = async (mode: "replace" | "merge") => {
    if (!uberStoreId || !businessId) {
      setError("Missing store or business information");
      return;
    }

    const posToken = localStorage.getItem("posToken");
    if (!posToken) {
      setError("No POS token found. Please login again.");
      return;
    }

    try {
      setUploadingMenu(true);
      setShowUploadModeModal(false);
      setError("");
      setSuccess("");

      const result = await uploadVend88MenuToUber({
        storeId: uberStoreId,
        businessId,
        posToken,
        mode,
      });

      setSuccess(
        `Upload success (${result.mode}): ${result.productCount} products, ${result.optionGroupCount} option groups, ${result.optionItemCount} option items`
      );
      setTimeout(() => setSuccess(""), 4000);

      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to upload menu");
    } finally {
      setUploadingMenu(false);
    }
  };

  const getUberItemNameById = (itemId: string) => {
    const item = [...(menuData?.items || []), ...(menuData?.option_items || [])].find((it) => it.id === itemId);
    if (!item) return "—";
    return getText(item.title);
  };

  const getUberItemPriceById = (itemId: string) => {
    const item = [...(menuData?.items || []), ...(menuData?.option_items || [])].find((it) => it.id === itemId);
    if (!item) return "—";
    const cents = item.price_info?.price;
    if (typeof cents !== "number") return "—";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatVend88DisplayPrice = (rawPrice: unknown) => {
    const value = Number(rawPrice);
    if (!Number.isFinite(value)) return "—";

    // Vend88 prices are in major currency units.
    return `$${value.toFixed(2)}`;
  };

  const getModifierGroupNameById = (groupId: string) => {
    const group = (uberOptions || []).find((g) => g.id === groupId);
    if (!group) return groupId;
    return getText(group.title) || groupId;
  };

  const getUberItemOptionGroupNames = (item: MenuItem) => {
    const groupIds = item.modifier_group_ids?.ids || [];
    return groupIds.map((groupId) => getModifierGroupNameById(groupId));
  };

  const getUberOptionGroupNamesFromStoredIds = (rawIds: unknown) => {
    let groupIds: string[] = [];

    if (Array.isArray(rawIds)) {
      groupIds = rawIds.filter((id): id is string => typeof id === "string");
    } else if (typeof rawIds === "string") {
      try {
        const parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed)) {
          groupIds = parsed.filter((id): id is string => typeof id === "string");
        }
      } catch {
        groupIds = [];
      }
    }

    return groupIds;
  };

  const getVend88OptionNamesFromStoredOptions = (rawOptions: unknown) => {
    let options: any[] = [];

    if (Array.isArray(rawOptions)) {
      options = rawOptions;
    } else if (typeof rawOptions === "string") {
      try {
        const parsed = JSON.parse(rawOptions);
        if (Array.isArray(parsed)) {
          options = parsed;
        }
      } catch {
        options = [];
      }
    }

    return options
      .map((opt: any) => {
        if (typeof opt === "string") return opt;
        return opt?.name || opt?.title || "";
      })
      .filter(Boolean);
  };

  const formatUberDisplayPriceFromMinor = (rawPrice: unknown) => {
    const value = Number(rawPrice);
    if (!Number.isFinite(value)) return "—";
    return `$${(value / 100).toFixed(2)}`;
  };

  const openItemMapModalForUber = (uberItem: MenuItem) => {
    setItemMapSource({ type: "uber", uberItem });
    setItemMapSearch("");
    setItemModalUberPage(1);
    setShowItemMapModal(true);
  };

  const openItemMapModalForVend = (vendItem: Vend88Item) => {
    setItemMapSource({ type: "vend88", vendItem });
    setItemMapSearch("");
    setItemModalUberPage(1);
    setShowItemMapModal(true);
  };

  const closeItemMapModal = () => {
    setShowItemMapModal(false);
    setItemMapSource(null);
    setItemMapSearch("");
    setItemModalUberPage(1);
    setItemModalUberCandidatesRaw([]);
  };

  const openOptionMapModalForUber = (uberOption: ModifierGroup) => {
    setOptionMapSource({ type: "uber", uberOption });
    setOptionMapSearch("");
    setOptionMapStep("group");
    setSelectedTargetOptionId("");
    setOptionItemSelections({});
    setOptionItemSearchByVendId({});
    setOptionModalUberPage(1);
    setShowOptionMapModal(true);
  };

  const openOptionMapModalForVend = (vendOption: Vend88Option) => {
    setOptionMapSource({ type: "vend88", vendOption });
    setOptionMapSearch("");
    setOptionMapStep("group");
    setSelectedTargetOptionId("");
    setOptionItemSelections({});
    setOptionItemSearchByVendId({});
    setOptionModalUberPage(1);
    setShowOptionMapModal(true);
  };

  const closeOptionMapModal = () => {
    setShowOptionMapModal(false);
    setOptionMapSource(null);
    setOptionMapSearch("");
    setOptionMapStep("group");
    setSelectedTargetOptionId("");
    setOptionItemSelections({});
    setOptionItemSearchByVendId({});
    setOptionModalUberPage(1);
  };

  const getMappedItemRows = () => {
    return itemMappings;
  };

  const mappedItemRows = getMappedItemRows();

  const handleConfirmItemMapping = async (targetId: string) => {
    if (!businessId) return;

    try {
      if (!itemMapSource) {
        return;
      }

      let mappedPosItemId = "";

      if (itemMapSource.type === "uber") {
        const uberItem = itemMapSource.uberItem;
        const vendItem = vend88Items.find((item) => item._id === targetId);

        if (!uberItem || !vendItem) {
          setError("Invalid item mapping selection");
          return;
        }

        await saveItemMapping({
          shop_id: businessId,
          pos_item_id: vendItem._id,
          pos_item_name: vendItem.name,
          pos_item_price: vendItem.price,
          pos_item_options: vendItem.options,
          uber_item_id: uberItem.id,
          uber_item_name: getText(uberItem.title),
          uber_item_price: uberItem.price_info?.price,
          uber_item_options: uberItem.modifier_group_ids?.ids,
        });

        mappedPosItemId = String(vendItem._id || "").trim();
      } else {
        const vendItem = itemMapSource.vendItem;
        // Get Uber item from the raw candidates that were fetched
        const uberItem = itemModalUberCandidatesRaw.find((item) => item.id === targetId) ||
                        [...(menuData?.items || []), ...(menuData?.option_items || [])].find((item) => item.id === targetId);

        if (!vendItem || !uberItem) {
          setError("Invalid item mapping selection");
          return;
        }

        await saveItemMapping({
          shop_id: businessId,
          pos_item_id: vendItem._id,
          pos_item_name: vendItem.name,
          pos_item_price: vendItem.price,
          pos_item_options: vendItem.options,
          uber_item_id: uberItem.id,
          uber_item_name: getText(uberItem.title),
          uber_item_price: uberItem.price_info?.price,
          uber_item_options: uberItem.modifier_group_ids?.ids,
        });

        mappedPosItemId = String(vendItem._id || "").trim();
      }

      // Optimistically hide freshly mapped records from current-page unmapped lists.
      if (mappedPosItemId) {
        setLocallyMappedPosItemIds((prev) => {
          const next = new Set(prev);
          next.add(mappedPosItemId);
          return next;
        });
        setVend88Items((prev) =>
          prev.filter((item) => {
            const primaryId = String(item._id || "").trim();
            const secondaryId = String(item.id || "").trim();
            return primaryId !== mappedPosItemId && secondaryId !== mappedPosItemId;
          })
        );
      }

      const [mappingData, uberMenuData] = await Promise.all([
        getAllMappings(businessId),
        getLocalUberMenuSnapshot(businessId, uberCurrentPage, uberOptionsCurrentPage, 15, 50),
      ]);
      setItemMappings(mappingData.items || []);
      setUberBackendPagedItems(uberMenuData.items || []);
      if (uberMenuData.pagination) {
        setUberItemsPagination(uberMenuData.pagination.items);
      }
      closeItemMapModal();
      setSuccess("Item mapping saved");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save item mapping");
    }
  };

  const handleDeleteItemMapping = async (mappingId: number, posItemId?: string) => {
    if (!businessId) return;

    try {
      setError("");
      await deleteItemMapping(businessId, mappingId);

      if (posItemId) {
        setLocallyMappedPosItemIds((prev) => {
          const next = new Set(prev);
          next.delete(String(posItemId || "").trim());
          return next;
        });
      }

      const [mappingData, uberMenuData] = await Promise.all([
        getAllMappings(businessId),
        getLocalUberMenuSnapshot(businessId, uberCurrentPage, uberOptionsCurrentPage, 15, 50),
      ]);

      setItemMappings(mappingData.items || []);
      setUberBackendPagedItems(uberMenuData.items || []);
      if (uberMenuData.pagination) {
        setUberItemsPagination(uberMenuData.pagination.items);
      }

      await loadVend88Products(vend88CurrentPage);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to delete item mapping");
    }
  };

  const handleDeleteOptionMapping = async (mappingId: number) => {
    if (!businessId) return;

    try {
      setError("");
      await deleteOptionMapping(businessId, mappingId);

      const mappingData = await getAllMappings(businessId);
      setOptionMappings(mappingData.options || []);
      setOptionItemMappings(mappingData.option_items || []);

      setSuccess("Option mapping deleted (including all option item mappings)");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to delete option mapping");
    }
  };

  const getUberOptionItemFromModifierOption = (modifierOptionId: string) => {
    return [...(menuData?.items || []), ...(menuData?.option_items || [])].find((item) => item.id === modifierOptionId);
  };

  const handleConfirmOptionGroupMapping = async () => {
    if (!businessId) return;
    if (!optionMapSource || !selectedTargetOptionId) {
      setError("Please select a target option group");
      return;
    }

    const sourceIsUber = optionMapSource.type === "uber";
    const uberOption = sourceIsUber
      ? optionMapSource.uberOption
      : uberOptions.find((opt) => opt.id === selectedTargetOptionId);
    const vendOption = sourceIsUber
      ? vend88Options.find((opt) => opt._id === selectedTargetOptionId)
      : optionMapSource.vendOption;

    if (!uberOption || !vendOption) {
      setError("Invalid option group selection");
      return;
    }

    const vend88ItemCount = vendOption.option_items?.length || 0;
    const uberItemCount = (uberOption.modifier_options || [])
      .filter((opt) => opt.type === "ITEM")
      .length;

    await saveOptionMapping({
      shop_id: businessId,
      pos_option_id: vendOption._id,
      pos_option_name: vendOption.name,
      uber_option_id: uberOption.id,
      uber_option_name: getText(uberOption.title),
      vend88_item_count: vend88ItemCount,
      uber_item_count: uberItemCount,
    });

    const defaultSelections: Record<string, string> = {};
    const uberItems = (uberOption.modifier_options || [])
      .map((opt) => ({
        id: opt.id,
        name: getText(getUberOptionItemFromModifierOption(opt.id)?.title),
      }))
      .filter((item) => item.id && item.name && item.name !== "—");

    (vendOption.option_items || []).forEach((vendItem) => {
      const matched = uberItems.find(
        (uberItem) => normalizeMappingName(uberItem.name) === normalizeMappingName(vendItem.name)
      );
      if (matched) {
        defaultSelections[vendItem._id] = matched.id;
      }
    });

    setOptionItemSelections(defaultSelections);
    setOptionMapStep("items");
  };

  const handleConfirmOptionItemMappings = async () => {
    if (!businessId || !optionMapSource) return;

    try {
      const sourceIsUber = optionMapSource.type === "uber";
      const uberOption = sourceIsUber
        ? optionMapSource.uberOption
        : uberOptions.find((opt) => opt.id === selectedTargetOptionId);
      const vendOption = sourceIsUber
        ? vend88Options.find((opt) => opt._id === selectedTargetOptionId)
        : optionMapSource.vendOption;

      if (!uberOption || !vendOption) {
        setError("Invalid option group selection");
        return;
      }

      for (const vendItem of vendOption.option_items || []) {
        const selectedUberOptionItemId = optionItemSelections[vendItem._id];
        if (!selectedUberOptionItemId) {
          continue;
        }

        const uberItem = getUberOptionItemFromModifierOption(selectedUberOptionItemId);
        await saveOptionItemMapping({
          shop_id: businessId,
          pos_option_id: vendOption._id,
          pos_option_item_id: vendItem._id,
          pos_option_item_name: vendItem.name,
          uber_option_id: uberOption.id,
          uber_option_item_id: selectedUberOptionItemId,
          uber_option_item_name: getText(uberItem?.title),
        });
      }

      const mappingData = await getAllMappings(businessId);
      setOptionMappings(mappingData.options || []);
      setOptionItemMappings(mappingData.option_items || []);
      closeOptionMapModal();
      setSuccess("Option mapping saved");
      setTimeout(() => setSuccess(""), 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to save option mapping");
    }
  };

  const handleAutoMapSameNames = async () => {
    if (!businessId) return;

    try {
      setAutoMapping(true);

      const posToken = localStorage.getItem("posToken");
      if (!posToken) {
        setError("No POS token found. Please login again.");
        return;
      }

      const autoMapPageSize = 200;

      // Auto-map should match against the full Vend88 catalog, not just the current page.
      const firstPage = await getPosProducts(posToken, businessId, autoMapPageSize, 0);
      const totalPages = Math.max(1, Number(firstPage.max_page || 1));
      const vend88ItemMap = new Map<string, Vend88Item>();

      (firstPage.products || []).forEach((item) => {
        const id = String(item?._id || "").trim();
        if (id) {
          vend88ItemMap.set(id, item);
        }
      });

      for (let page = 1; page < totalPages; page += 1) {
        const pageData = await getPosProducts(posToken, businessId, autoMapPageSize, page);
        (pageData.products || []).forEach((item) => {
          const id = String(item?._id || "").trim();
          if (id) {
            vend88ItemMap.set(id, item);
          }
        });
      }

      const allVend88Items = Array.from(vend88ItemMap.values());
      const allUberRows = await getLocalUberItems(businessId);
      const uberRowById = new Map(allUberRows.map((row) => [row.item_id, row]));

      const usedPosItemIds = new Set(itemMappings.map((m) => m.pos_item_id));
      const usedUberItemIds = new Set(itemMappings.map((m) => m.uber_item_id));

      const itemPairs = buildExactNamePairs(
        allVend88Items.map((item) => ({ id: item._id, name: item.name })),
        allUberRows.map((item) => ({ id: item.item_id, name: item.item_name })),
        usedPosItemIds,
        usedUberItemIds
      );

      for (const pair of itemPairs) {
        const vendItem = vend88ItemMap.get(pair.leftId);
        const uberItem = uberRowById.get(pair.rightId);
        const uberOptionNames = String(uberItem?.option || "")
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0);

        await saveItemMapping({
          shop_id: businessId,
          pos_item_id: pair.leftId,
          pos_item_name: vendItem?.name || pair.name,
          pos_item_price: vendItem?.price,
          pos_item_options: vendItem?.options,
          uber_item_id: pair.rightId,
          uber_item_name: uberItem?.item_name || pair.name,
          uber_item_price: uberItem?.price_minor,
          uber_item_options: uberOptionNames,
        });
      }

      const usedPosOptionIds = new Set(optionMappings.map((m) => m.pos_option_id));
      const usedUberOptionIds = new Set(optionMappings.map((m) => m.uber_option_id));
      const optionPairs = buildOptionPairs(
        vend88Options,
        uberOptions,
        usedPosOptionIds,
        usedUberOptionIds
      );

      for (const pair of optionPairs) {
        const vendOption = vend88Options.find((opt) => opt._id === pair.leftId);
        const uberOption = uberOptions.find((opt) => opt.id === pair.rightId);

        const vend88ItemCount = vendOption?.option_items?.length || 0;
        const uberItemCount = (uberOption?.modifier_options || [])
          .filter((opt) => opt.type === "ITEM")
          .length || 0;

        await saveOptionMapping({
          shop_id: businessId,
          pos_option_id: pair.leftId,
          pos_option_name: pair.name,
          uber_option_id: pair.rightId,
          uber_option_name: pair.name,
          vend88_item_count: vend88ItemCount,
          uber_item_count: uberItemCount,
        });

        if (!vendOption || !uberOption) {
          continue;
        }

        const uberItems = (uberOption.modifier_options || [])
          .map((option) => ({
            id: option.id,
            name: getText(getUberOptionItemFromModifierOption(option.id)?.title),
          }))
          .filter((row) => row.id && row.name && row.name !== "—");

        const usedPosOptionItemIds = new Set(optionItemMappings.map((m) => m.pos_option_item_id));
        const usedUberOptionItemIds = new Set(optionItemMappings.map((m) => m.uber_option_item_id));
        const optionItemPairs = buildExactNamePairs(
          (vendOption.option_items || []).map((item) => ({ id: item._id, name: item.name })),
          uberItems,
          usedPosOptionItemIds,
          usedUberOptionItemIds
        );

        for (const optionItemPair of optionItemPairs) {
          await saveOptionItemMapping({
            shop_id: businessId,
            pos_option_id: vendOption._id,
            pos_option_item_id: optionItemPair.leftId,
            pos_option_item_name: optionItemPair.name,
            uber_option_id: uberOption.id,
            uber_option_item_id: optionItemPair.rightId,
            uber_option_item_name: optionItemPair.name,
          });
        }
      }

      const mappingData = await getAllMappings(businessId);
      setItemMappings(mappingData.items || []);
      setOptionMappings(mappingData.options || []);
      setOptionItemMappings(mappingData.option_items || []);

      // Refresh current page data to reflect mapping status changes
      await loadVend88Products(vend88CurrentPage);
      
      const uberMenuData = await getLocalUberMenuSnapshot(
        businessId,
        uberCurrentPage,
        uberOptionsCurrentPage,
        15,
        50
      );
      setUberBackendPagedItems(uberMenuData.items || []);
      setUberBackendPagedOptions(uberMenuData.modifier_groups || []);
      if (uberMenuData.pagination) {
        setUberItemsPagination(uberMenuData.pagination.items);
        setUberOptionsPagination(uberMenuData.pagination.option_items);
      }

      setSuccess("Auto mapping by exact name completed (all Vend88 pages)");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to auto map by name");
    } finally {
      setAutoMapping(false);
    }
  };

  const mappedPosItemIds = new Set(
    itemMappings
      .map((m) => String(m.pos_item_id || "").trim())
      .filter((id) => id.length > 0)
  );
  const mappedUberItemIds = new Set(
    itemMappings
      .map((m) => String(m.uber_item_id || "").trim())
      .filter((id) => id.length > 0)
  );

  const effectiveMappedPosItemIds = new Set([
    ...Array.from(mappedPosItemIds),
    ...Array.from(locallyMappedPosItemIds),
  ]);

  const isVendItemMapped = (item: Vend88Item) => {
    const primaryId = String(item._id || "").trim();
    const secondaryId = String(item.id || "").trim();
    return (
      effectiveMappedPosItemIds.has(primaryId) ||
      (secondaryId ? effectiveMappedPosItemIds.has(secondaryId) : false)
    );
  };

  // 获取已映射的 Uber 商品 (based on all mappings, not just current page items)
  const getMappedUberItems = () => {
    return mappedUberItemIds.size;
  };

  const getUnmappedUberCount = () => {
    return uberItemsPagination.total_count;
  };

  // 获取未映射的 Vend88 商品
  const getUnmappedVend88Items = () => {
    return vend88Items.filter((item) => !isVendItemMapped(item));
  };

  // Pagination helper functions
  const getPaginatedUberItems = () => {
    return uberBackendPagedItems;
  };

  const getPaginatedVend88Items = () => {
    // vend88Items已经只是一页的数据，直接返回未映射的项
    return getUnmappedVend88Items();
  };

  const getUberTotalPages = () => uberItemsPagination.total_pages;
  const getPaginatedUberOptions = () => {
    // Use backend-paged options directly (already filtered by backend pagination)
    return uberBackendPagedOptions;
  };

  const getUberOptionsTotalPages = () => uberOptionsPagination.total_pages;
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
  const getCategoryForItem = (item: MenuItem): string => {
    if (!menuData?.categories) return "—";
    
    const category = menuData.categories.find((cat) =>
      cat.entities?.some((entity) => {
        if (!entity?.id || entity.id !== item.id) return false;
        return !entity.type || entity.type === "ITEM";
      })
    );
    
    return category ? (getText(category.title) || "—") : "—";
  };

  const mappedVendItemIds = mappedPosItemIds;
  const mappedVendOptionIds = new Set(optionMappings.map((m) => m.pos_option_id));
  const mappedUberOptionIds = new Set(optionMappings.map((m) => m.uber_option_id));

  const itemModalCandidates = (() => {
    if (!itemMapSource) {
      return [] as Array<{ id: string; name: string; subtitle: string }>;
    }

    const keyword = normalizeMappingName(itemMapSearch);

    if (itemMapSource.type === "uber") {
      return vend88Items
        .filter((item) => !mappedVendItemIds.has(item._id))
        .filter((item) => {
          if (!keyword) return true;
          return normalizeMappingName(item.name).includes(keyword);
        })
        .map((item) => ({
          id: item._id,
          name: item.name,
          subtitle: item.sku || item._id,
        }));
    }

    return itemModalUberCandidates;
  })();

  const filteredUberOptionModalCandidates = (() => {
    if (!optionMapSource || optionMapSource.type !== "vend88") {
      return [] as Array<{ id: string; name: string; subtitle: string }>;
    }

    const keyword = normalizeMappingName(optionMapSearch);
    return uberOptions
      .filter((option) => !mappedUberOptionIds.has(option.id))
      .filter((option) => {
        if (!keyword) return true;
        return normalizeMappingName(getText(option.title)).includes(keyword);
      })
      .map((option) => ({
        id: option.id,
        name: getText(option.title),
        subtitle: option.id,
      }));
  })();

  const optionModalUberTotalPages = Math.max(1, Math.ceil(filteredUberOptionModalCandidates.length / optionItemsPerPage));
  const optionModalUberCandidatesPage = filteredUberOptionModalCandidates.slice(
    (optionModalUberPage - 1) * optionItemsPerPage,
    optionModalUberPage * optionItemsPerPage
  );

  const optionModalCandidates = (() => {
    if (!optionMapSource) {
      return [] as Array<{ id: string; name: string; subtitle: string }>;
    }

    const keyword = normalizeMappingName(optionMapSearch);

    if (optionMapSource.type === "uber") {
      return vend88Options
        .filter((option) => !mappedVendOptionIds.has(option._id))
        .filter((option) => {
          if (!keyword) return true;
          return normalizeMappingName(option.name).includes(keyword);
        })
        .map((option) => ({
          id: option._id,
          name: option.name,
          subtitle: option._id,
        }));
    }

    return optionModalUberCandidatesPage;
  })();

  const selectedUberOptionForModal = optionMapSource
    ? optionMapSource.type === "uber"
      ? optionMapSource.uberOption
      : uberOptions.find((option) => option.id === selectedTargetOptionId)
    : undefined;

  const selectedVendOptionForModal = optionMapSource
    ? optionMapSource.type === "uber"
      ? vend88Options.find((option) => option._id === selectedTargetOptionId)
      : optionMapSource.vendOption
    : undefined;

  const uberOptionItemsForModal = (selectedUberOptionForModal?.modifier_options || [])
    .map((option) => ({
      id: option.id,
      name: getText(getUberOptionItemFromModifierOption(option.id)?.title),
    }))
    .filter((item) => item.id && item.name && item.name !== "—");

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
                Mapped: {getMappedUberItems()} | Uber: {getUnmappedUberCount()} | Vend88: {Math.max(0, vend88TotalCount - itemMappings.length)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoMapSameNames}
              disabled={autoMapping || syncingUberCache || uploadingMenu || refreshing}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {autoMapping ? "Auto Mapping..." : "Auto Map Same Names"}
            </button>
            <button
              onClick={handleSyncUberCache}
              disabled={syncingUberCache || uploadingMenu || refreshing}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded font-semibold hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncingUberCache ? "animate-spin" : ""}`} />
              {syncingUberCache ? "Syncing..." : "Sync Uber"}
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing || uploadingMenu || syncingUberCache}
              className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Reloading..." : "Refresh"}
            </button>
            <button
              onClick={() => setShowUploadModeModal(true)}
              disabled={uploadingMenu || refreshing || syncingUberCache}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploadingMenu ? "Uploading..." : "Upload Menu"}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-8">
          {/* Item Tabs Section */}
          <div className="flex-1 border-r border-gray-200">
            <div className="flex gap-0">
              <button
                onClick={() => {
                  setItemActiveTab("item-mapped");
                  setActiveSection("items");
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeSection === "items" && itemActiveTab === "item-mapped"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Mapped Item({getMappedUberItems()})
              </button>
              <button
                onClick={() => {
                  setItemActiveTab("item-unmapped-vend88");
                  setActiveSection("items");
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeSection === "items" && itemActiveTab === "item-unmapped-vend88"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Unmapped Vend88 Items  ({Math.max(0, vend88TotalCount - itemMappings.length)})
              </button>
              <button
                onClick={() => {
                  setItemActiveTab("item-unmapped-uber");
                  setActiveSection("items");
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeSection === "items" && itemActiveTab === "item-unmapped-uber"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Unmapped Uber Items ({getUnmappedUberCount()})
              </button>
            </div>
          </div>

          {/* Option Tabs Section */}
          <div className="flex-1">
            <div className="flex gap-0">
              <button
                onClick={() => {
                  setOptionActiveTab("option-mapped");
                  setActiveSection("options");
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeSection === "options" && optionActiveTab === "option-mapped"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Mapped Option({optionMappings.length})
              </button>
              <button
                onClick={() => {
                  setOptionActiveTab("option-unmapped-vend88");
                  setActiveSection("options");
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeSection === "options" && optionActiveTab === "option-unmapped-vend88"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Unmapped Vend88 Options ({vend88Options.filter((option) => !mappedVendOptionIds.has(option._id)).length})
              </button>
              <button
                onClick={() => {
                  setOptionActiveTab("option-unmapped-uber");
                  setActiveSection("options");
                }}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeSection === "options" && optionActiveTab === "option-unmapped-uber"
                    ? "border-black text-black"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Unmapped Uber Options ({uberOptions.filter((option) => !mappedUberOptionIds.has(option.id)).length})
              </button>
            </div>
          </div>
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

        {/* Tab Content - Items Section */}
        {activeSection === "items" && itemActiveTab === "item-mapped" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {mappedItemRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vend88 Item</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vend88 ID</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r-2 border-gray-300">Options</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uber Item</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uber ID</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Price</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r-2 border-gray-300">Options</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mappedItemRows.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <p className="text-sm font-semibold text-gray-900">
                            <span className="bg-orange-200 px-2 py-1 rounded">{mapping.pos_item_name || "—"}</span>
                          </p>
                        </td>
                        <td className="px-6 py-3 text-xs font-mono text-gray-900">
                          {mapping.pos_item_id || "—"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatVend88DisplayPrice(mapping.pos_item_price)}
                          </p>
                        </td>
                        <td className="px-6 py-3 border-r-2 border-gray-300">
                          {(() => {
                            const optionNames = getVend88OptionNamesFromStoredOptions(mapping.pos_item_options);

                            if (optionNames.length === 0) {
                              return <span className="text-gray-500 text-xs">—</span>;
                            }

                            return (
                              <div className="flex flex-wrap gap-1">
                                {optionNames.map((name: string, idx: number) => (
                                  <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-sm font-semibold text-gray-900">
                            <span className="bg-green-200 px-2 py-1 rounded">
                              {mapping.uber_item_name || "—"}
                            </span>
                          </p>
                        </td>
                        <td className="px-6 py-3 text-xs font-mono text-gray-900">
                          {mapping.uber_item_id || "—"}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatUberDisplayPriceFromMinor(mapping.uber_item_price)}
                          </p>
                        </td>
                        <td className="px-6 py-3 border-r-2 border-gray-300">
                          {(() => {
                            const optionNames = getUberOptionGroupNamesFromStoredIds(mapping.uber_item_options);

                            if (optionNames.length === 0) {
                              return <span className="text-gray-500 text-xs">—</span>;
                            }

                            return (
                              <div className="flex flex-wrap gap-1">
                                {optionNames.map((optionName, idx) => (
                                  <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                                    {optionName}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => handleDeleteItemMapping(mapping.id, mapping.pos_item_id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-1.5 rounded transition-colors"
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

        {activeSection === "items" && itemActiveTab === "item-unmapped-uber" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {getUnmappedUberCount() > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-120">Item Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-56">Item ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-40">Category</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-48">Option</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-20">Price</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-20">Status</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-30">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getPaginatedUberItems().map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 flex-1 min-w-48">
                            <p className="text-sm font-semibold text-gray-900">{getText(item.title)}</p>
                          </td>
                          <td className="px-6 py-3 w-56 text-xs text-gray-900 font-mono break-all">
                            {item.id}
                          </td>
                          <td className="px-6 py-3 w-40 text-sm text-gray-900">
                            {getCategoryForItem(item)}
                          </td>
                          <td className="px-6 py-3 w-48">
                            <div className="flex flex-wrap gap-2">
                              {getUberItemOptionGroupNames(item).length > 0 ? (
                                getUberItemOptionGroupNames(item).map((optionName, idx) => (
                                  <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                                    {optionName}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 w-20 text-sm font-bold text-gray-900">
                            ${((item.price_info?.price || 0) / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-3 w-20">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold inline-block bg-gray-100 text-gray-900`}
                            >
                              {item.suspension_info?.suspended ? "Suspended" : "Active"}
                            </span>
                          </td>
                          <td className="px-6 py-3 w-30 text-center">
                            <button
                              onClick={() => openItemMapModalForUber(item)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-1.5 rounded-full transition-colors"
                            >
                              Map
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {getUberTotalPages() > 1 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      {loadingUberPagination && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                      <span>Page {uberCurrentPage} of {getUberTotalPages()}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setLoadingUberPagination(true);
                          setUberCurrentPage(prev => Math.max(1, prev - 1));
                        }}
                        disabled={uberCurrentPage === 1 || loadingUberPagination}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: getUberTotalPages() }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setLoadingUberPagination(true);
                            setUberCurrentPage(page);
                          }}
                          disabled={loadingUberPagination}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            uberCurrentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                          } ${loadingUberPagination ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          setLoadingUberPagination(true);
                          setUberCurrentPage(prev => Math.min(getUberTotalPages(), prev + 1));
                        }}
                        disabled={uberCurrentPage === getUberTotalPages() || loadingUberPagination}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">All Uber items are mapped!</p>
                <p className="text-sm text-gray-500 mt-1">Great job keeping your inventory synced</p>
              </div>
            )}
          </div>
        )}

        {activeSection === "items" && itemActiveTab === "item-unmapped-vend88" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {getUnmappedVend88Items().length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-120">Item Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-56">Item ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-40">Category</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-24">SKU</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-48">Options</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-20">Price</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-20">Status</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-30">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getPaginatedVend88Items().map((item) => {
                        const categoryArray = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
                        const optionNames = (item.options || []).map((opt: any) => opt.name).filter(Boolean);
                        return (
                          <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-3 flex-1 min-w-48">
                              <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                            </td>
                            <td className="px-6 py-3 w-56 text-xs text-gray-900 font-mono break-all">
                              {item._id}
                            </td>
                            <td className="px-6 py-3 w-40 text-sm text-gray-900">
                              {categoryArray.length > 0 ? categoryArray.join(", ") : "—"}
                            </td>
                            <td className="px-6 py-3 w-24 text-xs text-gray-900 font-mono">
                              {item.sku || "—"}
                            </td>
                            <td className="px-6 py-3 w-48">
                              <div className="flex flex-wrap gap-2">
                                {optionNames.length > 0 ? (
                                  optionNames.map((optName, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                                      {optName}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-500 text-xs">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 w-20 text-sm font-bold text-gray-900">
                              {formatVend88DisplayPrice(item.price)}
                            </td>
                            <td className="px-6 py-3 w-20">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold inline-block bg-gray-100 text-gray-900`}
                              >
                                {item.active === false ? "Inactive" : "Active"}
                              </span>
                            </td>
                            <td className="px-6 py-3 w-30 text-center">
                              <button
                                onClick={() => openItemMapModalForVend(item)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-1.5 rounded-full transition-colors"
                              >
                                Map
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {vend88MaxPage > 1 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      {loadingVend88Products && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                      <span>Page {vend88CurrentPage + 1} of {vend88MaxPage}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setVend88CurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={vend88CurrentPage === 0 || loadingVend88Products}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: vend88MaxPage }, (_, i) => i).map((page) => (
                        <button
                          key={page}
                          onClick={() => setVend88CurrentPage(page)}
                          disabled={loadingVend88Products}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            vend88CurrentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                          } ${loadingVend88Products ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {page + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setVend88CurrentPage(prev => Math.min(vend88MaxPage - 1, prev + 1))}
                        disabled={vend88CurrentPage === vend88MaxPage - 1 || loadingVend88Products}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">All Vend88 items are mapped!</p>
                <p className="text-sm text-gray-500 mt-1">Your POS inventory is fully synced to Uber</p>
              </div>
            )}
          </div>
        )}

        {/* Option Mapped Tab */}
        {activeSection === "options" && optionActiveTab === "option-mapped" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {optionMappings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vend88 Option</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vend88 ID</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 border-r-2 border-gray-300">Items Count</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uber Option</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Uber ID</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 border-r-2 border-gray-300">Items Count</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  {optionMappings.map((mapping) => {
                    const isExpanded = expandedOptionMappingIds.has(mapping.id);
                    const toggleOptionGroupExpand = () => {
                      setExpandedOptionMappingIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(mapping.id)) {
                          next.delete(mapping.id);
                        } else {
                          next.add(mapping.id);
                        }
                        return next;
                      });
                    };

                    // Get Vend88 option items for this option group
                    const vend88Option = vend88Options.find((opt) => opt._id === mapping.pos_option_id);
                    const vend88OptionItems = vend88Option?.option_items || [];

                    // Get Uber option items for this option group
                    const uberOption = uberOptions.find((opt) => opt.id === mapping.uber_option_id);
                    const uberOptionItems = (uberOption?.modifier_options || []).filter((opt) => opt.type === "ITEM");

                    // Create mapping display rows - align to max count
                    const maxRows = Math.max(vend88OptionItems.length, uberOptionItems.length);

                    return (
                      <tbody key={`group-${mapping.id}`} className="group border-b border-gray-200 last:border-b-0">
                        <tr className={`transition-colors cursor-pointer ${isExpanded ? "bg-blue-50 group-hover:bg-blue-100" : "bg-white group-hover:bg-gray-50"}`} onClick={toggleOptionGroupExpand}>
                          <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600 font-semibold text-xs">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="bg-orange-200 px-2 py-1 rounded">{mapping.pos_option_name || "—"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-xs font-mono text-gray-900">{mapping.pos_option_id}</td>
                          <td className="px-6 py-3 text-center text-sm text-gray-700 font-semibold border-r-2 border-gray-300">{vend88OptionItems.length}</td>
                          <td className="px-6 py-3 text-sm font-semibold text-gray-900"><span className="bg-green-200 px-2 py-1 rounded">{mapping.uber_option_name || "—"}</span></td>
                          <td className="px-6 py-3 text-xs font-mono text-gray-900">{mapping.uber_option_id}</td>
                          <td className="px-6 py-3 text-center text-sm text-gray-700 font-semibold border-r-2 border-gray-300">{uberOptionItems.length}</td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOptionMapping(mapping.id);
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-1.5 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        {isExpanded && maxRows > 0 && (
                          <>
                            <tr className="bg-blue-50 group-hover:bg-blue-100 transition-colors cursor-pointer" onClick={toggleOptionGroupExpand}>
                              <td className="px-6 py-2 text-xs font-semibold text-gray-800 uppercase">Option Item</td>
                              <td className="px-6 py-2 text-xs font-semibold text-gray-800 uppercase">ID</td>
                              <td className="px-6 py-2 text-xs font-semibold text-gray-800 uppercase border-r-2 border-gray-300 text-center">Price</td>
                              <td className="px-6 py-2 text-xs font-semibold text-gray-800 uppercase">Option Item</td>
                              <td className="px-6 py-2 text-xs font-semibold text-gray-800 uppercase">ID</td>
                              <td className="px-6 py-2 text-xs font-semibold text-gray-800 uppercase border-r-2 border-gray-300 text-center">Price</td>
                              <td className="px-6 py-2"></td>
                            </tr>
                            {Array.from({ length: maxRows }, (_, idx) => {
                              const vend88Item = vend88OptionItems[idx];
                              const uberItem = uberOptionItems[idx];

                              return (
                                <tr key={`item-${mapping.id}-${idx}`} className="bg-blue-50 group-hover:bg-blue-100 transition-colors cursor-pointer" onClick={toggleOptionGroupExpand}>
                                  <td className="px-6 py-2 text-xs text-gray-900">
                                    <span className="bg-orange-200 px-2 py-1 rounded">
                                      {vend88Item?.name || "—"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-2 text-xs font-mono text-gray-700">
                                    {vend88Item?._id || "—"}
                                  </td>
                                  <td className="px-6 py-2 text-xs font-semibold text-gray-900 border-r-2 border-gray-300 text-center">
                                    {vend88Item?.price_adjust !== undefined ? `$${(vend88Item.price_adjust || 0).toFixed(2)}` : "—"}
                                  </td>
                                  <td className="px-6 py-2 text-xs text-gray-900">
                                    <span className="bg-green-200 px-2 py-1 rounded">
                                      {uberItem ? getUberItemNameById(uberItem.id) : "—"}
                                    </span>
                                  </td>
                                  <td className="px-6 py-2 text-xs font-mono text-gray-700">
                                    {uberItem?.id || "—"}
                                  </td>
                                  <td className="px-6 py-2 text-xs font-semibold text-gray-900 border-r-2 border-gray-300 text-center">
                                    {uberItem ? getUberItemPriceById(uberItem.id) : "—"}
                                  </td>
                                  <td className="px-6 py-2"></td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </tbody>
                    );
                  })}
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">No mapped options yet</p>
                <p className="text-sm text-gray-500 mt-1">Map Vend88 options to Uber options to see them here</p>
              </div>
            )}
          </div>
        )}

        {/* Uber Options Tab */}
        {activeSection === "options" && optionActiveTab === "option-unmapped-uber" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {uberOptions.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-48">Option Group Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-56">Option ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-64">Option Items</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-56">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getPaginatedUberOptions().filter((option) => !mappedUberOptionIds.has(option.id)).map((modifierGroup) => (
                        <tr key={modifierGroup.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 flex-1 min-w-48">
                            <p className="text-sm font-semibold text-gray-900">{getText(modifierGroup.title)}</p>
                          </td>
                          <td className="px-6 py-3 w-56 text-xs text-gray-900 font-mono break-all">
                            {modifierGroup.id}
                          </td>
                          <td className="px-6 py-3 flex-1 min-w-64">
                            <div className="space-y-2">
                              {modifierGroup.modifier_options && modifierGroup.modifier_options.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2">
                                    <span>Name</span>
                                    <span>ID</span>
                                    <span>Price</span>
                                  </div>
                                  {modifierGroup.modifier_options.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-3 gap-2 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                                      <span className="text-gray-900 font-medium truncate" title={getUberItemNameById(item.id)}>
                                        {getUberItemNameById(item.id)}
                                      </span>
                                      <span className="text-gray-900 font-mono break-all">{item.id}</span>
                                      <span className="text-gray-900 font-semibold">{getUberItemPriceById(item.id)}</span>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 w-30 text-center">
                            <button
                              onClick={() => openOptionMapModalForUber(modifierGroup)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-1.5 rounded-full transition-colors"
                            >
                              Map
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {getUberOptionsTotalPages() > 1 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {uberOptionsCurrentPage} of {getUberOptionsTotalPages()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUberOptionsCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={uberOptionsCurrentPage === 1}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: getUberOptionsTotalPages() }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setUberOptionsCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            uberOptionsCurrentPage === page
                              ? "bg-blue-600 text-white"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setUberOptionsCurrentPage(prev => Math.min(getUberOptionsTotalPages(), prev + 1))}
                        disabled={uberOptionsCurrentPage === getUberOptionsTotalPages()}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">No Uber options available</p>
                <p className="text-sm text-gray-500 mt-1">This store does not have any modifier groups configured</p>
              </div>
            )}
          </div>
        )}

        {/* Vend88 Options Tab */}
        {activeSection === "options" && optionActiveTab === "option-unmapped-vend88" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {vend88Options.filter((option) => !mappedVendOptionIds.has(option._id)).length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-48">Option Group Name</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 w-56">Option ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 flex-1 min-w-64">Option Items</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 w-30">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {vend88Options.filter((option) => !mappedVendOptionIds.has(option._id)).map((option) => (
                        <tr key={option._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3 flex-1 min-w-48">
                            <p className="text-sm font-semibold text-gray-900">{option.name}</p>
                          </td>
                          <td className="px-6 py-3 w-56 text-xs text-gray-900 font-mono break-all">
                            {option._id}
                          </td>
                          <td className="px-6 py-3 flex-1 min-w-64">
                            <div className="space-y-2">
                              {option.option_items && option.option_items.length > 0 ? (
                                <>
                                  <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2">
                                    <span>Name</span>
                                    <span>ID</span>
                                    <span>Price</span>
                                  </div>
                                  {option.option_items.map((item: any, idx: number) => {
                                    const rawPrice = item.price_adjust ?? item.price;
                                    let price = "—";

                                    if (rawPrice !== undefined && rawPrice !== null && rawPrice !== "") {
                                      const numericPrice = Number(rawPrice);
                                      if (Number.isFinite(numericPrice)) {
                                        price = formatVend88DisplayPrice(numericPrice);
                                      }
                                    }

                                    return (
                                      <div key={idx} className="grid grid-cols-3 gap-2 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
                                        <span className="text-gray-900 font-medium truncate" title={item.name || "—"}>
                                          {item.name || "—"}
                                        </span>
                                        <span className="text-gray-900 font-mono break-all">{item._id || item.id || "—"}</span>
                                        <span className="text-gray-900 font-semibold">{price}</span>
                                      </div>
                                    );
                                  })}
                                </>
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 w-30 text-center">
                            <button
                              onClick={() => openOptionMapModalForVend(option)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-1.5 rounded-full transition-colors"
                            >
                              Map
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {optionsMaxPage > 1 && (
                  <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page {optionsCurrentPage + 1} of {optionsMaxPage}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOptionsCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={optionsCurrentPage === 0}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: optionsMaxPage }, (_, i) => i).map((page) => (
                        <button
                          key={page}
                          onClick={() => setOptionsCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            optionsCurrentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setOptionsCurrentPage(prev => Math.min(optionsMaxPage - 1, prev + 1))}
                        disabled={optionsCurrentPage === optionsMaxPage - 1}
                        className="px-3 py-1 rounded border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-600 font-semibold">No options available</p>
                <p className="text-sm text-gray-500 mt-1">Your POS system has no options configured yet</p>
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

      {showItemMapModal && itemMapSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Manual Item Mapping</h2>
              <button onClick={closeItemMapModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded border border-gray-200 p-3 bg-gray-50">
                <p className="text-xs text-gray-600">Selected Source</p>
                <p className="text-sm font-semibold text-gray-900">
                  {itemMapSource.type === "uber"
                    ? getText(itemMapSource.uberItem?.title)
                    : itemMapSource.vendItem?.name || "—"}
                </p>
              </div>

              <input
                value={itemMapSearch}
                onChange={(e) => {
                  setItemMapSearch(e.target.value);
                  setItemModalUberPage(1);
                }}
                placeholder={
                  itemMapSource.type === "uber"
                    ? "Search Vend88 item name..."
                    : "Search Uber item name..."
                }
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />

              <div className="max-h-80 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
                {itemModalCandidates.length > 0 ? (
                  itemModalCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => handleConfirmItemMapping(candidate.id)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900">{candidate.name}</p>
                      <p className="text-xs text-gray-600 font-mono break-all">{candidate.subtitle}</p>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-8 text-sm text-gray-500 text-center">No available target items</p>
                )}
              </div>

              {itemMapSource.type === "uber" && vend88MaxPage > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span className="flex items-center gap-2">
                    {loadingVend88Products && <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                    Vend88 page {vend88CurrentPage + 1} / {vend88MaxPage}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVend88CurrentPage((prev) => Math.max(0, prev - 1))}
                      disabled={vend88CurrentPage === 0 || loadingVend88Products}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setVend88CurrentPage((prev) => Math.min(vend88MaxPage - 1, prev + 1))}
                      disabled={vend88CurrentPage >= vend88MaxPage - 1 || loadingVend88Products}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {itemMapSource.type === "vend88" && itemModalUberTotalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-gray-700">
                  <span>Uber page {itemModalUberPage} / {itemModalUberTotalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setItemModalUberPage((prev) => Math.max(1, prev - 1))}
                      disabled={itemModalUberPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setItemModalUberPage((prev) => Math.min(itemModalUberTotalPages, prev + 1))}
                      disabled={itemModalUberPage >= itemModalUberTotalPages}
                      className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showOptionMapModal && optionMapSource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Manual Option Mapping</h2>
              <button onClick={closeOptionMapModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {optionMapStep === "group" && (
              <div className="px-6 py-5 space-y-4">
                <div className="rounded border border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs text-gray-600">Selected Source Option Group</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {optionMapSource.type === "uber"
                      ? getText(optionMapSource.uberOption?.title)
                      : optionMapSource.vendOption?.name || "—"}
                  </p>
                </div>

                <input
                  value={optionMapSearch}
                  onChange={(e) => setOptionMapSearch(e.target.value)}
                  placeholder={
                    optionMapSource.type === "uber"
                      ? "Search Vend88 option group..."
                      : "Search Uber option group..."
                  }
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />

                <div className="max-h-80 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
                  {optionModalCandidates.length > 0 ? (
                    optionModalCandidates.map((candidate) => (
                      <label key={candidate.id} className="flex items-start gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer">
                        <input
                          type="radio"
                          name="target-option-group"
                          checked={selectedTargetOptionId === candidate.id}
                          onChange={() => setSelectedTargetOptionId(candidate.id)}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{candidate.name}</p>
                          <p className="text-xs text-gray-600 font-mono break-all">{candidate.subtitle}</p>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="px-4 py-8 text-sm text-gray-500 text-center">No available target option groups</p>
                  )}
                </div>

                {optionMapSource.type === "uber" && optionsMaxPage > 1 && (
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Vend88 option page {optionsCurrentPage + 1} / {optionsMaxPage}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOptionsCurrentPage((prev) => Math.max(0, prev - 1))}
                        disabled={optionsCurrentPage === 0}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setOptionsCurrentPage((prev) => Math.min(optionsMaxPage - 1, prev + 1))}
                        disabled={optionsCurrentPage >= optionsMaxPage - 1}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {optionMapSource.type === "vend88" && optionModalUberTotalPages > 1 && (
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Uber option page {optionModalUberPage} / {optionModalUberTotalPages}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOptionModalUberPage((prev) => Math.max(1, prev - 1))}
                        disabled={optionModalUberPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setOptionModalUberPage((prev) => Math.min(optionModalUberTotalPages, prev + 1))}
                        disabled={optionModalUberPage >= optionModalUberTotalPages}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleConfirmOptionGroupMapping}
                    disabled={!selectedTargetOptionId}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next: Map Option Items
                  </button>
                </div>
              </div>
            )}

            {optionMapStep === "items" && selectedVendOptionForModal && selectedUberOptionForModal && (
              <div className="px-6 py-5 space-y-4">
                <div className="rounded border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Option Group:</span> {selectedVendOptionForModal.name}{" -> "}{getText(selectedUberOptionForModal.title)}
                  </p>
                </div>

                <div className="space-y-3">
                  {(selectedVendOptionForModal.option_items || []).map((vendItem) => {
                    const filterKeyword = normalizeMappingName(optionItemSearchByVendId[vendItem._id] || "");
                    const filteredUberCandidates = uberOptionItemsForModal.filter((uberCandidate) => {
                      if (!filterKeyword) {
                        return true;
                      }
                      return normalizeMappingName(uberCandidate.name).includes(filterKeyword);
                    });

                    return (
                      <div key={vendItem._id} className="border border-gray-200 rounded p-3">
                        <p className="text-sm font-semibold text-gray-900">{vendItem.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{vendItem._id}</p>

                        <input
                          value={optionItemSearchByVendId[vendItem._id] || ""}
                          onChange={(e) =>
                            setOptionItemSearchByVendId((prev) => ({
                              ...prev,
                              [vendItem._id]: e.target.value,
                            }))
                          }
                          placeholder="Search Uber option item name..."
                          className="w-full mt-2 border border-gray-300 rounded px-3 py-2 text-sm"
                        />

                        <select
                          value={optionItemSelections[vendItem._id] || ""}
                          onChange={(e) =>
                            setOptionItemSelections((prev) => ({
                              ...prev,
                              [vendItem._id]: e.target.value,
                            }))
                          }
                          className="w-full mt-2 border border-gray-300 rounded px-3 py-2 text-sm"
                        >
                          <option value="">Skip mapping</option>
                          {filteredUberCandidates.map((uberCandidate) => (
                            <option key={uberCandidate.id} value={uberCandidate.id}>
                              {uberCandidate.name} ({uberCandidate.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setOptionMapStep("group")}
                    className="px-4 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmOptionItemMappings}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded"
                  >
                    Save Option Mapping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showUploadModeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Upload Menu</h2>
              <button
                onClick={() => setShowUploadModeModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={uploadingMenu}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                Choose how to upload Vend88 menu data to Uber:
              </p>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Replace (Vend88 full overwrite)</p>
                <p className="text-xs text-gray-600 mt-1">
                  Replace Uber menu with Vend88 menu data.
                </p>
                <button
                  onClick={() => handleUploadMenu("replace")}
                  disabled={uploadingMenu}
                  className="mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Replace Upload
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Merge (keep existing Uber menu)</p>
                <p className="text-xs text-gray-600 mt-1">
                  Keep existing Uber items and merge Vend88 items/options into menu.
                </p>
                <button
                  onClick={() => handleUploadMenu("merge")}
                  disabled={uploadingMenu}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Merge Upload
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowUploadModeModal(false)}
                disabled={uploadingMenu}
                className="px-4 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
