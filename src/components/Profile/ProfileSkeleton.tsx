import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Shimmer } from "../shared/Shimmer";
import { COLORS } from "@/constants/colors";

const ProfileSkeleton: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.scrollContent}>
        <ProfileHeaderSkeleton />
        <InfoSectionSkeleton />
        <RatingCardSkeleton />
        <TabsSkeleton />
        <GridSkeleton />
      </View>
    </View>
  );
};

const ProfileHeaderSkeleton = memo(function ProfileHeaderSkeleton() {
  return (
    <View style={styles.header}>
      <Shimmer width={24} height={24} borderRadius={4} />
      <Shimmer width={80} height={20} borderRadius={4} />
      <Shimmer width={24} height={24} borderRadius={4} />
    </View>
  );
});

const InfoSectionSkeleton = memo(function InfoSectionSkeleton() {
  return (
    <View style={styles.infoSection}>
      <View style={styles.infoRow}>
        <View style={styles.avatarContainer}>
          <Shimmer width={85} height={85} borderRadius={42} />
        </View>
        <View style={styles.infoRight}>
          <Shimmer width={140} height={20} borderRadius={4} />
          <Shimmer width="90%" height={14} borderRadius={4} style={styles.bioShimmer} />
          <View style={styles.roleBadgeRow}>
            <Shimmer width={70} height={22} borderRadius={6} />
          </View>
          <View style={styles.metaList}>
            <View style={styles.metaItem}>
              <Shimmer width={12} height={12} borderRadius={6} />
              <Shimmer width={100} height={12} borderRadius={4} />
            </View>
            <View style={styles.metaItem}>
              <Shimmer width={12} height={12} borderRadius={6} />
              <Shimmer width={120} height={12} borderRadius={4} />
            </View>
            <View style={styles.metaItem}>
              <Shimmer width={12} height={12} borderRadius={6} />
              <Shimmer width={90} height={12} borderRadius={4} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const RatingCardSkeleton = memo(function RatingCardSkeleton() {
  return (
    <View style={styles.ratingSection}>
      <View style={styles.ratingCard}>
        <View style={styles.ratingLeft}>
          <Shimmer width={30} height={20} borderRadius={4} />
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Shimmer key={i} width={14} height={14} borderRadius={7} />
            ))}
          </View>
          <Shimmer width={60} height={12} borderRadius={4} />
        </View>
        <View style={styles.ratingRight}>
          <Shimmer width={70} height={14} borderRadius={4} />
          <Shimmer width={12} height={12} borderRadius={6} />
        </View>
      </View>
    </View>
  );
});

const TabsSkeleton = memo(function TabsSkeleton() {
  return (
    <View style={styles.tabsContainer}>
      <TabItemSkeleton />
      <TabItemSkeleton />
      <TabItemSkeleton />
    </View>
  );
});

const TabItemSkeleton: React.FC = () => (
  <View style={styles.tab}>
    <Shimmer width={20} height={20} borderRadius={4} />
    <Shimmer width={60} height={13} borderRadius={4} />
    <Shimmer width={24} height={18} borderRadius={9} />
  </View>
);

const GridSkeleton: React.FC = () => {
  const items = [1, 2, 3, 4, 5, 6];

  return (
    <View style={styles.gridContainer}>
      {items.map((i) => (
        <View key={i} style={styles.gridItem}>
          <Shimmer
            width="100%"
            height={140}
            borderRadius={8}
            style={styles.gridImage}
          />
          <View style={styles.gridItemFooter}>
            <Shimmer width="60%" height={12} borderRadius={4} />
            <Shimmer width="40%" height={10} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flex: 1,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarContainer: {
    marginRight: 16,
    alignItems: "center",
  },
  infoRight: {
    flex: 1,
    paddingTop: 4,
  },
  bioShimmer: {
    marginTop: 4,
  },
  roleBadgeRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 8,
  },
  metaList: {
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingSection: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  ratingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  ratingLeft: {
    gap: 6,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  ratingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  gridItem: {
    width: "31%",
    marginBottom: 8,
  },
  gridImage: {
    minHeight: 100,
  },
  gridItemFooter: {
    marginTop: 6,
    gap: 4,
    paddingHorizontal: 2,
  },
});

export default memo(ProfileSkeleton);
