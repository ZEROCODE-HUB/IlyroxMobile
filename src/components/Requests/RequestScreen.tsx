import { ScreenWrapper } from "@/screens/ScreenWrapper";
import React, { useEffect, useState, useRef } from "react";
import { logger } from "@/utils/logger";

const log = logger.scoped("RequestScreen");
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { AppHeader } from "../AppHeader";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { requestService } from "@/services/requestService";
import { useRouter } from "expo-router";
import { PropertyItem } from "./propertyItem";
import { InfoItem } from "./infoItem";
import { useToast } from "@/context/ToastContext";

const { width } = Dimensions.get("window");

const RequestScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"info" | "properties">("info");
  const [infoRequests, setInfoRequests] = useState<any[]>([]);
  const [propertyRequests, setPropertyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pagerRef = useRef<FlatList>(null);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const info = await requestService.getRequestsInfo(user.id);
      const props = await requestService.getRequestProperty();
      setInfoRequests(info);
      setPropertyRequests(props);
    } catch (error) {
      log.error("Error fetching requests:", error);
      showToast(
        "No se pudieron cargar las solicitudes. Intente de nuevo.",
        "error",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTabPress = (tab: "info" | "properties") => {
    setActiveTab(tab);
    pagerRef.current?.scrollToIndex({
      index: tab === "info" ? 0 : 1,
      animated: true,
    });
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveTab(page === 0 ? "info" : "properties");
  };

  const formatCompactPrice = (amount: number) => {
    if (!amount) return "0";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}`;
  };

  const renderEmptyState = (tab: "info" | "properties") => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={tab === "info" ? "mail-open-outline" : "business-outline"}
        size={60}
        color={COLORS.cardBorder}
      />
      <Text style={styles.emptyTitle}>No hay solicitudes</Text>
      <Text style={styles.emptySubtitle}>
        {tab === "info"
          ? "Aún no has recibido preguntas sobre tus propiedades."
          : "No hay solicitudes de propiedades que coincidan con tu perfil."}
      </Text>
    </View>
  );

  const handleContactWpp = async (phone: string) => {
    if (!phone) {
      showToast(
        "Esta persona no proporcionó un número de teléfono.",
        "warning",
      );
      return;
    }

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const url = `https://wa.me/${cleanPhone}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showToast(
          "No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.",
          "error",
        );
      }
    } catch (error) {
      log.error("Error opening WhatsApp:", error);
      showToast(
        "Ocurrió un error al intentar contactar por WhatsApp.",
        "error",
      );
    }
  };

  const handleContactPhone = (phone: string) => {
    if (!phone) {
      showToast(
        "Esta persona no proporcionó un número de teléfono.",
        "warning",
      );
      return;
    }

    try {
      Linking.openURL(`tel:${phone}`);
    } catch (error) {
      showToast("Error al abrir los contactos.", "error");
    }
  };

  const pages = [
    { key: "info", data: infoRequests, Component: InfoItem },
    {
      key: "properties",
      data: propertyRequests,
      Component: PropertyItem,
    },
  ];

  return (
    <ScreenWrapper withHeader={false}>
      <AppHeader
        title="Solicitudes"
        showBackButton
        onBack={() => router.back()}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === "info" && styles.activeTab]}
          onPress={() => handleTabPress("info")}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={activeTab === "info" ? COLORS.primary : COLORS.textTertiary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "info" && styles.activeTabText,
            ]}
          >
            Información
          </Text>
          {infoRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{infoRequests.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "properties" && styles.activeTab]}
          onPress={() => handleTabPress("properties")}
        >
          <Ionicons
            name="business-outline"
            size={20}
            color={
              activeTab === "properties" ? COLORS.primary : COLORS.textTertiary
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "properties" && styles.activeTabText,
            ]}
          >
            Propiedades
          </Text>
          {propertyRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{propertyRequests.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.content}>
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={pagerRef}
            data={pages}
            keyExtractor={(item) => item.key}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumScrollEnd}
            renderItem={({ item: pageItem }) => (
              <View style={{ width }}>
                <FlatList
                  data={pageItem.data}
                  keyExtractor={(subItem) => subItem.id}
                  renderItem={({ item: subItem }) => {
                    const Component = pageItem.Component;
                    return (
                      <Component
                        item={subItem}
                        handleContactWpp={handleContactWpp}
                        handleContactPhone={handleContactPhone}
                        formatCompactPrice={formatCompactPrice}
                        showToast={showToast}
                      />
                    );
                  }}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={() =>
                    renderEmptyState(pageItem.key as any)
                  }
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                />
              </View>
            )}
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: COLORS.primaryLight,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    marginLeft: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "900",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});

export default RequestScreen;
