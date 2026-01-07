/**
 * ChatScreen.tsx
 * Pantalla de chat con soporte para metadata (destinatario_id y propiedad_id)
 * FIX: KeyboardAvoidingView mejorado para no afectar el header
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
  Keyboard,
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
  propertyId?: string | null;
  onBack?: () => void;
  onViewPropertyDetails?: (propertyId: string) => void;
  onConversationCreated?: (id: string) => void;
  keyboardOffset?: number;
}

export default function ChatScreen({
  conversationId,
  userId,
  otherUser,
  propertyId = null,
  onBack,
  onViewPropertyDetails,
  onConversationCreated,
  keyboardOffset = 0,
}: ChatScreenProps) {
  const flatListRef = useRef<FlatList>(null);
  const { bottom } = useStableSafeInsets();
  const [actualConversationId, setActualConversationId] = useState<
    string | null
  >(conversationId === "new" ? null : conversationId);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  // Listener del teclado para Android
  useEffect(() => {
    if (Platform.OS === "android") {
      const keyboardDidShowListener = Keyboard.addListener(
        "keyboardDidShow",
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
        }
      );

      return () => {
        keyboardDidShowListener.remove();
        keyboardDidHideListener.remove();
      };
    }
  }, []);

  // Wrapper para sendMessage que actualiza el conversationId después de crear
  const sendMessage = async (text: string, metadata: any) => {
    const result = await originalSendMessage(text, metadata);

    if (conversationId === "new" && !actualConversationId) {
      const { data } = await supabase
        .from("conversaciones")
        .select("id")
        .or(
          `and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUser.id}),and(usuario1_id.eq.${otherUser.id},usuario2_id.eq.${userId})`
        )
        .is("propiedad_id", null)
        .single();

      if (data) {
        setActualConversationId(data.id);
        if (onConversationCreated) {
          onConversationCreated(data.id);
        }
      }
    }

    return result;
  };

  const sendImage = async (uri: string, metadata: any) => {
    const result = await originalSendImage(uri, metadata);

    if (conversationId === "new" && !actualConversationId) {
      const { data } = await supabase
        .from("conversaciones")
        .select("id")
        .or(
          `and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUser.id}),and(usuario1_id.eq.${otherUser.id},usuario2_id.eq.${userId})`
        )
        .is("propiedad_id", null)
        .single();

      if (data) {
        setActualConversationId(data.id);
        if (onConversationCreated) {
          onConversationCreated(data.id);
        }
      }
    }

    return result;
  };

  const sendFile = async (uri: string, name: string, metadata: any) => {
    const result = await originalSendFile(uri, name, metadata);

    if (conversationId === "new" && !actualConversationId) {
      const { data } = await supabase
        .from("conversaciones")
        .select("id")
        .or(
          `and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUser.id}),and(usuario1_id.eq.${otherUser.id},usuario2_id.eq.${userId})`
        )
        .is("propiedad_id", null)
        .single();

      if (data) {
        setActualConversationId(data.id);
        if (onConversationCreated) {
          onConversationCreated(data.id);
        }
      }
    }

    return result;
  };

  // Restaurar StatusBar
  useEffect(() => {
    const restoreStatusBar = () => {
      StatusBar.setHidden(false);
      if (Platform.OS === "android") {
        StatusBar.setTranslucent(false);
        StatusBar.setBackgroundColor("#06D5B4");
      }
      StatusBar.setBarStyle("light-content");
    };

    restoreStatusBar();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setTimeout(() => {
          restoreStatusBar();
        }, 100);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

  // Calcular el offset para iOS
  const iosKeyboardOffset = Platform.OS === "ios" ? keyboardOffset : 0;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={iosKeyboardOffset}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[
            styles.messagesContent,
            Platform.OS === "android" && { paddingBottom: keyboardHeight },
          ]}
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
          onLayout={() => {
            // Scroll inicial después de layout
            if (messages.length > 0) {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 100);
            }
          }}
        />

        <MessageInput
          onSendText={(text) => sendMessage(text, messageMetadata)}
          onSendImage={async (uri) => {
            await sendImage(uri, messageMetadata);
          }}
          onSendFile={async (uri, name) => {
            await sendFile(uri, name, messageMetadata);
          }}
          onSendProperty={handleSendProperty}
          sending={sending}
        />
      </KeyboardAvoidingView>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
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
