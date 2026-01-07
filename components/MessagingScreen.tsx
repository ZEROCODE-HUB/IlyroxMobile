/**
 * MessagingScreen.tsx
 * Pantalla principal de mensajería integrada con Supabase
 * FIX: Header posicionado correctamente fuera del KeyboardAvoidingView
 */

import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ConversationsList from "./Messaging/ConversationsList";
import ChatScreen from "./Messaging/ChatScreen";
import { useAuth } from "../context/AuthContext";
import { useConversations } from "../hooks/messaging/useConversations";
import { AppHeader } from "./AppHeader";
import { User } from "../types";
import { COLORS } from "../constants";
import { useStableSafeInsets } from "../context/SafeInsetsContext";
import { ScreenWrapper } from "../screens/ScreenWrapper";
import HeaderChat from "./Messaging/HeaderChat";

interface MessagingScreenProps {
  initialUser?: User;
  initialPropertyId?: string;
  onBack?: () => void;
}

export default function MessagingScreen({
  initialUser,
  initialPropertyId,
  onBack,
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
  const { conversations, getConversationsForUser } = useConversations(
    profile?.id
  );
  const lastProcessedUserId = useRef<string | null>(null);

  // Función de navegación hacia atrás
  const handleNavigationBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  // Manejar initialUser
  useEffect(() => {
    if (
      initialUser &&
      profile?.id &&
      lastProcessedUserId.current !== initialUser.id
    ) {
      lastProcessedUserId.current = initialUser.id;
      handleInitialUser(initialUser);
    }
  }, [initialUser?.id, initialPropertyId, profile?.id]);

  const handleInitialUser = async (user: User) => {
    if (!profile?.id) return;

    // Esperar un poco para que las conversaciones se carguen
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Buscar si ya existe una agrupación con este usuario
    const existingGrouping = conversations.find(
      (conv) => conv.other_user?.id === user.id
    );

    if (existingGrouping) {
      // Si existe agrupación, obtener las conversaciones específicas
      const specificConvs = await getConversationsForUser(user.id);

      // 🏠 Si viene de una PROPIEDAD, buscar chat de esa propiedad
      if (initialPropertyId) {
        const propertyChat = specificConvs.find(
          (conv) => conv.propiedad?.id === initialPropertyId
        );

        if (propertyChat) {
          // ✅ Existe chat de esta propiedad, abrirlo
          console.log("✅ Chat de propiedad encontrado:", propertyChat.id);
          setActiveConversationId(propertyChat.id);
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(initialPropertyId);
          return;
        } else {
          // ❌ No existe chat de esta propiedad, crear uno nuevo
          console.log("❌ No existe chat de propiedad, creando nuevo...");
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
          console.log("✅ Chat general encontrado:", generalChat.id);
          setActiveConversationId(generalChat.id);
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(null);
          return;
        } else {
          // ❌ No existe chat general, crear uno nuevo
          console.log("❌ No existe chat general, creando nuevo...");
          setActiveConversationId("new");
          setOtherUser(existingGrouping.other_user);
          setActivePropertyId(null);
          return;
        }
      }
    } else {
      // 🆕 No existe NINGUNA conversación con este usuario
      console.log("🆕 Primera conversación con este usuario");
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
    propertyId?: string | null
  ) => {
    console.log("=== handleSelectConversation llamado ===");
    console.log("conversationId:", conversationId);
    console.log("otherUserData:", otherUserData);
    console.log("propertyId:", propertyId);
    setActiveConversationId(conversationId);
    setOtherUser(otherUserData);
    setActivePropertyId(propertyId || null);
    console.log("Estados actualizados");
  };

  const handleBack = () => {
    setActiveConversationId(null);
    setOtherUser(null);
    setActivePropertyId(null);
  };

  const handleViewPropertyDetails = (propertyId: string) => {
    console.log("Ver detalles de propiedad:", propertyId);
    // TODO: Navegar a PropertyDetails
  };

  if (!profile?.id) {
    return (
      <View style={[styles.container, { paddingTop: top }]}>
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

  const handleConversationCreated = (id: string) => {
    setActiveConversationId(id);
    // Refresh conversation list in background if needed
    // refresh();
  };

  // Mostrar chat si hay conversación activa
  if (activeConversationId && otherUser) {
    console.log("=== Renderizando ChatScreen ===");
    console.log("activeConversationId:", activeConversationId);
    console.log("otherUser:", otherUser);
    console.log("activePropertyId:", activePropertyId);

    return (
      <View style={styles.container}>
        {/* Header fijo fuera del área de contenido */}
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h && h !== headerHeight) setHeaderHeight(h);
          }}
          style={styles.headerFixed}
        >
          <HeaderChat
            onBack={handleBack}
            otherUser={otherUser}
            userId={profile.id}
            propertyId={activePropertyId}
            conversationId={activeConversationId}
          />
        </View>

        {/* Contenido del chat con margen superior igual a la altura del header */}
        <View style={[styles.chatContent, { marginTop: headerHeight }]}>
          <ChatScreen
            conversationId={activeConversationId}
            userId={profile.id}
            otherUser={otherUser}
            propertyId={activePropertyId}
            onBack={handleBack}
            onViewPropertyDetails={handleViewPropertyDetails}
            onConversationCreated={handleConversationCreated}
            keyboardOffset={headerHeight + top}
          />
        </View>
      </View>
    );
  }

  console.log("=== Renderizando ConversationsList ===");

  // Mostrar lista de conversaciones
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
    zIndex: 1000, // Aumentado para asegurar que esté encima
    elevation: 5, // Para Android
    backgroundColor: COLORS.white, // Asegurar fondo sólido
  },
  chatContent: {
    flex: 1,
  },
});
