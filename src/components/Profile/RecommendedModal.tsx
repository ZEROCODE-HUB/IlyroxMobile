import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { stylesRecommendedSection } from "./RecommendedSection";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";
import { Avatar } from "../shared";
import { useProfileStore, useAuthProfileStore } from "@/store/profileStore";

interface RecommendedModalProps {
  showRecommendedByModal: boolean;
  setShowRecommendedByModal: (show: boolean) => void;
  navigation: any;
  formatRole: (rol: string) => string;
  isMe: boolean;
  loadRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
}

export const RecommendedModal = ({
  showRecommendedByModal,
  setShowRecommendedByModal,
  navigation,
  formatRole,
  isMe,
  loadRecommendedByUsers,
}: RecommendedModalProps) => {
  // Use either external or auth store based on isMe
  const externalStore = useProfileStore();
  const authStore = useAuthProfileStore();
  const store = isMe ? authStore : externalStore;

  const {
    recommendedByUsers,
    recommendedByError,
    loadingRecommendedBy,
    recommendedByHasMore,
    reviewStats,
  } = store;

  // Wait, useProfile(userId) uses targetUserId = userId || authUser?.id
  // If we want the one currently in store, we should make sure we call the right load function.
  // Actually, useProfile returns a loadRecommendedByUsers that already uses the correct store internally because it's the SAME hook used in Profile.tsx
  
  return (
    <Modal
      visible={showRecommendedByModal}
      animationType="slide"
      onRequestClose={() => setShowRecommendedByModal(false)}
    >
      <SafeAreaView
        style={stylesRecommendedSection.recommendedByModalContainer}
      >
        <View style={stylesRecommendedSection.recommendedByModalHeader}>
          <TouchableOpacity
            onPress={() => setShowRecommendedByModal(false)}
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
              Recomendado por
            </Text>
            <Text style={stylesRecommendedSection.recommendedByModalSubtitle}>
              {reviewStats?.total_recomiendan || 0} usuarios
            </Text>
          </View>
          <View style={stylesRecommendedSection.recommendedByModalBackBtn} />
        </View>

        {recommendedByError ? (
          <View style={stylesRecommendedSection.recommendedByModalEmpty}>
            <Text style={stylesRecommendedSection.recommendedByEmptyText}>
              {recommendedByError}
            </Text>
          </View>
        ) : (
          <FlatList
            data={recommendedByUsers}
            keyExtractor={(u, idx) => `${u.id}-${idx}`}
            contentContainerStyle={
              stylesRecommendedSection.recommendedByModalList
            }
            onEndReached={() => {
              if (loadingRecommendedBy || !recommendedByHasMore) return;
              loadRecommendedByUsers();
            }}
            onEndReachedThreshold={0.6}
            ListEmptyComponent={
              loadingRecommendedBy ? (
                <View style={stylesRecommendedSection.recommendedByLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <View style={stylesRecommendedSection.recommendedByModalEmpty}>
                  <Text style={stylesRecommendedSection.recommendedByEmptyText}>
                    Aún no hay recomendaciones
                  </Text>
                </View>
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
                    setShowRecommendedByModal(false);
                    navigation.navigate("user/[id]", { id: u.id });
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
              loadingRecommendedBy ? (
                <View style={stylesRecommendedSection.recommendedByModalFooter}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : recommendedByHasMore ? (
                <View style={stylesRecommendedSection.recommendedByModalFooter}>
                  <TouchableOpacity
                    style={stylesRecommendedSection.recommendedByLoadMoreBtn}
                    onPress={() => loadRecommendedByUsers()}
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
