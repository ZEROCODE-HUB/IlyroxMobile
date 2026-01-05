import React, { useState } from "react";
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
  // Estilo para el contenedor exterior (donde se posiciona en tu layout)
  containerStyle?: any;
  // Estilo específico para la imagen miniatura (bordes, ratio, etc.)
  imageStyle?: any;
}

export function ViewImage({
  src,
  containerStyle,
  imageStyle,
}: ViewImageProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!src) return null;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setVisible(true)}
        // El contenedor maneja el posicionamiento
        style={[styles.defaultContainer, containerStyle]}
      >
        <Image
          source={{ uri: src }}
          // La imagen llena el contenedor respetando sus propios bordes
          style={[styles.thumbnail, imageStyle]}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Botón de cerrar con área de toque mejorada */}
          <TouchableOpacity
            style={[styles.closeButton, { top: insets.top + 10 }]}
            onPress={() => setVisible(false)}
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
              style={styles.fullImage}
              // 'contain' es vital para que la imagen completa nunca se corte
              resizeMode="contain"
              onLoadEnd={() => setLoading(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  defaultContainer: {
    overflow: 'hidden', // Evita que la imagen sobrepase los bordes redondeados
  },
  thumbnail: {
    width: "100%",
    height: "100%", // Obligamos a que llene el espacio que le asigne el padre
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
    height: "100%",
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