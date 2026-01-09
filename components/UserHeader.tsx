import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { User } from "../types";
import Avatar from "./shared/Avatar";
import { COLORS } from "../constants/colors";
import { supabase } from "../lib/supabase";

interface UserHeaderProps {
  user: User;
  timestamp: string;
  onUserClick?: (user: User) => void;
  showOptions: boolean;
  setShowOptions: (show: boolean) => void;
  onReport: () => void;
  totalRatings?: number;
  showRecommendedPreview?: boolean;
}

const UserHeader: React.FC<UserHeaderProps> = ({
  user,
  timestamp,
  onUserClick,
  showOptions,
  setShowOptions,
  onReport,
  totalRatings,
  showRecommendedPreview = true,
}) => {
  const displayName = user.name || user.nombre || "Usuario";
  const ratingsCount = totalRatings ?? user.totalRatings ?? 0;
  const averageRating =
    typeof user.rating === "number" && Number.isFinite(user.rating)
      ? Math.max(0, user.rating)
      : 0;
  const averageRatingText = Number.isInteger(averageRating)
    ? String(averageRating)
    : averageRating.toFixed(1);
  const displayCount = ratingsCount;
  const positiveRecommendations = user.positiveRecommendations ?? 0;
  const recommendedByPreview = user.recommendedByPreview ?? [];
  const firstRecommender = recommendedByPreview[0];
  const recommendedText =
    positiveRecommendations > 0 && firstRecommender
      ? `${firstRecommender.name}${
          positiveRecommendations > 1
            ? ` y ${positiveRecommendations - 1} más`
            : ""
        }`
      : `Recomendado por ${positiveRecommendations} usuarios`;
  const [showRecommendedModal, setShowRecommendedModal] = React.useState(false);
  const [recommendedList, setRecommendedList] = React.useState<
    { id: string; name: string; role?: string; avatar?: string | null }[]
  >([]);
  const [loadingRecommended, setLoadingRecommended] = React.useState(false);

  const openRecommendedModal = async () => {
    if (!user?.id) return;
    setShowRecommendedModal(true);
    setLoadingRecommended(true);
    setRecommendedList([]);

    // CORRECCIÓN: Una sola consulta con relación (inner join implícito al pedir datos anidados)
    const { data: recs } = await supabase
      .from("recomendaciones_usuarios")
      .select(`
        recomendado_por,
        perfil:perfiles!recomendado_por (
            id,
            nombre,
            apellido_paterno,
            apellido_materno,
            foto,
            rol
        )
      `)
      .eq("usuario_recomendado_id", user.id)
      .eq("recomienda", true)
      .range(0, 49);

    // Mapeo directo de la respuesta anidada
    const mapped = (recs || []).map((r: any) => {
      const p = r.perfil; // Supabase devuelve el objeto anidado aquí
      const name = [p?.nombre, p?.apellido_paterno, p?.apellido_materno]
        .filter(Boolean)
        .join(" ")
        .trim();

      return {
        id: p?.id,
        name: name || "Usuario",
        role: p?.rol,
        avatar: p?.foto ?? null,
      };
    });

    setRecommendedList(mapped);
    setLoadingRecommended(false);
  };
  return (
    <View style={styles.cardHeader}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => onUserClick?.(user)}
        accessibilityLabel={`Ver perfil de ${displayName}`}
        accessibilityRole="button"
      >
        <Avatar
          uri={user.avatar}
          name={displayName}
          size={36}
          style={styles.avatar}
        />
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{displayName}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>
                {averageRatingText}⭐ ({displayCount})
              </Text>
            </View>
          </View>
          <Text style={styles.timestamp}>
            {timestamp} • {user.role}
          </Text>
          {showRecommendedPreview && positiveRecommendations > 0 && (
            <TouchableOpacity
              style={styles.recommendedRow}
              onPress={openRecommendedModal}
              activeOpacity={0.8}
            >
              <View style={styles.recommendedAvatars}>
                {recommendedByPreview.slice(0, 2).map((u, idx) => (
                  <View
                    key={u.id}
                    style={[
                      styles.recommendedAvatarWrapper,
                      idx > 0 && styles.recommendedAvatarOverlap,
                    ]}
                  >
                    <Avatar
                      uri={u.avatar || undefined}
                      name={u.name}
                      size={18}
                      style={styles.recommendedAvatar}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.recommendedText} numberOfLines={1}>
                {recommendedText}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => setShowOptions(!showOptions)}>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={COLORS.textTertiary}
          />
        </TouchableOpacity>

        {showOptions && (
          <Modal visible={true} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowOptions(false)}
            >
              <View style={styles.menuContainer}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowOptions(false);
                    onReport();
                  }}
                >
                  <View style={styles.menuItemContent}>
                    <Ionicons name="flag" size={16} color={COLORS.error} />
                    <Text
                      style={[styles.menuItemText, { color: COLORS.error }]}
                    >
                      Reportar
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setShowOptions(false)}
                >
                  <View style={styles.menuItemContent}>
                    <Ionicons name="ban" size={16} color={COLORS.textPrimary} />
                    <Text style={styles.menuItemText}>Bloquear</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
      {showRecommendedModal && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRecommendedModal(false)}
          >
            <View style={styles.recommendedModal}>
              <View style={styles.recommendedModalHeader}>
                <Text style={styles.recommendedModalTitle}>
                  Recomendado por
                </Text>
                <Text style={styles.recommendedModalSubtitle}>
                  {positiveRecommendations} usuarios
                </Text>
              </View>
              {loadingRecommended ? (
                <View style={styles.recommendedModalLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <FlatList
                  data={recommendedList}
                  keyExtractor={(u) => u.id}
                  contentContainerStyle={styles.recommendedModalList}
                  renderItem={({ item }) => (
                    <View style={styles.recommendedModalItem}>
                      <Avatar
                        uri={item.avatar || undefined}
                        name={item.name}
                        size={40}
                      />
                      <View style={styles.recommendedModalInfo}>
                        <Text
                          style={styles.recommendedModalName}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={styles.recommendedModalRole}
                          numberOfLines={1}
                        >
                          {item.role === "agente" ? "Agente" : "Cliente"}
                        </Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.recommendedModalEmpty}>
                      <Text style={styles.recommendedModalEmptyText}>
                        Aún no hay recomendaciones
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  recommendedRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recommendedAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  recommendedAvatarWrapper: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  recommendedAvatarOverlap: {
    marginLeft: -8,
  },
  recommendedAvatar: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    maxWidth: 170,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    width: 280,
  },
  menuItem: {
    paddingVertical: 12,
  },
  recommendedModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: 320,
    maxHeight: 420,
  },
  recommendedModalHeader: {
    alignItems: "center",
    paddingBottom: 8,
  },
  recommendedModalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedModalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedModalLoading: {
    padding: 16,
    alignItems: "center",
  },
  recommendedModalList: {
    paddingVertical: 6,
    gap: 0,
  },
  recommendedModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  recommendedModalInfo: {
    flex: 1,
  },
  recommendedModalName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  recommendedModalRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedModalEmpty: {
    padding: 16,
    alignItems: "center",
  },
  recommendedModalEmptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuItemText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
});

export default React.memo(UserHeader);
