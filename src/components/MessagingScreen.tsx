/**
 * MessagingScreen.tsx - REFACTORIZADO
 * Pantalla principal de mensajería integrada con Supabase
 *
 * FIXES:
 * - useConversations solo se ejecuta cuando se muestra la lista
 * - Optimización de re-renders
 * - Logs de debug removidos para producción
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, BackHandler } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import ConversationsList from "./Messaging/ConversationsList";
import ChatScreen from "./Messaging/ChatScreen";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../hooks/hooks/messaging/useConversations";
import { AppHeader } from "./AppHeader";
import { User } from "../types";
import { COLORS } from "../constants";
import { useStableSafeInsets } from "../context/SafeInsetsContext";
import { ScreenWrapper } from "../screens/ScreenWrapper";
import HeaderChat from "./Messaging/HeaderChat";
import { router } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";

interface MessagingScreenProps {
  initialUser?: User;
  initialPropertyId?: string;
  conversationId?: string;
  onBack?: () => void;
  isAppointment?: boolean;
}

export default function MessagingScreen({
  initialUser,
  initialPropertyId,
  conversationId,
  onBack,
  isAppointment,
}: MessagingScreenProps) {
  const { top } = useStableSafeInsets();
  const { profile } = useAuth();
  const navigation = useNavigation<any>();

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(64);

  const lastProcessedUserId = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // FIX: Solo llamar useConversations cuando NO estamos en un chat activo
  const isInChatView = !!(activeConversationId && otherUser);

  // Mantener el hook siempre activo para recibir actualizaciones en tiempo real
  // incluso mientras estamos dentro de un chat, así al volver la lista ya está actualizada.
  const conversationsHook = useConversations(profile?.id);

  const { conversations = [], getConversationsForUser } = conversationsHook;

  // Función de navegación hacia atrás
  const handleNavigationBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  // Determine if we started the screen as a list or a direct chat
  const startedAtList = useRef(
    !initialUser && !conversationId && !activeConversationId,
  ).current;

  const handleBack = useCallback(() => {
    // Si entramos a un chat desde la lista interna de MessagingScreen,
    // al volver queremos ver la lista de nuevo.
    if (startedAtList && (activeConversationId || otherUser)) {
      setActiveConversationId(null);
      setOtherUser(null);
      setActivePropertyId(null);
      isInitializedRef.current = false;
    } else {
      // Si entramos directamente a un chat (desde afuera: Appointments, Profile, etc.)
      // o ya estamos en la vista de la lista, salimos de la pantalla.
      if (isAppointment) {
        router.push("/(stack)/appointments");
      } else if (onBack) {
        onBack();
      } else {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          router.replace("/(tabs)/feed");
        }
      }
    }
  }, [
    startedAtList,
    activeConversationId,
    otherUser,
    isAppointment,
    onBack,
    navigation,
  ]);

  // Manejar botón físico de atrás en Android
  useEffect(() => {
    const onBackPress = () => {
      if (isInChatView) {
        handleBack();
        return true; // Prevenir comportamiento por defecto (salir de la app/pantalla)
      }
      return false; // Dejar pasar el evento si no estamos en chat
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => {
      subscription.remove();
    };
  }, [isInChatView, handleBack]);

  // Manejar initialUser y navigation params
  useEffect(() => {
    // Si no hay usuario activo, no hacer nada
    if (!profile?.id) return;

    const targetUserId = initialUser?.id;
    const targetConvId = conversationId;

    // Detectar si los parámetros han cambiado respecto a lo último que procesamos
    const hasParamsChanged =
      targetUserId !== lastProcessedUserId.current ||
      targetConvId !== activeConversationId;

    if (!hasParamsChanged && isInitializedRef.current) {
      return;
    }

    // Reset de estado para nueva inicialización
    isInitializedRef.current = true;
    lastProcessedUserId.current = targetUserId;

    // Si tenemos un conversationId explícito (aunque sea "new")
    if (targetConvId && initialUser) {
      setActiveConversationId(targetConvId);
      setOtherUser({
        id: initialUser.id,
        nombre:
          (initialUser as any).nombre || initialUser.name?.split(" ")[0] || "",
        apellido_paterno:
          (initialUser as any).apellido_paterno ||
          initialUser.name?.split(" ")[1] ||
          "",
        foto: (initialUser as any).foto || (initialUser as any).avatar || null,
      });
      setActivePropertyId(initialPropertyId || null);
      return;
    }

    // Si tenemos un initialUser pero no ID de conversación, dejar que handleInitialUser lo busque
    if (initialUser) {
      handleInitialUser(initialUser);
    } else {
      // Sin parámetros: mostrar lista (a menos que ya estuviéramos en un chat y no queramos resetear)
      // Pero si targetUserId es null y antes no lo era, volvemos a la lista
      if (!targetUserId && lastProcessedUserId.current) {
        handleBack();
      }
    }
  }, [initialUser?.id, initialPropertyId, profile?.id, conversationId]);

  const handleInitialUser = async (user: User) => {
    if (!profile?.id) return;

    // Esperar un poco para que las conversaciones se carguen
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Buscar si ya existe una agrupación con este usuario
    const existingGrouping = conversations.find(
      (conv) => conv.other_user?.id === user.id,
    );

    if (existingGrouping && getConversationsForUser) {
      // Si existe agrupación, obtener las conversaciones específicas
      const specificConvs = await getConversationsForUser(user.id);

      // 🏠 Si viene de una PROPIEDAD, buscar chat de esa propiedad
      if (initialPropertyId) {
        const propertyChat = specificConvs.find(
          (conv) => conv.propiedad?.id === initialPropertyId,
        );

        if (propertyChat) {
          // ✅ Existe chat de esta propiedad, abrirlo
          setActiveConversationId(propertyChat.id);
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(initialPropertyId);
          return;
        } else {
          // ❌ No existe chat de esta propiedad, crear uno nuevo
          setActiveConversationId("new");
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(initialPropertyId);
          return;
        }
      } else {
        // 💬 Si NO viene de propiedad, buscar chat GENERAL
        const generalChat = specificConvs.find((conv) => !conv.propiedad?.id);

        if (generalChat) {
          // ✅ Existe chat general, abrirlo
          setActiveConversationId(generalChat.id);
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(null);
          return;
        } else {
          // ❌ No existe chat general, crear uno nuevo
          setActiveConversationId("new");
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(null);
          return;
        }
      }
    } else {
      // 🆕 No existe NINGUNA conversación con este usuario
      setActiveConversationId("new");
      setOtherUser({
        id: user.id,
        nombre: (user as any).nombre || user.name?.split(" ")[0] || "",
        apellido_paterno:
          (user as any).apellido_paterno || user.name?.split(" ")[1] || "",
        foto: (user as any).foto || (user as any).avatar || null,
      });
      setActivePropertyId(initialPropertyId || null);
    }
  };

  const handleSelectConversation = (
    conversationId: string,
    otherUserData: any,
    propertyId?: string | null,
  ) => {
    setActiveConversationId(conversationId);
    setOtherUser(otherUserData);
    setActivePropertyId(propertyId || null);
  };

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
  };

  // Loading state
  if (!profile?.id) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Mensajes"
          showBackButton
          onBack={handleNavigationBack}
        />
        <View style={styles.content}>
          <Text style={styles.subtitle}>Cargando...</Text>
        </View>
      </View>
    );
  }

  // Chat View
  if (isInChatView) {
    return (
      <KeyboardProvider>
        <View style={styles.container}>
          {/* Header fijo */}
          <View
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h && h !== headerHeight) setHeaderHeight(h);
            }}
            style={[styles.headerFixed, { paddingTop: top }]}
          >
            <HeaderChat
              onBack={handleBack}
              otherUser={otherUser}
              userId={profile.id}
              propertyId={activePropertyId}
              conversationId={activeConversationId}
            />
          </View>

          {/* Contenido del chat */}
          <View style={[styles.chatContent, { marginTop: headerHeight }]}>
            <ChatScreen
              conversationId={activeConversationId}
              userId={profile.id}
              otherUser={otherUser}
              propertyId={activePropertyId}
              onBack={handleBack}
              onConversationCreated={handleConversationCreated}
              keyboardOffset={headerHeight + top}
            />
          </View>
        </View>
      </KeyboardProvider>
    );
  }

  // Conversations List View
  return (
    <ScreenWrapper withHeader={false}>
      <View style={styles.container}>
        <AppHeader
          title="Mensajes"
          showBackButton
          onBack={handleNavigationBack}
        />
        <ConversationsList
          userId={profile.id}
          onSelectConversation={handleSelectConversation}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  headerFixed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    backgroundColor: COLORS.white,
  },
  chatContent: {
    flex: 1,
  },
});
