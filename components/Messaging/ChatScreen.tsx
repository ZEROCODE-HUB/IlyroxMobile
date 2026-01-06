/**
 * ChatScreen.tsx
 * Pantalla de chat con soporte para metadata (destinatario_id y propiedad_id)
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  AppState,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MessageBubble from "./MessageBubble";
import PropertyMessageBubble from "./PropertyMessageBubble";
import MessageInput from "./MessageInput";
import TagsModal from "./TagsModal";
import CreateAppointmentModal from "../Appointments/CreateAppointmentModal";
import { useMessages } from "../../hooks/messaging/useMessages";
import { useTags } from "../../hooks/messaging/useTags";
import { COLORS } from "../../constants";
import { Avatar } from "../shared";
import { useStableSafeInsets } from "../../context/SafeInsetsContext";
import { supabase } from "../../lib/supabase";

interface ChatScreenProps {
  conversationId: string;
  userId: string;
  otherUser: {
    id: string;
    nombre: string;
    apellido_paterno: string;
    foto: string | null;
  };
  propertyId?: string | null; // ID de la propiedad si es un chat específico
  onBack?: () => void;
  onViewPropertyDetails?: (propertyId: string) => void;
}

const SafeAreaContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { bottom } = useStableSafeInsets();

  return (
    <View style={{ flex: 1, paddingBottom: bottom }}>
      {children}
    </View>
  );
};

export default function ChatScreen({
  conversationId,
  userId,
  otherUser,
  propertyId = null,
  onBack,
  onViewPropertyDetails,
}: ChatScreenProps) {
  const flatListRef = useRef<FlatList>(null);
  const { top } = useStableSafeInsets();
  const [actualConversationId, setActualConversationId] = useState<string | null>(
    conversationId === "new" ? null : conversationId
  );
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [conversationTags, setConversationTags] = useState<any[]>([]);

  const {
    tags,
    assignTag,
    removeTag,
    getConversationTags,
    createTag,
  } = useTags(userId);

  const {
    messages,
    loading,
    sending,
    error,
    hasMore,
    sendMessage: originalSendMessage,
    sendImage: originalSendImage,
    sendFile: originalSendFile,
    loadMore,
  } = useMessages(actualConversationId || "", userId);

  // Metadata para todos los mensajes
  const messageMetadata = {
    destinatario_id: otherUser.id,
    propiedad_id: propertyId,
  };

  // Wrapper para sendMessage que actualiza el conversationId después de crear
  const sendMessage = async (text: string, metadata: any) => {
    const result = await originalSendMessage(text, metadata);
    
    // Si era una conversación nueva, el trigger habrá creado el ID
    // Necesitamos obtenerlo
    if (conversationId === "new" && !actualConversationId) {
      // Buscar la conversación recién creada
      const { data } = await supabase
        .from('conversaciones')
        .select('id')
        .or(`and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUser.id}),and(usuario1_id.eq.${otherUser.id},usuario2_id.eq.${userId})`)
        .is('propiedad_id', null)
        .single();
      
      if (data) {
        setActualConversationId(data.id);
      }
    }
    
    return result;
  };

  const sendImage = async (uri: string, metadata: any) => {
    const result = await originalSendImage(uri, metadata);
    
    if (conversationId === "new" && !actualConversationId) {
      const { data } = await supabase
        .from('conversaciones')
        .select('id')
        .or(`and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUser.id}),and(usuario1_id.eq.${otherUser.id},usuario2_id.eq.${userId})`)
        .is('propiedad_id', null)
        .single();
      
      if (data) {
        setActualConversationId(data.id);
      }
    }
    
    return result;
  };

  const sendFile = async (uri: string, name: string, metadata: any) => {
    const result = await originalSendFile(uri, name, metadata);
    
    if (conversationId === "new" && !actualConversationId) {
      const { data } = await supabase
        .from('conversaciones')
        .select('id')
        .or(`and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUser.id}),and(usuario1_id.eq.${otherUser.id},usuario2_id.eq.${userId})`)
        .is('propiedad_id', null)
        .single();
      
      if (data) {
        setActualConversationId(data.id);
      }
    }
    
    return result;
  };

  // Restaurar StatusBar
  useEffect(() => {
    const restoreStatusBar = () => {
      StatusBar.setHidden(false);
      if (Platform.OS === 'android') {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor('#06D5B4');
      }
      StatusBar.setBarStyle('light-content');
    };

    restoreStatusBar();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setTimeout(() => {
          restoreStatusBar();
        }, 100);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Cargar etiquetas de la conversación
  useEffect(() => {
    const loadTags = async () => {
      if (actualConversationId) {
        const tags = await getConversationTags(actualConversationId);
        setConversationTags(tags);
      }
    };
    loadTags();
  }, [actualConversationId]);

  // Auto-scroll al recibir nuevos mensajes
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSendProperty = () => {
    Alert.alert(
      "Compartir propiedad",
      "Esta función abrirá un selector de propiedades en la versión completa.",
      [{ text: "OK" }]
    );
  };

  const handleAssignTag = async (tagId: string) => {
    if (!actualConversationId) {
      Alert.alert("Error", "Envía un mensaje primero para poder asignar etiquetas");
      return false;
    }

    const success = await assignTag(actualConversationId, tagId);
    if (success) {
      const updatedTags = await getConversationTags(actualConversationId);
      setConversationTags(updatedTags);
    }
    return success;
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!actualConversationId) return false;

    const success = await removeTag(actualConversationId, tagId);
    if (success) {
      const updatedTags = await getConversationTags(actualConversationId);
      setConversationTags(updatedTags);
    }
    return success;
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.emisor_id === userId;

    if (item.tipo === "propiedad") {
      return (
        <PropertyMessageBubble
          message={item}
          isMe={isMe}
          onViewDetails={onViewPropertyDetails}
        />
      );
    }

    return <MessageBubble message={item} isMe={isMe} />;
  };

  const renderHeader = () => {
    if (!hasMore) return null;

    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
        <Text style={styles.loadMoreText}>Cargar más mensajes</Text>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  const fullName = `${otherUser.nombre} ${otherUser.apellido_paterno}`;

  return (
    <SafeAreaContent>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.header, { paddingTop: top }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons
              name="chevron-back"
              size={28}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerUser}>
            <Avatar uri={otherUser.foto} name={otherUser.nombre} size={40} />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {fullName}
              </Text>
              {propertyId && (
                <Text style={styles.headerSubtitle}>Chat de propiedad</Text>
              )}
              {conversationTags.length > 0 && (
                <View style={styles.headerTagsContainer}>
                  {conversationTags.slice(0, 2).map((tag) => (
                    <View 
                      key={tag.id} 
                      style={[styles.headerTagBadge, { backgroundColor: tag.color }]}
                    >
                      <Text style={styles.headerTagText}>{tag.nombre}</Text>
                    </View>
                  ))}
                  {conversationTags.length > 2 && (
                    <Text style={styles.moreTagsText}>
                      +{conversationTags.length - 2}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowTagsModal(true)}
            style={styles.headerButton}
          >
            <Ionicons
              name="pricetag"
              size={22}
              color={conversationTags.length > 0 ? COLORS.primary : COLORS.textSecondary}
            />
          </TouchableOpacity>

          {propertyId && (
            <TouchableOpacity
              onPress={() => setShowAppointmentModal(true)}
              style={styles.headerButton}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContent}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="chatbubble-outline"
                  size={64}
                  color={COLORS.cardBorder}
                />
                <Text style={styles.emptyText}>No hay mensajes aún</Text>
                <Text style={styles.emptySubtext}>
                  Envía un mensaje para iniciar la conversación
                </Text>
              </View>
            ) : null
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />

        <MessageInput
          onSendText={(text) => sendMessage(text, messageMetadata)}
          onSendImage={async (uri) => { await sendImage(uri, messageMetadata); }}
          onSendFile={async (uri, name) => { await sendFile(uri, name, messageMetadata); }}
          onSendProperty={handleSendProperty}
          sending={sending}
        />

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TagsModal
          visible={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          availableTags={tags}
          assignedTags={conversationTags}
          onAssignTag={handleAssignTag}
          onRemoveTag={handleRemoveTag}
          onCreateTag={createTag}
        />

        {propertyId && (
          <CreateAppointmentModal
            visible={showAppointmentModal}
            onClose={() => setShowAppointmentModal(false)}
            propertyId={propertyId}
            otherUserId={otherUser.id}
            currentUserId={userId}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  headerTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerTagText: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.white,
  },
  moreTagsText: {
    fontSize: 9,
    color: COLORS.textTertiary,
    alignSelf: "center",
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  loadMoreButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginBottom: 12,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  loadingFooter: {
    paddingVertical: 16,
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 8,
    textAlign: "center",
  },
  errorBanner: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.error + "20",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.error,
  },
});
