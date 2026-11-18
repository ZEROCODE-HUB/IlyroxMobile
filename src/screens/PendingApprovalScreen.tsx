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

const POLL_INTERVAL_MS = 30_000;

export default function PendingApprovalScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { showModal } = useModal();
  const [refreshing, setRefreshing] = useState(false);

  const recibidas = profile?.aprobaciones_recibidas || 0;
  const requeridas = profile?.aprobaciones_requeridas || 3;

  const inFlightRef = useRef(false);

  const syncProfile = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await refreshProfile();
    } finally {
      inFlightRef.current = false;
    }
  }, [refreshProfile]);

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
        () => { syncProfile(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    padding: 24,
  },
  refreshHint: {
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -32,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryTransparent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  progressCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
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
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  waitText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  waitBold: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  whenTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 24,
  },
  signOutText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
