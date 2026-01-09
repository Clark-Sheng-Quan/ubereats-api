import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  FlatList,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../context/LanguageContext";
import {
  getOrderDetails,
  updateOrderStatus,
  UberOrder,
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

export default function OrderDetailScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { orderId } = useLocalSearchParams();

  const [order, setOrder] = useState<UberOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("");

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId || typeof orderId !== "string") {
        Alert.alert(t("error"), t("invalid_order_id"));
        router.back();
        return;
      }

      try {
        setLoading(true);
        const orderData = await getOrderDetails(orderId);
        if (orderData) {
          setOrder(orderData);
          setCurrentStatus(orderData.status);
        } else {
          Alert.alert(t("error"), t("order_not_found"));
          router.back();
        }
      } catch (error) {
        Alert.alert(t("error"), t("failed_to_load_order_details"));
        console.error("Failed to load order:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId, t]);

  const handleStatusUpdate = async (
    newStatus: "preparing" | "ready" | "completed" | "cancelled"
  ) => {
    if (!order || !orderId || typeof orderId !== "string") return;

    Alert.alert(
      t("confirm"),
      `${t("update_order_status")} ${getStatusLabel(newStatus)}?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("confirm"),
          onPress: async () => {
            try {
              setUpdating(true);
              const result = await updateOrderStatus(orderId, newStatus);
              if (result.success) {
                setCurrentStatus(newStatus);
                Alert.alert(
                  t("success"),
                  `${t("order_status_updated")} ${getStatusLabel(newStatus)}`
                );
              } else {
                Alert.alert(t("error"), result.error || t("unknown_error"));
              }
            } catch (error) {
              Alert.alert(t("error"), t("failed_to_update_status"));
              console.error("Failed to update status:", error);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return colors.warning;
      case "preparing":
        return colors.warning;
      case "ready":
        return colors.success;
      case "completed":
        return colors.success;
      default:
        return colors.secondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t("order_not_found")}</Text>
      </View>
    );
  }

  const nextStatuses: { [key: string]: ("preparing" | "ready" | "completed")[] } = {
    confirmed: ["preparing"],
    preparing: ["ready"],
    ready: ["completed"],
  };

  const availableNextStatuses = nextStatuses[currentStatus] || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 订单头部 */}
        <View style={styles.header}>
          <View style={styles.orderNumberRow}>
            <Text style={styles.orderNumber}>订单 #{order.order_num}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(currentStatus) },
              ]}
            >
              <Text style={styles.statusText}>{getStatusLabel(currentStatus)}</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            {new Date(order.created_at).toLocaleString()}
          </Text>
        </View>

        {/* 客户信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("customer_info")}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("name")}</Text>
            <Text style={styles.value}>
              {order.customer.first_name} {order.customer.last_name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("phone")}</Text>
            <Text style={styles.value}>{order.customer.phone}</Text>
          </View>
        </View>

        {/* 取餐信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("pickup_info")}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("method")}</Text>
            <Text style={styles.value}>
              {order.pick_method === "dine_in"
                ? t("dine_in")
                : t("pick_up")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t("time")}</Text>
            <Text style={styles.value}>
              {new Date(order.pick_time).toLocaleTimeString()}
            </Text>
          </View>
        </View>

        {/* 订单项目 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("items")}</Text>
          <FlatList
            data={order.items}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  {item.special_instructions && (
                    <Text style={styles.specialInstructions}>
                      {t("notes")}: {item.special_instructions}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
              </View>
            )}
            keyExtractor={(item, index) => index.toString()}
          />
        </View>

        {/* 费用汇总 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("summary")}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.label}>{t("items")}</Text>
            <Text style={styles.value}>${order.total_amount.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t("total")}</Text>
            <Text style={styles.totalValue}>
              ${order.total_amount.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 状态更新按钮 */}
        {availableNextStatuses.length > 0 && !updating && (
          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>{t("next_action")}</Text>
            <View style={styles.buttonGroup}>
              {availableNextStatuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => handleStatusUpdate(status)}
                  style={[styles.statusButton, styles[`${status}Button`]]}
                >
                  <Text style={styles.statusButtonText}>
                    {getStatusLabel(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {updating && (
          <View style={styles.updatingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.updatingText}>{t("updating")}</Text>
          </View>
        )}
      </ScrollView>

      {/* 返回按钮 */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>{t("back")}</Text>
      </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: colors.secondary,
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderNumberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
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
  timestamp: {
    fontSize: 12,
    color: colors.secondary,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  label: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
    marginBottom: 4,
  },
  specialInstructions: {
    fontSize: 12,
    color: colors.secondary,
    fontStyle: "italic",
  },
  itemQty: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
    marginLeft: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.primary,
  },
  actionSection: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGroup: {
    gap: 10,
  },
  statusButton: {
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  preparingButton: {
    backgroundColor: colors.warning,
  },
  readyButton: {
    backgroundColor: colors.success,
  },
  completedButton: {
    backgroundColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
  updatingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  updatingText: {
    fontSize: 14,
    color: colors.secondary,
  },
  backButton: {
    margin: 16,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
  },
});
