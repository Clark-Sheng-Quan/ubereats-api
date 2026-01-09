import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLanguage } from "../context/LanguageContext";
import { getUberOrders, UberOrder } from "../services/uberOrderService";

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

interface OrderStats {
  total: number;
  new: number;
  preparing: number;
  ready: number;
  totalRevenue: number;
}

export default function DashboardScreen() {
  const { t } = useLanguage();
  const router = useRouter();

  const [orders, setOrders] = useState<UberOrder[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    new: 0,
    preparing: 0,
    ready: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shopId, setShopId] = useState<string>("");

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

  const loadOrders = useCallback(async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      const uberOrders = await getUberOrders(shopId);
      setOrders(uberOrders);

      // 计算统计数据
      const statsData: OrderStats = {
        total: uberOrders.length,
        new: uberOrders.filter((o) => o.status === "confirmed").length,
        preparing: uberOrders.filter((o) => o.status === "preparing").length,
        ready: uberOrders.filter((o) => o.status === "ready").length,
        totalRevenue: uberOrders.reduce((sum, o) => sum + o.total_amount, 0),
      };

      setStats(statsData);
    } catch (error) {
      Alert.alert(t("error"), t("failed_to_load_data"));
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }, [shopId, t]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const StatCard = ({
    title,
    value,
    color,
    onPress,
  }: {
    title: string;
    value: number | string;
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.statCard, { borderLeftColor: color }]}
    >
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("dashboard")}</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* 关键指标 */}
        <View style={styles.statsGrid}>
          <StatCard
            title={t("total_orders")}
            value={stats.total}
            color={colors.primary}
          />
          <StatCard
            title={t("new")}
            value={stats.new}
            color={colors.warning}
            onPress={() => router.push("/orders?filter=new")}
          />
          <StatCard
            title={t("preparing")}
            value={stats.preparing}
            color={colors.warning}
          />
          <StatCard
            title={t("ready")}
            value={stats.ready}
            color={colors.success}
          />
        </View>

        {/* 收入统计 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("revenue")}</Text>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueLabel}>{t("today_total")}</Text>
            <Text style={styles.revenueValue}>
              ${stats.totalRevenue.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* 最近订单 */}
        {orders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t("recent_orders")}</Text>
              <TouchableOpacity onPress={() => router.push("/orders")}>
                <Text style={styles.viewAllLink}>{t("view_all")}</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={orders.slice(0, 5)}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/orders/${item.order_id}`)
                  }
                  style={styles.orderItem}
                >
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderNumber}>#{item.order_num}</Text>
                    <Text style={styles.orderCustomer}>
                      {item.customer.first_name} {item.customer.last_name}
                    </Text>
                  </View>
                  <View style={styles.orderItemRight}>
                    <Text style={styles.orderAmount}>
                      ${item.total_amount.toFixed(2)}
                    </Text>
                    <Text style={styles.orderStatus}>{item.status}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.order_id}
            />
          </View>
        )}

        {/* 快速操作 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("quick_actions")}</Text>
          <TouchableOpacity
            onPress={() => router.push("/orders")}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>{t("view_orders")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onRefresh()}
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          >
            <Text style={styles.actionButtonText}>{t("refresh")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: colors.secondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
  },
  viewAllLink: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
  },
  revenueCard: {
    backgroundColor: colors.light,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  revenueLabel: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 8,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: colors.success,
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  orderItemInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 12,
    color: colors.secondary,
  },
  orderItemRight: {
    alignItems: "flex-end",
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 11,
    color: colors.secondary,
    backgroundColor: colors.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
});
