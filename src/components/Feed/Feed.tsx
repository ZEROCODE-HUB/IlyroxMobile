import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewToken,
  RefreshControl,
  Platform,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { FeedItem, User } from "../../types";
import UsersSlider from "../UsersSlider";
import { ReelCard, PropertyCard, PostCard } from "../cards";

import {
  useFocusEffect,
  useNavigation,
  useIsFocused,
} from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";
import { useFeed, useUserApprovals } from "@/hooks/hooks";

interface FeedProps {
  currentUserId?: string;
  currentUserState?: string;
  onUserClick?: (user: User) => void;
  onScroll?: (offset: number) => void;
  scrollEnabled?: boolean;
  refreshTimestamp?: number;
}

const Feed: React.FC<FeedProps> = ({
  currentUserId,
  currentUserState,
  onUserClick,
  onScroll,
  scrollEnabled = true,
  refreshTimestamp,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [scrollOffset, setScrollOffset] = useState(0);
  const [activeCommentItem, setActiveCommentItem] = useState<FeedItem | null>(
    null,
  );
  const flatListRef = useRef<any>(null);

  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

  // Hooks de datos reales
  const {
    items,
    loading,
    refreshing,
    hasMore,
    loadMore,
    refresh,
    refreshUserStats,
  } = useFeed({
    userId: currentUserId,
    pageSize: 20,
    enableAutoRefresh: true,
  });

  useFocusEffect(
    useCallback(() => {
      refreshUserStats();
    }, [refreshUserStats]),
  );

  useEffect(() => {
    if (refreshTimestamp) {
      refresh();
    }
  }, [refreshTimestamp, refresh]);

  const dynamicPaddingTop = useMemo(() => {
    return Platform.OS === "ios" ? insets.top + 140 : insets.top + 130;
  }, [insets.top]);

  const {
    pendingUsers,
    loading: loadingApprovals,
    approveUser,
    rejectUser,
  } = useUserApprovals(currentUserId, currentUserState);

  // Banner de notificación
  const [bannerText, setBannerText] = useState("");
  const [bannerVisible, setBannerVisible] = useState(false);
  const bannerAnim = useRef(new Animated.Value(0)).current;

  // Viewability config

  const onViewableItemsChanged = useRef(
    ({
      viewableItems,
      changed,
    }: {
      viewableItems: ViewToken[];
      changed: ViewToken[];
    }) => {
      if (viewableItems.length > 0) {
        const firstVisible = viewableItems[0];
        setFocusedItemId((prevId) => {
          if (prevId !== firstVisible.item.id) {
            return firstVisible.item.id;
          }
          return prevId;
        });
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 200,
  }).current;

  const showBanner = useCallback(
    (text: string) => {
      setBannerText(text);
      setBannerVisible(true);
      Animated.timing(bannerAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(bannerAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setBannerVisible(false);
          });
        }, 1200);
      });
    },
    [bannerAnim],
  );

  const handleOpenDetail = useCallback(
    (item: FeedItem) => {
      if (item.type === "property" && item.propertyDetails?.id) {
        navigation.navigate("(stack)", {
          screen: "property/[id]",
          params: { id: item.propertyDetails.id },
        });
      } else if (item.type === "reel") {
        navigation.navigate("(stack)", {
          screen: "reel/[id]",
          params: {
            id: item.id,
            item: JSON.stringify(item),
          },
        });
      } else if (item.type === "post") {
        navigation.push("(stack)", {
          screen: "post/[id]",
          params: { id: item.id },
        });
      }
    },
    [navigation],
  );

  const handleScroll = useCallback(
    (event: any) => {
      const currentOffset = event.nativeEvent.contentOffset.y;
      setScrollOffset(currentOffset);
      onScroll?.(currentOffset);
    },
    [onScroll],
  );

  const handleOpenComments = useCallback((item: FeedItem) => {
    setActiveCommentItem(item);
  }, []);

  const handleCloseComments = useCallback(() => {
    setActiveCommentItem(null);
  }, []);

  const handleApproveUser = useCallback(
    async (user: User) => {
      const success = await approveUser(user.id);
      if (success) {
        showBanner("¡Aprobación enviada!");
      }
    },
    [approveUser, showBanner, onUserClick],
  );

  const handleRejectUser = useCallback(
    (user: User) => {
      rejectUser(user.id);
      showBanner("Aprobación rechazada");
    },
    [rejectUser, showBanner],
  );

  // Renderizar item según su tipo
  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => {
      const isVisible = item.id === focusedItemId && isFocused;

      switch (item.type) {
        case "reel":
          return (
            <ReelCard
              item={item}
              onClick={() => handleOpenDetail(item)}
              onUserClick={onUserClick}
              onCommentClick={() => handleOpenComments(item)}
              isVisible={isVisible}
              currentUserId={currentUserId}
            />
          );
        case "property":
          return (
            <PropertyCard
              item={item}
              onClick={() => {
                handleOpenDetail(item);
              }}
              onUserClick={onUserClick}
              onCommentClick={() => handleOpenComments(item)}
              currentUserId={currentUserId}
            />
          );
        default:
          return (
            <PostCard
              item={item}
              onClick={() => {
                handleOpenDetail(item);
              }}
              onUserClick={onUserClick}
              onCommentClick={() => handleOpenComments(item)}
              currentUserId={currentUserId}
            />
          );
      }
    },
    [
      handleOpenDetail,
      handleOpenComments,
      onUserClick,
      focusedItemId,
      currentUserId,
    ],
  );

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const ListHeader = useMemo(
    () => (
      <UsersSlider
        users={pendingUsers}
        onUserClick={onUserClick}
        onApprove={handleApproveUser}
        onReject={handleRejectUser}
      />
    ),
    [pendingUsers, onUserClick, handleApproveUser, handleRejectUser],
  );

  const ListFooter = useMemo(() => {
    if (!hasMore && items.length > 0) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>¡Has visto todo! 🎉</Text>
        </View>
      );
    }
    if (loading && items.length > 0) {
      return (
        <View style={styles.loadingMore}>
          <Text style={styles.loadingMoreText}>Cargando más...</Text>
        </View>
      );
    }
    return null;
  }, [hasMore, loading, items.length]);

  const ListEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Cargando feed...</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay contenido aún</Text>
        <Text style={styles.emptySubtext}>¡Sé el primero en publicar!</Text>
      </View>
    );
  }, [loading]);

  return (
    <>
      <FlashList
        ref={flatListRef}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={400} // Altura aproximada promedio de un post/reel
        extraData={focusedItemId}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: dynamicPaddingTop },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
            progressViewOffset={dynamicPaddingTop}
          />
        }
      />

      {/* Modal de comentarios */}
      {activeCommentItem && (
        <CommentsBottomSheet
          visible={activeCommentItem !== null}
          onClose={handleCloseComments}
          feedItemId={activeCommentItem.id}
          currentUserId={currentUserId}
        />
      )}

      {/* Banner de notificación */}
      {bannerVisible && (
        <Animated.View
          style={[
            styles.banner,
            {
              opacity: bannerAnim,
              transform: [
                {
                  translateY: bannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.bannerText}>{bannerText}</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  banner: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bannerText: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "700",
  },
  endMessage: {
    padding: 40,
    alignItems: "center",
  },
  endMessageText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontWeight: "600",
  },
  loadingMore: {
    padding: 20,
    alignItems: "center",
  },
  loadingMoreText: {
    color: COLORS.textTertiary,
    fontSize: 12,
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
});

export default Feed;
