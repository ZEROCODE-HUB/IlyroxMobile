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
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
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
      if (!onSendFile) return;

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

    const insets = useSafeAreaInsets();
    const isDisabled = sending || uploading;

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
            disabled={isDisabled}
          >
            <Ionicons
              name="image"
              size={24}
              color={isDisabled ? COLORS.textDisabled : COLORS.primary}
            />
          </TouchableOpacity>
        )}

        {onSendFile && (
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
          editable={!isDisabled}
        />

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
