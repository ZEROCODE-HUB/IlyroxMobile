/**
 * ProfileAvatarPicker.tsx
 * Avatar con funcionalidad de cambio de foto para el perfil
 */

import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../constants/colors";
import { Avatar } from "../shared";
import { ViewImage } from "../modals/ViewImage";

interface ProfileAvatarPickerProps {
  uri?: string;
  name: string;
  size?: number;
  userId: string;
  isOwnProfile: boolean;
  onPhotoUpdated?: (newUrl: string) => void;
}

const ProfileAvatarPicker: React.FC<ProfileAvatarPickerProps> = React.memo(
  ({ uri, name, size = 100, userId, isOwnProfile, onPhotoUpdated }) => {
    const [uploading, setUploading] = useState(false);
    const [openModal, setOpenModal] = useState(false);

    const handleImagePick = async () => {
      if (!isOwnProfile) return;

      try {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permiso denegado",
            "Se requiere acceso a la galería para cambiar la foto.",
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const imageUri = result.assets[0].uri;
          await uploadImage(imageUri);
        }
      } catch (error) {
        console.error("Error picking image:", error);
        Alert.alert("Error", "No se pudo seleccionar la imagen");
      }
    };

    const uploadImage = async (imageUri: string): Promise<void> => {
      try {
        setUploading(true);

        const fileName = `avatar_${userId}_${Date.now()}.jpg`;
        const filePath = `avatars/${fileName}`;

        let fileBody: string | Blob | ArrayBuffer;

        if (Platform.OS === "web") {
          const response = await fetch(imageUri);
          fileBody = await response.blob();
        } else {
          const { readAsStringAsync } = require("expo-file-system/legacy");
          const base64 = await readAsStringAsync(imageUri, {
            encoding: "base64",
          });
          fileBody = decode(base64);
        }

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("feed-images")
          .upload(filePath, fileBody, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from("feed-images")
          .getPublicUrl(filePath);

        const publicUrl = data.publicUrl;

        // Update profile in database
        const { error: updateError } = await supabase
          .from("perfiles")
          .update({ foto: publicUrl })
          .eq("id", userId);

        if (updateError) throw updateError;

        // Notify parent component
        if (onPhotoUpdated) {
          onPhotoUpdated(publicUrl);
        }

        Alert.alert("Éxito", "Foto de perfil actualizada correctamente");
      } catch (error: any) {
        console.error("Error uploading image:", error);
        Alert.alert("Error", error.message || "No se pudo subir la imagen");
      } finally {
        setUploading(false);
      }
    };

    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <TouchableOpacity
          onPress={handleImagePick}
          disabled={uploading || !isOwnProfile}
          activeOpacity={isOwnProfile ? 0.8 : 1}
          onLongPress={() => setOpenModal(true)}
          style={{ width: size, height: size }}
        >
          <Avatar uri={uri} name={name} size={size} style={styles.avatar} />

          {isOwnProfile && (
            <View
              style={[
                styles.editBadge,
                {
                  width: size * 0.32,
                  height: size * 0.32,
                  borderRadius: 50,
                },
              ]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons
                  name="camera"
                  size={size * 0.16}
                  color={COLORS.white}
                />
              )}
            </View>
          )}
        </TouchableOpacity>

        <ViewImage
          src={uri}
          isVisibleAuto={openModal}
          onClose={() => setOpenModal(false)}
          showThumbnail={false}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default ProfileAvatarPicker;
