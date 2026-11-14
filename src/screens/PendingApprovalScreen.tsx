import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import { COLORS } from '../constants';
import { theme } from '../design-system/theme';

/**
 * Red de seguridad por si el canal realtime se cae o nunca conecta.
 * El camino normal es la suscripción a `perfiles`.
 */
const POLL_INTERVAL_MS = 30_000;

export default function PendingApprovalScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { showModal } = useModal();
  const [refreshing, setRefreshing] = useState(false);

  const recibidas = profile?.aprobaciones_recibidas || 0;
  const requeridas = profile?.aprobaciones_requeridas || 3;
  const faltantes = Math.max(0, requeridas - recibidas);
  const progress = Math.min(100, (recibidas / requeridas) * 100);

  // Evita solapar consultas: el sondeo, el foreground y el pull-to-refresh
  // pueden dispararse a la vez.
  const inFlightRef = useRef(false);

  const syncProfile = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      // Sin argumentos: invalida la caché y relee de la red.
      await refreshProfile();
    } finally {
      inFlightRef.current = false;
    }
  }, [refreshProfile]);

  // El perfil se cachea en memoria y el realtime global de `perfiles` está
  // desactivado, así que sin esto la pantalla nunca se enteraría de las nuevas
  // aprobaciones y el usuario tendría que cerrar sesión para verlas.
  useEffect(() => {
    syncProfile();

    const interval = setInterval(syncProfile, POLL_INTERVAL_MS);

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') syncProfile();
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [syncProfile]);

  // Aprobación instantánea: el trigger `update_aprobaciones_count` actualiza
  // `perfiles`, y este canal lo entrega al momento. Se relee el perfil de la
  // red en vez de usar `payload.new` porque la fila replicada puede no traer
  // todas las columnas según el REPLICA IDENTITY de la tabla.
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`pending-approval-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'perfiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          syncProfile();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, syncProfile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await syncProfile();
    setRefreshing(false);
  }, [syncProfile]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {profile?.foto ? (
            <Image
              source={{ uri: profile.foto }}
              style={{ width: 120, height: 120, borderRadius: 60 }}
              contentFit="cover"
              cachePolicy="none"
            />
          ) : (
            <Ionicons name="shield-checkmark-outline" size={48} color={COLORS.primary} />
          )}
        </View>

        <Text style={styles.title}>Solicitud enviada</Text>
        <Text style={styles.description}>
          ILYROX es exclusiva para asesores inmobiliarios.
        </Text>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>{recibidas} de {requeridas} aprobaciones</Text>
          <View style={styles.pillsRow}>
            {Array.from({ length: requeridas }).map((_, i) => (
              <View key={i} style={[styles.pill, i < recibidas ? styles.pillActive : styles.pillInactive]} />
            ))}
          </View>
        </View>

        <View style={styles.waitRow}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.primary} style={{ marginTop: 2 }} />
          <Text style={styles.waitText}>
            <Text style={styles.waitBold}>Por ahora, solo queda esperar.</Text>
            {' '}Te avisaremos cuando tu cuenta esté activa.
          </Text>
        </View>

        <Text style={styles.whenTitle}>Cuando se active tu cuenta</Text>
        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Ionicons name="search-outline" size={22} color={COLORS.primary} />
            <Text style={styles.featureText}>Busca propiedades por zona.</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="star-outline" size={22} color={COLORS.primary} />
            <Text style={styles.featureText}>Recibe matches para tus clientes.</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="layers-outline" size={22} color={COLORS.primary} />
            <Text style={styles.featureText}>Sincroniza tu inventario desde plataformas compatibles.</Text>
          </View>
        </View>

        <Text style={styles.refreshHint}>
          Esta pantalla se actualiza sola. Desliza hacia abajo para comprobarlo ahora.
        </Text>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            showModal({
              title: "Cerrar sesión",
              message: "¿Estás seguro de que deseas cerrar sesión?",
              confirmText: "Cerrar sesión",
              cancelText: "Cancelar",
              onConfirm: signOut
            });
          }}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  refreshHint: {
    color: COLORS.textTertiary,
    fontSize: theme.typography.fontSizes.xs,
    textAlign: 'center',
    marginTop: -theme.spacing.xxl,
    marginBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.full,
    backgroundColor: COLORS.primaryTransparent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: COLORS.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: theme.typography.fontSizes.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xxl,
  },
  statItemHighlight: {
    borderColor: COLORS.errorTransparent,
    backgroundColor: COLORS.errorTransparent,
  },
  statValue: {
    fontSize: theme.typography.fontSizes.xxl + 8,
    fontWeight: theme.typography.fontWeights.bold,
    color: COLORS.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.fontSizes.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  progressTitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: COLORS.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    width: 32,
    height: 8,
    borderRadius: 4,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
  },
  pillInactive: {
    backgroundColor: COLORS.backgroundDark,
  },
  waitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  waitText: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  waitBold: {
    fontWeight: theme.typography.fontWeights.semibold,
    color: COLORS.textPrimary,
  },
  whenTitle: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginBottom: theme.spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: theme.typography.fontSizes.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  signOutText: {
    color: COLORS.textSecondary,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
  },
});