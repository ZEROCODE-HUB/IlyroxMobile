import React, { useEffect, useRef, memo } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { COLORS, DIMENSIONS } from "@/constants";

const ShimmerColor = "#e0e0e0";

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}

const Shimmer = memo(function Shimmer({
  width,
  height,
  borderRadius = 4,
  style,
}: ShimmerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: ShimmerColor,
          opacity,
        },
        style,
      ]}
    />
  );
});

interface PostShimmerCardProps {
  showCaption?: boolean;
}

const PostShimmerCard = memo(function PostShimmerCard({ showCaption = true }: PostShimmerCardProps) {
  const { width } = { width: DIMENSIONS.SCREEN_WIDTH };
  const cardWidth = width;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Shimmer width={36} height={36} borderRadius={18} />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Shimmer width={110} height={14} borderRadius={4} />
            <Shimmer width={50} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
          <Shimmer width={80} height={10} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>

      <Shimmer width={cardWidth} height={cardWidth * DIMENSIONS.POST_ASPECT_RATIO} />

      <View style={styles.actionsRow}>
        <View style={styles.actionItem}>
          <Shimmer width={20} height={20} borderRadius={4} />
          <Shimmer width={24} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
        </View>
        <View style={styles.actionItem}>
          <Shimmer width={20} height={20} borderRadius={4} />
          <Shimmer width={24} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
        </View>
        <View style={styles.actionItem}>
          <Shimmer width={20} height={20} borderRadius={4} />
          <Shimmer width={24} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
        </View>
      </View>

      {showCaption && (
        <View style={styles.captionArea}>
          <View style={styles.captionLine}>
            <Shimmer width={70} height={14} borderRadius={4} />
            <Shimmer width="65%" height={14} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
          <Shimmer width="45%" height={14} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      )}
    </View>
  );
});

export const FeedShimmer = memo(function FeedShimmer() {
  return (
    <View style={styles.container}>
      <PostShimmerCard showCaption={true} />
      <PostShimmerCard showCaption={true} />
      <PostShimmerCard showCaption={true} />
      <PostShimmerCard showCaption={false} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  card: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  captionArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  captionLine: {
    flexDirection: "row",
    alignItems: "center",
  },
});
