import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import { Avatar } from "../shared";
import { COLORS } from "../../constants";
import { useTags } from "../../hooks/hooks/messaging";
import { useState, useEffect } from "react";
import TagsModal from "./TagsModal";
import CreateAppointmentModal from "../Appointments/CreateAppointmentModal";
import { useRouter } from "expo-router";
import { Image } from "expo-image";

export default function HeaderChat({
  onBack,
  otherUser,
  userId,
  propertyId,
  conversationId,
}: {
  onBack: () => void;
  otherUser: any;
  userId: string;
  propertyId?: string | null;
  conversationId: string;
}) {
  const [conversationTags, setConversationTags] = useState<any[]>([]);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const router = useRouter();

  const {
    tags,
    assignTag,
    removeTag,
    getConversationTags,
    createTag,
    updateTag,
  } = useTags(userId);

  // Load tags when conversationId changes and is not "new"
  const loadTags = async () => {
    if (conversationId && conversationId !== "new") {
      const tags = await getConversationTags(conversationId);
      setConversationTags(tags);
    } else {
      setConversationTags([]);
    }
  };

  useEffect(() => {
    loadTags();
  }, [conversationId]);

  const handleAssignTag = async (tagId: string) => {
    if (!conversationId || conversationId === "new") {
      Alert.alert(
        "Error",
        "Envía un mensaje primero para poder asignar etiquetas",
      );
      return false;
    }
    const success = await assignTag(conversationId, tagId);
    if (success) {
      loadTags();
    }
    return success;
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!conversationId || conversationId === "new") return false;
    const success = await removeTag(conversationId, tagId);
    if (success) {
      loadTags();
    }
    return success;
  };

  const handleUpdateTag = async (id: string, name: string, color: string) => {
    const success = await updateTag(id, name, color);
    if (success) loadTags();
    return success;
  };

  return (
    <View style={[styles.header]}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons
          name="chevron-back-outline"
          size={28}
          color={COLORS.textPrimary}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.headerUser}
        onPress={() =>
          router.push({
            pathname: "/(stack)/user/[id]",
            params: { id: otherUser.id },
          })
        }
      >
        <Avatar uri={otherUser.foto} name={otherUser.nombre} size={40} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherUser.nombre}
          </Text>
          {propertyId && (
            <Text style={styles.headerSubtitle}>Chat de propiedad</Text>
          )}
          {conversationTags.length > 0 && (
            <View style={styles.headerTagsContainer}>
              {conversationTags.slice(0, 2).map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.headerTagBadge,
                    { backgroundColor: tag.color },
                  ]}
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
          name="pricetag-outline"
          size={22}
          color={
            conversationTags.length > 0 ? COLORS.primary : COLORS.textSecondary
          }
        />
      </TouchableOpacity>

      {propertyId && (
        <TouchableOpacity
          onPress={() => setShowAppointmentModal(true)}
          style={styles.headerButton}
        >
          <Image
            source={require("@/assets/google-calendar-svg.svg")}
            style={{ width: 30, height: 30 }}
          />
        </TouchableOpacity>
      )}

      {showTagsModal && (
        <TagsModal
          visible={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          availableTags={tags}
          assignedTags={conversationTags}
          onAssignTag={handleAssignTag}
          onRemoveTag={handleRemoveTag}
          onCreateTag={createTag}
          onUpdateTag={handleUpdateTag}
        />
      )}

      {showAppointmentModal && propertyId && (
        <CreateAppointmentModal
          visible={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
          propertyId={propertyId}
          otherUserId={otherUser.id}
          currentUserId={userId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    gap: 8,
    marginTop: 10,
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
});
