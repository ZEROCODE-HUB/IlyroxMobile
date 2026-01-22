import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../design-system/components/AppInput";
import { ChatSession, Message, Tag, Property, User } from "../types";
import { COLORS as APP_COLORS } from "../constants";

interface MessagingProps {
  sessions: ChatSession[];
  initialUser?: User;
  properties?: Property[];
}

const COLORS_PRESETS = [
  { name: "Teal", bg: APP_COLORS.primaryTransparent, text: APP_COLORS.primaryDark },
  { name: "Blue", bg: APP_COLORS.infoLight, text: APP_COLORS.info },
  { name: "Red", bg: APP_COLORS.errorLight, text: APP_COLORS.error },
  { name: "Orange", bg: APP_COLORS.warningLight, text: APP_COLORS.warning },
  { name: "Purple", bg: APP_COLORS.tagPurpleLight, text: APP_COLORS.tagPurple },
  { name: "Gray", bg: APP_COLORS.backgroundDark, text: APP_COLORS.textSecondary },
];

const Messaging: React.FC<MessagingProps> = ({
  sessions: initialSessions,
  initialUser,
  properties,
}) => {
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");

  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS_PRESETS[0]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [apptDate, setApptDate] = useState("");
  const [apptTime, setApptTime] = useState("");

  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [propQuery, setPropQuery] = useState("");
  const selectorOpacity = useRef(
    new Animated.Value(initialUser ? 1 : 0)
  ).current;

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const baseProperties: Property[] =
    properties && properties.length > 0 ? properties : [];

  const findOrCreateSession = (user: User, property?: Property) => {
    const id = property ? `${user.id}:${property.id}` : `${user.id}:general`;
    const existing = sessions.find((s) => s.id === id);
    if (existing) {
      setActiveSessionId(existing.id);
      Animated.timing(selectorOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
      return;
    }
    const tag: Tag = property
      ? { id: `tag-${property.id}`, name: property.title, color: "Teal" }
      : { id: `tag-general-${user.id}`, name: "General", color: "Gray" };
    const newSession: ChatSession = {
      id,
      user,
      lastMessage: "",
      unread: 0,
      messages: [],
      tags: [tag],
    };
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    Animated.timing(selectorOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (activeSession?.messages && flatListRef.current) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
    }
  }, [activeSession?.messages, activeSessionId]);

  const handleSend = () => {
    if (!inputText.trim() || !activeSessionId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...s.messages, newMessage],
              lastMessage: inputText,
            }
          : s
      )
    );

    setInputText("");
  };

  const handleSchedule = () => {
    if (!apptDate || !apptTime || !activeSessionId) return;

    const formattedDate = apptDate + " at " + apptTime;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "me",
      text: "",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "appointment",
      appointmentDate: formattedDate,
      appointmentStatus: "pending",
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...s.messages, newMessage],
              lastMessage: "📅 Appointment Scheduled",
            }
          : s
      )
    );

    setShowScheduleModal(false);
    setApptDate("");
    setApptTime("");
  };

  const addTag = () => {
    if (!newTagText.trim() || !activeSessionId) return;
    const newTag: Tag = {
      id: Date.now().toString(),
      name: newTagText,
      color: selectedColor.name,
    };

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, tags: [...s.tags, newTag] } : s
      )
    );
    setNewTagText("");
  };

  const removeTag = (tagId: string) => {
    if (!activeSessionId) return;
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, tags: s.tags.filter((t) => t.id !== tagId) }
          : s
      )
    );
  };

  const allTags = Array.from(
    new Set(sessions.flatMap((s) => s.tags.map((t) => t.name)))
  ).sort();

  const filteredSessions = (
    activeTagFilter
      ? sessions.filter((s) => s.tags.some((t) => t.name === activeTagFilter))
      : sessions
  ).filter((s) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (s.user.name || s.user.nombre || "").toLowerCase().includes(q) ||
      (s.lastMessage || "").toLowerCase().includes(q)
    );
  });

  const getTagStyle = (tagName: string, colorName?: string) => {
    const color =
      COLORS_PRESETS.find((c) => c.name === colorName) ||
      COLORS_PRESETS.find((c) => c.name === "Gray");
    return { backgroundColor: color?.bg, borderColor: color?.bg };
  };
  const getTagTextStyle = (tagName: string, colorName?: string) => {
    const color =
      COLORS_PRESETS.find((c) => c.name === colorName) ||
      COLORS_PRESETS.find((c) => c.name === "Gray");
    return { color: color?.text };
  };

  if (initialUser && !activeSessionId) {
    return (
      <Animated.View style={[styles.container, { opacity: selectorOpacity }]}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.headerTitle}>
            Chats de {initialUser.name || initialUser.nombre}
          </Text>
          <AppInput
            containerStyle={styles.searchWrapper}
            placeholder="Buscar contacto..."
            value={propQuery}
            onChangeText={setPropQuery}
            leftIcon={<Ionicons name="search" size={20} color={APP_COLORS.textTertiary} />}
          />
        </View>

        <View style={styles.selectorHeaderRow}>
          <TouchableOpacity
            style={styles.generalChatBtn}
            onPress={() => findOrCreateSession(initialUser)}
          >
            <Ionicons name="chatbubble" size={16} color={APP_COLORS.white} />
            <Text style={styles.generalChatText}>Asesor Virtual</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.sessionList}>
          {baseProperties
            .filter((p) => {
              const q = propQuery.trim().toLowerCase();
              if (!q) return true;
              return (
                p.title.toLowerCase().includes(q) ||
                p.location.city.toLowerCase().includes(q)
              );
            })
            .map((p) => {
              const id = `${initialUser.id}:${p.id}`;
              const sess = sessions.find((s) => s.id === id);
              const unread = sess?.unread || 0;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={styles.propertyItemRow}
                  onPress={() => findOrCreateSession(initialUser, p)}
                >
                  <Image
                    source={{ uri: p.images[0] }}
                    style={styles.propertyThumb}
                  />
                  <View style={styles.propertyInfoCol}>
                    <Text style={styles.propertyTitle} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={styles.propertyMeta} numberOfLines={1}>
                      {p.location.city} · {(p.price / 1000).toFixed(0)}k
                    </Text>
                  </View>
                  {unread > 0 && (
                    <View style={styles.unreadBadgeSmall}>
                      <Text style={styles.unreadText}>{unread}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={APP_COLORS.textTertiary} />
                </TouchableOpacity>
              );
            })}
          {baseProperties.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Sin propiedades relacionadas</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  }

  if (!activeSessionId) {
    return (
      <View style={styles.container}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.headerTitle}>Messages</Text>
          <AppInput
            containerStyle={styles.searchWrapper}
            placeholder="Buscar conversaciones..."
            value={query}
            onChangeText={setQuery}
            leftIcon={<Ionicons name="search" size={20} color={APP_COLORS.textTertiary} />}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              onPress={() => setActiveTagFilter(null)}
              style={[
                styles.filterChip,
                activeTagFilter === null
                  ? styles.filterChipActive
                  : styles.filterChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  activeTagFilter === null
                    ? styles.filterTextActive
                    : styles.filterTextInactive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {allTags.map((tagName) => (
              <TouchableOpacity
                key={tagName}
                onPress={() =>
                  setActiveTagFilter(
                    activeTagFilter === tagName ? null : tagName
                  )
                }
                style={[
                  styles.filterChip,
                  activeTagFilter === tagName
                    ? styles.filterChipActiveTeal
                    : styles.filterChipInactive,
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    activeTagFilter === tagName
                      ? { backgroundColor: APP_COLORS.white }
                      : { backgroundColor: APP_COLORS.primary },
                  ]}
                />
                <Text
                  style={[
                    styles.filterText,
                    activeTagFilter === tagName
                      ? styles.filterTextActive
                      : styles.filterTextInactive,
                  ]}
                >
                  {tagName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.sessionList}>
          {filteredSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => setActiveSessionId(session.id)}
              style={styles.sessionItem}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: session.user.avatar }}
                  style={styles.avatar}
                />
                {session.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{session.unread}</Text>
                  </View>
                )}
              </View>
              <View style={styles.sessionInfo}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionName} numberOfLines={1}>
                    {session.user.name}
                  </Text>
                  <Text style={styles.sessionTime}>12m</Text>
                </View>
                <Text
                  style={[
                    styles.lastMessage,
                    session.unread > 0 && styles.lastMessageBold,
                  ]}
                  numberOfLines={1}
                >
                  {session.lastMessage}
                </Text>
                <View style={styles.tagRow}>
                  {session.tags.map((tag) => {
                    const style = getTagStyle(tag.name, tag.color);
                    const textStyle = getTagTextStyle(tag.name, tag.color);
                    return (
                      <View key={tag.id} style={[styles.miniTag, style]}>
                        <Text style={[styles.miniTagText, textStyle]}>
                          {tag.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {filteredSessions.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="filter" size={32} color={APP_COLORS.cardBorder} />
              <Text style={styles.emptyText}>No conversations found.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <TouchableOpacity
            onPress={() => setActiveSessionId(null)}
            style={styles.backButton}
          >
            <Text style={{ fontSize: 24, color: APP_COLORS.textSecondary, marginRight: 4 }}>
              ←
            </Text>
          </TouchableOpacity>
          <Image
            source={{ uri: activeSession?.user.avatar }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerName}>{activeSession?.user.name}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
        <View style={styles.chatHeaderRight}>
          <TouchableOpacity
            onPress={() => setShowTagModal(true)}
            style={styles.iconButton}
          >
            <Ionicons name="pricetag" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {activeSession && activeSession.tags.length > 0 && (
        <View style={styles.tagsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeSession.tags.map((tag) => {
              const style = getTagStyle(tag.name, tag.color);
              const textStyle = getTagTextStyle(tag.name, tag.color);
              return (
                <View key={tag.id} style={[styles.headerTag, style]}>
                  <Ionicons
                    name="pricetag"
                    size={10}
                    color={textStyle.color as string}
                  />
                  <Text style={[styles.headerTagText, textStyle]}>
                    {tag.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={activeSession?.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item: msg }) => (
          <View
            style={[
              styles.messageRow,
              msg.senderId === "me"
                ? styles.messageRowMe
                : styles.messageRowOther,
            ]}
          >
            <View
              style={[
                styles.messageBubble,
                msg.senderId === "me" ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              {msg.type === "text" && (
                <Text
                  style={[
                    styles.messageText,
                    msg.senderId === "me" ? styles.textMe : styles.textOther,
                  ]}
                >
                  {msg.text}
                </Text>
              )}

              {msg.type === "appointment" && (
                <View>
                  <View style={styles.apptHeader}>
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={msg.senderId === "me" ? APP_COLORS.white : APP_COLORS.textPrimary}
                    />
                    <Text
                      style={[
                        styles.apptTitle,
                        msg.senderId === "me"
                          ? styles.textMe
                          : styles.textOther,
                      ]}
                    >
                      Appointment
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.apptDate,
                      msg.senderId === "me" ? styles.textMe : styles.textOther,
                    ]}
                  >
                    Scheduled for:{" "}
                    <Text style={{ fontWeight: "bold" }}>
                      {msg.appointmentDate}
                    </Text>
                  </Text>

                  {msg.appointmentStatus === "pending" && (
                    <TouchableOpacity style={styles.apptActionBtn}>
                      <Ionicons name="checkmark" size={14} color={APP_COLORS.textPrimary} />
                      <Text style={styles.apptActionText}>Mark Completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text
                style={[
                  styles.messageTime,
                  msg.senderId === "me" ? styles.timeMe : styles.timeOther,
                ]}
              >
                {msg.timestamp}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={styles.inputArea}>
        <TouchableOpacity
          onPress={() => setShowScheduleModal(true)}
          style={styles.attachBtn}
        >
          <Ionicons name="calendar" size={20} color={APP_COLORS.textSecondary} />
        </TouchableOpacity>
        <AppInput
          containerStyle={styles.messageInputWrapper}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Ionicons name="send" size={18} color={APP_COLORS.white} />
        </TouchableOpacity>
      </View>

      <Modal visible={showTagModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Labels</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Ionicons name="close" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalTagsList}>
                {activeSession?.tags.map((tag) => {
                  const style = getTagStyle(tag.name, tag.color);
                  const textStyle = getTagTextStyle(tag.name, tag.color);
                  return (
                    <View key={tag.id} style={[styles.modalTagItem, style]}>
                      <Text style={[styles.miniTagText, textStyle]}>
                        {tag.name}
                      </Text>
                      <TouchableOpacity onPress={() => removeTag(tag.id)}>
                        <Ionicons
                          name="close"
                          size={14}
                          color={textStyle.color as string}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {activeSession?.tags.length === 0 && (
                  <View>
                    <Text style={styles.emptyTagsText}>No labels yet.</Text>
                  </View>
                )}
              </View>

              <Text style={styles.label}>Add New Label</Text>
              <View style={styles.addTagRow}>
                <AppInput
                  containerStyle={styles.tagInputWrapper}
                  placeholder="Label name..."
                  value={newTagText}
                  onChangeText={setNewTagText}
                />
                <TouchableOpacity onPress={addTag} style={styles.addTagBtn}>
                  <Ionicons name="add" size={20} color={APP_COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={styles.colorRow}>
                {COLORS_PRESETS.map((c) => (
                  <TouchableOpacity
                    key={c.name}
                    onPress={() => setSelectedColor(c)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c.bg },
                      selectedColor.name === c.name &&
                        styles.colorCircleSelected,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons name="calendar" size={20} color={APP_COLORS.primary} />
                <Text style={styles.modalTitle}>Schedule Appointment</Text>
              </View>
            </View>

            <View style={styles.modalBody}>
              <AppInput
                label="Date (YYYY-MM-DD)"
                placeholder="2023-10-25"
                value={apptDate}
                onChangeText={setApptDate}
              />
              <AppInput
                label="Time (HH:MM)"
                placeholder="14:30"
                value={apptTime}
                onChangeText={setApptTime}
                leftIcon={<Ionicons name="time" size={16} color={APP_COLORS.textTertiary} />}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowScheduleModal(false)}
                  style={styles.btnSecondary}
                >
                  <Text style={styles.btnTextSec}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSchedule}
                  style={styles.btnPrimary}
                >
                  <Text style={styles.btnTextPri}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.white,
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: APP_COLORS.textPrimary,
    marginBottom: 12,
  },
  searchWrapper: {
    marginBottom: 0,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.textPrimary,
    borderColor: APP_COLORS.textPrimary,
  },
  filterChipActiveTeal: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  filterChipInactive: {
    backgroundColor: APP_COLORS.white,
    borderColor: APP_COLORS.cardBorder,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterTextActive: {
    color: APP_COLORS.white,
  },
  filterTextInactive: {
    color: APP_COLORS.textSecondary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sessionList: {
    flex: 1,
  },
  sessionItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.background,
  },
  unreadBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: APP_COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: APP_COLORS.white,
  },
  unreadText: {
    color: APP_COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  sessionInfo: {
    flex: 1,
    justifyContent: "center",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_COLORS.textPrimary,
    flex: 1,
  },
  sessionTime: {
    fontSize: 10,
    color: APP_COLORS.textTertiary,
  },
  lastMessage: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  lastMessageBold: {
    color: APP_COLORS.textPrimary,
    fontWeight: "600",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  miniTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyText: {
    color: APP_COLORS.textTertiary,
  },
  selectorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  generalChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generalChatText: {
    color: APP_COLORS.white,
    fontWeight: "600",
  },
  propertyItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
  },
  propertyThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: APP_COLORS.background,
  },
  propertyInfoCol: {
    flex: 1,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_COLORS.textPrimary,
  },
  propertyMeta: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  unreadBadgeSmall: {
    backgroundColor: APP_COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: APP_COLORS.white,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
    backgroundColor: APP_COLORS.white,
    zIndex: 10,
  },
  chatHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "bold",
    color: APP_COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: APP_COLORS.success,
  },
  statusText: {
    fontSize: 10,
    color: APP_COLORS.success,
  },
  chatHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  tagsBar: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
    backgroundColor: APP_COLORS.whiteTransparent80,
  },
  headerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  headerTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    marginBottom: 16,
    flexDirection: "row",
  },
  messageRowMe: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: APP_COLORS.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: APP_COLORS.white,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: APP_COLORS.cardBorder,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textMe: {
    color: APP_COLORS.white,
  },
  textOther: {
    color: APP_COLORS.textPrimary,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  timeMe: {
    color: APP_COLORS.whiteTransparent70,
  },
  timeOther: {
    color: APP_COLORS.textTertiary,
  },
  apptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.whiteTransparent20,
    paddingBottom: 4,
  },
  apptTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  apptDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  apptActionBtn: {
    backgroundColor: APP_COLORS.whiteTransparent90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  apptActionText: {
    fontSize: 10,
    fontWeight: "600",
    color: APP_COLORS.textPrimary,
  },
  inputArea: {
    padding: 12,
    backgroundColor: APP_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachBtn: {
    padding: 8,
  },
  messageInputWrapper: {
    flex: 1,
    marginBottom: 0,
  },
  sendBtn: {
    padding: 10,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: APP_COLORS.blackTransparent50,
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: APP_COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.background,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: APP_COLORS.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  modalTagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  modalTagItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  emptyTagsText: {
    fontSize: 12,
    color: APP_COLORS.textTertiary,
    fontStyle: "italic",
  },
  label: {
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: APP_COLORS.textTertiary,
  },
  addTagRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tagInputWrapper: {
    flex: 1,
    marginBottom: 0,
  },
  addTagBtn: {
    backgroundColor: APP_COLORS.textPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleSelected: {
    borderColor: APP_COLORS.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  btnSecondary: {
    flex: 1,
    padding: 12,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimary: {
    flex: 1,
    padding: 12,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
  },
  btnTextSec: {
    fontWeight: "600",
    color: APP_COLORS.textSecondary,
  },
  btnTextPri: {
    fontWeight: "600",
    color: APP_COLORS.white,
  },
});

export default Messaging;
