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
import { Post, User } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import { commonStyles } from "styles";
import { RichText } from "../shared";
import { SpecialPostCard } from "../Feed/SpecialPostCard";

const { width } = Dimensions.get("window");
// ProfilePostGrid used (width - 24) / 3
const ITEM_SIZE = (width - 24) / 3;

interface ProfilePostItemProps {
  item: Post;
  user?: User;
  onPress: (item: Post) => void;
  isOwnProfile?: boolean;
  onEdit?: (item: Post) => void;
  onDelete?: (item: Post) => void;
}

const ProfilePostItem: React.FC<ProfilePostItemProps> = ({
  item,
  user,
  onPress,
  isOwnProfile,
  onEdit,
  onDelete,
}) => {
  const hasImages = item.imagenes && item.imagenes.length > 0;
  const hasMultipleImages = item.imagenes && item.imagenes.length > 1;
  const isSearchPost = item.tipo === "busqueda";

  const cleanPostType = (item.tipo || "").toLowerCase().replace(/\s+/g, "");

  const isSpecialPost = ["openhouse", "aniversario", "sold"].includes(
    cleanPostType,
  );

  const menuOptions: MenuOption[] = [
    ...(cleanPostType === "post"
      ? [
          {
            icon: "pencil-outline",
            label: "Editar",
            onPress: () => onEdit && onEdit(item),
          } as MenuOption,
        ]
      : []),
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
      {isSpecialPost ? (
        <SpecialPostCard
          item={{
            id: item.id,
            type: "post",
            user: user || {
              id: item.publicado_por,
              name: "Usuario",
              avatar: "",
              role: "Cliente",
              isFollowing: false,
            },
            content: item.contenido || "",
            images: item.imagenes || [],
            likes: 0,
            comments: 0,
            timestamp: item.created_at,
            postType: cleanPostType as any,
            foto_perfil: item.foto_perfil,
            fecha_hora: item.fecha_hora,
            nombre_asesor: item.nombre_asesor,
            ubicacion: item.ubicacion,
            foto_propiedad: item.foto_propiedad,
            antiguedad: item.antiguedad,
            status: item.status,
          }}
          mode="grid"
        />
      ) : hasImages ? (
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
        <View
          style={[styles.textOnlyPost, isSearchPost && commonStyles.cardDetail]}
        >
          <RichText
            style={[
              styles.textOnlyContent,
              isSearchPost && styles.searchPostText,
            ]}
            content={item.contenido}
            iconSize={10}
            iconColor={isSearchPost ? COLORS.primaryDark : COLORS.textPrimary}
          />
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
    marginLeft: 6,
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
    fontSize: 10,
    color: COLORS.textPrimary,
    textAlign: "center",
    lineHeight: 16,
  },

  searchPostText: {
    color: COLORS.primaryDark,
    fontSize: 8,
    textAlign: "left",
    fontWeight: "700",
  },
});

export default ProfilePostItem;
