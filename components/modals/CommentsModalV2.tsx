import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useComments } from "../../hooks";
import { COLORS } from "../../constants";
import { Avatar } from "../shared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ViewImage } from "./ViewImage";
import { CommentInput } from "../inputs/CommentInput";
import * as ImagePicker from "expo-image-picker";

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  feedItemId: string;
  currentUserId?: string;
  currentUserProfile?: {
    id: string;
    nombre: string;
    foto: string | null;
  };
}

export default function CommentsModalV2({
  visible,
  onClose,
  feedItemId,
  currentUserId,
  extraBottom,
}: CommentsModalProps & { extraBottom?: number }) {
  const { height: screenH } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string>("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<any>(null);

  // Hook logic
  const { comments, loading, posting, addComment, toggleCommentLike } =
    useComments({
      feedItemId,
      userId: currentUserId,
      userProfile: currentUserId
        ? {
            id: currentUserId,
            nombre: "Tú",
            foto: null,
          }
        : undefined,
    });

  // Auto-scroll on reply
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  const handlePostComment = async () => {
    if (!commentText.trim() && !imageUri.trim()) return;
    const success = await addComment(
      commentText,
      imageUri,
      replyTo || undefined
    );
    if (success) {
      setCommentText("");
      setImageUri("");
      setReplyTo(null);
      Keyboard.dismiss();
    }
  };

  const handlePickImage = async () => {
    try {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri;
        if (uri) setImageUri(uri);
      }
    } catch (e) {
      console.error("Error picking image", e);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    setLikedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });

    try {
      const success = await toggleCommentLike(commentId);
      if (!success) {
        setLikedComments((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(commentId)) newSet.delete(commentId);
          else newSet.add(commentId);
          return newSet;
        });
      }
    } catch (error) {
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(commentId)) newSet.delete(commentId);
        else newSet.add(commentId);
        return newSet;
      });
    }
  };

  const replyToUser = replyTo
    ? comments.find((c) => c.id === replyTo)?.user.nombre
    : null;

  // Componente del input (se usa en ambas plataformas)
  const renderInput = () => (
    <>
      {/* Barra de contexto (reply/imagen) */}
      {(replyTo || imageUri) && (
        <View style={styles.contextBar}>
          {!!imageUri && (
            <View style={styles.previewImageContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity
                onPress={() => setImageUri("")}
                style={styles.removeImage}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          {!!replyTo && (
            <View style={styles.replyContext}>
              <Text style={styles.replyText}>
                Respondiendo a:{" "}
                <Text style={{ fontWeight: "bold" }}>{replyToUser}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Input de comentario */}
      <CommentInput
        ref={inputRef}
        value={commentText}
        onChangeText={setCommentText}
        onSend={handlePostComment}
        isLoading={posting}
        onPickImage={handlePickImage}
        hasImage={!!imageUri}
        disableSend={!commentText.trim() && !imageUri}
        containerStyle={{
          paddingBottom: Math.max(insets.bottom + (extraBottom || 0), 16),
        }}
      />
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop para cerrar */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        {/* Contenedor del modal */}
          {/* Ajustar altura y padding inferior para dejar espacio extra si se solicita */}
          <View
            style={[
              styles.modalContainer,
              { height: screenH * 0.9, paddingBottom: Math.max(insets.bottom + (extraBottom || 0), 16) },
            ]}
          >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragIndicator} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>Comentarios ({comments.length})</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de comentarios */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={true}
          >
            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>
                  ¡Sé el primero en comentar!
                </Text>
              </View>
            ) : (
              comments
                .filter((c) => !c.parentId)
                .map((comment) => {
                  const isLiked = likedComments.has(comment.id);
                  const replies = comments.filter(
                    (c) => c.parentId === comment.id
                  );
                  return (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      replies={replies}
                      isLiked={isLiked}
                      onLike={() => handleLikeComment(comment.id)}
                      onReply={(id: string) => {
                        setReplyTo(id);
                      }}
                    />
                  );
                })
            )}
          </ScrollView>

          {/* Input */}
          {renderInput()}
        </View>
      </View>
    </Modal>
  );
}

// Subcomponente para renderizar un comentario y sus respuestas
function CommentItem({ comment, replies, isLiked, onLike, onReply }: any) {
  return (
    <View style={styles.commentContainer}>
      <View style={styles.commentMain}>
        <Avatar
          uri={comment.user.avatar}
          name={comment.user.nombre}
          size={36}
        />
        <View style={styles.commentBody}>
          <View style={styles.bubble}>
            <View style={styles.bubbleHeader}>
              <Text style={styles.userName}>{comment.user.nombre}</Text>
              <Text style={styles.time}>{comment.timestamp}</Text>
            </View>
            {!!comment.text && (
              <Text style={styles.commentText}>{comment.text}</Text>
            )}
            {!!comment.imageUrl && (
              <ViewImage
                src={comment.imageUrl}
                containerStyle={styles.imageContainer}
                imageStyle={styles.commentImage}
              />
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onLike} style={styles.actionButton}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={16}
                color={isLiked ? COLORS.error : COLORS.textTertiary}
              />
              {isLiked && <Text style={styles.actionText}>Like</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReply(comment.id)}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Responder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Respuestas */}
      {replies.map((reply: any) => (
        <View key={reply.id} style={styles.replyContainer}>
          <Avatar uri={reply.user.avatar} name={reply.user.nombre} size={28} />
          <View style={styles.commentBody}>
            <View style={styles.bubble}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.userName}>{reply.user.nombre}</Text>
                <Text style={styles.time}>{reply.timestamp}</Text>
              </View>
              {!!reply.text && (
                <Text style={styles.commentText}>{reply.text}</Text>
              )}
              {!!reply.imageUrl && (
                <ViewImage
                  src={reply.imageUrl}
                  containerStyle={styles.imageContainer}
                  imageStyle={styles.commentImage}
                />
              )}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E5E5",
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textTertiary,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentMain: {
    flexDirection: "row",
    gap: 12,
  },
  commentBody: {
    flex: 1,
  },
  bubble: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  bubbleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  userName: {
    fontWeight: "600",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  imageContainer: {
    marginTop: 8,
    width: "100%",
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
  },
  commentImage: {
    width: "100%",
    height: "100%",
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
    paddingLeft: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  replyContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    paddingLeft: 48,
  },
  contextBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    padding: 12,
  },
  replyContext: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
  },
  replyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  previewImageContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImage: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
  },
  inputAccessoryContainer: {
    backgroundColor: "#FFFFFF",
  },
});
