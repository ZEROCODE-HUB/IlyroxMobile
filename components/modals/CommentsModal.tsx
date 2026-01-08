import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { useComments } from "../../hooks";
import { COLORS } from "../../constants";
import { Avatar } from "../shared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ViewImage } from "./ViewImage";
import { useStableSafeInsets } from "../../context/SafeInsetsContext";

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

export default function CommentsModal({
  visible,
  onClose,
  feedItemId,
  currentUserId,
}: CommentsModalProps) {
  const { height: screenH } = Dimensions.get("window");
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string>("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const { bottom: stableBottom } = useStableSafeInsets();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const translateY = React.useRef(new Animated.Value(0)).current;

  // Detectar cuando el teclado aparece/desaparece
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Hook de comentarios real
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
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderGrant: () => setIsDragging(true),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) {
          Animated.timing(translateY, {
            toValue: screenH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
        setIsDragging(false);
      },
    })
  ).current;

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
      if (!(result as any).canceled) {
        const uri = (result as any).assets?.[0]?.uri || (result as any).uri;
        if (uri) setImageUri(uri);
      }
    } catch {}
  };

  const handleLikeComment = async (commentId: string) => {
    const success = await toggleCommentLike(commentId);
    if (success) {
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        newSet.has(commentId)
          ? newSet.delete(commentId)
          : newSet.add(commentId);
        return newSet;
      });
    }
  };

  const replyToUser = replyTo
    ? comments.find((c) => c.id === replyTo)?.user.nombre
    : null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.commentsModal,
            {
              transform: [{ translateY }],
              maxHeight: screenH - insets.top - 20,
              height:
                keyboardHeight > 0
                  ? screenH - keyboardHeight - insets.top - 20
                  : screenH * 0.8,
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>
                Comentarios ({comments.length})
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoidingView}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.commentsContent}
              contentContainerStyle={styles.commentsContentContainer}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!isDragging}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Cargando...</Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.noCommentsText}>
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
                      <View key={comment.id}>
                        <View style={styles.commentItem}>
                          <Avatar
                            uri={comment.user.avatar}
                            name={comment.user.nombre}
                            size={32}
                          />
                          <View style={styles.commentContent}>
                            <View style={styles.commentBubble}>
                              <View style={styles.commentHeader}>
                                <Text style={styles.commentUser}>
                                  {comment.user.nombre}
                                </Text>
                                <Text style={styles.commentTime}>
                                  {comment.timestamp || ""}
                                </Text>
                              </View>
                              {!!comment.text && (
                                <Text style={styles.commentText}>
                                  {comment.text || ""}
                                </Text>
                              )}
                              {comment.imageUrl && (
                                <ViewImage
                                  src={comment.imageUrl}
                                  containerStyle={{
                                    width: "100%",
                                    height: 250,
                                    marginVertical: 10,
                                  }}
                                  imageStyle={styles.imagePreviewBar}
                                />
                              )}
                            </View>
                            <View style={styles.commentActionsRow}>
                              <TouchableOpacity
                                onPress={() => handleLikeComment(comment.id)}
                                style={styles.likeButton}
                              >
                                <Ionicons
                                  name={isLiked ? "heart" : "heart-outline"}
                                  size={18}
                                  color={
                                    isLiked ? COLORS.error : COLORS.textTertiary
                                  }
                                />
                                {isLiked && (
                                  <Text style={styles.likeText}>1</Text>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setReplyTo(comment.id)}
                                style={styles.replyButton}
                              >
                                <Ionicons
                                  name="chatbubble-outline"
                                  size={16}
                                  color={COLORS.textTertiary}
                                />
                                <Text style={styles.replyText}>Responder</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                        {replies.map((reply) => (
                          <View key={reply.id} style={styles.replyItem}>
                            <Avatar
                              uri={reply.user.avatar}
                              name={reply.user.nombre}
                              size={24}
                            />
                            <View style={styles.replyContent}>
                              <View style={styles.replyBubble}>
                                <View style={styles.commentHeader}>
                                  <Text style={styles.commentUser}>
                                    {reply.user.nombre}
                                  </Text>
                                  <Text style={styles.commentTime}>
                                    {reply.timestamp}
                                  </Text>
                                </View>
                                {!!reply.text && (
                                  <Text style={styles.commentText}>
                                    {reply.text || ""}
                                  </Text>
                                )}
                                {reply.imageUrl && (
                                  <ViewImage
                                    src={reply.imageUrl}
                                    containerStyle={{
                                      width: "100%",
                                      height: 250,
                                      marginVertical: 10,
                                    }}
                                    imageStyle={styles.imagePreviewBar}
                                  />
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })
              )}
            </ScrollView>

            <View
              style={[
                styles.footerContainer,
                { paddingBottom: Math.max(16, stableBottom) },
              ]}
            >
              {/* 1. Previsualización de Imagen AHORA ARRIBA del input */}
              {!!imageUri && (
                <View style={styles.imagePreviewWrapper}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImageMini}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButtonMini}
                    onPress={() => setImageUri("")}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={COLORS.error}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. Etiqueta de respuesta */}
              {replyTo && (
                <View style={styles.replyLabel}>
                  <Text style={styles.replyLabelText}>
                    Respondiendo a {replyToUser || "usuario"}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}>
                    <Ionicons
                      name="close"
                      size={16}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* 3. Input de texto y botones */}
              <View style={styles.commentInputRow}>
                <AppInput
                  containerStyle={styles.flex1}
                  placeholder="Escribe un comentario..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  inputStyle={styles.inputStyleAdjust}
                  maxLength={500}
                  editable={!posting}
                  onFocus={() => {
                    // Scroll al final cuando se enfoca el input
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                />

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.iconAction}
                    onPress={handlePickImage}
                    disabled={posting}
                  >
                    <Ionicons
                      name="images-outline"
                      size={24}
                      color={imageUri ? COLORS.primary : COLORS.textTertiary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !commentText.trim() &&
                        !imageUri &&
                        styles.sendButtonDisabled,
                    ]}
                    onPress={handlePostComment}
                    disabled={(!commentText.trim() && !imageUri) || posting}
                  >
                    {posting ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons
                        name="send"
                        size={22}
                        color={
                          commentText.trim() || imageUri
                            ? COLORS.primary
                            : COLORS.textDisabled
                        }
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.overlay,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
  },
  commentsModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  dragHandle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.cardBorder,
    marginTop: 10,
  },
  commentsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  commentsContent: {
    flex: 1,
    padding: 16,
  },
  commentsContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  emptyState: { padding: 40, alignItems: "center" },
  noCommentsText: { color: COLORS.textTertiary, fontSize: 14 },
  commentItem: { flexDirection: "row", marginBottom: 16, gap: 12 },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardBorder,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    minWidth: 0, // Permite que el flex funcione correctamente
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUser: { fontWeight: "600", fontSize: 13, color: COLORS.textPrimary },
  commentTime: { fontSize: 10, color: COLORS.textTertiary },
  commentText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    flexShrink: 1,
  },
  commentContent: { flex: 1 },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingLeft: 12,
  },
  likeText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },
  commentImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: COLORS.cardBorder,
  },
  commentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    paddingLeft: 12,
  },
  replyButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  replyText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  replyLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  replyLabelText: { fontSize: 12, color: COLORS.textSecondary },
  attachButton: { padding: 8 },
  sendButton: { padding: 8 },
  sendButtonDisabled: { opacity: 0.5 },
  imagePreviewBar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
    backgroundColor: COLORS.cardBorder,
  },
  removeImageButton: { position: "absolute", top: 8, right: 24 },
  replyItem: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
    paddingLeft: 56,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.cardBorder,
  },
  replyContent: { flex: 1 },
  replyBubble: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 10,
    borderTopLeftRadius: 4,
    minWidth: 0, // Permite que el flex funcione correctamente
  },
  footerContainer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    width: "100%",
  },
  imagePreviewWrapper: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  previewImageMini: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButtonMini: {
    position: "absolute",
    top: 4,
    left: 72,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
    width: "100%",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
  },
  iconAction: {
    padding: 8,
  },
  inputStyleAdjust: {
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  flex1: { flex: 1, marginBottom: 0 },
});
