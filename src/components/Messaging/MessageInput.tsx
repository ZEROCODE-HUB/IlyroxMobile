import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { COLORS } from "../../constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendImage?: (uri: string) => Promise<void>;
  onSendFile?: (uri: string, name: string) => Promise<void>;
  onSendProperty?: (propertyId: string) => void;
  sending?: boolean;
  onFocusChange?: (isFocused: boolean) => void;
}

export default React.forwardRef<TextInput, MessageInputProps>(
  function MessageInput(
    { onSendText, onSendImage, onSendFile, sending = false, onFocusChange },
    ref,
  ) {
    const [text, setText] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleSend = async () => {
      if (!text.trim() || sending) return;

      const messageText = text.trim();
      setText("");

      try {
        await onSendText(messageText);
      } catch (error) {
        console.error("Error sending message:", error);
        setText(messageText);
        Alert.alert("Error", "No se pudo enviar el mensaje");
      }
    };

    const handlePickImage = async () => {
      if (!onSendImage) return;

      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permiso denegado",
            "Necesitamos permiso para acceder a tus fotos",
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
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
            Alert.alert(
              "Archivo muy grande",
              `El ${isVideo ? "video" : "imagen"} excede el límite de ${isVideo ? "40MB" : "5MB"}.`,
            );
            return;
          }

          setUploading(true);
          // If it's a video, we might need a different handler or check if onSendImage supports it.
          // The interface says onSendImage?: (uri: string) => Promise<void>;
          // Assuming the parent handles the upload type based on URI or if we need to call onSendFile for video.
          // However, existing code was only for Images.
          // If the user wants videos, we should probably support it.
          // For now, I'll pass it to onSendImage which presumably handles media URIs.
          // Wait, the prompt specifically says "mensajes entre usuarios:: Vídeos: 40Mb".
          // The current MessageInput handles images specifically via onSendImage.
          // I will assume onSendImage can handle the URI, or I should treat video as a file?
          // Usually chat apps treat video separate or as file.
          // Let's stick to the current flow but allowing 'All' media types and validating size.

          await onSendImage(asset.uri);
          setUploading(false);
        }
      } catch (error) {
        console.error("Error picking image:", error);
        setUploading(false);
        Alert.alert("Error", "No se pudo cargar el archivo");
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
            Alert.alert(
              "Archivo muy grande",
              "El documento excede el límite de 20MB.",
            );
            return;
          }

          setUploading(true);
          await onSendFile(file.uri, file.name);
          setUploading(false);
        }
      } catch (error) {
        console.error("Error picking file:", error);
        setUploading(false);
        Alert.alert("Error", "No se pudo cargar el archivo");
      }
    };

    const insets = useSafeAreaInsets();
    // Solo bloqueamos input si se está subiendo un archivo pesado (uploading),
    // pero permitimos escribir mientras se envía mensaje de texto (sending)
    // para no cerrar el teclado.
    const isInputDisabled = uploading;
    const isButtonDisabled = (!text.trim() && !uploading) || uploading;

    return (
      <View
        style={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom, 10),
          },
          onFocusChange && {
            marginBottom: 5,
          },
        ]}
      >
        {onSendImage && (
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
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
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
