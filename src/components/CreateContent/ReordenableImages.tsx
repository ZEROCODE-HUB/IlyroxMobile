import React, { useCallback, useState, useRef, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
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
// Calculamos el tamaño para que quepan 3 imágenes
// Ajuste ligero: aseguramos que el cálculo coincida con los nuevos paddings visuales
const CONTENT_PADDING = 20;
const IMAGE_SIZE = (SCREEN_WIDTH - (CONTENT_PADDING * 2) - (12 * 2)) / 3.2;
// Nota: Ajusté ligeramente el divisor o las restas si sientes que el tamaño cambió,
// pero mantuve la lógica original de tu cálculo aproximado.
const SPACING = 12;

let globalImageCounter = 0;

export default function ReordenableImages({
  images,
  onReorder,
  onRemove,
}: ReordenableImagesProps) {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);

  const idMapRef = useRef<Map<string, string>>(new Map());

  const imageItems: ImageItem[] = useMemo(() => {
    const map = idMapRef.current;
    images.forEach((uri) => {
      if (!map.has(uri)) {
        map.set(uri, `img-${++globalImageCounter}`);
      }
    });
    const currentSet = new Set(images);
    for (const key of map.keys()) {
      if (!currentSet.has(key)) map.delete(key);
    }
    return images.map((uri) => ({
      id: map.get(uri)!,
      uri,
    }));
  }, [images]);

  const handleDragEnd = useCallback(
    ({ data }: { data: ImageItem[] }) => {
      const newOrder = data.map((item) => item.uri);
      // Comparación simple para evitar actualizaciones innecesarias
      if (JSON.stringify(newOrder) !== JSON.stringify(images)) {
        onReorder(newOrder);
      }
    },
    [onReorder, images],
  );

  // Componentes para simular el padding sin afectar el sistema de coordenadas de arrastre
  const ListHeaderComponent = useCallback(() => <View style={{ width: CONTENT_PADDING }} />, []);
  const ListFooterComponent = useCallback(() => <View style={{ width: CONTENT_PADDING }} />, []);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<ImageItem>) => {
      const index = getIndex() ?? 0;

      return (
        <View style={styles.itemWrapper}>
          <ScaleDecorator activeScale={1.1}>
            <TouchableOpacity
              onLongPress={drag}
              delayLongPress={160}
              activeOpacity={1}
              style={[
                styles.imageContainer,
                isActive && styles.imageContainerActive,
              ]}
            >
              <Image
                source={{ uri: item.uri }}
                style={styles.image}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />

              {isActive && <View style={styles.activeOverlay} />}

              <View style={styles.expandButtonContainer}>
                <TouchableOpacity
                  onPress={() => setSelectedUri(item.uri)}
                  activeOpacity={0.7}
                  style={styles.expandButton}
                >
                  <Ionicons name="expand" size={12} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {!isActive && (
                <View style={styles.dragHint}>
                  <Ionicons name="move" size={12} color="#FFF" />
                </View>
              )}

              <View style={styles.removeButtonContainer}>
                <TouchableOpacity
                  onPress={() => onRemove(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </ScaleDecorator>
        </View>
      );
    },
    [onRemove, images],
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
        // Eliminado paddingHorizontal de aquí para evitar saltos de coordenadas
        contentContainerStyle={styles.listContent}
        // Usamos componentes para el espaciado inicial/final
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        activationDistance={10}
        autoscrollSpeed={100}
        autoscrollThreshold={40}
        // getItemLayout eliminado para permitir medición dinámica precisa y evitar glitches
        removeClippedSubviews={false}

        // Optimización de scroll
        decelerationRate="fast"
        snapToInterval={IMAGE_SIZE + SPACING} // Opcional: hace que el scroll se detenga en las imágenes
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
    height: IMAGE_SIZE + 40,
    justifyContent: "center",
  },
  listContent: {
    // Padding vertical se mantiene, pero horizontal se maneja con Header/Footer
    paddingVertical: 10,
  },
  itemWrapper: {
    width: IMAGE_SIZE + SPACING,
    height: IMAGE_SIZE,
    justifyContent: 'center',
    // No usamos alignItems para evitar que los elementos absolutos se desborden
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
  },
  imageContainerActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20,
    borderColor: COLORS.primary,
    zIndex: 100,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  activeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  expandButtonContainer: {
    position: "absolute",
    top: 6,
    left: 6,
    zIndex: 20,
  },
  expandButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 6,
    borderRadius: 8,
  },
  dragHint: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonContainer: {
    position: "absolute",
    top: -6,
    right: 2, // Ajustado para que quede dentro del wrapper sin desbordarse
    zIndex: 30,
  },
  removeButton: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
});