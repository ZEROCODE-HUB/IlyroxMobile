import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { COLORS } from "../../constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logger } from "@/utils/logger";

const log = logger.scoped("ImageEditor");

interface ImageEditorProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (uri: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CONTAINER_WIDTH = SCREEN_WIDTH - 40;
const CONTAINER_HEIGHT = SCREEN_HEIGHT - 250;
const MIN_SIZE = 60;

export const ImageEditor: React.FC<ImageEditorProps> = ({
  visible,
  imageUri,
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [isCropping, setIsCropping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displayRect, setDisplayRect] = useState({ w: 0, h: 0, x: 0, y: 0 });

  // Crop area state
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const resetState = useCallback((w: number, h: number, rot: number) => {
    let curW = w;
    let curH = h;
    if (rot % 180 !== 0) {
      curW = h;
      curH = w;
    }

    const imageAspectRatio = curW / curH;
    const containerAspectRatio = CONTAINER_WIDTH / CONTAINER_HEIGHT;

    let dW, dH;
    if (imageAspectRatio > containerAspectRatio) {
      dW = CONTAINER_WIDTH;
      dH = CONTAINER_WIDTH / imageAspectRatio;
    } else {
      dH = CONTAINER_HEIGHT;
      dW = CONTAINER_HEIGHT * imageAspectRatio;
    }

    const dX = (CONTAINER_WIDTH - dW) / 2;
    const dY = (CONTAINER_HEIGHT - dH) / 2;

    setDisplayRect({ w: dW, h: dH, x: dX, y: dY });

    const initialSize = Math.min(dW, dH) * 0.8;
    setCrop({
      w: initialSize,
      h: initialSize,
      x: dX + (dW - initialSize) / 2,
      y: dY + (dH - initialSize) / 2,
    });
  }, []);

  useEffect(() => {
    if (imageUri && visible) {
      Image.getSize(imageUri, (w, h) => {
        setImageSize({ width: w, height: h });
        resetState(w, h, 0);
      });
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setIsCropping(false);
    }
  }, [imageUri, visible, resetState]);

  useEffect(() => {
    if (imageSize.width > 0) {
      resetState(imageSize.width, imageSize.height, rotation);
    }
  }, [rotation, imageSize, resetState]);

  const handleRotate = () => setRotation((p) => (p + 90) % 360);
  const handleFlipH = () => setFlipH((p) => !p);
  const handleFlipV = () => setFlipV((p) => !p);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const actions: ImageManipulator.Action[] = [];
      if (rotation !== 0) actions.push({ rotate: rotation });
      if (flipH) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      if (flipV) actions.push({ flip: ImageManipulator.FlipType.Vertical });

      if (isCropping) {
        let curW = imageSize.width;
        let curH = imageSize.height;
        if (rotation % 180 !== 0) {
          curW = imageSize.height;
          curH = imageSize.width;
        }

        const scale = curW / displayRect.w;
        const originX = (crop.x - displayRect.x) * scale;
        const originY = (crop.y - displayRect.y) * scale;
        const width = crop.w * scale;
        const height = crop.h * scale;

        actions.push({
          crop: {
            originX: Math.max(0, originX),
            originY: Math.max(0, originY),
            width: Math.min(width, curW - originX),
            height: Math.min(height, curH - originY),
          },
        });
      }

      if (actions.length === 0) {
        onSave(imageUri);
        return;
      }

      const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      onSave(result.uri);
    } catch (err) {
      log.error(err);
      alert("Error al procesar imagen");
    } finally {
      setIsProcessing(false);
    }
  };

  // State refs for PanResponder closures
  const cropRef = useRef(crop);
  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  const lastState = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const moveResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastState.current = { ...cropRef.current };
      },
      onPanResponderMove: (_, gs) => {
        const nx = Math.min(
          Math.max(displayRect.x, lastState.current.x + gs.dx),
          displayRect.x + displayRect.w - cropRef.current.w,
        );
        const ny = Math.min(
          Math.max(displayRect.y, lastState.current.y + gs.dy),
          displayRect.y + displayRect.h - cropRef.current.h,
        );
        setCrop((p) => ({ ...p, x: nx, y: ny }));
      },
    }),
  ).current;

  const createResizeResponder = (type: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastState.current = { ...cropRef.current };
      },
      onPanResponderMove: (_, gs) => {
        setCrop((prev) => {
          let { x, y, w, h } = { ...lastState.current };

          if (type.includes("r")) {
            w = Math.min(
              Math.max(MIN_SIZE, lastState.current.w + gs.dx),
              displayRect.x + displayRect.w - x,
            );
          }
          if (type.includes("b")) {
            h = Math.min(
              Math.max(MIN_SIZE, lastState.current.h + gs.dy),
              displayRect.y + displayRect.h - y,
            );
          }
          if (type.includes("l")) {
            const nw = Math.max(MIN_SIZE, lastState.current.w - gs.dx);
            const nx = Math.max(
              displayRect.x,
              lastState.current.x + (lastState.current.w - nw),
            );
            if (
              nx >= displayRect.x &&
              nx + nw <= displayRect.x + displayRect.w
            ) {
              x = nx;
              w = nw;
            }
          }
          if (type.includes("t")) {
            const nh = Math.max(MIN_SIZE, lastState.current.h - gs.dy);
            const ny = Math.max(
              displayRect.y,
              lastState.current.y + (lastState.current.h - nh),
            );
            if (
              ny >= displayRect.y &&
              ny + nh <= displayRect.y + displayRect.h
            ) {
              y = ny;
              h = nh;
            }
          }
          return { x, y, w, h };
        });
      },
    });

  const tlResponder = useRef(createResizeResponder("tl")).current;
  const trResponder = useRef(createResizeResponder("tr")).current;
  const blResponder = useRef(createResizeResponder("bl")).current;
  const brResponder = useRef(createResizeResponder("br")).current;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Imagen</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.saveText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.previewContainer}>
          <View style={styles.imageWrapper}>
            {imageUri && (
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.preview,
                  {
                    transform: [
                      { rotate: `${rotation}deg` },
                      { scaleX: flipH ? -1 : 1 },
                      { scaleY: flipV ? -1 : 1 },
                    ],
                  },
                ]}
                resizeMode="contain"
              />
            )}
            {isCropping && (
              <View
                style={[
                  styles.cropBox,
                  { left: crop.x, top: crop.y, width: crop.w, height: crop.h },
                ]}
                {...moveResponder.panHandlers}
              >
                <View style={styles.cropGrid}>
                  <View style={styles.gridLineV} />
                  <View style={styles.gridLineV} />
                  <View style={[styles.gridLineH, { top: "33%" }]} />
                  <View style={[styles.gridLineH, { top: "66%" }]} />
                </View>

                {/* Handles */}
                <View
                  style={[styles.handle, styles.handleTl]}
                  {...tlResponder.panHandlers}
                />
                <View
                  style={[styles.handle, styles.handleTr]}
                  {...trResponder.panHandlers}
                />
                <View
                  style={[styles.handle, styles.handleBl]}
                  {...blResponder.panHandlers}
                />
                <View
                  style={[styles.handle, styles.handleBr]}
                  {...brResponder.panHandlers}
                />
              </View>
            )}
          </View>
        </View>

        <View style={[styles.toolbar, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.toolButton} onPress={handleRotate}>
            <Ionicons name="refresh" size={24} color={COLORS.white} />
            <Text style={styles.toolText}>Rotar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => setIsCropping(!isCropping)}
          >
            <Ionicons
              name="crop"
              size={24}
              color={isCropping ? COLORS.primary : COLORS.white}
            />
            <Text
              style={[styles.toolText, isCropping && { color: COLORS.primary }]}
            >
              Recortar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleFlipH}>
            <Ionicons name="swap-horizontal" size={24} color={COLORS.white} />
            <Text style={styles.toolText}>Reflejar H</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleFlipV}>
            <Ionicons name="swap-vertical" size={24} color={COLORS.white} />
            <Text style={styles.toolText}>Reflejar V</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 60,
  },
  headerButton: { padding: 8, minWidth: 60, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: COLORS.white },
  saveText: { color: COLORS.primary, fontSize: 16, fontWeight: "bold" },
  previewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
  imageWrapper: {
    width: CONTAINER_WIDTH,
    height: CONTAINER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  preview: { width: "100%", height: "100%" },
  cropBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  cropGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    alignContent: "space-evenly",
  },
  gridLineV: {
    width: 1,
    height: "100%",
    backgroundColor: COLORS.whiteTransparent30,
  },
  gridLineH: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.whiteTransparent30,
    position: "absolute",
  },
  handle: {
    position: "absolute",
    width: 44,
    height: 44,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  handleTl: {
    top: -22,
    left: -22,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  handleTr: {
    top: -22,
    right: -22,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
  },
  handleBl: {
    bottom: -22,
    left: -22,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: COLORS.primary,
  },
  handleBr: {
    bottom: -22,
    right: -22,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: COLORS.primary,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: COLORS.black,
  },
  toolButton: { alignItems: "center", gap: 4 },
  toolText: { color: COLORS.white, fontSize: 12 },
});
