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
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
  Platform,
  TextInput,
  BackHandler,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useComments } from "../../hooks";
import { COLORS } from "../../constants";
import { Avatar } from "../shared";
import { ViewImage } from "./ViewImage";
import * as ImagePicker from "expo-image-picker";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { CommentInput } from "../inputs/CommentInput";

interface CommentsBottomSheetProps {
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

export default function CommentsBottomSheet({
  visible,
  onClose,
  feedItemId,
  currentUserId,
}: CommentsBottomSheetProps) {
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string>("");
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const bottomSheetRef = useRef<BottomSheet>(null);
  const inputRef = useRef<TextInput>(null);

  const snapPoints = useMemo(() => ["70%"], []);

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

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isKeyboardVisible) {
          Keyboard.dismiss();
          return true;
        }
        onClose();
        return true;
      }
    );
    return () => backHandler.remove();
  }, [visible, isKeyboardVisible, onClose]);

  useEffect(() => {
    if (replyTo) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [replyTo]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        Keyboard.dismiss();
        onClose();
      }
    },
    [onClose]
  );

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
      if (newSet.has(commentId)) newSet.delete(commentId);
      else newSet.add(commentId);
      return newSet;
    });
    toggleCommentLike(commentId);
  };

  const replyToUser = replyTo
    ? comments.find((c) => c.id === replyTo)?.user.nombre
    : null;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Context bar for reply/image
  const replyContextElement = useMemo(() => {
    if (!replyTo && !imageUri) return null;

    return (
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
    );
  }, [replyTo, imageUri, replyToUser]);

  if (!visible) return null;

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.handleIndicator}
        backgroundStyle={styles.sheetBackground}
        enableDynamicSizing={false}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Comentarios ({comments.length})</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Lista de comentarios */}
          <BottomSheetScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
                .map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    replies={comments.filter((c) => c.parentId === comment.id)}
                    isLiked={likedComments.has(comment.id)}
                    onLike={() => handleLikeComment(comment.id)}
                    onReply={(id: string) => setReplyTo(id)}
                  />
                ))
            )}
            {/* Spacer para evitar que el último comentario quede oculto */}
            <View style={{ height: 120 }} />
          </BottomSheetScrollView>
        </View>
      </BottomSheet>

      {/* Input que se posiciona de forma independiente */}
      {visible && (
        <CommentInput
          ref={inputRef}
          value={commentText}
          onChangeText={setCommentText}
          onSend={handlePostComment}
          onPickImage={handlePickImage}
          hasImage={!!imageUri}
          isLoading={posting}
          disableSend={!commentText.trim() && !imageUri}
          replyContext={replyContextElement}
        />
      )}
    </>
  );
}

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
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#E5E5E5",
    width: 40,
    height: 5,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  centerContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textTertiary,
  },
  contextBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
});
