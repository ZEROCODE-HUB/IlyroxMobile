import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ViewImageProps {
  src?: string;
  containerStyle?: any;
  imageStyle?: any;
  isVisibleAuto?: boolean;
  onClose?: () => void;
  showThumbnail?: boolean;
}

export function ViewImage({
  src,
  containerStyle,
  imageStyle,
  isVisibleAuto,
  onClose,
  showThumbnail = true,
}: ViewImageProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  const isModalVisible = isVisibleAuto || visible;

  useEffect(() => {
    if (src) {
      Image.getSize(src, (width, height) => {
        setAspectRatio(width / height);
      });
    }
  }, [src]);

  useEffect(() => {
    if (isModalVisible) {
      setLoading(true);
    }
  }, [src, isModalVisible]);

  if (!src) return null;

  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  return (
    <>
      {showThumbnail && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setVisible(true)}
          style={[styles.defaultContainer, containerStyle]}
        >
          <Image
            source={{ uri: src }}
            style={[styles.thumbnail, { aspectRatio }]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={handleClose}
          >
            <Ionicons name="close-circle" size={32} color="#fff" />
          </TouchableOpacity>

          <View style={styles.imageWrapper}>
            {loading && (
              <ActivityIndicator
                size="large"
                color="#fff"
                style={styles.loading}
              />
            )}
            <Image
              source={{ uri: src }}
              style={[
                styles.fullImage,
                { aspectRatio, maxHeight: SCREEN_HEIGHT },
              ]}
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  defaultContainer: {
    overflow: "hidden", // Evita que la imagen sobrepase los bordes redondeados
  },
  thumbnail: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "black", // Fondo sólido para mejor contraste
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
  },
  loading: {
    position: "absolute",
    zIndex: 1,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    padding: 10, // Área de toque más grande (UX)
  },
});
