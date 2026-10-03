import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, StyleSheet, StatusBar, FlatList } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import ReelListItem from "./ReelListItem";
import { useReelFeed } from "./useReelFeed";
import { COLORS } from "../../constants";

// NOTE: FlashList is intentionally NOT used here.
// FlashList recycles native views across items which causes
// "Cannot use shared object that was already released" errors
// when expo-video's SurfaceVideoView gets reassigned to a new player
// while the old one is still being torn down.
// FlatList keeps one native view per item — required for VideoView.

interface ReelFeedListProps {
  initialReelItem?: any;
  onClose: () => void;
  onUserClick?: (user: any) => void;
  currentUserId?: string;
}

const ReelFeedList: React.FC<ReelFeedListProps> = ({
  initialReelItem,
  onClose,
  onUserClick,
  currentUserId,
}) => {
  const [{ height, width }, setViewport] = useState({ height: 0, width: 0 });
  const isFocused = useIsFocused();
  const { reels, fetchMoreReels } = useReelFeed(initialReelItem);

  // El reel abierto siempre queda en el índice 0, así que no hace falta
  // calcular un índice inicial ni remontar la lista.
  const [currentIndex, setCurrentIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const currentIndexRef = useRef(0);
  const flatListRef = useRef<FlatList>(null);

  const handleLayout = useCallback(({ nativeEvent }: LayoutChangeEvent) => {
    const { height, width } = nativeEvent.layout;
    setViewport((previous) =>
      previous.height === height && previous.width === width
        ? previous
        : { height, width },
    );
  }, []);

  useEffect(() => {
    if (height <= 0 || width <= 0) return;
    const index = currentIndexRef.current;
    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: index * height,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [height, width]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 50,
  }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      currentIndexRef.current = viewableItems[0].index;
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height],
  );

  const renderItem = useCallback(
    ({ item, index }: any) => {
      // Only initialize the player for the active item and its direct neighbors
      const shouldInitialize = Math.abs(index - currentIndex) <= 1;
      return (
        <View style={{ height, width }}>
          <ReelListItem
            item={item}
            isActive={index === currentIndex && isFocused}
            shouldInitialize={shouldInitialize && isFocused}
            onClose={onClose}
            onUserClick={onUserClick}
            currentUserId={currentUserId}
            width={width}
            height={height}
            onCaptionExpandedChange={setCaptionExpanded}
          />
        </View>
      );
    },
    [currentIndex, height, width, onClose, onUserClick, currentUserId, isFocused],
  );

  // La ruta `reel/[id]` ya se presenta como `fullScreenModal`, así que el visor
  // es solo una View a pantalla completa. (Antes había un <Modal> de RN anidado
  // aquí, pero un Modal montado sobre una pantalla nativa-modal a veces no
  // aparece en Android — era la causa de que el reel "no abriera".)
  return (
    <View style={styles.container} onLayout={handleLayout}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      {reels.length > 0 && height > 0 && width > 0 ? (
        <FlatList
          style={styles.list}
          ref={flatListRef}
          data={reels}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          scrollEnabled={!captionExpanded}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          disableIntervalMomentum
          snapToInterval={height}
          snapToAlignment="start"
          getItemLayout={getItemLayout}
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
          onEndReached={fetchMoreReels}
          onEndReachedThreshold={1}
          removeClippedSubviews={false}
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={2}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
    overflow: "hidden",
  },
  list: {
    flex: 1,
  },
});

export default ReelFeedList;