import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface ConversationItem {
  id: string;
  propiedad?: {
    id: string;
    tipo: string;
    ciudad: string;
    precio: number;
    imagenes: string[];
  } | null;
  unread_count: number;
  ultimo_mensaje_preview?: string;
}

interface ConversationsSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  conversations: ConversationItem[];
  onSelectConversation: (conversation: ConversationItem) => void;
  otherUserName: string;
}

export default function ConversationsSelectionModal({
  visible,
  onClose,
  conversations,
  onSelectConversation,
  otherUserName,
}: ConversationsSelectionModalProps) {
  
  const renderItem = ({ item }: { item: ConversationItem }) => {
    const isGeneral = !item.propiedad;
    const title = isGeneral 
      ? 'Chat General' 
      : `${item.propiedad?.tipo} en ${item.propiedad?.ciudad}`;
    
    const subtitle = isGeneral
      ? 'Conversación personal'
      : `$${item.propiedad?.precio?.toLocaleString()}`;

    const image = !isGeneral && item.propiedad?.imagenes?.[0] 
      ? { uri: item.propiedad.imagenes[0] }
      : null;

    return (
      <TouchableOpacity 
        style={styles.item}
        onPress={() => onSelectConversation(item)}
      >
        <View style={styles.iconContainer}>
          {image ? (
            <Image source={image} style={styles.propertyImage} />
          ) : (
            <View style={[styles.iconPlaceholder, { backgroundColor: isGeneral ? COLORS.primary : COLORS.info }]}>
              <Ionicons 
                name={isGeneral ? "chatbubble-ellipses-outline" : "home-outline"} 
                size={24} 
                color={COLORS.white} 
              />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {item.ultimo_mensaje_preview && (
            <Text style={styles.preview} numberOfLines={1}>
              {item.ultimo_mensaje_preview}
            </Text>
          )}
        </View>

        {item.unread_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.unread_count}</Text>
          </View>
        )}
        
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Conversaciones con {otherUserName}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No se encontraron conversaciones</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  preview: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
