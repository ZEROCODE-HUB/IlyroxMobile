/**
 * ProfilePostGrid.tsx
 * Grid de posts estilo Instagram (3 columnas)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { Post } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useGridProfile } from "../../hooks/profile/useGridProfile";
import CreatePost from "../CreateContent/CreatePost";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 24) / 3; // 3 items per row with padding

interface ProfilePostGridProps {
  userId: string;
  onPostPress: (post: Post) => void;
  isOwnProfile?: boolean;
  onDelete?: () => void;
  refreshTrigger?: number;
}

const ProfilePostGrid: React.FC<ProfilePostGridProps> = ({
  userId,
  onPostPress,
  isOwnProfile = false,
  onDelete,
  refreshTrigger = 0,
}) => {
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postToEdit, setPostToEdit] = useState<Post | null>(null);

  const { posts, getPosts, deletePost, loading } = useGridProfile();

  React.useEffect(() => {
    if (userId) {
      getPosts(userId);
    }
  }, [userId, refreshTrigger]);

  const handleDelete = async (post: Post) => {
    try {
      setDeleting(true);

      await deletePost(post);

      setPostToDelete(null);

      // Trigger refresh
      if (onDelete) {
        onDelete();
      }

      // Refresh local list
      if (userId) {
        getPosts(userId);
      }
    } catch (error: any) {
      console.error("Error deleting post:", error);
      Alert.alert("Error", error.message || "No se pudo eliminar el post");
    } finally {
      setDeleting(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const hasImages = item.imagenes && item.imagenes.length > 0;
    const hasMultipleImages = item.imagenes && item.imagenes.length > 1;

    const menuOptions: MenuOption[] = [
      {
        icon: "pencil-outline",
        label: "Editar",
        onPress: () => {
          setPostToEdit(item);
          setShowPostModal(true);
        },
      },
      {
        icon: "trash-outline",
        label: "Eliminar",
        onPress: () => setPostToDelete(item),
        danger: true,
      },
    ];

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onPostPress(item)}
        activeOpacity={0.8}
      >
        {hasImages ? (
          <>
            <Image
              source={{ uri: item.imagenes![0] }}
              style={styles.gridImage}
              resizeMode="cover"
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

        {/* 3-Dot Menu (solo si es perfil propio) */}
        {isOwnProfile && (
          <View style={styles.menuContainer}>
            <ThreeDotsMenu options={menuOptions} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="images-outline"
              size={48}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyText}>No hay posts aún</Text>
          </View>
        }
      />

      <Modal visible={showPostModal}>
        <CreatePost
          post={postToEdit || undefined} // Pass post to edit
          onBack={() => {
            setShowPostModal(false);
            setPostToEdit(null);
            if (userId) getPosts(userId);
          }}
        />
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={!!postToDelete}
        title="¿Eliminar post?"
        message="¿Estás seguro de que deseas eliminar este post? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => postToDelete && handleDelete(postToDelete)}
        onCancel={() => setPostToDelete(null)}
        danger
        loading={deleting}
      />
    </>
  );
};

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
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
    backgroundColor: COLORS.blackTransparent50,
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
    backgroundColor: COLORS.gradientBackground,
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
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
});

export default ProfilePostGrid;
