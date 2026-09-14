import React, { useEffect, useRef, memo } from "react";
import { Animated, View, StyleSheet, Dimensions } from "react-native";
import { COLORS } from "@/constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ShimmerColor = "#e0e0e0";

interface ShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

const Shimmer = memo(function Shimmer({
  width = "100%",
  height = 16,
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
          width: width as any,
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

export const PostDetailShimmer: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.backBtn}>
          <Shimmer width={24} height={24} borderRadius={4} />
        </View>
        <View style={styles.headerTitle}>
          <Shimmer width={100} height={16} borderRadius={4} />
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.scrollContent}>
        <View style={styles.userHeader}>
          <Shimmer width={36} height={36} borderRadius={18} />
          <View style={styles.userHeaderText}>
            <Shimmer width={110} height={14} borderRadius={4} />
            <Shimmer width={80} height={10} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>

        <Shimmer width={SCREEN_WIDTH} height={SCREEN_WIDTH} borderRadius={0} />

        <View style={styles.actionsRow}>
          <View style={styles.actionItem}>
            <Shimmer width={22} height={22} borderRadius={4} />
            <Shimmer width={28} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
          <View style={styles.actionItem}>
            <Shimmer width={22} height={22} borderRadius={4} />
            <Shimmer width={28} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
          <View style={styles.actionItem}>
            <Shimmer width={22} height={22} borderRadius={4} />
            <Shimmer width={28} height={12} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.propertyCard}>
            <Shimmer width="40%" height={24} borderRadius={4} />
            <Shimmer width="80%" height={18} borderRadius={4} style={{ marginTop: 6 }} />
            <View style={styles.locationRow}>
              <Shimmer width={14} height={14} borderRadius={7} />
              <Shimmer width="45%" height={12} borderRadius={4} style={{ marginLeft: 6 }} />
            </View>
            <View style={styles.statsRow}>
              <Shimmer width={60} height={60} borderRadius={12} />
              <Shimmer width={60} height={60} borderRadius={12} />
              <Shimmer width={60} height={60} borderRadius={12} />
              <Shimmer width={60} height={60} borderRadius={12} />
            </View>
          </View>

          <Shimmer width="100%" height={16} borderRadius={4} />
          <Shimmer width="90%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
          <Shimmer width="75%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
          <Shimmer width="55%" height={16} borderRadius={4} style={{ marginTop: 6 }} />

          <View style={styles.amenitiesSection}>
            <Shimmer width={100} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
            <View style={styles.amenitiesRow}>
              <Shimmer width={90} height={28} borderRadius={20} />
              <Shimmer width={80} height={28} borderRadius={20} style={{ marginLeft: 8 }} />
              <Shimmer width={70} height={28} borderRadius={20} style={{ marginLeft: 8 }} />
            </View>
          </View>

          <View style={styles.captionSection}>
            <Shimmer width="25%" height={14} borderRadius={4} />
            <Shimmer width="85%" height={14} borderRadius={4} style={{ marginLeft: 8 }} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backBtn: {
    width: 24,
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerRight: {
    width: 24,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  userHeaderText: {
    flex: 1,
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
  body: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  amenitiesSection: {
    marginTop: 24,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  captionSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
});
