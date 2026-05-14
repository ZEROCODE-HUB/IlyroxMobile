/**
 * EasyBrokerSettingsScreen.tsx - REFACTORIZADO
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { useEasyBroker } from "@/hooks/useEasyBroker";
import { EasyBrokerOnboarding } from "@/components/easy-broker/EasyBrokerOnboarding";
import { EasyBrokerStats } from "@/components/easy-broker/EasyBrokerStats";
import { EasyBrokerSyncStatus } from "@/components/easy-broker/EasyBrokerSyncStatus";
import { EasyBrokerHistory } from "@/components/easy-broker/EasyBrokerHistory";

const EasyBrokerSettingsScreen: React.FC = () => {
  const {
    apiKey,
    setApiKey,
    hasApiKey,
    loading,
    syncing,
    syncProgress,
    stats,
    history,
    handleSaveAndSync,
    handleSync,
    changeApiKey,
  } = useEasyBroker();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback a Home si no hay historial
      router.replace("/(tabs)");
    }
  };

  if (loading) {
    return (
      <ScreenWrapper withHeader={false} style={styles.container}>
        <AppHeader
          title="EasyBroker"
          showBackButton
          onBack={handleBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  // Vista de onboarding (sin API key)
  if (!hasApiKey) {
    return (
      <ScreenWrapper withHeader={false} style={styles.container}>
        <AppHeader
          title="EasyBroker"
          showBackButton
          onBack={handleBack}
        />
        <EasyBrokerOnboarding
          apiKey={apiKey}
          setApiKey={setApiKey}
          onSave={handleSaveAndSync}
          loading={loading}
        />
      </ScreenWrapper>
    );
  }

  // Vista principal (con API key configurada)
  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="EasyBroker"
        showBackButton
        onBack={handleBack}
      />

      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        <EasyBrokerStats stats={stats} />

        <EasyBrokerSyncStatus syncing={syncing} syncProgress={syncProgress} onSync={handleSync} />

        <EasyBrokerHistory history={history} />

        {/* Configuración */}
        <View style={styles.settingsSection}>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={changeApiKey}
          >
            <Ionicons
              name="key-outline"
              size={20}
              color={COLORS.textSecondary}
            />
            <Text style={styles.settingsItemText}>Cambiar API Key</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
  },
  settingsSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  settingsItemText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
});

export default EasyBrokerSettingsScreen;
