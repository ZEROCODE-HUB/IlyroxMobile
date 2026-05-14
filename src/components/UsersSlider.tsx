import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { User } from "../types";
import { useWindowDimensions } from "react-native";
import Avatar from "./shared/Avatar";

import { COLORS } from "../constants";

interface UsersSliderProps {
  users: User[];
  onUserClick?: (user: User) => void;
  onApprove: (user: User) => void;
  onReject: (user: User) => void;
}

const UsersSlider: React.FC<UsersSliderProps> = ({
  users,
  onUserClick,
  onApprove,
  onReject,
}) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor(width / 2) - 24;

  const renderUser = useCallback(
    ({ item: user }: { item: User }) => (
      <View style={[styles.userCard, { width: cardWidth }]}>
        <TouchableOpacity onPress={() => onUserClick?.(user)}>
          <Avatar 
            uri={user.avatar} 
            name={user.name || user.nombre} 
            size={80} 
            style={styles.userCardAvatar} 
          />
        </TouchableOpacity>
        <Text style={styles.userCardName} numberOfLines={1}>
          {user.name || user.nombre || "Usuario"}
        </Text>
        <View style={styles.userCardActions}>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => onApprove(user)}
            accessibilityLabel="Aprobar usuario"
          >
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject(user)}
            accessibilityLabel="Rechazar usuario"
          >
            <Ionicons name="close" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [onUserClick, onApprove, onReject]
  );

  const keyExtractor = useCallback((user: User) => user.id, []);

  if (!users || users.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¿Conoces a este usuario?</Text>
      <FlatList
        data={users}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={renderUser}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 12,
    gap: 8,
  },
  userCard: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  userCardAvatar: {
    marginBottom: 10,
  },
  userCardName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  userCardActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
});

export default React.memo(UsersSlider);
