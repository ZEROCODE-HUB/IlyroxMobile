import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { Avatar } from "../shared";
import { RecommendedUser } from "../../hooks/useUserRecommendations";
import { commonStyles } from "../../styles";

interface RecommendedUsersModalProps {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  users: RecommendedUser[];
  totalCount: number;
}

const RecommendedUsersModal: React.FC<RecommendedUsersModalProps> = ({
  visible,
  onClose,
  loading,
  users,
  totalCount,
}) => {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={commonStyles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.recommendedModal}>
          <View style={styles.recommendedModalHeader}>
            <Text style={styles.recommendedModalTitle}>Recomendado por</Text>
            <Text style={styles.recommendedModalSubtitle}>
              {totalCount} usuarios
            </Text>
          </View>
          {loading ? (
            <View style={styles.recommendedModalLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={users}
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
                    <Text style={styles.recommendedModalName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.recommendedModalRole} numberOfLines={1}>
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
  );
};

const styles = StyleSheet.create({
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
});

export default RecommendedUsersModal;
