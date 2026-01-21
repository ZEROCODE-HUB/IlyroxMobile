/**
 * ProfileReelGrid.tsx
 * Grid de reels con thumbnails e ícono de play (3 columnas)
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
import { FeedItem, Reel } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useGridProfile } from "../../hooks/profile/useGridProfile";
import CreateReel from "../CreateContent/CreateReel";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 24) / 3; // 3 items per row with padding

interface ProfileReelGridProps {
  userId: string;
  onReelPress: (reel: FeedItem | Reel) => void;
  isOwnProfile?: boolean;
  onEdit?: (item: Reel) => void;
  onDelete?: () => void;
  refreshTrigger?: number;
}

const ProfileReelGrid: React.FC<ProfileReelGridProps> = ({
  userId,
  onReelPress,
  isOwnProfile = false,
  onEdit,
  onDelete,
  refreshTrigger = 0,
}) => {
  const [reelToDelete, setReelToDelete] = useState<Reel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [item, setItem] = useState<Reel | null>(null);

  const { reels, getReels, deleteReel, loading } = useGridProfile();

  React.useEffect(() => {
    if (userId) {
      getReels(userId);
    }
  }, [userId, refreshTrigger]);

  const handleDelete = async (reel: Reel) => {
    try {
      setDeleting(true);
      await deleteReel(reel);

      setReelToDelete(null);

      // Trigger refresh
      if (onDelete) {
        onDelete();
      }

      // Also refresh local list
      if (userId) {
        getReels(userId);
      }
    } catch (error: any) {
      console.error("Error deleting reel:", error);
      Alert.alert("Error", error.message || "No se pudo eliminar el reel");
    } finally {
      setDeleting(false);
    }
  };

  const renderReel = ({ item }: { item: Reel }) => {
    const menuOptions: MenuOption[] = [
      {
        icon: "pencil-outline",
        label: "Editar",
        onPress: () => {
          setItem(item);
          setShowModalEdit(true);
          if (onEdit) onEdit(item);
        },
      },
      {
        icon: "trash-outline",
        label: "Eliminar",
        onPress: () => setReelToDelete(item),
        danger: true,
      },
    ];

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => onReelPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{
            uri:
              item.thumbnail_url ||
              "https://placehold.co/400x600/45a0a5/white?text=Video",
          }}
          style={styles.gridImage}
          resizeMode="cover"
        />

        {/* Play Icon Overlay (Bottom Left) */}
        <View style={styles.playOverlay}>
          <Ionicons name="play" size={16} color={COLORS.white} />
        </View>

        {/* Duration Badge */}
        {item.duracion_segundos && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duracion_segundos)}
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

  if (loading && reels.length === 0) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={reels}
        renderItem={renderReel}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.grid}
        scrollEnabled={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="film-outline"
              size={48}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyText}>No hay reels aún</Text>
          </View>
        }
      />

      <Modal visible={showModalEdit} animationType="slide">
        <CreateReel
          reelId={item?.id}
          onBack={() => {
            setShowModalEdit(false);
            if (userId) getReels(userId);
          }}
        />
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={!!reelToDelete}
        title="¿Eliminar reel?"
        message="¿Estás seguro de que deseas eliminar este reel? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => reelToDelete && handleDelete(reelToDelete)}
        onCancel={() => setReelToDelete(null)}
        danger
        loading={deleting}
      />
    </>
  );
};

/**
 * Formatear duración de segundos a mm:ss
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  grid: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  gridItem: {
    width: ITEM_SIZE - 2,
    height: (ITEM_SIZE - 2) * 1.6, // Aspect ratio standard for reels
    marginBottom: 3,
    marginRight: 3,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    bottom: 6,
    left: 6,
    zIndex: 1,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  durationBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: COLORS.blackTransparent60,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  menuContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 9999,
  },
  durationText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
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

export default ProfileReelGrid;
