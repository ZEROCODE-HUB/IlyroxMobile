import React, { useEffect, useRef, memo } from "react";
import { Animated, View, StyleSheet, Dimensions } from "react-native";
import { COLORS } from "@/constants";

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

export const PropertyDetailShimmer: React.FC = () => {
  return (
    <View style={styles.container}>
      <Shimmer width={SCREEN_WIDTH} height={350} borderRadius={0} />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.metaRow}>
            <Shimmer width={90} height={12} borderRadius={4} />
            <Shimmer width={12} height={12} borderRadius={4} style={{ marginHorizontal: 8 }} />
            <Shimmer width={70} height={12} borderRadius={4} />
          </View>

          <View style={styles.tagRow}>
            <Shimmer width={80} height={22} borderRadius={6} />
            <Shimmer width={60} height={22} borderRadius={6} style={{ marginLeft: 8 }} />
          </View>

          <Shimmer width="85%" height={28} borderRadius={4} style={{ marginTop: 8 }} />

          <View style={styles.priceRow}>
            <Shimmer width={90} height={36} borderRadius={8} />
            <Shimmer width={90} height={36} borderRadius={8} style={{ marginLeft: 8 }} />
          </View>

          <View style={styles.locationRow}>
            <Shimmer width={18} height={18} borderRadius={9} />
            <Shimmer width="55%" height={14} borderRadius={4} style={{ marginLeft: 6 }} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Shimmer width={100} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Shimmer width={32} height={32} borderRadius={16} />
              <View style={styles.statText}>
                <Shimmer width={40} height={14} borderRadius={4} />
                <Shimmer width={60} height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
            <View style={styles.statItem}>
              <Shimmer width={32} height={32} borderRadius={16} />
              <View style={styles.statText}>
                <Shimmer width={40} height={14} borderRadius={4} />
                <Shimmer width={50} height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
            <View style={styles.statItem}>
              <Shimmer width={32} height={32} borderRadius={16} />
              <View style={styles.statText}>
                <Shimmer width={50} height={14} borderRadius={4} />
                <Shimmer width={70} height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
            <View style={styles.statItem}>
              <Shimmer width={32} height={32} borderRadius={16} />
              <View style={styles.statText}>
                <Shimmer width={60} height={14} borderRadius={4} />
                <Shimmer width={55} height={10} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.chipsRow}>
          <Shimmer width={100} height={28} borderRadius={20} />
          <Shimmer width={90} height={28} borderRadius={20} style={{ marginLeft: 8 }} />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Shimmer width={100} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
          <Shimmer width="100%" height={16} borderRadius={4} />
          <Shimmer width="95%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
          <Shimmer width="80%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
          <Shimmer width="70%" height={16} borderRadius={4} style={{ marginTop: 6 }} />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Shimmer width="100%" height={180} borderRadius={12} />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Shimmer width="100%" height={200} borderRadius={12} />
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
  content: {
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  headerSection: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 24,
  },
  section: {
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statText: {
    flex: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
});
