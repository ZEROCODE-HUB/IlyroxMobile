import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Avatar } from "../shared";
import { COLORS } from "@/constants";
import { EmptyState } from "@/design-system/components";
import { Ionicons } from "@expo/vector-icons";
import { RecommendedModal } from "./RecommendedModal";
import { stylesRecommendedSection } from "./RecommendedSection.styles";
import { useProfileStore, useAuthProfileStore } from "@/store/profileStore";
import { useMemo, useEffect } from "react";

// Re-export para no romper imports existentes de `stylesRecommendedSection`.
export { stylesRecommendedSection };

interface RecommendedSectionProps {
  setShowRecommendedByModal: (show: boolean) => void;
  showRecommendedByModal: boolean;
  setShowNotRecommendedByModal: (show: boolean) => void;
  showNotRecommendedByModal: boolean;
  formatRole: (rol: string) => string;
  isMe: boolean;
  loadRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
  loadNotRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
}

export const RecommendedSection = ({
  setShowRecommendedByModal,
  showRecommendedByModal,
  setShowNotRecommendedByModal,
  showNotRecommendedByModal,
  formatRole,
  isMe,
  loadRecommendedByUsers,
  loadNotRecommendedByUsers,
}: RecommendedSectionProps) => {
  // Use either external or auth store based on isMe
  const externalStore = useProfileStore();
  const authStore = useAuthProfileStore();
  const store = isMe ? authStore : externalStore;

  const {
    reviewStats,
    loadingRecommendedBy,
    recommendedByError,
    recommendedByUsers,
    recommendedByLoaded,
    loadingNotRecommendedBy,
    notRecommendedByError,
    notRecommendedByUsers,
    notRecommendedByLoaded,
  } = store;

  // Mapped profile data for easy access
  const stats = useMemo(() => ({
    positiveRecommendations: reviewStats?.total_recomiendan || 0,
    negativeRecommendations: reviewStats?.total_no_recomiendan || 0,
    profesionalismo: reviewStats?.promedio_profesionalismo || 0,
    eticaValores: reviewStats?.promedio_etica_valores || 0,
    pagoComisiones: reviewStats?.promedio_pago_comisiones || 0,
    comunicacionServicio: reviewStats?.promedio_comunicacion_servicio || 0,
    totalReviews: reviewStats?.total_resenas || 0,
  }), [reviewStats]);

  useEffect(() => {
    // Cargar solo una vez por perfil. Usamos la bandera `loaded` en lugar de
    // `length === 0`: si las estadísticas indican recomendaciones pero la query
    // regresa vacío (datos desincronizados), `length` se quedaría en 0 y el
    // efecto se dispararía en bucle al alternar `loading`, congelando la pantalla.
    if (!loadingRecommendedBy && !recommendedByLoaded && stats.positiveRecommendations > 0) {
      loadRecommendedByUsers({ reset: true });
    }
  }, [loadingRecommendedBy, recommendedByLoaded, stats.positiveRecommendations, loadRecommendedByUsers]);

  useEffect(() => {
    if (!loadingNotRecommendedBy && !notRecommendedByLoaded && stats.negativeRecommendations > 0) {
      loadNotRecommendedByUsers({ reset: true });
    }
  }, [loadingNotRecommendedBy, notRecommendedByLoaded, stats.negativeRecommendations, loadNotRecommendedByUsers]);


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

      <View style={stylesRecommendedSection.recommendedBySection}>
        <View style={stylesRecommendedSection.recommendedByHeader}>
          <Text style={stylesRecommendedSection.recommendedByTitle}>
            No recomendado por
          </Text>
          <Text style={stylesRecommendedSection.recommendedByCount}>
            {stats.negativeRecommendations} usuarios
          </Text>
        </View>

        {loadingNotRecommendedBy && notRecommendedByUsers.length === 0 ? (
          <View style={stylesRecommendedSection.recommendedByLoading}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : notRecommendedByError ? (
          <Text style={stylesRecommendedSection.recommendedByEmptyText}>
            {notRecommendedByError}
          </Text>
        ) : notRecommendedByUsers.length === 0 ? (
          <EmptyState title="Aún no hay valoraciones negativas" />
        ) : (
          <TouchableOpacity
            style={stylesRecommendedSection.recommendedByPreviewRow}
            onPress={() => setShowNotRecommendedByModal(true)}
            activeOpacity={0.85}
          >
            <View style={stylesRecommendedSection.recommendedByAvatars}>
              {notRecommendedByUsers.slice(0, 2).map((u, idx) => {
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
                const first = notRecommendedByUsers[0];
                const firstName = first
                  ? [first.nombre, first.apellido_paterno]
                      .filter(Boolean)
                      .join(" ")
                      .trim()
                  : "Usuario";
                const rest = Math.max(0, stats.negativeRecommendations - 1);
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
          { label: "Profesionalismo", rating: stats.profesionalismo },
          { label: "Ética y valores", rating: stats.eticaValores },
          { label: "Pago de comisiones", rating: stats.pagoComisiones },
          { label: "Comunicación y servicio", rating: stats.comunicacionServicio },
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
        variant="positive"
        showModal={showRecommendedByModal}
        setShowModal={setShowRecommendedByModal}
        formatRole={formatRole}
        isMe={isMe}
        loadUsers={loadRecommendedByUsers}
      />
      <RecommendedModal
        variant="negative"
        showModal={showNotRecommendedByModal}
        setShowModal={setShowNotRecommendedByModal}
        formatRole={formatRole}
        isMe={isMe}
        loadUsers={loadNotRecommendedByUsers}
      />
    </View>
  );
};
