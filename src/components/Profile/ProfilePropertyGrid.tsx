/**
 * ProfilePropertyGrid.tsx
 * Grid de propiedades con badges de comisión y estado
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useToast } from "@/context/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { Property } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import ConfirmDialog from "../shared/ConfirmDialog";
import { supabase } from "../../lib/supabase";
import { Bath } from "lucide-react-native";
import { logger } from "@/utils/logger";

const log = logger.scoped("ProfilePropertyGrid");

const { width } = Dimensions.get("window");
const GAP = 8;
const ITEM_SIZE = (width - 24 - GAP * 2) / 3;

interface ProfilePropertyGridProps {
  properties: Property[];
  onPropertyPress: (property: Property) => void;
  isOwnProfile: boolean;
  onEditPress?: (property: Property) => void;
  onDelete?: () => void;
}

const ProfilePropertyGrid: React.FC<ProfilePropertyGridProps> = ({
  properties,
  onPropertyPress,
  isOwnProfile,
  onEditPress,
  onDelete,
}) => {
  const { showToast } = useToast();
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (property: Property) => {
    try {
      setDeleting(true);

      // Soft delete: set deleted_at timestamp
      const { error } = await supabase
        .from("propiedades")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", property.id);

      if (error) throw error;

      showToast("Propiedad eliminada correctamente", "success");
      setPropertyToDelete(null);

      // Trigger refresh
      if (onDelete) {
        onDelete();
      }
    } catch (error: any) {
      log.error("Error deleting property:", error);
      showToast(error.message || "No se pudo eliminar la propiedad", "error");
    } finally {
      setDeleting(false);
    }
  };

  const renderProperty = ({
    item,
    index,
  }: {
    item: Property;
    index: number;
  }) => {
    const isLastInRow = (index + 1) % 3 === 0;
    const commissionText = formatCommission(item.commission);

    const menuOptions: MenuOption[] = [
      {
        icon: "pencil-outline",
        label: "Editar",
        onPress: () => onEditPress && onEditPress(item),
      },
      {
        icon: "trash-outline",
        label: "Eliminar",
        onPress: () => setPropertyToDelete(item),
        danger: true,
      },
    ];

    return (
      <TouchableOpacity
        style={[styles.gridItem, isLastInRow && { marginRight: 0 }]}
        onPress={() => onPropertyPress(item)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.images[0] }} style={styles.gridImage} />

        {/* Status Badge */}
        {item.sin_comision ? (
          <View style={[styles.statusBadge, styles.sinComisionBadge]}>
            <Ionicons name="alert-circle" size={10} color="#fff" />
            <Text style={[styles.statusText, { color: "#fff" }]}> Sin comisión</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: "#aab9d761" }]}>
            {commissionText ? (
              <Text style={styles.statusText}>{commissionText} comisión</Text>
            ) : (
              <Text style={styles.statusText}>{item.status}</Text>
            )}
          </View>
        )}

        {/* 3-Dot Menu (solo si es perfil propio) */}
        {isOwnProfile && (
          <View style={styles.menuContainer}>
            <ThreeDotsMenu options={menuOptions} />
          </View>
        )}

        {/* Property Info Container */}
        <View style={styles.infoContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.propertyPrice}>
              $
              {item.price >= 1000000
                ? `${(item.price / 1000000).toFixed(1)}M`
                : `${(item.price / 1000).toFixed(0)}k`}
            </Text>
            <Text style={styles.propertyCurrency}>{item.currency}</Text>
          </View>
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {item.location.city}
          </Text>

          {/* Features */}
          <View style={styles.propertyFeatures}>
            {item.features.beds > 0 && (
              <View
                style={{
                  ...styles.featureBadge,
                  borderRightWidth: 1,
                  paddingRight: 5,
                  borderRightColor: "#cccccc",
                }}
              >
                <Ionicons
                  name="bed-outline"
                  size={10}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.featureBadgeText}>
                  {item.features.beds}
                </Text>
              </View>
            )}
            {item.features.baths > 0 && (
              <View
                style={{
                  ...styles.featureBadge,
                  borderRightWidth: 1,
                  paddingRight: 5,
                  borderRightColor: "#cccccc",
                }}
              >
                <Bath size={10} color={COLORS.textPrimary} />
                <Text style={styles.featureBadgeText}>
                  {item.features.baths}
                </Text>
              </View>
            )}
            {item.features.constructionSqft > 0 ? (
              <View
                style={{
                  ...styles.featureBadge,
                  paddingHorizontal: 3,
                  borderRightColor: "#cccccc",
                }}
              >
                <Text style={styles.featureBadgeText}>
                  {item.features.constructionSqft} m²
                </Text>
              </View>
            ) : (
              <View
                style={{
                  ...styles.featureBadge,
                  paddingHorizontal: 3,
                  borderRightColor: "#cccccc",
                }}
              >
                <Text style={styles.featureBadgeText}>
                  {item.features.landSqft} m²
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <FlatList
        data={properties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="home-outline"
              size={48}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyText}>No hay propiedades aún</Text>
          </View>
        }
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={!!propertyToDelete}
        title="¿Eliminar propiedad?"
        message={`¿Estás seguro de que deseas eliminar "${propertyToDelete?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => { if (propertyToDelete) handleDelete(propertyToDelete); }}
        onCancel={() => setPropertyToDelete(null)}
        danger
        loading={deleting}
      />
    </>
  );
};

const formatCommission = (commission?: {
  shared: boolean;
  percentage?: number;
  months?: number;
  condition?: string;
}): string | null => {
  if (!commission) return null;
  if (commission.months) {
    return `${commission.months} mes${commission.months !== 1 ? "es" : ""}`;
  }
  if (commission.percentage) {
    return `${commission.percentage}%`;
  }
  return null;
};

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  columnWrapper: {
    justifyContent: "flex-start",
  },
  gridItem: {
    width: ITEM_SIZE,
    marginBottom: 12,
    marginRight: GAP,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  gridImage: {
    width: "100%",
    height: ITEM_SIZE,
  },
  statusBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statusText: {
    color: "#686a6fff",
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  sinComisionBadge: {
    backgroundColor: "#C53030cc",
    flexDirection: "row",
    alignItems: "center",
  },
  menuContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 9999,
  },
  infoContainer: {
    backgroundColor: COLORS.white,
    padding: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textQuaternary,
  },
  propertyCurrency: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textQuaternary,
    marginLeft: 2,
  },
  propertyLocation: {
    fontSize: 10,
    color: COLORS.textQuaternary,
    marginTop: 2,
  },
  propertyFeatures: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 4,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textQuaternary,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
});

export default ProfilePropertyGrid;
