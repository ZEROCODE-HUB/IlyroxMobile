import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import SafePressable from '@/design-system/components/SafePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/shared';
import { buildFeedItemNavigation } from '../../utils/notificationNavigation';
import {
  useNotificationHistory,
  groupNotificationsByDay,
  type NotificationSection,
} from '../../hooks/notifications/useNotificationHistory';
import { useNotifications } from '../../context/NotificationContext';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { COLORS } from '../../constants';
import { logger } from '@/utils/logger';

const log = logger.scoped("NotificationHistoryScreen");

export default function NotificationHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    notifications,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    error,
  } = useNotificationHistory({ userId: user?.id, pageSize: 30 });

  const { markAsRead } = useNotifications();

  // Refrescar al entrar para ver notificaciones nuevas
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo<NotificationSection[]>(
    () => groupNotificationsByDay(notifications),
    [notifications],
  );

  const handleNotificationPress = useCallback(
    async (notificationId: string, feedItemId: string | null, data: Record<string, unknown>) => {
      // markAsRead en background: no bloquea la navegación. Si falla, el
      // badge se reconcilia cuando el usuario vuelva a la lista.
      if (user) {
        markAsRead(notificationId).catch((err) =>
          log.warn("markAsRead falló (no crítico):", err),
        );
      }
      if (!feedItemId) return;
      const go = await buildFeedItemNavigation({
        router,
        feedItemId,
        data,
        queryClient,
        currentUserId: user?.id,
      });
      go?.();
    },
    [user, markAsRead, router, queryClient],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isUnread = item.estado === 'pendiente';
      const firstAuthor = item.autores?.[0];
      const extraCount = (item.total_autores || 0) - 1;

      return (
        <SafePressable
          style={[styles.notificationItem, isUnread && styles.unreadItem]}
          onPress={() =>
            handleNotificationPress(item.id, item.feed_item_id, item.data)
          }
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Avatar
              uri={firstAuthor?.foto || undefined}
              name={firstAuthor?.nombre || 'Usuario'}
              size={44}
            />
            {extraCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>+{extraCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.content}>
              <Text
                style={[styles.message, !isUnread && styles.readMessage]}
                numberOfLines={2}
              >
                {item.mensaje}
              </Text>
              <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
            </View>

            {item.contenido?.thumbnail ? (
              <Image
                source={{ uri: item.contenido.thumbnail }}
                style={styles.thumbnail}
                contentFit="cover"
              />
            ) : null}
          </View>
        </SafePressable>
      );
    },
    [handleNotificationPress],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: NotificationSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>{section.title}</Text>
      </View>
    ),
    [],
  );

  const renderFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }
    if (!hasMore && notifications.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No hay más notificaciones</Text>
        </View>
      );
    }
    return null;
  }, [loadingMore, hasMore, notifications.length]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={COLORS.textTertiary}
        />
        <Text style={styles.emptyTitle}>No hay notificaciones</Text>
        <Text style={styles.emptySubtitle}>
          Cuando alguien comente tu publicación aparecerá aquí
        </Text>
      </View>
    ),
    [],
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <SafePressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          </SafePressable>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <SafePressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </SafePressable>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={styles.placeholder} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) =>
          `${(item as any).id ?? "item"}-${index}`
        }
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={refresh}
        stickySectionHeadersEnabled
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyList : undefined
        }
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  unreadItem: {
    backgroundColor: COLORS.primaryTransparent,
  },
  avatarContainer: {
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  readMessage: {
    opacity: 0.6,
  },
  time: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    padding: 12,
    backgroundColor: COLORS.error || '#EF4444',
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.white,
    fontSize: 13,
  },
});
