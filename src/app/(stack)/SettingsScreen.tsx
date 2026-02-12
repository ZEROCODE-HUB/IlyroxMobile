import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import EditProfile from "@/components/Profile/EditProfile";
import { useModal } from "@/context/ModalContext";

import { router } from "expo-router";
import Constants from "expo-constants";
import { ScreenWrapper } from "@/screens/ScreenWrapper";

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
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
          console.log("🚀 Iniciando cierre de sesión desde Settings...");
          await signOut();
          console.log("✨ Proceso de cierre de sesión completado.");
        } catch (error) {
          console.error("❌ Error en performLogout:", error);
          showModal({
            title: "Error",
            message: "No se pudo cerrar sesión. Inténtalo de nuevo.",
            confirmText: "OK",
          });
        }
      },
    });
  };

  const [showEditProfile, setShowEditProfile] = React.useState(false);

  const settingsOptions = [
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
      id: "logout",
      title: "Cerrar sesión",
      icon: "log-out-outline",
      onPress: handleLogout,
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
        onBack={() => navigation.goBack()}
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
                    option.id === "logout" && {
                      backgroundColor: COLORS.errorLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={22}
                    color={option.color || COLORS.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.optionTitle,
                    option.id === "logout" && { color: COLORS.error },
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
