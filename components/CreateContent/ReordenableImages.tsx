import { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
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
// Calculamos el tamaño para que quepan aproximadamente 3 imágenes en pantalla
const IMAGE_SIZE = (SCREEN_WIDTH - 60 - 70) / 3;

/**
 * ReordenableImages
 * Versión simplificada que solo maneja la lista de imágenes reordenables.
 * Ideal para ser integrada en contenedores que ya manejan las acciones de agregar/eliminar.
 */
export default function ReordenableImages({
  images,
  onReorder,
  onRemove,
}: ReordenableImagesProps) {
  // Mapeamos las URIs a objetos con ID único para el DraggableFlatList
  const imageItems: ImageItem[] = images.map((uri, index) => ({
    id: `img-${index}-${uri.slice(-10)}`,
    uri,
  }));

  const handleDragEnd = useCallback(
    ({ data }: { data: ImageItem[] }) => {
      const newOrder = data.map((item) => item.uri);
      onReorder(newOrder);
    },
    [onReorder]
  );
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ImageItem>) => {
      const index = getIndex() ?? 0;

      return (
        <ScaleDecorator activeScale={1.05}>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            style={[
              styles.imageContainer,
              isActive && styles.imageContainerActive,
            ]}
          >
            <Image source={{ uri: item.uri }} style={styles.image} />

            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => {
                setSelectedUri(item.uri);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="expand" size={10} color={COLORS.white} />
            </TouchableOpacity>

            {/* Hint visual para indicar que se puede mover */}
            <View style={styles.dragHint}>
              <Ionicons name="move" size={16} color="#FFF" />
            </View>

            {/* Botón para eliminar */}
            <TouchableOpacity
              onPress={() => onRemove(index)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </TouchableOpacity>
        </ScaleDecorator>
      );
    },
    [onRemove]
  );

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
  expandButton: {
    position: "absolute",
    top: 1,
    left: 0,
    backgroundColor: COLORS.blackTransparent60,
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
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
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FFF",
    borderRadius: 10,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
});
