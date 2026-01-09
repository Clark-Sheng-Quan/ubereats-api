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
  Badge,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getUberOrders,
  UberOrder,
  acceptUberOrder,
  rejectUberOrder,
} from "../services/uberOrderService";

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

interface OrderWithStatus extends UberOrder {
  posStatus?: "pending" | "preparing" | "ready" | "completed";
}

export default function OrdersScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  const [orders, setOrders] = useState<OrderWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopId, setShopId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "new" | "preparing" | "ready">(
    "all"
  );

  // 获取店铺信息
  useEffect(() => {
    const loadShopInfo = async () => {
      try {
        const shop = await AsyncStorage.getItem("selectedShopId");
        const staff = await AsyncStorage.getItem("staffId");
        if (shop) setShopId(shop);
        if (staff) setStaffId(staff);
      } catch (error) {
        console.error("Failed to load shop info:", error);
      }
    };

    loadShopInfo();
  }, []);

  // 加载订单
  const loadOrders = useCallback(async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const uberOrders = await getUberOrders(shopId);
      setOrders(uberOrders);
    } catch (error) {
      Alert.alert(t("error"), t("failed_to_load_orders"));
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }, [shopId, t]);

  // 初始加载和轮询
  useEffect(() => {
    loadOrders();

    // 每30秒刷新一次订单
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (order: UberOrder) => {
    if (!staffId) {
      Alert.alert(t("error"), t("staff_id_not_found"));
      return;
    }

    Alert.alert(t("confirm"), t("accept_order_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("confirm"),
        onPress: async () => {
          try {
            const result = await acceptUberOrder(shopId, order, staffId);
            if (result.success) {
              Alert.alert(t("success"), t("order_accepted"));
              // 从列表中移除已接受的订单
              setOrders((prev) =>
                prev.filter((o) => o.order_id !== order.order_id)
              );
            } else {
              Alert.alert(t("error"), result.error || t("unknown_error"));
            }
          } catch (error) {
            Alert.alert(t("error"), t("failed_to_accept_order"));
            console.error("Failed to accept order:", error);
          }
        },
      },
    ]);
  };

  const handleRejectOrder = (order: UberOrder) => {
    Alert.prompt(t("reject_reason"), t("enter_rejection_reason"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("confirm"),
        onPress: async (reason) => {
          try {
            const result = await rejectUberOrder(order.order_id, reason || "");
            if (result.success) {
              Alert.alert(t("success"), t("order_rejected"));
              setOrders((prev) =>
                prev.filter((o) => o.order_id !== order.order_id)
              );
            } else {
              Alert.alert(t("error"), result.error || t("unknown_error"));
            }
          } catch (error) {
            Alert.alert(t("error"), t("failed_to_reject_order"));
          }
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "preparing":
        return colors.warning;
      case "ready":
        return colors.success;
      default:
        return colors.secondary;
    }
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      confirmed: t("new"),
      preparing: t("preparing"),
      ready: t("ready"),
      completed: t("completed"),
      cancelled: t("cancelled"),
    };
    return statusMap[status] || status;
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "new") return order.status === "confirmed";
    if (filter === "preparing") return order.status === "preparing";
    if (filter === "ready") return order.status === "ready";
    return true;
  });

  const renderOrderItem = ({ item }: { item: OrderWithStatus }) => (
    <TouchableOpacity
      onPress={() => router.push(`/orders/${item.order_id}`)}
      style={styles.orderCard}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{item.order_num}</Text>
          <Text style={styles.customerName}>
            {item.customer.first_name} {item.customer.last_name}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.itemCount}>
          {item.items.length} {t("items")}
        </Text>
        <Text style={styles.totalAmount}>${item.total_amount.toFixed(2)}</Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.pickupInfo}>
          {item.pick_method === "dine_in" ? t("dine_in") : t("pick_up")} •{" "}
          {new Date(item.pick_time).toLocaleTimeString()}
        </Text>
      </View>

      {item.status === "confirmed" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleAcceptOrder(item)}
            style={[styles.button, styles.acceptButton]}
          >
            <Text style={styles.buttonText}>{t("accept")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleRejectOrder(item)}
            style={[styles.button, styles.rejectButton]}
          >
            <Text style={styles.buttonText}>{t("reject")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 过滤标签 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {(
          [
            { key: "all", label: t("all") },
            { key: "new", label: t("new") },
            { key: "preparing", label: t("preparing") },
            { key: "ready", label: t("ready") },
          ] as Array<{
            key: "all" | "new" | "preparing" | "ready";
            label: string;
          }>
        ).map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() =>
              setFilter(
                item.key as "all" | "new" | "preparing" | "ready"
              )
            }
            style={[
              styles.filterButton,
              filter === item.key && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === item.key && styles.filterButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 订单列表 */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.order_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("no_orders")}</Text>
          </View>
        }
      />
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
  filterScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.secondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: colors.secondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  itemCount: {
    fontSize: 13,
    color: colors.secondary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  orderFooter: {
    marginBottom: 12,
  },
  pickupInfo: {
    fontSize: 12,
    color: colors.secondary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
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
});
