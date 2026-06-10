import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "@/constants";
import { Avatar } from "../shared";
import { EmptyState } from "@/design-system/components";
import { useUserRecommendations } from "@/hooks/useUserRecommendations";

interface OwnerRecommendationsProps {
  /** Id del perfil del agente publicador. */
  userId?: string | null;
  /** Ocupación del agente, para construir el texto ("recomienda a este {ocupacion}"). */
  ocupacion?: string | null;
}

/**
 * Indicador de "recomendado por" para el agente publicador en el detalle de la
 * propiedad. Replica el comportamiento del feed (avatares + texto) y abre un
 * modal con la lista completa de quienes lo recomiendan.
 */
export const OwnerRecommendations: React.FC<OwnerRecommendationsProps> = ({
  userId,
  ocupacion,
}) => {
  const { recommendedList, loadingRecommended, fetchRecommendations } =
    useUserRecommendations(userId || undefined);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const count = recommendedList.length;

  // Mientras no haya recomendaciones que mostrar, no ocupamos espacio.
  if (count === 0) return null;

  const first = recommendedList[0];
  const rest = Math.max(0, count - 1);
  const names = `${first.name}${rest > 0 ? ` y ${rest} más` : ""}`;
  const ocup = ocupacion?.trim();
  const verbo = count > 1 ? "recomiendan" : "recomienda";
  const text = ocup ? `${names} ${verbo} a este ${ocup}` : names;

  return (
    <>
      <TouchableOpacity
        style={styles.row}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <View style={styles.avatars}>
          {recommendedList.slice(0, 2).map((u, idx) => (
            <View
              key={`${u.id}-${idx}`}
              style={[styles.avatarWrap, idx > 0 && styles.avatarOverlap]}
            >
              <Avatar
                uri={u.avatar || undefined}
                name={u.name}
                size={18}
                style={styles.avatar}
              />
            </View>
          ))}
        </View>
        <Text style={styles.text} numberOfLines={1}>
          {text}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recomendado por</Text>
              <Text style={styles.modalSubtitle}>{count} usuarios</Text>
            </View>
            {loadingRecommended && count === 0 ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <FlatList
                data={recommendedList}
                keyExtractor={(u, idx) => `${u.id}-${idx}`}
                contentContainerStyle={styles.modalList}
                renderItem={({ item }) => (
                  <View style={styles.modalItem}>
                    <Avatar
                      uri={item.avatar || undefined}
                      name={item.name}
                      size={40}
                    />
                    <View style={styles.modalInfo}>
                      <Text style={styles.modalName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.modalRole} numberOfLines={1}>
                        {item.role === "agente" ? "Agente" : "Cliente"}
                      </Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <EmptyState title="Aún no hay recomendaciones" />
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatar: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: 320,
    maxHeight: 420,
  },
  modalHeader: {
    alignItems: "center",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalLoading: {
    padding: 16,
    alignItems: "center",
  },
  modalList: {
    paddingVertical: 6,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  modalInfo: {
    flex: 1,
  },
  modalName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  modalRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
