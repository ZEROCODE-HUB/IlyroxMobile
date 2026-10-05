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
  StyleSheet,
  ActivityIndicator,
  Platform,
  FlatList,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { SafePressable } from "@/design-system";

import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardProvider,
  KeyboardStickyView,
} from "react-native-keyboard-controller";

import { useComments } from "../../hooks";
import { COLORS } from "../../constants";
import { Avatar } from "../shared";
import { ViewImage } from "./ViewImage";
import { Comment } from "../../types";
import MessageInput from "../Messaging/MessageInput";
import { supabase } from "../../lib/supabase";

// ============================================================================
// Types
// ============================================================================

interface CommentsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  feedItemId: string;
  currentUserId?: string;
  highlightUserIds?: string[];
  highlightCommentIds?: string[];
  /** Callback cuando un comentario highlighteado no se encontró (fue eliminado).
   * Se llama DESPUÉS de que TODOS los comentarios se cargaron (hasMore=false). */
  onHighlightedCommentNotFound?: () => void;
}

interface CommentItemProps {
  comment: Comment;
  replies: Comment[];
  isLiked: boolean;
  onLike: () => void;
  onReply: () => void;
  highlightedUserIds?: string[];
  highlightCommentIds?: string[];
}

// ============================================================================
// Constants
// ============================================================================


// ============================================================================
// Subcomponents
// ============================================================================

const CommentItem = React.memo<CommentItemProps>(
  ({ comment, replies, isLiked, onLike, onReply, highlightedUserIds, highlightCommentIds }) => {
    // Only use highlightedUserIds for parent comments (root level).
    // For replies, ONLY highlight by exact comment ID match (highlightCommentIds).
    // This prevents "Alex replied to you" from highlighting ALL of Alex's replies.
    const isByHighlightedAuthor = !comment.parentId && (highlightedUserIds?.includes(comment.user.id) || false);
    const isExactHighlighted = highlightCommentIds?.includes(comment.id) || false;
    const isCommentHighlighted = isByHighlightedAuthor || isExactHighlighted;

    return (
      <View style={[styles.commentContainer, isCommentHighlighted && styles.highlightedComment]}>
          {isCommentHighlighted && <View style={styles.highlightIndicator} />}

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
                <SafePressable onPress={onLike} style={styles.actionButton}>
                  <Ionicons
                    name={isLiked ? "heart" : "heart-outline"}
                    size={16}
                    color={isLiked ? COLORS.error : COLORS.textTertiary}
                  />
                  {isLiked && <Text style={styles.actionText}>Like</Text>}
                </SafePressable>
                <SafePressable onPress={onReply} style={styles.actionButton}>
                  <Text style={styles.actionText}>Responder</Text>
                </SafePressable>
              </View>
            </View>
          </View>

          {replies.map((reply) => {
            // If highlightCommentIds is provided, ONLY highlight by exact comment ID match.
            // This handles the "Alex replied to your comment" case - we want only Alex's
            // specific reply highlighted, not ALL of Alex's replies.
            const isReplyExact = highlightCommentIds?.includes(reply.id) || false;
            const isReplyHighlighted = isReplyExact;
            return (
              <View key={reply.id} style={[styles.replyContainer, isReplyHighlighted && styles.highlightedReply]}>
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
                    {!!reply.imageUrl && (
                      <ViewImage
                        src={reply.imageUrl}
                        containerStyle={styles.commentImageContainer}
                        imageStyle={styles.commentImage}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
      </View>
    );
  },
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
  highlightUserIds,
  highlightCommentIds,
  onHighlightedCommentNotFound,
}: CommentsBottomSheetProps) {
  const { height: screenHeight } = useWindowDimensions();
  const modalHeight = screenHeight * 0.95;

  // State
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [highlightedUserIds, setHighlightedUserIds] = useState<string[]>([]);
  const [localHighlightCommentIds, setLocalHighlightCommentIds] = useState<string[]>([]);

  // Refs
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Data
  const {
    comments,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    posting,
    addComment,
    toggleCommentLike,
    highlightedRootIds,
  } = useComments({
    feedItemId,
    userId: currentUserId,
    userProfile: currentUserId
      ? { id: currentUserId, nombre: "Tú", foto: null }
      : undefined,
    highlightUserIds,
    highlightCommentIds,
  });

  // Derived data
  const parentComments = useMemo(
    () => comments.filter((c) => c.parentId == null),
    [comments],
  );

  // Display comments: destacados (por autor o por raíz de thread) ARRIBA.
  // Cubre: (a) raíces de autores destacados, (b) raíces ancestrales de
  // un comentario destacado (caso REPLY) gracias a highlightedRootIds.
  const displayComments = useMemo(() => {
    const authorSet = new Set(highlightedUserIds || []);
    const rootSet = new Set(highlightedRootIds || []);

    const isHighlighted = (c: Comment) =>
      (!!c.parentId === false && rootSet.has(c.id)) ||
      (authorSet.size > 0 && authorSet.has(c.user.id));

    if (authorSet.size === 0 && rootSet.size === 0) return parentComments;

    const highlighted = parentComments.filter(isHighlighted);
    const others = parentComments.filter((c) => !isHighlighted(c));
    return [...highlighted, ...others];
  }, [parentComments, highlightedUserIds, highlightedRootIds]);

  // Pre-computed map de respuestas por comment para evitar O(N²) en render
  const repliesMap = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const c of comments) {
      if (c.parentId) {
        const arr = map.get(c.parentId) || [];
        arr.push(c);
        map.set(c.parentId, arr);
      }
    }
    return map;
  }, [comments]);

  const replyToUser = useMemo(
    () => comments.find((c) => c.id === replyTo)?.user.nombre,
    [replyTo, comments],
  );

  // ============================================================================
  // Effects
  // ============================================================================

  // Focus input when replying
  useEffect(() => {
    if (replyTo && visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [replyTo, visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setReplyTo(null);
      setHighlightedUserIds([]);
      setLocalHighlightCommentIds([]);
    } else if (visible && feedItemId && currentUserId) {
      // Marcar post como visto para cancelar notificaciones duplicadas
      supabase.rpc('mark_post_as_seen', {
        p_feed_item_id: feedItemId,
        p_user_id: currentUserId
      });
    }
  }, [visible, feedItemId, currentUserId]);

  // Set highlighted users when highlightUserIds prop changes
  useEffect(() => {
    if (highlightUserIds && highlightUserIds.length > 0) {
      setHighlightedUserIds(highlightUserIds);
    }
  }, [highlightUserIds]);

  // Set highlighted comment ids when highlightCommentIds prop changes
  useEffect(() => {
    if (highlightCommentIds && highlightCommentIds.length > 0) {
      setLocalHighlightCommentIds(highlightCommentIds);
    }
  }, [highlightCommentIds]);

  // Scroll to highlighted comment when it appears in the list
  const hasScrolledToHighlightRef = useRef(false);
  useEffect(() => {
    if (!localHighlightCommentIds || localHighlightCommentIds.length === 0) return;
    if (loading) return; // Wait for loading to complete

    const findCommentIndex = () => {
      for (let i = 0; i < displayComments.length; i++) {
        if (localHighlightCommentIds.includes(displayComments[i].id)) {
          return i;
        }
        // Also check replies
        const replies = repliesMap.get(displayComments[i].id) || [];
        for (let j = 0; j < replies.length; j++) {
          if (localHighlightCommentIds.includes(replies[j].id)) {
            return i; // Scroll to parent, reply will be visible
          }
        }
      }
      return -1;
    };

    const index = findCommentIndex();
    if (index >= 0 && !hasScrolledToHighlightRef.current) {
      hasScrolledToHighlightRef.current = true;
      // Small delay to ensure list is rendered
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: Math.min(index, displayComments.length - 1),
          animated: true,
          viewPosition: 0.3, // Position in viewport (0=top, 1=bottom)
        });
      }, 150);
    }
  }, [localHighlightCommentIds, loading, displayComments, repliesMap]);

  // Check if highlighted comments still exist after ALL loading completes
  // Only show "deleted" toast when hasMore=false (fully loaded) and comment truly not found
  const deletedToastShownRef = useRef(false);
  useEffect(() => {
    if (!highlightCommentIds || highlightCommentIds.length === 0) return;
    if (loading) return;
    if (hasMore) return; // Still loading more, wait

    // Only check once
    if (deletedToastShownRef.current) return;

    const allCommentIds = comments.map((c) => c.id);
    const highlightSet = new Set(highlightCommentIds);
    const foundIds = allCommentIds.filter((id) => highlightSet.has(id));

    // Only show toast if NONE of the highlightCommentIds were found
    if (foundIds.length === 0) {
      deletedToastShownRef.current = true;
      onHighlightedCommentNotFound?.();
    }
  }, [loading, hasMore, comments, highlightCommentIds, onHighlightedCommentNotFound]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSendCombined = useCallback(
    async (text?: string, imageUri?: string) => {
      const success = await addComment(
        text || undefined,
        imageUri || undefined,
        replyTo || undefined,
      );

      if (success) {
        setReplyTo(null);
        // DESC: nuevo arriba -> scrollear al inicio
        setTimeout(
          () => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }),
          100,
        );
      }
    },
    [replyTo, addComment],
  );

  const handleLikeComment = useCallback(
    (commentId: string) => {
      toggleCommentLike(commentId);
    },
    [toggleCommentLike],
  );

  // ============================================================================
  // Render helpers
  // ============================================================================

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => {
      // Only use highlightedUserIds for parent comments (root level).
      // For replies, ONLY highlight by exact comment ID.
      const isByHighlightedAuthor = !item.parentId && (highlightedUserIds?.includes(item.user.id) || false);
      const isExactHighlighted = localHighlightCommentIds?.includes(item.id) || false;
      const isItemHighlighted = isByHighlightedAuthor || isExactHighlighted;
      return (
        <View style={isItemHighlighted ? styles.listItemFullWidth : styles.listItemWrap}>
          <CommentItem
            comment={item}
            replies={repliesMap.get(item.id) || []}
            isLiked={!!item.isLiked}
            onLike={() => handleLikeComment(item.id)}
            onReply={() => setReplyTo(item.id)}
            highlightedUserIds={highlightedUserIds}
            highlightCommentIds={localHighlightCommentIds}
          />
        </View>
      );
    },
    [repliesMap, handleLikeComment, highlightedUserIds, localHighlightCommentIds],
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

  const ListFooterComponent = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      );
    }
    if (hasMore && displayComments.length > 0) {
      return (
        <SafePressable
          style={styles.loadMoreButton}
          onPress={loadMore}
          activeOpacity={0.7}
        >
          <Text style={styles.loadMoreText}>Ver más comentarios</Text>
        </SafePressable>
      );
    }
    return null;
  }, [loadingMore, hasMore, loadMore, displayComments.length]);

  // ============================================================================
  // Render
  // ============================================================================

  const renderHeader = () => (
    <>
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Comentarios ({totalCount})
        </Text>
        <SafePressable
          onPress={handleClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </SafePressable>
      </View>
    </>
  );

  const renderFooter = () => (
    <>
      {/* Context bar (reply) */}
      {replyTo && (
        <View style={styles.contextBar}>
          <View style={styles.replyBadge}>
            <Text style={styles.replyBadgeText}>
              Respondiendo a:{" "}
              <Text style={styles.replyBadgeName}>{replyToUser}</Text>
            </Text>
            <SafePressable onPress={() => setReplyTo(null)}>
              <Ionicons
                name="close"
                size={20}
                color={COLORS.textSecondary}
              />
            </SafePressable>
          </View>
        </View>
      )}

      {/* MessageInput */}
      <View style={{ marginBottom: Platform.OS === "android" ? 0 : 30 }}>
        <MessageInput
          ref={inputRef}
          onSendCombined={handleSendCombined}
          sending={posting}
          mediaType="Images"
        />
      </View>
    </>
  );

  return (
    <AppBottomSheet visible={visible} onClose={handleClose} statusBarTranslucent>
      <View style={[styles.sheet, { height: modalHeight }]}>
        <KeyboardProvider>
          {renderHeader()}

          {/* Comments List */}
          <FlatList
            ref={flatListRef}
            data={displayComments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              displayComments.length === 0 && styles.listContentEmpty,
            ]}
            ListEmptyComponent={ListEmptyComponent}
            ListFooterComponent={ListFooterComponent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          <KeyboardStickyView offset={{ opened: Platform.OS === "ios" ? 12 :42}}>
            {renderFooter()}
          </KeyboardStickyView>
        </KeyboardProvider>
      </View>
    </AppBottomSheet>
  );
}
const styles = StyleSheet.create({
  // Modal structure
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  listItemWrap: {
    paddingHorizontal: 16,
  },
  listItemFullWidth: {
    paddingHorizontal: 0,
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

  // Footer / load more
  footerContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadMoreButton: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    marginVertical: 12,
  },
  loadMoreText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
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

  // Input area (legacy styles removed, keeping contextBar for reply)
  contextBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: COLORS.white,
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

  // Highlight styles for comment notifications
  highlightedComment: {
    backgroundColor: COLORS.primaryTransparent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginVertical: 4,
    opacity: 0.85,
  },
  highlightIndicator: {
    display: 'none',
  },
  highlightedReply: {
    backgroundColor: COLORS.primaryTransparent,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginHorizontal: -16,
    opacity: 0.85,
  },
  highlightBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  highlightBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
