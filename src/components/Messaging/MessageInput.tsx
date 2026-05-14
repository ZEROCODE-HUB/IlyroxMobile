import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/context/ToastContext";
import { COLORS } from "../../constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { logger } from "@/utils/logger";

const log = logger.scoped("MessageInput");

export interface MessageInputProps {
  onSendText?: (text: string) => Promise<void>;
  onSendImage?: (uri: string) => Promise<void>;
  onSendFile?: (uri: string, name: string) => Promise<void>;
  onSendCombined?: (text: string, imageUri?: string) => Promise<void>;
  onSendProperty?: (propertyId: string) => void;
  sending?: boolean;
  onFocusChange?: (isFocused: boolean) => void;
  mediaType?: "All" | "Images" | "Videos";
}

export default React.forwardRef<TextInput, MessageInputProps>(
  function MessageInput(
    {
      onSendText,
      onSendImage,
      onSendFile,
      onSendCombined,
      sending = false,
      onFocusChange,
      mediaType = "All",
    },
    ref,
  ) {
    const { showModal } = useModal();
    const { showToast } = useToast();
    const [text, setText] = useState("");
    const [uploading, setUploading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const handleSend = async () => {
      if (sending) return;

      const messageText = text.trim();
      const imageToSend = selectedImage;

      if (!messageText && !imageToSend) return;

      setText("");
      setSelectedImage(null);
      setUploading(true);

      try {
        if (onSendCombined) {
          await onSendCombined(messageText, imageToSend || undefined);
        } else {
          if (messageText && onSendText) await onSendText(messageText);
          if (imageToSend && onSendImage) await onSendImage(imageToSend);
        }
      } catch (error) {
        log.error("Error sending message:", error);
        setText(messageText);
        setSelectedImage(imageToSend);
        showToast("No se pudo enviar el mensaje", "error");
      } finally {
        setUploading(false);
      }
    };

    const handlePickImage = async () => {
      if (!onSendImage && !onSendCombined) return;

      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          showModal({ title: "Permiso denegado", message: "Necesitamos permiso para acceder a tus fotos", confirmText: "OK" });
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes:
            mediaType === "All"
              ? ImagePicker.MediaTypeOptions.All
              : mediaType === "Videos"
                ? ImagePicker.MediaTypeOptions.Videos
                : ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];

          // Validate File Size
          const fileSize = asset.fileSize || 0;
          const isVideo = asset.type === "video";
          const limit = isVideo ? 40 * 1024 * 1024 : 5 * 1024 * 1024; // 40MB video, 5MB image

          if (fileSize > limit) {
            showModal({
              title: "Archivo muy grande",
              message: `El ${isVideo ? "video" : "imagen"} excede el límite de ${isVideo ? "40MB" : "5MB"}.`,
              confirmText: "OK",
            });
            return;
          }

          if (onSendCombined) {
            setSelectedImage(asset.uri);
          } else if (onSendImage) {
            setUploading(true);
            try {
              await onSendImage(asset.uri);
            } catch (error) {
              log.error("Error sending image directly:", error);
              showToast("No se pudo enviar la imagen", "error");
            } finally {
              setUploading(false);
            }
          }
        }
      } catch (error) {
        log.error("Error picking image:", error);
        setUploading(false);
        showToast("No se pudo cargar el archivo", "error");
      }
    };

    const handlePickFile = async () => {
      if (!onSendFile) return;

      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets[0]) {
          const file = result.assets[0];

          // Validate File Size
          const fileSize = file.size || 0;
          const limit = 20 * 1024 * 1024; // 20MB for files

          if (fileSize > limit) {
            showModal({ title: "Archivo muy grande", message: "El documento excede el límite de 20MB.", confirmText: "OK" });
            return;
          }

          setUploading(true);
          await onSendFile(file.uri, file.name);
          setUploading(false);
        }
      } catch (error) {
        log.error("Error picking file:", error);
        setUploading(false);
        showToast("No se pudo cargar el archivo", "error");
      }
    };

    const isVideoFile = (uri: string | null) => {
      if (!uri) return false;
      return /\.(mp4|mov|avi|m4v|mkv|webm)$/i.test(uri);
    };

    const insets = useSafeAreaInsets();
    // Solo bloqueamos input si se está subiendo un archivo pesado (uploading),
    // pero permitimos escribir mientras se envía mensaje de texto (sending)
    // para no cerrar el teclado.
    const isInputDisabled = uploading;
    const isButtonDisabled =
      (!text.trim() && !selectedImage && !uploading) || uploading;

    return (
      <View style={styles.outerContainer}>
        {selectedImage && (
          <View style={styles.previewContainer}>
            {isVideoFile(selectedImage) ? (
              <View
                style={[
                  styles.previewImage,
                  {
                    backgroundColor: COLORS.black,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Ionicons name="videocam" size={32} color={COLORS.white} />
              </View>
            ) : (
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />
            )}
            <TouchableOpacity
              onPress={() => setSelectedImage(null)}
              style={styles.removePreviewBtn}
            >
              <Ionicons name="close" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
        <View
          style={[
            styles.container,
            {
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          {(onSendImage || onSendCombined) && (
            <TouchableOpacity
              onPress={handlePickImage}
              style={styles.iconButton}
              disabled={uploading}
            >
              <Ionicons
                name="image"
                size={24}
                color={uploading ? COLORS.textDisabled : COLORS.primary}
              />
            </TouchableOpacity>
          )}

          {onSendFile && (
            <TouchableOpacity
              onPress={handlePickFile}
              style={styles.iconButton}
              disabled={uploading}
            >
              <Ionicons
                name="attach"
                size={24}
                color={uploading ? COLORS.textDisabled : COLORS.primary}
              />
            </TouchableOpacity>
          )}

          <TextInput
            ref={ref}
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={COLORS.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            editable={!isInputDisabled}
          />

          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              isButtonDisabled && styles.sendButtonDisabled,
            ]}
            disabled={isButtonDisabled || sending}
          >
            {sending || uploading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Ionicons name="send" size={20} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  previewContainer: {
    padding: 12,
    flexDirection: "row",
    position: "relative",
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePreviewBtn: {
    position: "absolute",
    top: 6,
    left: 80, // Next to the image
    backgroundColor: COLORS.error,
    padding: 4,
    borderRadius: 12,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  iconButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
});
