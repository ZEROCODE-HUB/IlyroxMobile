import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { ExpandableText } from "../shared";
import { ProfileHeader } from "./ProfileHeader";
import ProfileAvatarPicker from "./ProfileAvatarPicker";
import ProfileTabs from "./ProfileTabs";
import { RecommendedSection } from "./RecommendedSection";
import { ProfileContentType, perfiles } from "@/types";

export interface ProfileData {
  name: string;
  avatar?: string;
  role: string;
  location: string;
  phone: string;
  anos_experiencia: number | string;
  rating: number;
  reviewCount: number;
  positiveRecommendations: number;
  negativeRecommendations: number;
  biography?: string;
  website?: string;
  disponibilidad: number;
  profesionalismo: number;
  comunicacion: number;
  conocimientoMercado: number;
}

export interface ProfileInfoHeaderProps {
  profile: perfiles | null;
  profileData: ProfileData;
  targetUserId: string;
  isMe: boolean;
  onBack?: () => void;
  onSupport: () => void;
  onSettings: () => void;
  onUpdatePhoto: (url: string) => void;
  onMessage: () => void;
  showRatingDetails: boolean;
  onToggleRatingDetails: () => void;
  showRecommendedByModal: boolean;
  setShowRecommendedByModal: (v: boolean) => void;
  formatRole: (rol: string) => string;
  loadRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
  activeTab: ProfileContentType;
  onTabChange: (tab: ProfileContentType) => void;
  contentCounts: { properties: number; posts: number; reels: number };
  activeFilter: string;
  onOpenFilter: () => void;
  filteredPropertiesCount: number;
}

export const ProfileInfoHeader: React.FC<ProfileInfoHeaderProps> = ({
  profileData,
  targetUserId,
  isMe,
  onBack,
  onSupport,
  onSettings,
  onUpdatePhoto,
  onMessage,
  showRatingDetails,
  onToggleRatingDetails,
  showRecommendedByModal,
  setShowRecommendedByModal,
  formatRole,
  loadRecommendedByUsers,
  activeTab,
  onTabChange,
  contentCounts,
  activeFilter,
  onOpenFilter,
  filteredPropertiesCount,
}) => {
  return (
    <>
      <ProfileHeader
        isOwnProfile={isMe}
        onBack={onBack}
        onSupport={onSupport}
        onSettings={onSettings}
      />

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <ProfileAvatarPicker
              uri={profileData.avatar}
              name={profileData.name}
              size={85}
              userId={targetUserId}
              isOwnProfile={isMe}
              onPhotoUpdated={onUpdatePhoto}
            />
          </View>

          <View style={styles.infoRight}>
            <Text style={styles.name}>{profileData.name}</Text>
            {profileData.biography && (
              <ExpandableText
                text={profileData.biography}
                maxLines={2}
                style={styles.biography}
              />
            )}
            {profileData.role && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{profileData.role}</Text>
              </View>
            )}
            <View style={styles.metaList}>
              {profileData.phone && (
                <View style={styles.metaItem}>
                  <Ionicons name="call" size={12} color={COLORS.textTertiary} />
                  <Text style={styles.metaText}>{profileData.phone}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Ionicons
                  name="location"
                  size={12}
                  color={COLORS.textTertiary}
                />
                <Text style={styles.metaText}>{profileData.location}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="school" size={12} color={COLORS.textTertiary} />
                <Text style={styles.metaText}>
                  {`+${profileData.anos_experiencia} años de experiencia`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!isMe && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.messageBtn} onPress={onMessage}>
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color={COLORS.textPrimary}
              />
              <Text style={styles.messageBtnText}>Mensaje</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.ratingSection}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleRatingDetails}
          style={styles.ratingCard}
        >
          <View style={styles.ratingInfoGroup}>
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingValue}>
                {profileData.rating.toFixed(1)}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name="star"
                    size={14}
                    color={COLORS.warning}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.reviewCount}>
              {profileData.reviewCount} reseñas
            </Text>
          </View>

          <View style={styles.ratingRight}>
            <Text style={styles.viewDetailsText}>Ver Detalles</Text>
            <Ionicons
              name={showRatingDetails ? "chevron-up" : "chevron-down"}
              size={14}
              color={COLORS.primary}
              style={styles.chevronIcon}
            />
          </View>
        </TouchableOpacity>

        {showRatingDetails && (
          <RecommendedSection
            setShowRecommendedByModal={setShowRecommendedByModal}
            showRecommendedByModal={showRecommendedByModal}
            formatRole={formatRole}
            isMe={isMe}
            loadRecommendedByUsers={loadRecommendedByUsers}
          />
        )}
      </View>

      <ProfileTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        counts={contentCounts}
      />

      {activeTab === "properties" && (
        <View style={styles.toolbar}>
          <TouchableOpacity onPress={onOpenFilter} style={styles.filterBtn}>
            <Ionicons name="funnel" size={16} color={COLORS.textPrimary} />
            <Text style={styles.filterBtnText}>{activeFilter}</Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.countText}>
            {filteredPropertiesCount}{" "}
            {filteredPropertiesCount === 1 ? "Propiedad" : "Propiedades"}
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  infoContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLeft: {
    marginRight: 16,
    alignItems: "center",
  },
  infoRight: {
    flex: 1,
    paddingTop: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaList: {
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    marginTop: 16,
  },
  messageBtn: {
    backgroundColor: COLORS.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  messageBtnText: {
    color: COLORS.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  ratingSection: {
    marginBottom: 16,
    alignItems: "stretch",
  },
  ratingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 32,
    justifyContent: "space-between",
  },
  ratingInfoGroup: {
    flexDirection: "column",
    gap: 2,
  },
  ratingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  ratingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  chevronIcon: {
    margin: 4,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  toolbar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  countText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  biography: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
});
