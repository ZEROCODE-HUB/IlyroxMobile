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
          <Ionicons name="hourglass-outline" size={60} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>Aprobación Pendiente</Text>
        <Text style={styles.description}>
          Tu cuenta está siendo revisada por la comunidad. Necesitas completar las aprobaciones para acceder a todas las funciones.
        </Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{recibidas}</Text>
            <Text style={styles.statLabel}>Recibidas</Text>
          </View>
          <View style={[styles.statItem, styles.statItemHighlight]}>
            <Text style={styles.statValue}>{faltantes}</Text>
            <Text style={styles.statLabel}>Faltantes</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {recibidas} de {requeridas} aprobaciones
          </Text>
        </View>

        <Text style={styles.refreshHint}>
          Esta pantalla se actualiza sola. Desliza hacia abajo para comprobarlo ahora.
        </Text>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => {
            showModal({
              title: "Cerrar Sesión",
              message: "¿Estás seguro de que deseas cerrar sesión?",
              confirmText: "Cerrar Sesión",
              cancelText: "Cancelar",
              onConfirm: signOut
            });
          }}
        >
          <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  statItem: {
    backgroundColor: COLORS.white,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    minWidth: 120,
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
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
  progressContainer: {
    width: '100%',
    marginBottom: theme.spacing.xxl * 1.5,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: theme.typography.fontSizes.sm,
    textAlign: 'center',
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