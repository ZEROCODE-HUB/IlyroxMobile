import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../context/NotificationContext';
import { formatTimeAgo } from '../../utils/formatTimeAgo';
import { COLORS } from '../../constants';
import SafePressable from '@/design-system/components/SafePressable';

interface NotificationItemProps {
  onPress: () => void;
}

export function NotificationItem({ onPress }: NotificationItemProps) {
  const { lastNotification, unreadCount } = useNotifications();

  const hasNotifications = !!lastNotification;
  const displayText = hasNotifications
    ? lastNotification.mensaje
    : 'Sin notificaciones';

  const displayTime = hasNotifications
    ? formatTimeAgo(lastNotification.created_at)
    : '';

  return (
    <SafePressable
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.text,
            !hasNotifications && styles.noNotificationText
          ]}
          numberOfLines={2}
        >
          {displayText}
        </Text>

        {displayTime ? (
          <Text style={styles.time}>{displayTime}</Text>
        ) : null}
      </View>

      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </SafePressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  iconContainer: {
    marginRight: 12,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  noNotificationText: {
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});

