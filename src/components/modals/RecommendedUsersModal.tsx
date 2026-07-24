import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { Avatar } from "../shared";
import { RecommendedUser } from "../../hooks/useUserRecommendations";
import { Modal, EmptyState, LoadingState } from "@/design-system/components";

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
    <Modal
      visible={visible}
      onClose={onClose}
      variant="center"
      showCloseButton={false}
      contentStyle={styles.container}
    >
      <View style={styles.recommendedModalHeader}>
        <Text style={styles.recommendedModalTitle}>Recomendado por</Text>
        <Text style={styles.recommendedModalSubtitle}>
          {totalCount} usuarios
        </Text>
      </View>
      {loading ? (
        <LoadingState size="small" style={styles.recommendedModalLoading} />
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
                {/* La etiqueta es la OCUPACIÓN, no `rol`: `rol` es el permiso
                    en la app (cliente/admin/web) y nadie lo tiene en "agente",
                    así que a todos les salía "Cliente". */}
                <Text style={styles.recommendedModalRole} numberOfLines={1}>
                  {item.ocupacion?.trim() || "Cliente"}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState title="Aún no hay recomendaciones" />
          }
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: 320,
    maxWidth: 320,
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
