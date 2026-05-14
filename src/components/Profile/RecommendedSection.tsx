import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar } from "../shared";
import { COLORS } from "@/constants";
import { EmptyState } from "@/design-system/components";
import { Ionicons } from "@expo/vector-icons";
import { RecommendedModal } from "./RecommendedModal";
import { useProfileStore, useAuthProfileStore } from "@/store/profileStore";
import { useMemo, useEffect } from "react";

interface RecommendedSectionProps {
  setShowRecommendedByModal: (show: boolean) => void;
  showRecommendedByModal: boolean;
  formatRole: (rol: string) => string;
  isMe: boolean;
  loadRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
}

export const RecommendedSection = ({
  setShowRecommendedByModal,
  showRecommendedByModal,
  formatRole,
  isMe,
  loadRecommendedByUsers,
}: RecommendedSectionProps) => {
  // Use either external or auth store based on isMe
  const externalStore = useProfileStore();
  const authStore = useAuthProfileStore();
  const store = isMe ? authStore : externalStore;

  const { 
    reviewStats, 
    loadingRecommendedBy, 
    recommendedByError, 
    recommendedByUsers 
  } = store;

  // Mapped profile data for easy access
  const stats = useMemo(() => ({
    positiveRecommendations: reviewStats?.total_recomiendan || 0,
    disponibilidad: reviewStats?.promedio_disponibilidad || 0,
    profesionalismo: reviewStats?.promedio_profesionalismo || 0,
    comunicacion: reviewStats?.promedio_comunicacion || 0,
    conocimientoMercado: reviewStats?.promedio_conocimiento_mercado || 0,
    totalReviews: reviewStats?.total_resenas || 0,
  }), [reviewStats]);

  useEffect(() => {
    // Only load if we have positive recommendations AND we haven't loaded them yet
    // Also avoid calling it repeatedly if loading
    if (!loadingRecommendedBy && recommendedByUsers.length === 0 && stats.positiveRecommendations > 0) {
      loadRecommendedByUsers({ reset: true });
    }
  }, [loadingRecommendedBy, recommendedByUsers.length, stats.positiveRecommendations, loadRecommendedByUsers]);


  return (
    <View style={stylesRecommendedSection.container}>
      <View style={stylesRecommendedSection.recommendedBySection}>
        <View style={stylesRecommendedSection.recommendedByHeader}>
          <Text style={stylesRecommendedSection.recommendedByTitle}>
            Recomendado por
          </Text>
          <Text style={stylesRecommendedSection.recommendedByCount}>
            {stats.positiveRecommendations} usuarios
          </Text>
        </View>

        {loadingRecommendedBy && recommendedByUsers.length === 0 ? (
          <View style={stylesRecommendedSection.recommendedByLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : recommendedByError ? (
          <Text style={stylesRecommendedSection.recommendedByEmptyText}>
            {recommendedByError}
          </Text>
        ) : recommendedByUsers.length === 0 ? (
          <EmptyState title="Aún no hay recomendaciones" />
        ) : (
          <TouchableOpacity
            style={stylesRecommendedSection.recommendedByPreviewRow}
            onPress={() => setShowRecommendedByModal(true)}
            activeOpacity={0.85}
          >
            <View style={stylesRecommendedSection.recommendedByAvatars}>
              {recommendedByUsers.slice(0, 2).map((u, idx) => {
                const fullName = [
                  u.nombre,
                  u.apellido_paterno,
                  u.apellido_materno,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .trim();

                return (
                  <View
                    key={u.id}
                    style={[
                      stylesRecommendedSection.recommendedByAvatarWrap,
                      idx === 1 &&
                        stylesRecommendedSection.recommendedByAvatarWrapSecond,
                    ]}
                  >
                    <Avatar
                      uri={u.foto || undefined}
                      name={fullName || "Usuario"}
                      size={26}
                      style={stylesRecommendedSection.recommendedByAvatarSmall}
                    />
                  </View>
                );
              })}
            </View>

            <Text
              style={stylesRecommendedSection.recommendedByPreviewText}
              numberOfLines={1}
            >
              {(() => {
                const first = recommendedByUsers[0];
                const firstName = first
                  ? [first.nombre, first.apellido_paterno]
                      .filter(Boolean)
                      .join(" ")
                      .trim()
                  : "Usuario";
                const rest = Math.max(0, stats.positiveRecommendations - 1);
                return rest > 0 ? `${firstName} y ${rest} más` : firstName;
              })()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={stylesRecommendedSection.progressSection}>
        {[5, 4, 3, 2, 1].map((stars) => {
          const starCounts = {
            5: reviewStats?.total_5_estrellas || 0,
            4: reviewStats?.total_4_estrellas || 0,
            3: reviewStats?.total_3_estrellas || 0,
            2: reviewStats?.total_2_estrellas || 0,
            1: reviewStats?.total_1_estrella || 0,
          };

          const count = starCounts[stars as keyof typeof starCounts];
          const percentage =
            stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

          return (
            <View key={stars} style={stylesRecommendedSection.progressRow}>
              <Text style={stylesRecommendedSection.progressLabel}>
                {stars} estrellas
              </Text>
              <View style={stylesRecommendedSection.progressBar}>
                <View
                  style={[
                    stylesRecommendedSection.progressFill,
                    { width: `${Math.round(percentage)}%` },
                  ]}
                />
              </View>
              <Text style={stylesRecommendedSection.progressPerc}>
                {Math.round(percentage)}%
              </Text>
            </View>
          );
        })}
      </View>

      <View style={stylesRecommendedSection.featuresSection}>
        <Text style={stylesRecommendedSection.featuresTitle}>
          Calificación de características
        </Text>
        {[
          { label: "Disponibilidad", rating: stats.disponibilidad },
          { label: "Profesionalismo", rating: stats.profesionalismo },
          { label: "Comunicación", rating: stats.comunicacion },
          { label: "Conocimiento del Mercado", rating: stats.conocimientoMercado },
        ].map((f) => (
          <View key={f.label} style={stylesRecommendedSection.featureRow}>
            <Text style={stylesRecommendedSection.featureLabel}>{f.label}</Text>
            <View style={stylesRecommendedSection.featureStars}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < Math.round(f.rating) ? "star" : "star-outline"}
                  size={16}
                  color={
                    i < Math.round(f.rating)
                      ? COLORS.primary
                      : COLORS.textDisabled
                  }
                />
              ))}
            </View>
          </View>
        ))}
      </View>

      <RecommendedModal
        showRecommendedByModal={showRecommendedByModal}
        setShowRecommendedByModal={setShowRecommendedByModal}
        formatRole={formatRole}
        isMe={isMe}
        loadRecommendedByUsers={loadRecommendedByUsers}
      />
    </View>
  );
};

export const stylesRecommendedSection = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
  },
  recommendedBySection: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recommendedByHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recommendedByTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByCount: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recommendedByLoading: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByEmptyText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  recommendedByPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recommendedByAvatars: {
    flexDirection: "row",
    alignItems: "center",
    width: 46,
  },
  recommendedByAvatarWrap: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  recommendedByAvatarWrapSecond: {
    marginLeft: -10,
  },
  recommendedByAvatarSmall: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedByPreviewText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  recommendedByModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  recommendedByModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recommendedByModalBackBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByModalTitleWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  recommendedByModalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recommendedByModalList: {
    padding: 16,
    paddingBottom: 30,
  },
  recommendedByModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  recommendedByAvatar: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedByInfo: {
    flex: 1,
    justifyContent: "center",
  },
  recommendedByName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByRole: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedByModalFooter: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByLoadMoreBtn: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  recommendedByLoadMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByModalEmpty: {
    padding: 20,
    alignItems: "center",
  },
  progressSection: {
    marginTop: 16,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    width: 80,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  progressPerc: {
    width: 40,
    textAlign: "right",
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  featuresSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  featureLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  featureStars: {
    flexDirection: "row",
    gap: 4,
  },
});
