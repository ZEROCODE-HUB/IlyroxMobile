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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { FeedItem, Reel } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useGridProfile } from "../../hooks/profile/useGridProfile";

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 24) / 3; // 3 items per row with padding

interface ProfileReelGridProps {
  userId: string;
  onReelPress: (reel: FeedItem | Reel) => void;
  isOwnProfile?: boolean;
  onDelete?: () => void;
}

const ProfileReelGrid: React.FC<ProfileReelGridProps> = ({
  userId,
  onReelPress,
  isOwnProfile = false,
  onDelete,
}) => {
  const [reelToDelete, setReelToDelete] = useState<Reel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { reels, getReels, deleteReel, loading } = useGridProfile();

  React.useEffect(() => {
    if (userId) {
      getReels(userId);
    }
  }, [userId]);

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
          // TODO: Implement edit
          console.log("Edit reel:", item.id);
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

        {/* Play Icon Overlay */}
        <View style={styles.playOverlay}>
          <Ionicons name="play" size={32} color={COLORS.white} />
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
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.5, // Reels are taller (9:16 aspect ratio)
    marginBottom: 2,
    marginRight: 2,
    backgroundColor: COLORS.background,
    overflow: "hidden",
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.blackTransparent30,
    justifyContent: "center",
    alignItems: "center",
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
