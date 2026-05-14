import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { normalizePostType } from "../../utils/stringNormalizer";
import { Post, User } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import { SpecialPostCard } from "../Feed/SpecialPostCard";
import PostCard from "../cards/PostCard";

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

const ProfilePostItem: React.FC<ProfilePostItemProps> = React.memo(
  ({ item, user, onPress, isOwnProfile, onEdit, onDelete }) => {
    const hasMultipleImages = item.imagenes && item.imagenes.length > 1;

    const cleanPostType = normalizePostType(item.tipo);

    const isSpecialPost = [
      "openhouse",
      "aniversario",
      "sold",
      "busqueda",
    ].includes(cleanPostType);

    const menuOptions: MenuOption[] = [
      ...(["post", "openhouse", "busqueda"].includes(cleanPostType)
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

    const feedItemProps = {
      id: item.id,
      type: "post" as const,
      user: user || {
        id: item.publicado_por,
        name: "Usuario",
        avatar: "",
        role: "Cliente" as const,
        isFollowing: false,
      },
      content: item.contenido || "",
      images: item.imagenes || [],
      likes: item.likes_count || 0,
      comments: item.comentarios_count || 0,
      timestamp: item.created_at,
      postType: cleanPostType as "post" | "busqueda" | "openhouse" | "aniversario" | "sold",
      foto_perfil_usuario: item.foto_perfil_usuario,
      fecha_hora: item.fecha_hora,
      nombre_asesor: item.nombre_asesor,
      ubicacion: item.ubicacion,
      foto_propiedad: item.foto_propiedad,
      antiguedad: item.antiguedad,
      postDetails: item,
      busquedas_json: item.busquedas_json,
    };

    const SCALE = ITEM_SIZE / width;

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        <View 
          pointerEvents="none" 
          style={{
            width: width,
            transformOrigin: "top left",
            transform: [{ scale: SCALE }],
            backgroundColor: COLORS.background,
          }}
        >
          {isSpecialPost ? (
            <SpecialPostCard
              item={feedItemProps}
              mode="preview"
            />
          ) : (
            <PostCard
              item={feedItemProps}
              onClick={() => {}}
              onCommentClick={() => {}}
              currentUserId={user?.id}
            />
          )}
        </View>

        {hasMultipleImages && !isSpecialPost && (
          <View style={styles.multipleIndicator}>
            <Ionicons name="copy-outline" size={16} color={COLORS.white} />
          </View>
        )}

        {isOwnProfile && (
          <View style={styles.menuContainer}>
            <ThreeDotsMenu options={menuOptions} />
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

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
