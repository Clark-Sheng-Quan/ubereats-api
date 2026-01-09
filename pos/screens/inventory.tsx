import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../context/LanguageContext";
import {
  getShopInventory,
  updateInventory,
  getShopProducts,
} from "../services/syncService";

const colors = {
  primary: "#000000",
  secondary: "#666666",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  light: "#F5F5F5",
  border: "#EEEEEE",
  white: "#FFFFFF",
};

interface InventoryItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
}

export default function InventoryScreen() {
  const { t } = useLanguage();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [shopId, setShopId] = useState<string>("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const loadShopInfo = async () => {
      try {
        const shop = await AsyncStorage.getItem("selectedShopId");
        if (shop) setShopId(shop);
      } catch (error) {
        console.error("Failed to load shop info:", error);
      }
    };

    loadShopInfo();
  }, []);

  const loadInventory = useCallback(async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const stock = await getShopInventory(shopId);
      setInventory(stock);
      setFilteredInventory(stock);
    } catch (error) {
      Alert.alert(t("error"), t("failed_to_load_inventory"));
      console.error("Failed to load inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [shopId, t]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    const filtered = inventory.filter(
      (item) =>
        item.product_name.toLowerCase().includes(text.toLowerCase()) ||
        item.product_id.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredInventory(filtered);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setNewQuantity(item.quantity.toString());
    setModalVisible(true);
  };

  const handleUpdateQuantity = async () => {
    if (!editingItem || !newQuantity) {
      Alert.alert(t("error"), t("enter_valid_quantity"));
      return;
    }

    try {
      setUpdating(true);
      const result = await updateInventory(
        shopId,
        editingItem.product_id,
        parseInt(newQuantity, 10)
      );

      if (result.success) {
        Alert.alert(t("success"), t("inventory_updated"));
        setModalVisible(false);
        setEditingItem(null);
        await loadInventory();
      } else {
        Alert.alert(t("error"), result.error || t("unknown_error"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("failed_to_update_inventory"));
      console.error("Failed to update inventory:", error);
    } finally {
      setUpdating(false);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const threshold = item.low_stock_threshold || 10;
    if (item.quantity <= 0) {
      return { color: colors.error, status: t("out_of_stock") };
    } else if (item.quantity <= threshold) {
      return { color: colors.warning, status: t("low_stock") };
    } else {
      return { color: colors.success, status: t("in_stock") };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const stockStatus = getStockStatus(item);

    return (
      <TouchableOpacity
        onPress={() => openEditModal(item)}
        style={styles.inventoryCard}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.productName}>{item.product_name}</Text>
            <Text style={styles.productId}>{item.product_id}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.statusText}>{stockStatus.status}</Text>
          </View>
        </View>

        <View style={styles.itemFooter}>
          <Text style={styles.quantity}>
            {item.quantity} {item.unit}
          </Text>
          <Text style={styles.editHint}>{t("tap_to_edit")}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t("search_products")}
          placeholderTextColor={colors.secondary}
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      {/* 库存列表 */}
      <FlatList
        data={filteredInventory}
        renderItem={renderItem}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText ? t("no_results") : t("no_items")}
            </Text>
          </View>
        }
      />

      {/* 编辑库存模态框 */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("update_inventory")}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditingItem(null);
                }}
              >
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {editingItem && (
              <>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>{t("product")}</Text>
                  <Text style={styles.modalProductName}>
                    {editingItem.product_name}
                  </Text>

                  <Text style={styles.modalLabel}>
                    {t("current_quantity")}: {editingItem.quantity}{" "}
                    {editingItem.unit}
                  </Text>

                  <Text style={styles.modalLabel}>{t("new_quantity")}</Text>
                  <TextInput
                    style={styles.quantityInput}
                    placeholder={t("enter_quantity")}
                    placeholderTextColor={colors.secondary}
                    value={newQuantity}
                    onChangeText={setNewQuantity}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      setEditingItem(null);
                    }}
                    style={[styles.modalButton, styles.cancelButton]}
                    disabled={updating}
                  >
                    <Text style={styles.modalButtonText}>{t("cancel")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleUpdateQuantity}
                    style={[styles.modalButton, styles.confirmButton]}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.white}
                      />
                    ) : (
                      <Text style={styles.modalButtonText}>
                        {t("confirm")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.light,
    color: colors.primary,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  inventoryCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  productId: {
    fontSize: 12,
    color: colors.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  quantity: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  editHint: {
    fontSize: 12,
    color: colors.secondary,
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  modalCloseButton: {
    fontSize: 24,
    color: colors.secondary,
  },
  modalBody: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 16,
  },
  quantityInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.light,
    color: colors.primary,
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.light,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
});
