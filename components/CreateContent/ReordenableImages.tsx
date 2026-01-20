import { useCallback, useState, useMemo } from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { TouchableOpacity } from "react-native-gesture-handler";
import { COLORS } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import { ViewImage } from "../modals/ViewImage";

interface ImageItem {
  id: string;
  uri: string;
}

interface ReordenableImagesProps {
  images: string[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_SIZE = (SCREEN_WIDTH - 60 - 70) / 3;

export default function ReordenableImages({
  images,
  onReorder,
  onRemove,
}: ReordenableImagesProps) {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  // Generar IDs únicos basados en la URI para garantizar estabilidad al reordenar
  // NO USAR ÍNDICE aquí, ya que rompe el drag & drop al editar.
  const imageItems: ImageItem[] = useMemo(() => {
    return images.map((uri) => ({
      id: uri,
      uri,
    }));
  }, [images]);

  const handleDragEnd = useCallback(
    ({ data }: { data: ImageItem[] }) => {
      const newOrder = data.map((item) => item.uri);
      onReorder(newOrder);
    },
    [onReorder],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ImageItem>) => {
      const index = getIndex() ?? 0;

      return (
        <ScaleDecorator activeScale={1.05}>
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={100}
            activeOpacity={0.9}
            style={[
              styles.imageContainer,
              isActive && styles.imageContainerActive,
            ]}
          >
            <Image
              source={{ uri: item.uri }}
              style={[styles.image, isActive && styles.imageActive]}
            />

            {/* Overlay cuando está activo */}
            {isActive && <View style={styles.activeOverlay} />}

            {/* Expand Button */}
            <View style={styles.expandButtonContainer}>
              <TouchableOpacity
                onPress={() => setSelectedUri(item.uri)}
                activeOpacity={0.7}
                style={styles.expandButton}
              >
                <Ionicons name="expand" size={12} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* Drag hint */}
            <View style={styles.dragHint}>
              <Ionicons name="move" size={16} color="#FFF" />
            </View>

            {/* Remove button */}
            <View style={styles.removeButtonContainer}>
              <TouchableOpacity
                onPress={() => onRemove(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [onRemove],
  );

  if (images.length === 0) return null;

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={imageItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        activationDistance={10}
        dragItemOverflow={true}
      />
      <ViewImage
        src={selectedUri || undefined}
        isVisibleAuto={!!selectedUri}
        onClose={() => setSelectedUri(null)}
        showThumbnail={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: IMAGE_SIZE + 20,
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  imageContainerActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageActive: {
    opacity: 0.95,
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
  },
  expandButton: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 6,
    borderRadius: 6,
  },
  dragHint: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FFF",
    borderRadius: 11,
  },
  removeButtonContainer: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 10,
  },
  expandButtonContainer: {
    position: "absolute",
    top: 1,
    left: 0,
    zIndex: 10,
  },
});
