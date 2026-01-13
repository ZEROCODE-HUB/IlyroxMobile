/**
 * CommentsBottomSheet
 *
 * Modal de comentarios estilo bottom sheet con:
 * - Lista de comentarios con respuestas anidadas
 * - Input para nuevo comentario con soporte de imágenes
 * - Animación suave del teclado
 * - Optimistic updates via useComments hook
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
  Platform,
  Modal,
  FlatList,
  TextInput,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { useComments } from "../../hooks";
import { COLORS } from "../../constants";
import { Avatar } from "../shared";
import { ViewImage } from "./ViewImage";
import { Comment } from "../../types";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

// ============================================================================
// Types
// ============================================================================

interface CommentsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  feedItemId: string;
  currentUserId?: string;
}

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  isLiked: boolean;
  onLike: () => void;
  onReply: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.75;

// ============================================================================
// Subcomponents
// ============================================================================

const CommentItem = React.memo<CommentItemProps>(
  ({ comment, replies, isLiked, onLike, onReply }) => (
    <ScreenWrapper withHeader={false}>
      <View style={styles.commentContainer}>
        {/* Comentario principal */}
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
                <Text style={styles.timestamp}>{comment.timestamp}</Text>
              </View>
              {!!comment.text && (
                <Text style={styles.commentText}>{comment.text}</Text>
              )}
              {!!comment.imageUrl && (
                <ViewImage
                  src={comment.imageUrl}
                  containerStyle={styles.commentImageContainer}
                  imageStyle={styles.commentImage}
                />
              )}
            </View>

            <View style={styles.commentActions}>
              <TouchableOpacity onPress={onLike} style={styles.actionButton}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={16}
                  color={isLiked ? COLORS.error : COLORS.textTertiary}
                />
                {isLiked && <Text style={styles.actionText}>Like</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={onReply} style={styles.actionButton}>
                <Text style={styles.actionText}>Responder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Respuestas */}
        {replies.map((reply) => (
          <View key={reply.id} style={styles.replyContainer}>
            <Avatar
              uri={reply.user.avatar}
              name={reply.user.nombre}
              size={28}
            />
            <View style={styles.commentBody}>
              <View style={styles.bubble}>
                <View style={styles.bubbleHeader}>
                  <Text style={styles.userName}>{reply.user.nombre}</Text>
                  <Text style={styles.timestamp}>{reply.timestamp}</Text>
                </View>
                {!!reply.text && (
                  <Text style={styles.commentText}>{reply.text}</Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  )
);

CommentItem.displayName = "CommentItem";

// ============================================================================
// Main Component
// ============================================================================

export default function CommentsBottomSheet({
  visible,
  onClose,
  feedItemId,
  currentUserId,
}: CommentsBottomSheetProps) {
  const insets = useSafeAreaInsets();

  // State
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  // Refs
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const translateY = useRef(new Animated.Value(0)).current;

  // Data
  const { comments, loading, posting, addComment, toggleCommentLike } =
    useComments({
      feedItemId,
      userId: currentUserId,
      userProfile: currentUserId
        ? { id: currentUserId, nombre: "Tú", foto: null }
        : undefined,
    });

  // Derived data
  const parentComments = useMemo(
    () => comments.filter((c) => c.parentId == null),
    [comments]
  );

  const replyToUser = useMemo(
    () => comments.find((c) => c.id === replyTo)?.user.nombre,
    [replyTo, comments]
  );

  const canSend = Boolean(commentText.trim() || imageUri);

  // ============================================================================
  // Effects
  // ============================================================================

  // Keyboard animation - only when modal is visible
  useEffect(() => {
    if (!visible) return;

    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(translateY, {
        toValue: -e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [visible, translateY]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setCommentText("");
      setImageUri("");
      setReplyTo(null);
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  // Focus input when replying
  useEffect(() => {
    if (replyTo && visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [replyTo, visible]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handlePostComment = useCallback(async () => {
    if (!canSend) return;

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
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100
      );
    }
  }, [commentText, imageUri, replyTo, canSend, addComment]);

  const handlePickImage = useCallback(async () => {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const handleLikeComment = useCallback(
    (commentId: string) => {
      setLikedComments((prev) => {
        const next = new Set(prev);
        next.has(commentId) ? next.delete(commentId) : next.add(commentId);
        return next;
      });
      toggleCommentLike(commentId);
    },
    [toggleCommentLike]
  );

  // ============================================================================
  // Render helpers
  // ============================================================================

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentItem
        comment={item}
        replies={comments.filter((c) => c.parentId === item.id)}
        isLiked={likedComments.has(item.id)}
        onLike={() => handleLikeComment(item.id)}
        onReply={() => setReplyTo(item.id)}
      />
    ),
    [comments, likedComments, handleLikeComment]
  );

  const ListEmptyComponent = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>¡Sé el primero en comentar!</Text>
      </View>
    );
  }, [loading]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height: MODAL_HEIGHT,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Comentarios ({comments.length})</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <FlatList
            ref={flatListRef}
            data={parentComments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              parentComments.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={ListEmptyComponent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {/* Input Area */}
          <View style={styles.inputArea}>
            {/* Context bar (reply / image preview) */}
            {(replyTo || imageUri) && (
              <View style={styles.contextBar}>
                {!!imageUri && (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      onPress={() => setImageUri("")}
                      style={styles.removePreview}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={COLORS.white}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                {!!replyTo && (
                  <View style={styles.replyBadge}>
                    <Text style={styles.replyBadgeText}>
                      Respondiendo a:{" "}
                      <Text style={styles.replyBadgeName}>{replyToUser}</Text>
                    </Text>
                    <TouchableOpacity onPress={() => setReplyTo(null)}>
                      <Ionicons
                        name="close"
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Input row */}
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  placeholder="Escribe un comentario..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                  autoCapitalize="sentences"
                />
              </View>

              <TouchableOpacity
                onPress={handlePickImage}
                disabled={posting}
                style={styles.iconButton}
              >
                <Ionicons
                  name="images-outline"
                  size={24}
                  color={imageUri ? COLORS.primary : COLORS.textTertiary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePostComment}
                disabled={!canSend || posting}
                style={[
                  styles.sendButton,
                  !canSend && styles.sendButtonDisabled,
                ]}
              >
                {posting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="send" size={18} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  // Modal structure
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },

  // Handle
  handleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 3,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },

  // List
  list: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 15,
  },

  // Comment item
  commentContainer: {
    marginBottom: 5,
  },
  commentMain: {
    flexDirection: "row",
    gap: 12,
  },
  commentBody: {
    flex: 1,
  },
  bubble: {
    backgroundColor: COLORS.white,
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
  timestamp: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  commentImageContainer: {
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
  commentActions: {
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

  // Input area
  inputArea: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  contextBar: {
    marginBottom: 12,
  },
  previewContainer: {
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removePreview: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.error,
    borderRadius: 12,
  },
  replyBadge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
  },
  replyBadgeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  replyBadgeName: {
    fontWeight: "bold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    minHeight: 40,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: COLORS.textPrimary,
    maxHeight: 80,
    padding: 0,
    margin: 0,
  },
  iconButton: {
    padding: 8,
    marginBottom: 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
});
