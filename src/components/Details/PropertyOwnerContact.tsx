import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import SafePressable from "@/design-system/components/SafePressable";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "@/constants";
import { useModal } from "@/context/ModalContext";
import { Avatar } from "../shared";
import { OwnerRecommendations } from "./OwnerRecommendations";
import { propertyDetailStyles as styles } from "./propertyDetailStyles";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";

export interface PropertyOwnerContactProps {
  profile: any;
  propertyId: string;
  currentUserId?: string;
  sinDatos?: boolean;
  loadingEdit: boolean;
  onContactExternal?: (ownerId: string, propertyId: string) => void;
  onContactInternal: (profile: any) => void;
  onEditProperty: () => void;
  /** Ejecuta una navegación cerrando antes el <Modal> contenedor, si lo hay.
      Ver `navigateAway` en PropertyDetail. Sin él se navega directo. */
  onNavigateAway?: (go: () => void) => void;
}

export const PropertyOwnerContact: React.FC<PropertyOwnerContactProps> = ({
  profile,
  propertyId,
  currentUserId,
  sinDatos,
  loadingEdit,
  onContactExternal,
  onContactInternal,
  onEditProperty,
  onNavigateAway,
}) => {
  const { showModal } = useModal();
  const navigate = onNavigateAway ?? ((go: () => void) => go());
  const [showContactSheet, setShowContactSheet] = useState(false);

  if (sinDatos || !profile) return null;

  const isOwnProperty = currentUserId === profile.id;

  const handleContactOwner = () => {
    if (onContactExternal) {
      onContactExternal(profile.id, propertyId);
      return;
    }
    onContactInternal(profile);
  };

  const handleProfilePress = () => {
    if (!profile?.id) return;
    navigate(() =>
      router.push({
        pathname: "/(stack)/user/[id]",
        params: { id: profile.id },
      }),
    );
  };

  const handleCall = () => {
    const phone = `${profile.prefijo_celular || ""}${profile.celular || ""}`;
    if (phone && phone.trim().length > 0) {
      Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
      return;
    }
    showModal({
      title: "Sin número de contacto",
      message:
        "Este usuario no cuenta con un número registrado para llamadas directas.",
      confirmText: "OK",
    });
  };

  const handleWhatsApp = () => {
    setShowContactSheet(false);
    const phone = `${profile.prefijo_celular || ""}${profile.celular || ""}`.replace(/\s/g, "");
    if (phone && phone.length > 0) {
      Linking.openURL(`https://wa.me/${phone}`);
    } else {
      showModal({
        title: "Sin número de contacto",
        message:
          "Este usuario no cuenta con un número registrado para mensajes de WhatsApp.",
        confirmText: "OK",
      });
    }
  };

  const handleContactSheetCall = () => {
    setShowContactSheet(false);
    handleCall();
  };

  const openContactSheet = () => {
    setShowContactSheet(true);
  };

  return (
    <>
      <SafePressable
        style={styles.profileSection}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <Avatar
          uri={profile.foto}
          name={profile.nombre}
          size={50}
          style={styles.profileFoto}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.nombre}</Text>
          <Text style={styles.profileRole}>Agente Inmobiliario</Text>
          <OwnerRecommendations
            userId={profile.id}
            ocupacion={profile.ocupacion}
          />
        </View>

        {!isOwnProperty && (
          <TouchableOpacity
            style={styles.contactIconBtn}
            onPress={handleContactOwner}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={24}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        )}
      </SafePressable>

      {isOwnProperty ? (
        <TouchableOpacity
          style={[styles.mainContactBtn, { backgroundColor: COLORS.info }]}
          onPress={onEditProperty}
        >
          {loadingEdit ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons
                name="pencil"
                size={20}
                color={COLORS.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.mainContactBtnText}>Editar Propiedad</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.mainContactBtn} onPress={openContactSheet}>
          <Ionicons
            name="call"
            size={20}
            color={COLORS.white}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.mainContactBtnText}>Contactar ahora</Text>
        </TouchableOpacity>
      )}

      <AppBottomSheet visible={showContactSheet} onClose={() => setShowContactSheet(false)}>
        <View style={contactSheetStyles.container}>
          <Text style={contactSheetStyles.title}>Contactar ahora</Text>

          <TouchableOpacity style={contactSheetStyles.option} onPress={handleWhatsApp}>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={contactSheetStyles.optionText}>Mandar mensaje por WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={contactSheetStyles.option} onPress={handleContactSheetCall}>
            <Ionicons name="call" size={24} color={COLORS.primary} />
            <Text style={contactSheetStyles.optionText}>Llamar ahora</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={contactSheetStyles.cancelBtn}
            onPress={() => setShowContactSheet(false)}
          >
            <Text style={contactSheetStyles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </>
  );
};

const contactSheetStyles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.black,
    textAlign: "center",
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 16,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
