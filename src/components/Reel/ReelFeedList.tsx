import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Modal,
  StatusBar,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import ReelListItem from "./ReelListItem";
import { useReelFeed } from "./useReelFeed";
import { COLORS } from "../../constants";

interface ReelFeedListProps {
  initialReelItem?: any;
  initialReelId: string;
  onClose: () => void;
  onUserClick?: (user: any) => void;
  currentUserId?: string;
}

const ReelFeedList: React.FC<ReelFeedListProps> = ({
  initialReelItem,
  initialReelId,
  onClose,
  onUserClick,
  currentUserId,
}) => {
  const { height, width } = useWindowDimensions();
  const { reels, loading, fetchMoreReels } = useReelFeed(initialReelId);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // When reels load, find initial index
  const initialScrollIndex = useMemo(() => {
    if (reels.length === 0) return 0;
    const idx = reels.findIndex((r: any) => r.tipo_match === "actual");
    return idx !== -1 ? idx : 0;
  }, [reels]);

  // Set initial currentIndex once we have data
  useEffect(() => {
    if (reels.length > 0 && currentIndex === -1) {
      setCurrentIndex(initialScrollIndex);
    }
  }, [reels.length, initialScrollIndex, currentIndex]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      // Tomamos el item que esta mas visible
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item, index }: any) => {
      // Solo inicializa el reproductor para index, index-1 e index+1
      const shouldInitialize = Math.abs(index - currentIndex) <= 1;
      return (
        <View style={{ height, width }}>
          <ReelListItem
            item={item}
            isActive={index === currentIndex}
            shouldInitialize={shouldInitialize}
            onClose={onClose}
            onUserClick={onUserClick}
            currentUserId={currentUserId}
          />
        </View>
      );
    },
    [currentIndex, height, width, onClose, onUserClick, currentUserId],
  );

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      supportedOrientations={["portrait"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.container}>
        {reels.length > 0 ? (
          <FlashList
            data={reels}
            renderItem={renderItem}
            /* @ts-ignore */
            estimatedItemSize={height}
            pagingEnabled
            disableIntervalMomentum={true}
            snapToInterval={height}
            snapToAlignment="start"
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={initialScrollIndex}
            onEndReached={fetchMoreReels}
            onEndReachedThreshold={0.5}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: COLORS.black }}>
            {/* Mientras carga, podriamos renderizar el Reel inicial si lo tenemos? */}
            {initialReelItem && (
              <ReelListItem
                item={initialReelItem}
                isActive={true}
                shouldInitialize={true}
                onClose={onClose}
                onUserClick={onUserClick}
                currentUserId={currentUserId}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
});

export default ReelFeedList;
