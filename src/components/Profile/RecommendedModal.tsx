import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { stylesRecommendedSection } from "./RecommendedSection.styles";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { Avatar } from "../shared";
import { EmptyState, LoadingState } from "@/design-system/components";
import { useProfileStore, useAuthProfileStore } from "@/store/profileStore";
import { router } from "expo-router";

interface RecommendedModalProps {
  variant: "positive" | "negative";
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  formatRole: (rol: string) => string;
  isMe: boolean;
  loadUsers: (options?: { reset?: boolean }) => Promise<void>;
}

export const RecommendedModal = ({
  variant,
  showModal,
  setShowModal,
  formatRole,
  isMe,
  loadUsers,
}: RecommendedModalProps) => {
  // Use either external or auth store based on isMe
  const externalStore = useProfileStore();
  const authStore = useAuthProfileStore();
  const store = isMe ? authStore : externalStore;

  const isPositive = variant === "positive";

  const users = isPositive
    ? store.recommendedByUsers
    : store.notRecommendedByUsers;
  const error = isPositive
    ? store.recommendedByError
    : store.notRecommendedByError;
  const loading = isPositive
    ? store.loadingRecommendedBy
    : store.loadingNotRecommendedBy;
  const hasMore = isPositive
    ? store.recommendedByHasMore
    : store.notRecommendedByHasMore;
  const total = isPositive
    ? store.reviewStats?.total_recomiendan || 0
    : store.reviewStats?.total_no_recomiendan || 0;
  const title = isPositive ? "Recomendado por" : "No recomendado por";
  const emptyTitle = isPositive
    ? "Aún no hay recomendaciones"
    : "Aún no hay valoraciones negativas";

  return (
    <Modal
      visible={showModal}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}
    >
      <SafeAreaView
        style={stylesRecommendedSection.recommendedByModalContainer}
      >
        <View style={stylesRecommendedSection.recommendedByModalHeader}>
          <TouchableOpacity
            onPress={() => setShowModal(false)}
            style={stylesRecommendedSection.recommendedByModalBackBtn}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <View style={stylesRecommendedSection.recommendedByModalTitleWrap}>
            <Text style={stylesRecommendedSection.recommendedByModalTitle}>
              {title}
            </Text>
            <Text style={stylesRecommendedSection.recommendedByModalSubtitle}>
              {total} usuarios
            </Text>
          </View>
          <View style={stylesRecommendedSection.recommendedByModalBackBtn} />
        </View>

        {error ? (
          <View style={stylesRecommendedSection.recommendedByModalEmpty}>
            <Text style={stylesRecommendedSection.recommendedByEmptyText}>
              {error}
            </Text>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(u, idx) => `${u.id}-${idx}`}
            contentContainerStyle={
              stylesRecommendedSection.recommendedByModalList
            }
            onEndReached={() => {
              if (loading || !hasMore) return;
              loadUsers();
            }}
            onEndReachedThreshold={0.6}
            ListEmptyComponent={
              loading ? (
                <LoadingState size="small" />
              ) : (
                <EmptyState title={emptyTitle} />
              )
            }
            renderItem={({ item: u }) => {
              const fullName = [
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
              ]
                .filter(Boolean)
                .join(" ")
                .trim();

              return (
                <TouchableOpacity
                  style={stylesRecommendedSection.recommendedByModalItem}
                  onPress={() => {
                    setShowModal(false);
                    router.push({ pathname: "/user/[id]", params: { id: u.id } });
                  }}
                  activeOpacity={0.85}
                >
                  <Avatar
                    uri={u.foto || undefined}
                    name={fullName || "Usuario"}
                    size={44}
                    style={stylesRecommendedSection.recommendedByAvatar}
                  />
                  <View style={stylesRecommendedSection.recommendedByInfo}>
                    <Text
                      style={stylesRecommendedSection.recommendedByName}
                      numberOfLines={1}
                    >
                      {fullName || "Usuario"}
                    </Text>
                    <Text
                      style={stylesRecommendedSection.recommendedByRole}
                      numberOfLines={1}
                    >
                      {formatRole(u.rol)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={
              loading ? (
                <View style={stylesRecommendedSection.recommendedByModalFooter}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : hasMore ? (
                <View style={stylesRecommendedSection.recommendedByModalFooter}>
                  <TouchableOpacity
                    style={stylesRecommendedSection.recommendedByLoadMoreBtn}
                    onPress={() => loadUsers()}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={stylesRecommendedSection.recommendedByLoadMoreText}
                    >
                      Cargar más
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={stylesRecommendedSection.recommendedByModalFooter}
                />
              )
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
