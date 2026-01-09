/**
 * MessageInput.tsx
 * Input simplificado: imagen | archivo | texto | enviar
 */

import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { COLORS } from "../../constants";
import { useStableSafeInsets } from "../../context/SafeInsetsContext";
import { Platform } from "react-native";

interface MessageInputProps {
  onSendText: (text: string) => Promise<void>;
  onSendImage: (uri: string) => Promise<void>;
  onSendFile: (uri: string, name: string) => Promise<void>;
  onSendProperty?: (propertyId: string) => void;
  sending?: boolean;
}

export default function MessageInput({
  onSendText,
  onSendImage,
  onSendFile,
  sending = false,
}: MessageInputProps) {
  const { bottom } = useStableSafeInsets();
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
      setText(messageText); // Restaurar texto si falla
      Alert.alert("Error", "No se pudo enviar el mensaje");
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos permiso para acceder a tus fotos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        await onSendImage(result.assets[0].uri);
        setUploading(false);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setUploading(false);
      Alert.alert("Error", "No se pudo cargar la imagen");
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
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

  const isDisabled = sending || uploading;

  // En Android APK, el bottom inset puede ser muy grande, limitamos a un máximo razonable
  // Cuando el teclado está visible, no necesitamos padding extra
  const paddingBottom =
    Platform.OS === "android" ? Math.min(bottom, 8) : bottom;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom },
        // En Android APK, asegurar que el input esté siempre visible
        Platform.OS === "android" && {
          backgroundColor: COLORS.white,

          zIndex: 1000,
        },
      ]}
    >
      {/* Botón de imagen */}
      <TouchableOpacity
        onPress={handlePickImage}
        style={styles.iconButton}
        disabled={isDisabled}
      >
        <Ionicons
          name="image"
          size={24}
          color={isDisabled ? COLORS.textDisabled : COLORS.primary}
        />
      </TouchableOpacity>

      {/* Botón de archivo */}
      <TouchableOpacity
        onPress={handlePickFile}
        style={styles.iconButton}
        disabled={isDisabled}
      >
        <Ionicons
          name="attach"
          size={24}
          color={isDisabled ? COLORS.textDisabled : COLORS.primary}
        />
      </TouchableOpacity>

      {/* Input de texto */}
      <TextInput
        style={styles.input}
        placeholder="Escribe un mensaje..."
        placeholderTextColor={COLORS.textTertiary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={1000}
        editable={!isDisabled}
      />

      {/* Botón de enviar */}
      <TouchableOpacity
        onPress={handleSend}
        style={[
          styles.sendButton,
          (!text.trim() || isDisabled) && styles.sendButtonDisabled,
        ]}
        disabled={!text.trim() || isDisabled}
      >
        {sending || uploading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Ionicons name="send" size={20} color={COLORS.white} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
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
