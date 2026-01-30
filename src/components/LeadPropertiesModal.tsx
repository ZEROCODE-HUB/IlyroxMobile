import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropertyCard from "./cards/PropertyCard";
import { AppHeader } from "./AppHeader";
import { COLORS } from "../constants";
import { FeedItem, User } from "../types";
import { ScreenWrapper } from "../screens/ScreenWrapper";
import { CommentsBottomSheet } from "./modals";

interface LeadPropertiesModalProps {
  visible: boolean;
  onClose: () => void;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  busquedaId: string;
  coincidences: FeedItem[];
  similars: FeedItem[];
  searchCriteria: {
    tipo_propiedad?: string;
    subtipo?: string;
    ciudad?: string;
    municipio?: string;
    colonia?: string;
    tipo_operacion?: string;
    precio_min?: number;
    precio_max?: number;
    moneda?: string;
    habitaciones?: string;
    banos?: string;
    estacionamientos?: string;
    metros_terreno?: number;
    metros_construccion?: number;
    estado?: string;
    genero?: string;
    codigo_propiedad?: string;
  };
  onPropertyClick: (propertyId: string) => void;
  onUserClick: (user: User) => void;
  onDeleteSearch: (busquedaId: string) => void;
  currentUserId?: string;
}

export const LeadPropertiesModal: React.FC<LeadPropertiesModalProps> = ({
  visible,
  onClose,
  leadName,
  leadPhone,
  leadEmail,
  busquedaId,
  coincidences,
  similars,
  searchCriteria = {},
  onPropertyClick,
  onUserClick,
  onDeleteSearch,
  currentUserId,
}) => {
  const [activeTab, setActiveTab] = useState<"coincidencia" | "similar">(
    "coincidencia",
  );
  const [selectedFeedItemId, setSelectedFeedItemId] = useState<string | null>(
    null,
  );
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  const handleDeleteSearchInternal = () => {
    Alert.alert(
      "Eliminar búsqueda",
      "¿Estás seguro de que deseas eliminar esta búsqueda guardada? Se eliminarán todos los matches asociados.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            onDeleteSearch(busquedaId);
            onClose();
          },
        },
      ],
    );
  };

  const handleCommentClick = (feedItemId: string) => {
    setSelectedFeedItemId(feedItemId);
    setShowCommentsModal(true);
  };

  const activeList = activeTab === "coincidencia" ? coincidences : similars;
  const badgeColor = activeTab === "coincidencia" ? "#FF3B30" : "#8E8E93";
  const badgeText = activeTab === "coincidencia" ? "Match" : "Similar";

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

  const renderSearchDetail = (
    icon: keyof typeof Ionicons.glyphMap,
    value?: string | number,
  ) => {
    // Show if value exists (including 0 for number strings if they are formatted as such)
    if (value === undefined || value === null || value === "") return null;

    return (
      <View style={styles.detailItem}>
        <Ionicons name={icon} size={14} color={COLORS.textSecondary} />
        <Text style={styles.detailText}>{String(value)}</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScreenWrapper withHeader={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <AppHeader
              title={leadName}
              showBackButton
              onBack={onClose}
              rightComponent={
                <TouchableOpacity
                  onPress={handleDeleteSearchInternal}
                  style={styles.deleteBtn}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={COLORS.error}
                  />
                </TouchableOpacity>
              }
            />

            {/* Search Info Section */}
            <View style={styles.searchInfoSection}>
              <Text style={styles.detailText}>
                <Text style={styles.detailLabel}>Busca casa: </Text>
                {formatCompactPrice(searchCriteria.precio_min || 0)} -{" "}
                {formatCompactPrice(searchCriteria.precio_max || 0)}{" "}
                {searchCriteria.moneda || ""}
              </Text>
              <Text style={styles.sectionTitle}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color={COLORS.textSecondary}
                />{" "}
                {leadPhone}
              </Text>
              {leadEmail && (
                <Text style={styles.emailText}>
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={COLORS.textSecondary}
                  />{" "}
                  {leadEmail}
                </Text>
              )}
              <View style={styles.criteriaContainer}>
                {renderSearchDetail(
                  "home-outline",
                  searchCriteria.tipo_propiedad,
                )}
                {renderSearchDetail("business-outline", searchCriteria.subtipo)}
                {renderSearchDetail(
                  "pricetag-outline",
                  searchCriteria.tipo_operacion,
                )}
                {renderSearchDetail(
                  "location-outline",
                  searchCriteria.municipio || searchCriteria.ciudad,
                )}
                {renderSearchDetail("map-outline", searchCriteria.colonia)}
                {renderSearchDetail("globe-outline", searchCriteria.estado)}
              </View>
              <View style={styles.criteriaContainer2}>
                {renderSearchDetail("bed-outline", searchCriteria.habitaciones)}
                {renderSearchDetail("water-outline", searchCriteria.banos)}
                {renderSearchDetail(
                  "car-outline",
                  searchCriteria.estacionamientos,
                )}
                {renderSearchDetail(
                  "construct-outline",
                  searchCriteria.metros_construccion === null
                    ? ""
                    : `${searchCriteria.metros_construccion} m²`,
                )}
                {renderSearchDetail(
                  "grid-outline",
                  searchCriteria.metros_terreno === null
                    ? ""
                    : `${searchCriteria.metros_terreno} m²`,
                )}
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "coincidencia" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("coincidencia")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "coincidencia" && styles.activeTabText,
                ]}
              >
                Coincidencias ({coincidences.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "similar" && styles.activeTabSimilar,
              ]}
              onPress={() => setActiveTab("similar")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "similar" && styles.activeTabText,
                ]}
              >
                Similares ({similars.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Properties List */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={COLORS.textTertiary}
                />
                <Text style={styles.emptyText}>
                  No hay propiedades en esta sección
                </Text>
              </View>
            ) : (
              activeList.map((property, index) => (
                <View
                  key={property.id || index}
                  style={styles.propertyCardWrapper}
                >
                  <PropertyCard
                    onUserClick={(user) => onUserClick(user)}
                    item={property}
                    onClick={() =>
                      onPropertyClick(
                        property.propertyDetails?.id || property.id,
                      )
                    }
                    onCommentClick={() => handleCommentClick(property.id)}
                    currentUserId={currentUserId}
                  />
                  {/* Badge Overlay */}
                  <View
                    style={[styles.cardBadge, { backgroundColor: badgeColor }]}
                  >
                    <Text style={styles.cardBadgeText}>{badgeText}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Comments Modal */}
          {selectedFeedItemId && (
            <CommentsBottomSheet
              visible={showCommentsModal}
              onClose={() => {
                setShowCommentsModal(false);
                setSelectedFeedItemId(null);
              }}
              feedItemId={selectedFeedItemId}
              currentUserId={currentUserId}
            />
          )}
        </View>
      </ScreenWrapper>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  deleteBtn: {
    padding: 4,
  },
  searchInfoSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  emailText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: "600",
    paddingVertical: 4,
  },
  criteriaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  criteriaContainer2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    paddingVertical: 4,
  },
  detailLabel: {
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
    borderRadius: 25,
    backgroundColor: COLORS.cardBorder,
  },
  activeTab: {
    backgroundColor: "#FF3B30",
  },
  activeTabSimilar: {
    backgroundColor: "#8E8E93",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  propertyCardWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    position: "relative",
    paddingTop: 45,
    // Add shadow for better separation
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 15,
    fontWeight: "500",
  },
});
