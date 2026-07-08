import React, { ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import EditProfile from "@/components/Profile/EditProfile";
import { useModal } from "@/context/ModalContext";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { LEGAL_URLS } from "@/constants/legal";

import { router } from "expo-router";

type IoniconName = ComponentProps<typeof Ionicons>["name"];
import Constants from "expo-constants";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { logger } from "@/utils/logger";

const log = logger.scoped("SettingsScreen");

const SettingsScreen: React.FC = () => {
  const { signOut } = useAuth();
  const { showModal } = useModal();

  const handleLogout = () => {
    showModal({
      title: "Cerrar Sesión",
      message: "¿Estás seguro de que quieres cerrar sesión?",
      confirmText: "Cerrar Sesión",
      cancelText: "Cancelar",
      onConfirm: async () => {
        try {
          await signOut();
        } catch (error) {
          log.error("performLogout error:", error);
          showModal({
            title: "Error",
            message: "No se pudo cerrar sesión. Inténtalo de nuevo.",
            confirmText: "OK",
          });
        }
      },
    });
  };

  const openLegal = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch((error) => {
      log.error("openLegal error:", error);
    });
  };

  const performDeleteAccount = async () => {
    const { error } = await supabase.functions.invoke("eliminar-cuenta", {
      method: "POST",
    });
    if (error) {
      log.error("eliminar-cuenta error:", error);
      // El modal de confirmación se cierra al volver; mostramos el error después.
      setTimeout(() => {
        showModal({
          title: "Error",
          message:
            "No se pudo eliminar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
          confirmText: "OK",
          type: "alert",
        });
      }, 350);
      return;
    }
    // Cuenta eliminada: limpiar sesión local y volver al login.
    await signOut();
  };

  const handleDeleteAccount = () => {
    showModal({
      title: "Eliminar cuenta",
      message:
        "Esta acción es permanente. Se eliminarán tu perfil, propiedades, publicaciones, mensajes y toda tu información. No se puede deshacer.",
      confirmText: "Eliminar mi cuenta",
      cancelText: "Cancelar",
      confirmVariant: "danger",
      onConfirm: performDeleteAccount,
    });
  };

  const [showEditProfile, setShowEditProfile] = React.useState(false);

  const settingsOptions: { id: string; title: string; icon: IoniconName; onPress: () => void; color?: string; showChevron?: boolean }[] = [
    {
      id: "edit_profile",
      title: "Editar perfil",
      icon: "person-outline",
      onPress: () => {
        setShowEditProfile(true);
      },
    },
    {
      id: "easy_broker",
      title: "Easy Broker",
      icon: "business-outline",
      onPress: () => {
        router.push("/easy-broker");
      },
    },
    {
      id: "support",
      title: "Soporte",
      icon: "help-circle-outline",
      onPress: () => {
        router.push("/support");
      },
    },
    {
      id: "privacy",
      title: "Política de privacidad",
      icon: "shield-checkmark-outline",
      onPress: () => openLegal(LEGAL_URLS.privacy),
    },
    {
      id: "terms",
      title: "Términos y condiciones",
      icon: "document-text-outline",
      onPress: () => openLegal(LEGAL_URLS.terms),
    },
    {
      id: "logout",
      title: "Cerrar sesión",
      icon: "log-out-outline",
      onPress: handleLogout,
      color: COLORS.error,
      showChevron: false,
    },
    {
      id: "delete_account",
      title: "Eliminar cuenta",
      icon: "trash-outline",
      onPress: handleDeleteAccount,
      color: COLORS.error,
      showChevron: false,
    },
  ];

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Configuración"
        showBackButton={true}
        onBack={() => router.back()}
      />

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionItem}
              onPress={() => {
                option.onPress();
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={option.title}
            >
              <View style={styles.optionLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    option.color === COLORS.error && {
                      backgroundColor: COLORS.errorLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={option.color || COLORS.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.optionTitle,
                    option.color === COLORS.error && { color: COLORS.error },
                  ]}
                >
                  {option.title}
                </Text>
              </View>
              {option.showChevron !== false && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textTertiary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Versión {appVersion}</Text>
        </View>

      </ScrollView>

      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <EditProfile onBack={() => setShowEditProfile(false)} />
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  footer: {
    padding: 32,
    alignItems: "center",
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});

export default SettingsScreen;
