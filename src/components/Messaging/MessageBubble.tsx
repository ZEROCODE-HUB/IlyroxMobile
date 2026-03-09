/**
 * MessageBubble.tsx
 * Componente de burbuja de mensaje individual
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Pressable,
  Modal,
  Dimensions,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import { ViewImage } from "../modals/ViewImage";
import VideoPlayer from "../shared/VideoPlayer";

interface MessageBubbleProps {
  message: {
    id: string;
    contenido: string | null;
    tipo: "texto" | "imagen" | "archivo" | "propiedad";
    imagen_url: string | null;
    archivo_url: string | null;
    archivo_nombre: string | null;
    created_at: string;
  };
  isMe: boolean;
  showTime?: boolean;
}

export default function MessageBubble({
  message,
  isMe,
  showTime = true,
}: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const [isFullScreen, setIsFullScreen] = useState(false);
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
    Dimensions.get("window");

  const isVideo = (url: string | null) => {
    if (!url) return false;
    return /\.(mp4|mov|avi|m4v|mkv|webm)$/i.test(url);
  };

  const handleOpenFile = () => {
    if (message.archivo_url) {
      Linking.openURL(message.archivo_url);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.containerMe : styles.containerOther,
      ]}
    >
      <View
        style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
      >
        {/* Mensaje de texto */}
        {message.tipo === "texto" && message.contenido && (
          <Text style={[styles.text, isMe ? styles.textMe : styles.textOther]}>
            {message.contenido}
          </Text>
        )}

        {/* Mensaje con imagen */}
        {message.tipo === "imagen" && message.imagen_url && (
          <View style={styles.imageContainer}>
            {isVideo(message.imagen_url) ? (
              <View style={styles.videoWrapper}>
                <VideoPlayer
                  videoUrl={message.imagen_url}
                  isVisible={true}
                  aspectRatio={1}
                  contentFit="cover"
                  showControls={false}
                  showTimeline={false}
                  showPlayIcon={false}
                  autoPlay={false}
                  isMuted={true}
                />
                <View style={styles.playOverlay}>
                  <Ionicons
                    name="play-circle"
                    size={48}
                    color="rgba(255,255,255,0.8)"
                  />
                </View>
                <Pressable
                  onPress={() => setIsFullScreen(true)}
                  style={StyleSheet.absoluteFillObject}
                />

                <Modal
                  visible={isFullScreen}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setIsFullScreen(false)}
                >
                  <View style={styles.fullScreenContainer}>
                    <SafeAreaView style={styles.safeArea}>
                      <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsFullScreen(false)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={32}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>
                    </SafeAreaView>
                    <View style={styles.fullScreenVideoWrapper}>
                      <VideoPlayer
                        videoUrl={message.imagen_url}
                        isVisible={isFullScreen}
                        aspectRatio={SCREEN_WIDTH / SCREEN_HEIGHT}
                        contentFit="contain"
                        showControls={true}
                        autoPlay={true}
                        isMuted={false}
                      />
                    </View>
                  </View>
                </Modal>
              </View>
            ) : (
              <ViewImage
                src={message.imagen_url}
                containerStyle={{ width: "auto", height: "auto" }}
                imageStyle={styles.image}
              />
            )}
            {message.contenido && message.contenido !== "📷 Imagen" && (
              <Text
                style={[
                  styles.text,
                  isMe ? styles.textMe : styles.textOther,
                  styles.caption,
                ]}
              >
                {message.contenido}
              </Text>
            )}
          </View>
        )}

        {/* Mensaje con archivo */}
        {message.tipo === "archivo" && message.archivo_url && (
          <TouchableOpacity
            style={styles.fileContainer}
            onPress={handleOpenFile}
          >
            <View
              style={[
                styles.fileIcon,
                {
                  backgroundColor: isMe
                    ? COLORS.whiteTransparent20
                    : COLORS.primaryTransparent,
                },
              ]}
            >
              <Ionicons
                name="document-attach"
                size={24}
                color={isMe ? COLORS.white : COLORS.primary}
              />
            </View>
            <View style={styles.fileInfo}>
              <Text
                style={[
                  styles.fileName,
                  isMe ? styles.textMe : styles.textOther,
                ]}
              >
                {message.archivo_nombre || "Archivo"}
              </Text>
              <Text
                style={[
                  styles.fileAction,
                  isMe ? styles.textMe : styles.textOther,
                ]}
              >
                Toca para abrir
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Timestamp */}
        {showTime && (
          <Text style={[styles.time, isMe ? styles.timeMe : styles.timeOther]}>
            {formatTime(message.created_at)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    flexDirection: "row",
  },
  containerMe: {
    justifyContent: "flex-end",
  },
  containerOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  textMe: {
    color: COLORS.white,
  },
  textOther: {
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
  },
  timeMe: {
    color: COLORS.whiteTransparent70,
    textAlign: "right",
  },
  timeOther: {
    color: COLORS.textTertiary,
  },
  imageContainer: {
    gap: 8,
  },
  videoWrapper: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  fullScreenVideoWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 16,
    marginTop: 16,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  caption: {
    marginTop: 4,
  },
  fileContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 40,
    width: 200,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  fileAction: {
    fontSize: 11,
    opacity: 0.7,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: 12,
  },
});
