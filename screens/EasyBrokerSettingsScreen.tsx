/**
 * EasyBrokerSettingsScreen.tsx - REFACTORIZADO
 *
 * FIXES:
 * - Limpieza correcta de suscripciones Realtime
 * - Eliminado polling agresivo (era 28,800 requests/día)
 * - Mejor manejo de estados de sincronización
 * - Código más modular y limpio
 * - Mensajes mejorados para duplicados
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { COLORS } from "../constants/colors";
import { AppHeader } from "../components/AppHeader";
import { useAuth } from "../context/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ScreenWrapper } from "./ScreenWrapper";

interface SyncHistory {
  id: string;
  fecha: string;
  propiedades_procesadas: number;
  propiedades_nuevas: number;
  propiedades_actualizadas: number;
  errores: number;
  mensaje_error: string | null;
  status: string;
}

interface Stats {
  total: number;
  lastSync: string | null;
  nuevas: number;
  actualizadas: number;
}

const EasyBrokerSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Estados
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    lastSync: null,
    nuevas: 0,
    actualizadas: 0,
  });
  const [history, setHistory] = useState<SyncHistory[]>([]);

  // Refs para control de suscripciones
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Cargar datos iniciales
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Cargar config
      const { data: config } = await supabase.rpc("obtener_config_easybroker");

      if (config?.success) {
        setHasApiKey(config.tiene_api_key);

        if (config.data) {
          setStats({
            total: config.data.total_propiedades_sincronizadas || 0,
            lastSync: config.data.ultima_sincronizacion,
            nuevas: 0,
            actualizadas: 0,
          });

          if (config.data.sincronizacion_en_progreso) {
            setSyncing(true);
          }
        }
      }

      // Cargar historial
      const { data: historial } = await supabase.rpc(
        "obtener_historial_sincronizaciones",
        { p_limit: 5 },
      );

      if (historial?.success && historial.data) {
        const filtered = historial.data.filter(
          (item: SyncHistory) =>
            item.status === "completada" || item.status === "error",
        );
        setHistory(filtered);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Limpiar canal Realtime
   */
  const cleanupChannel = async () => {
    if (channelRef.current) {
      console.log("🧹 Cleaning up sync subscription");
      try {
        await supabase.removeChannel(channelRef.current);
      } catch (err) {
        console.warn("⚠️ Error removing sync channel:", err);
      }
      channelRef.current = null;
    }
  };

  /**
   * Configurar suscripción Realtime solo cuando está sincronizando
   */
  const setupSyncSubscription = async () => {
    if (!user?.id) return;

    // Limpiar suscripción anterior si existe
    await cleanupChannel();

    console.log("📡 Setting up sync subscription");

    const channel = supabase
      .channel(`sync-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sincronizaciones_easybroker",
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const sync = payload.new;
          console.log("📨 Sync update received:", sync.status);

          if (sync.status === "completada") {
            setSyncing(false);
            loadInitialData();

            const mensaje =
              sync.propiedades_nuevas === 0 &&
              sync.propiedades_actualizadas === 0
                ? "No hay cambios. Tus propiedades ya están sincronizadas."
                : `${sync.propiedades_nuevas} nuevas, ${sync.propiedades_actualizadas} actualizadas`;

            Alert.alert("🎉 Sincronización completada", mensaje, [
              { text: "Genial", style: "default" },
            ]);
          } else if (sync.status === "error") {
            setSyncing(false);
            loadInitialData();

            const errorMsg =
              sync.mensaje_error || "Hubo un problema en la sincronización";
            Alert.alert("Error en sincronización", errorMsg);
          }
        },
      )
      .subscribe((status) => {
        console.log("📡 Sync subscription status:", status);
      });

    channelRef.current = channel;
  };

  /**
   * Effect: Cargar datos iniciales
   */
  useEffect(() => {
    isMountedRef.current = true;
    loadInitialData();

    return () => {
      isMountedRef.current = false;
      cleanupChannel();
    };
  }, []);

  /**
   * Effect: Configurar/limpiar suscripción según estado de sincronización
   */
  useEffect(() => {
    if (syncing && user?.id) {
      setupSyncSubscription();
    } else {
      cleanupChannel();
    }

    return () => {
      cleanupChannel();
    };
  }, [syncing, user?.id]);

  /**
   * Guardar API Key y sincronizar
   */
  const handleSaveAndSync = async () => {
    if (!apiKey.trim()) {
      Alert.alert("Oops", "Ingresa tu API Key de EasyBroker");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc("guardar_api_key_easybroker", {
        p_api_key: apiKey.trim(),
      });

      if (error) throw error;

      if (data?.success) {
        setHasApiKey(true);
        setApiKey("");

        // Sincronizar automáticamente
        setTimeout(() => {
          handleSync();
        }, 500);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo guardar la API Key");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Iniciar sincronización
   */
  const handleSync = async () => {
    if (syncing) return;

    try {
      setSyncing(true);

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { error } = await supabase.functions.invoke(
        "sincronizar-easybroker",
        {
          body: { usuario_id: currentUser.id },
        },
      );

      if (error) {
        throw error;
      }

      // La suscripción Realtime manejará las actualizaciones
    } catch (error: any) {
      setSyncing(false);
      Alert.alert("Error", "No se pudo iniciar la sincronización");
      console.error("Error starting sync:", error);
    }
  };

  /**
   * Formatear fecha relativa
   */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Hace un momento";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;

    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="EasyBroker"
          showBackButton
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  // Vista de onboarding (sin API key)
  if (!hasApiKey) {
    return (
      <ScreenWrapper withHeader={false} style={styles.container}>
        <AppHeader
          title="EasyBroker"
          showBackButton
          onBack={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.onboardingContainer}>
          <View style={styles.onboardingContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="cloud-upload" size={48} color={COLORS.primary} />
            </View>

            <Text style={styles.onboardingTitle}>
              Sincroniza tus propiedades
            </Text>

            <Text style={styles.onboardingSubtitle}>
              Conecta tu cuenta de EasyBroker para importar automáticamente
              todas tus propiedades publicadas
            </Text>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={COLORS.success}
                />
                <Text style={styles.benefitText}>
                  Sincronización automática
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={COLORS.success}
                />
                <Text style={styles.benefitText}>
                  Actualización en tiempo real
                </Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={COLORS.success}
                />
                <Text style={styles.benefitText}>100% seguro</Text>
              </View>
            </View>
          </View>

          <View style={styles.onboardingForm}>
            <Text style={styles.inputLabel}>API Key de EasyBroker</Text>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Pega tu API Key aquí"
                value={apiKey}
                onChangeText={setApiKey}
                secureTextEntry={!showApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={COLORS.textTertiary}
              />
              <TouchableOpacity
                style={styles.inputIcon}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Ionicons
                  name={showApiKey ? "eye-off" : "eye"}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSaveAndSync}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    Conectar y Sincronizar
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.white}
                  />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpButton}>
              <Ionicons
                name="help-circle-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.helpText}>¿Dónde encuentro mi API Key?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // Vista principal (con API key configurada)
  return (
    <View style={styles.container}>
      <AppHeader
        title="EasyBroker"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats principales */}
        <View style={styles.headerStats}>
          <View style={styles.mainStatCard}>
            <Text style={styles.mainStatLabel}>Propiedades sincronizadas</Text>
            <Text style={styles.mainStatValue}>{stats.total}</Text>
            <Text style={styles.mainStatSubtext}>
              {stats.lastSync
                ? `Última vez ${formatDate(stats.lastSync)}`
                : "Nunca sincronizado"}
            </Text>
          </View>
        </View>

        {/* Estado de sincronización */}
        {syncing ? (
          <View style={styles.syncingCard}>
            <View style={styles.syncingHeader}>
              <View style={styles.syncingDot} />
              <Text style={styles.syncingTitle}>Sincronizando...</Text>
            </View>

            <Text style={styles.syncingDescription}>
              Estamos importando tus propiedades desde EasyBroker. Puedes salir
              de esta pantalla, te avisaremos cuando termine.
            </Text>

            <View style={styles.syncingProgress}>
              <View style={styles.progressBarBg}>
                <View style={styles.progressBarAnimated} />
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
            <Ionicons name="sync-outline" size={24} color={COLORS.white} />
            <View style={styles.syncButtonContent}>
              <Text style={styles.syncButtonTitle}>Sincronizar ahora</Text>
              <Text style={styles.syncButtonSubtitle}>
                Importar propiedades de EasyBroker
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {/* Historial */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>
              Sincronizaciones recientes
            </Text>

            {history.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <View
                    style={[
                      styles.historyStatusDot,
                      item.status === "completada"
                        ? styles.statusDotSuccess
                        : styles.statusDotError,
                    ]}
                  />
                  <Text style={styles.historyDate}>
                    {formatDate(item.fecha)}
                  </Text>
                </View>

                <View style={styles.historyStats}>
                  {item.propiedades_nuevas > 0 && (
                    <View style={styles.historyStatItem}>
                      <Text style={styles.historyStatValue}>
                        {item.propiedades_nuevas}
                      </Text>
                      <Text style={styles.historyStatLabel}>nuevas</Text>
                    </View>
                  )}
                  {item.propiedades_actualizadas > 0 && (
                    <View style={styles.historyStatItem}>
                      <Text style={styles.historyStatValue}>
                        {item.propiedades_actualizadas}
                      </Text>
                      <Text style={styles.historyStatLabel}>actualizadas</Text>
                    </View>
                  )}
                  {item.errores > 0 && (
                    <View style={styles.historyStatItem}>
                      <Text
                        style={[
                          styles.historyStatValue,
                          { color: COLORS.error },
                        ]}
                      >
                        {item.errores}
                      </Text>
                      <Text style={styles.historyStatLabel}>errores</Text>
                    </View>
                  )}
                  {item.propiedades_nuevas === 0 &&
                    item.propiedades_actualizadas === 0 &&
                    item.errores === 0 && (
                      <Text style={styles.noChangesText}>Sin cambios</Text>
                    )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Configuración */}
        <View style={styles.settingsSection}>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setHasApiKey(false)}
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
    </View>
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

  // Onboarding
  onboardingContainer: {
    flexGrow: 1,
    padding: 24,
  },
  onboardingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  onboardingTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  onboardingSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  onboardingForm: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 16,
    paddingRight: 50,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },

  // Main content
  mainContent: {
    flex: 1,
  },
  headerStats: {
    padding: 24,
    paddingBottom: 16,
  },
  mainStatCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  mainStatLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
    fontWeight: "500",
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
  },
  mainStatSubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },

  syncingCard: {
    backgroundColor: "#FFF3E0",
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  syncingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  syncingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF9800",
  },
  syncingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#E65100",
  },
  syncingDescription: {
    fontSize: 14,
    color: "#BF360C",
    lineHeight: 20,
    marginBottom: 16,
  },
  syncingProgress: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#FFE0B2",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarAnimated: {
    height: "100%",
    width: "100%",
    backgroundColor: "#FF9800",
  },

  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  syncButtonContent: {
    flex: 1,
  },
  syncButtonTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 2,
  },
  syncButtonSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },

  historySection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  historyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  historyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotSuccess: {
    backgroundColor: COLORS.success,
  },
  statusDotError: {
    backgroundColor: COLORS.error,
  },
  historyDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  historyStats: {
    flexDirection: "row",
    gap: 20,
  },
  historyStatItem: {
    alignItems: "center",
  },
  historyStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  historyStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noChangesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: "italic",
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
