import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { supabase } from '../../lib/supabase';
import { useNotifications, NotificacionExtendida } from '../../context/NotificationContext';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../../components/shared';

export default function NotificationHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    notifications, 
    markAsRead, 
    isLoading
  } = useNotifications();
  
  useEffect(() => {
    // Notifications are fetched automatically by the context
  }, []);
  
  const handleNotificationPress = async (notification: NotificacionExtendida) => {
    const { id, feed_item_id, autores } = notification;

    if (user) {
      await markAsRead(id);
    }

    if (!feed_item_id) return;

    const firstAuthorId = autores[0]?.id || null;

    const { data: feedItem } = await supabase
      .from("feed_items")
      .select("contenido_id, tipo_contenido")
      .eq("id", feed_item_id)
      .single();

    if (!feedItem) return;

    const highlightParam = firstAuthorId ? { highlightUserId: firstAuthorId } : {};

    switch (feedItem.tipo_contenido) {
      case "propiedad":
        router.push({ pathname: "/(stack)/property/[id]", params: { id: feedItem.contenido_id, ...highlightParam } });
        break;
      case "post":
        router.push({ pathname: "/(stack)/post/[id]", params: { id: feedItem.contenido_id, ...highlightParam } });
        break;
      case "reel":
        router.push({ pathname: "/(stack)/reel/[id]", params: { id: feedItem.contenido_id, ...highlightParam } });
        break;
      default:
        router.push({ pathname: "/(stack)/property/[id]", params: { id: feedItem.contenido_id, ...highlightParam } });
    }
  };
  
  const renderItem = ({ item }: { item: NotificacionExtendida }) => {
    const isUnread = item.estado === 'pendiente';
    const firstAuthor = item.autores[0];
    const extraCount = item.total_autores - 1;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.dotContainer}>
          <View style={[styles.dot, isUnread && styles.unreadDot]} />
        </View>

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
            <Text style={[styles.message, !isUnread && styles.readMessage]} numberOfLines={2}>
              {item.mensaje}
            </Text>
            <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
          </View>

          {item.contenido?.thumbnail && (
            <Image
              source={{ uri: item.contenido.thumbnail }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyText}>No hay notificaciones</Text>
    </View>
  );
  
  if (isLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#F0F9FF',
  },
  dotContainer: {
    width: 20,
    alignItems: 'center',
    paddingTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  unreadDot: {
    backgroundColor: '#3B82F6',
  },
  message: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  readMessage: {
    opacity: 0.6,
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginLeft: 8,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#3B82F6',
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
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginLeft: 8,
  },
});
