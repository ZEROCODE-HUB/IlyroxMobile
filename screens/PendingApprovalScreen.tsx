import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, DIMENSIONS } from '../constants';
import { theme } from '../design-system/theme';

export default function PendingApprovalScreen() {
  const { profile, signOut } = useAuth();

  const recibidas = profile?.aprobaciones_recibidas || 0;
  const requeridas = profile?.aprobaciones_requeridas || 3;
  const faltantes = Math.max(0, requeridas - recibidas);
  const progress = Math.min(100, (recibidas / requeridas) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
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

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
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