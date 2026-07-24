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
import { Reel } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import * as VideoThumbnails from "expo-video-thumbnails";
import { logger } from "@/utils/logger";

const log = logger.scoped("ProfileReelItem");

const { width } = Dimensions.get("window");
// Assuming 12px padding total (horizontal) and 3 cols?
// In ProfileReelGrid it was: (width - 24) / 3
// In Profile.tsx padding might differ. Profile.tsx had `styles.scrollContent` but no horizontal padding on the list itself?
// ProfileReelGrid had `paddingHorizontal: 12`.
const ITEM_SIZE = (width - 24) / 3;

interface ProfileReelItemProps {
  item: Reel;
  onPress: (item: Reel) => void;
  isOwnProfile?: boolean;
  onEdit?: (item: Reel) => void;
  onDelete?: (item: Reel) => void;
}

const ProfileReelItem: React.FC<ProfileReelItemProps> = React.memo(
  ({ item, onPress, isOwnProfile, onEdit, onDelete }) => {
    // We'll use expo-image for main thumbnail.
    // If thumbnail_url is missing, we try to use video_url.
    // Expo Image can handle some video formats as thumbnails on iOS/Android depending on config,
    // but let's stick to the generated thumbnail logic if needed, but optimized.

    // Actually, for better performance, if no thumbnail, show a placeholder or try to cache the thumbnail generation.
    // But let's first trust the item.thumbnail_url.

    const [thumbSource, setThumbSource] = useState<string | null>(
      item.thumbnail_url,
    );

    React.useEffect(() => {
      let isMounted = true;
      if (!item.thumbnail_url && item.video_url && !thumbSource) {
        // Retrasar la generación para no bloquear el renderizado de la lista
        const timeoutId = setTimeout(() => {
          VideoThumbnails.getThumbnailAsync(item.video_url, {
            time: 0, // El inicio del video es más rápido de extraer
            quality: 0.1, // Baja calidad para el grid es suficiente y procesa más rápido
          })
            .then(({ uri }) => {
              if (isMounted) setThumbSource(uri);
            })
            .catch((e) => log.warn("Thumbnail generation failed", e));
        }, 500);

        return () => {
          isMounted = false;
          clearTimeout(timeoutId);
        };
      }
    }, [item.thumbnail_url, item.video_url]);

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
        onPress={() => {
          console.log("[RDBG] ProfileReelItem.onPress", {
            id: item.id,
            feed_item_id: item.feed_item_id,
          });
          onPress(item);
        }}
        activeOpacity={0.8}
      >
        <Image
          source={
            thumbSource
              ? { uri: thumbSource }
              : {
                  uri: "https://placehold.co/400x600/111111/111111/png", // Color oscuro limpio en vez de "Cargando"
                }
          }
          style={styles.gridImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />

        <View style={styles.playOverlay}>
          <Ionicons name="play" size={16} color={COLORS.white} />
        </View>

        {item.duracion_segundos && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(item.duracion_segundos)}
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
  },
);

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const styles = StyleSheet.create({
  gridItem: {
    width: ITEM_SIZE - 2,
    height: (ITEM_SIZE - 2) * 1.6,
    marginTop: 5,
    marginBottom: 5,
    marginRight: 5,
    marginLeft: 5,
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
    backgroundColor: "rgba(0,0,0,0.6)",
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
});

export default ProfileReelItem;
