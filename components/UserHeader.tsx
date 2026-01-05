import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { User } from "../types";
import Avatar from "./shared/Avatar";
import RatingStars from "./shared/RatingStars";
import { COLORS } from "../constants/colors";

interface UserHeaderProps {
  user: User;
  timestamp: string;
  onUserClick?: (user: User) => void;
  showOptions: boolean;
  setShowOptions: (show: boolean) => void;
  onReport: () => void;
  totalRatings?: number;
}

const UserHeader: React.FC<UserHeaderProps> = ({
  user,
  timestamp,
  onUserClick,
  showOptions,
  setShowOptions,
  onReport,
  totalRatings,
}) => {
  const displayName = user.name || user.nombre || "Usuario";
  return (
    <View style={styles.cardHeader}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => onUserClick?.(user)}
        accessibilityLabel={`Ver perfil de ${displayName}`}
        accessibilityRole="button"
      >
        <Avatar uri={user.avatar} name={displayName} size={36} style={styles.avatar} />
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{displayName}</Text>
            {user.rating !== undefined && (
              <RatingStars 
                rating={user.rating} 
                totalRatings={totalRatings || user.totalRatings || 0} 
                size={12}
              />
            )}
          </View>
          <Text style={styles.timestamp}>
            {timestamp} • {user.role}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => setShowOptions(!showOptions)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textTertiary} />
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
                    <Text style={[styles.menuItemText, { color: COLORS.error }]}>
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
