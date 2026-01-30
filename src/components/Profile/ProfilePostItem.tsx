import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { Post } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";

const { width } = Dimensions.get("window");
// ProfilePostGrid used (width - 24) / 3
const ITEM_SIZE = (width - 24) / 3;

interface ProfilePostItemProps {
  item: Post;
  onPress: (item: Post) => void;
  isOwnProfile?: boolean;
  onEdit?: (item: Post) => void;
  onDelete?: (item: Post) => void;
}

const ProfilePostItem: React.FC<ProfilePostItemProps> = ({
  item,
  onPress,
  isOwnProfile,
  onEdit,
  onDelete,
}) => {
  const hasImages = item.imagenes && item.imagenes.length > 0;
  const hasMultipleImages = item.imagenes && item.imagenes.length > 1;

  const menuOptions: MenuOption[] = [
    {
      icon: "pencil-outline",
      label: "Editar",
      onPress: () => onEdit && onEdit(item),
    },
    {
      icon: "trash-outline",
      label: "Eliminar",
      onPress: () => onDelete && onDelete(item),
      danger: true,
    },
  ];

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      {hasImages ? (
        <>
          <Image
            source={{ uri: item.imagenes![0] }}
            style={styles.gridImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
          {hasMultipleImages && (
            <View style={styles.multipleIndicator}>
              <Ionicons name="copy-outline" size={16} color={COLORS.white} />
            </View>
          )}
        </>
      ) : (
        <View style={styles.textOnlyPost}>
          <Text style={styles.textOnlyContent} numberOfLines={6}>
            {item.contenido}
          </Text>
        </View>
      )}

      {isOwnProfile && (
        <View style={styles.menuContainer}>
          <ThreeDotsMenu options={menuOptions} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridItem: {
    width: ITEM_SIZE - 2,
    height: ITEM_SIZE - 2,
    marginBottom: 3,
    marginRight: 3,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  multipleIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 4,
    borderRadius: 4,
  },
  menuContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 9999,
  },
  textOnlyPost: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.gradientBackground || "#f0f0f0", // Fallback if gradient not defined
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textOnlyContent: {
    fontSize: 11,
    color: COLORS.textPrimary,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default ProfilePostItem;
