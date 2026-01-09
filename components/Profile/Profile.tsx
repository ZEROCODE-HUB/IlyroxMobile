/**
 * Profile.tsx - COMPLETO Y OPTIMIZADO
 *
 * MEJORAS:
 * - Tabs para Posts, Reels y Propiedades
 * - Avatar con cambio de foto inline
 * - Grid estilo Instagram
 * - Badges de comisión en propiedades
 * - Colores centralizados (no hardcoded)
 * - useEffects optimizados (sin duplicados)
 * - Rating Details completo con todas las estadísticas
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

// Types
import { perfiles, Property, ProfileContentType, FeedItem } from "../../types";

// Components
import { Avatar } from "../shared";
import { ProfileHeader } from "./ProfileHeader";
import ProfileAvatarPicker from "./ProfileAvatarPicker";
import ProfileTabs from "./ProfileTabs";
import ProfilePropertyGrid from "./ProfilePropertyGrid";
import ProfilePostGrid from "./ProfilePostGrid";
import ProfileReelGrid from "./ProfileReelGrid";
import PropertyDetail from "../Details/PropertyDetail";
import SelectionModal from "../modals/SelectionModal";
import { useProfile } from "../../hooks/profile/useProfile";
import ReelDetail from "../Reel/ReelDetail";

interface ProfileProps {
  userId?: string | null;
  onBack?: () => void;
}

const FILTER_OPTIONS = [
  "Todas",
  "Publicada",
  "Suspendida",
  "Rentada",
  "Reservada",
  "Vendida",
];

const Profile: React.FC<ProfileProps> = ({ userId, onBack }) => {
  const { user: authUser } = useAuth();
  const navigation = useNavigation<any>();

  // Use Custom Hook
  const {
    profile,
    reviewStats,
    properties,
    posts,
    reels,
    userRecommendation,
    recommendedByUsers,
    recommendedByHasMore,
    loadingRecommendedBy,
    recommendedByError,
    loading,
    submittingRecommendation,
    fetchProfileData,
    handleRecommendation,
    loadRecommendedByUsers,
    updateProfilePhoto,
  } = useProfile(userId);

  // State - Content
  const [activeTab, setActiveTab] = useState<ProfileContentType>("properties");

  // State - Filters & Modals
  const [activeFilter, setActiveFilter] = useState<string>("Todas");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [showRecommendedByModal, setShowRecommendedByModal] = useState(false);

  // Computed
  const targetUserId = userId || authUser?.id;
  const isMe = !userId || targetUserId === authUser?.id;

  useFocusEffect(
    React.useCallback(() => {
      setSelectedProperty(null);
    }, [])
  );

  /**
   * Helper: Format full name
   */
  const formatFullName = (p: perfiles | null): string => {
    if (!p) return "Usuario";
    const parts = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(
      Boolean
    );
    return parts.length > 0 ? parts.join(" ") : p.nombre_completo || "Usuario";
  };

  const formatPhoneNumber = (
    prefix: string | null,
    number: string | null
  ): string => {
    if (!number) return "No especificado";
    if (prefix) return `${prefix} ${number}`;
    return number;
  };

  const formatLocation = (estado: string | null, pais: string): string => {
    if (!estado) return pais || "No especificada";
    return `${estado}, ${pais}`;
  };

  const formatRole = (rol: string): string => {
    const roleMap: Record<string, string> = {
      agente: "Agente",
      cliente: "Cliente",
      admin: "Admin",
    };
    return roleMap[rol] || rol;
  };

  /**
   * useEffect ÚNICO optimizado for Recommended Users
   */
  useEffect(() => {
    const shouldLoad = showRatingDetails || showRecommendedByModal;

    if (!shouldLoad) return;
    if (!targetUserId) return;
    if (recommendedByUsers.length > 0) return;
    if (loadingRecommendedBy) return;
    if ((reviewStats?.total_recomiendan || 0) <= 0) {
      // Just to be safe, though hook handles data
      return;
    }

    loadRecommendedByUsers({ reset: true });
  }, [
    showRatingDetails,
    showRecommendedByModal,
    targetUserId,
    recommendedByUsers.length,
    loadingRecommendedBy,
    reviewStats?.total_recomiendan,
  ]);

  /**
   * Wrapper for recommendation to also reload list if needed
   */
  const onToggleRecommendation = async (recomienda: boolean) => {
    await handleRecommendation(recomienda);
    if (showRatingDetails || showRecommendedByModal) {
      loadRecommendedByUsers({ reset: true });
    }
  };

  const profileData = {
    name: formatFullName(profile),
    avatar: profile?.foto || undefined,
    role: formatRole(profile?.rol || "cliente"),
    location: formatLocation(
      profile?.estado || null,
      profile?.pais || "México"
    ),
    phone: formatPhoneNumber(
      profile?.prefijo_celular || null,
      profile?.celular || null
    ),
    rating: reviewStats?.calificacion_promedio || 0,
    reviewCount: reviewStats?.total_resenas || 0,
    positiveRecommendations: reviewStats?.total_recomiendan || 0,
    negativeRecommendations: reviewStats?.total_no_recomiendan || 0,
    biography: profile?.biografia,
    website: profile?.sitio_web,
    disponibilidad: reviewStats?.promedio_disponibilidad || 0,
    profesionalismo: reviewStats?.promedio_profesionalismo || 0,
    comunicacion: reviewStats?.promedio_comunicacion || 0,
    conocimientoMercado: reviewStats?.promedio_conocimiento_mercado || 0,
  };

  const filteredProperties =
    activeFilter === "Todas"
      ? properties
      : properties.filter((p) => p.status === activeFilter);

  const contentCounts = {
    properties: properties.length,
    posts: posts.length,
    reels: reels.length,
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <ProfileHeader
        isOwnProfile={isMe}
        onBack={onBack}
        onSettings={() => navigation.navigate("Settings")}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <ProfileAvatarPicker
              uri={profileData.avatar}
              name={profileData.name}
              size={100}
              userId={targetUserId!}
              isOwnProfile={isMe}
              onPhotoUpdated={(newUrl) => {
                updateProfilePhoto(newUrl);
              }}
            />

            <View style={styles.infoRight}>
              <Text style={styles.name}>{profileData.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{profileData.role}</Text>
              </View>
              <View style={styles.metaList}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="location"
                    size={12}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.metaText}>{profileData.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="call" size={12} color={COLORS.textTertiary} />
                  <Text style={styles.metaText}>{profileData.phone}</Text>
                </View>
              </View>
            </View>
          </View>

          {!isMe && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => {
                  navigation.navigate("Messages", {
                    initialUser: {
                      id: targetUserId,
                      nombre: profile?.nombre,
                      apellido_paterno: profile?.apellido_paterno || "",
                      foto: profile?.foto || null,
                    },
                  });
                }}
              >
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

        {/* ========== RATING SECTION - COMPLETA ========== */}
        <View style={styles.ratingSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowRatingDetails(!showRatingDetails)}
            style={styles.ratingCard}
          >
            <View style={styles.ratingLeft}>
              <Text style={styles.ratingValue}>
                {profileData.rating.toFixed(1)}
              </Text>
              <View style={styles.ratingStars}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name="star"
                      size={10}
                      color={COLORS.warning}
                    />
                  ))}
                </View>
                <Text style={styles.reviewCount}>
                  {profileData.reviewCount} reseñas
                </Text>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.ratingRight}>
              <Text style={styles.viewDetailsText}>Ver Detalles</Text>
              <Ionicons
                name={showRatingDetails ? "chevron-up" : "chevron-down"}
                size={12}
                color={COLORS.primary}
                style={styles.chevronIcon}
              />
            </View>
          </TouchableOpacity>

          {showRatingDetails && (
            <View style={styles.statsPanel}>
              {/* Recommends Row */}
              <View style={styles.recommendsRow}>
                <TouchableOpacity
                  style={[
                    styles.recItem,
                    isMe && styles.recItemDisabled,
                    userRecommendation === true && styles.recItemActive,
                  ]}
                  onPress={() => handleRecommendation(true)}
                  disabled={isMe || submittingRecommendation}
                >
                  <Ionicons
                    name={
                      userRecommendation === true
                        ? "thumbs-up"
                        : "thumbs-up-outline"
                    }
                    size={16}
                    color={
                      userRecommendation === true
                        ? COLORS.success
                        : COLORS.textSecondary
                    }
                  />
                  <Text style={styles.recVal}>
                    {profileData.positiveRecommendations}
                  </Text>
                  <Text style={styles.recLabel}>Recomiendan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.recItem,
                    isMe && styles.recItemDisabled,
                    userRecommendation === false && styles.recItemActive,
                  ]}
                  onPress={() => handleRecommendation(false)}
                  disabled={isMe || submittingRecommendation}
                >
                  <Ionicons
                    name={
                      userRecommendation === false
                        ? "thumbs-down"
                        : "thumbs-down-outline"
                    }
                    size={16}
                    color={
                      userRecommendation === false
                        ? COLORS.error
                        : COLORS.textSecondary
                    }
                  />
                  <Text style={styles.recVal}>
                    {profileData.negativeRecommendations}
                  </Text>
                  <Text style={styles.recLabel}>No recomiendan</Text>
                </TouchableOpacity>
              </View>

              {/* Recommended By Section */}
              <View style={styles.recommendedBySection}>
                <View style={styles.recommendedByHeader}>
                  <Text style={styles.recommendedByTitle}>Recomendado por</Text>
                  <Text style={styles.recommendedByCount}>
                    {profileData.positiveRecommendations} usuarios
                  </Text>
                </View>

                {loadingRecommendedBy ? (
                  <View style={styles.recommendedByLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  </View>
                ) : recommendedByError ? (
                  <Text style={styles.recommendedByEmptyText}>
                    {recommendedByError}
                  </Text>
                ) : recommendedByUsers.length === 0 ? (
                  <Text style={styles.recommendedByEmptyText}>
                    Aún no hay recomendaciones
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={styles.recommendedByPreviewRow}
                    onPress={() => setShowRecommendedByModal(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.recommendedByAvatars}>
                      {recommendedByUsers.slice(0, 2).map((u, idx) => {
                        const fullName = [
                          u.nombre,
                          u.apellido_paterno,
                          u.apellido_materno,
                        ]
                          .filter(Boolean)
                          .join(" ")
                          .trim();

                        return (
                          <View
                            key={u.id}
                            style={[
                              styles.recommendedByAvatarWrap,
                              idx === 1 && styles.recommendedByAvatarWrapSecond,
                            ]}
                          >
                            <Avatar
                              uri={u.foto || undefined}
                              name={fullName || "Usuario"}
                              size={26}
                              style={styles.recommendedByAvatarSmall}
                            />
                          </View>
                        );
                      })}
                    </View>

                    <Text
                      style={styles.recommendedByPreviewText}
                      numberOfLines={1}
                    >
                      {(() => {
                        const first = recommendedByUsers[0];
                        const firstName = first
                          ? [first.nombre, first.apellido_paterno]
                              .filter(Boolean)
                              .join(" ")
                              .trim()
                          : "Usuario";
                        const total = profileData.positiveRecommendations || 0;
                        const rest = Math.max(0, total - 1);
                        return rest > 0
                          ? `${firstName} y ${rest} más`
                          : firstName;
                      })()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Progress Section */}
              <View style={styles.progressSection}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  const starCounts = {
                    5: reviewStats?.total_5_estrellas || 0,
                    4: reviewStats?.total_4_estrellas || 0,
                    3: reviewStats?.total_3_estrellas || 0,
                    2: reviewStats?.total_2_estrellas || 0,
                    1: reviewStats?.total_1_estrella || 0,
                  };

                  const count = starCounts[stars as keyof typeof starCounts];
                  const totalReviews = reviewStats?.total_resenas || 0;
                  const percentage =
                    totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                  return (
                    <View key={stars} style={styles.progressRow}>
                      <Text style={styles.progressLabel}>
                        {stars} estrellas
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.round(percentage)}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressPerc}>
                        {Math.round(percentage)}%
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Features Section */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>
                  Calificación de características
                </Text>
                {[
                  {
                    label: "Disponibilidad",
                    rating: profileData.disponibilidad,
                  },
                  {
                    label: "Profesionalismo",
                    rating: profileData.profesionalismo,
                  },
                  { label: "Comunicación", rating: profileData.comunicacion },
                  {
                    label: "Conocimiento del Mercado",
                    rating: profileData.conocimientoMercado,
                  },
                ].map((f) => (
                  <View key={f.label} style={styles.featureRow}>
                    <Text style={styles.featureLabel}>{f.label}</Text>
                    <View style={styles.featureStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons
                          key={i}
                          name={
                            i < Math.round(f.rating) ? "star" : "star-outline"
                          }
                          size={16}
                          color={
                            i < Math.round(f.rating)
                              ? COLORS.primary
                              : COLORS.textDisabled
                          }
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Modal de "Recomendado por" Completo */}
        <Modal
          visible={showRecommendedByModal}
          animationType="slide"
          onRequestClose={() => setShowRecommendedByModal(false)}
        >
          <SafeAreaView style={styles.recommendedByModalContainer}>
            <View style={styles.recommendedByModalHeader}>
              <TouchableOpacity
                onPress={() => setShowRecommendedByModal(false)}
                style={styles.recommendedByModalBackBtn}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>

              <View style={styles.recommendedByModalTitleWrap}>
                <Text style={styles.recommendedByModalTitle}>
                  Recomendado por
                </Text>
                <Text style={styles.recommendedByModalSubtitle}>
                  {profileData.positiveRecommendations} usuarios
                </Text>
              </View>
              <View style={styles.recommendedByModalBackBtn} />
            </View>

            {recommendedByError ? (
              <View style={styles.recommendedByModalEmpty}>
                <Text style={styles.recommendedByEmptyText}>
                  {recommendedByError}
                </Text>
              </View>
            ) : (
              <FlatList
                data={recommendedByUsers}
                keyExtractor={(u) => u.id}
                contentContainerStyle={styles.recommendedByModalList}
                onEndReached={() => {
                  if (loadingRecommendedBy || !recommendedByHasMore) return;
                  loadRecommendedByUsers();
                }}
                onEndReachedThreshold={0.6}
                ListEmptyComponent={
                  loadingRecommendedBy ? (
                    <View style={styles.recommendedByLoading}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  ) : (
                    <View style={styles.recommendedByModalEmpty}>
                      <Text style={styles.recommendedByEmptyText}>
                        Aún no hay recomendaciones
                      </Text>
                    </View>
                  )
                }
                renderItem={({ item: u }) => {
                  const fullName = [
                    u.nombre,
                    u.apellido_paterno,
                    u.apellido_materno,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                  return (
                    <TouchableOpacity
                      style={styles.recommendedByModalItem}
                      onPress={() => {
                        setShowRecommendedByModal(false);
                        navigation.navigate("UserProfile", { userId: u.id });
                      }}
                      activeOpacity={0.85}
                    >
                      <Avatar
                        uri={u.foto || undefined}
                        name={fullName || "Usuario"}
                        size={44}
                        style={styles.recommendedByAvatar}
                      />
                      <View style={styles.recommendedByInfo}>
                        <Text
                          style={styles.recommendedByName}
                          numberOfLines={1}
                        >
                          {fullName || "Usuario"}
                        </Text>
                        <Text
                          style={styles.recommendedByRole}
                          numberOfLines={1}
                        >
                          {formatRole(u.rol)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                ListFooterComponent={
                  loadingRecommendedBy ? (
                    <View style={styles.recommendedByModalFooter}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    </View>
                  ) : recommendedByHasMore ? (
                    <View style={styles.recommendedByModalFooter}>
                      <TouchableOpacity
                        style={styles.recommendedByLoadMoreBtn}
                        onPress={() => loadRecommendedByUsers()}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.recommendedByLoadMoreText}>
                          Cargar más
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.recommendedByModalFooter} />
                  )
                }
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={contentCounts}
        />

        {/* Filter Toolbar */}
        {activeTab === "properties" && (
          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={styles.filterBtn}
            >
              <Ionicons name="funnel" size={16} color={COLORS.textPrimary} />
              <Text style={styles.filterBtnText}>{activeFilter}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.countText}>
              {filteredProperties.length}{" "}
              {filteredProperties.length === 1 ? "Propiedad" : "Propiedades"}
            </Text>
          </View>
        )}

        {/* Content Grids */}
        {activeTab === "properties" && (
          <ProfilePropertyGrid
            properties={filteredProperties}
            onPropertyPress={(property) => setSelectedProperty(property)}
            isOwnProfile={isMe}
            onEditPress={(property) => {
              navigation.navigate("EditProperty", { propertyId: property.id });
            }}
            onDelete={fetchProfileData}
          />
        )}

        {activeTab === "posts" && (
          <ProfilePostGrid
            userId={targetUserId}
            onPostPress={(post) => {
              console.log("Post clicked:", post.id);
            }}
            isOwnProfile={isMe}
            onDelete={fetchProfileData}
          />
        )}

        {activeTab === "reels" && (
          <ProfileReelGrid
            userId={targetUserId}
            onReelPress={(reel: FeedItem) => {
              <ReelDetail
                item={reel}
                onClose={() => {}}
                onUserClick={() => {}}
                currentUserId={targetUserId}
              />;
            }}
            isOwnProfile={isMe}
            onDelete={fetchProfileData}
          />
        )}
      </ScrollView>

      {/* Modals */}
      <SelectionModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSelect={(value) => setActiveFilter(value)}
        title="Filtrar Propiedades"
        options={FILTER_OPTIONS}
        currentValue={activeFilter}
        searchable={false}
      />

      {selectedProperty && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedProperty(null)}
        >
          <PropertyDetail
            propertyId={selectedProperty.id}
            navigation={{
              ...navigation,
              goBack: () => setSelectedProperty(null),
              navigate: (screen: string, params: any) => {
                setSelectedProperty(null);
                navigation.navigate(screen, params);
              },
            }}
          />
        </Modal>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoRight: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 16,
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  ratingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "center",
  },
  ratingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  ratingStars: {
    gap: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  reviewCount: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  verticalDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 16,
  },
  ratingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  statsPanel: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  recommendsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recItem: {
    alignItems: "center",
    gap: 4,
    padding: 8,
    borderRadius: 8,
    minWidth: 100,
  },
  recItemDisabled: {
    opacity: 0.5,
  },
  recItemActive: {
    backgroundColor: COLORS.white,
  },
  recVal: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  recLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  recommendedBySection: {
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recommendedByHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recommendedByTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByCount: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recommendedByLoading: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByEmptyText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  recommendedByPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recommendedByAvatars: {
    flexDirection: "row",
    alignItems: "center",
    width: 46,
  },
  recommendedByAvatarWrap: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  recommendedByAvatarWrapSecond: {
    marginLeft: -10,
  },
  recommendedByAvatarSmall: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedByPreviewText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  recommendedByModalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  recommendedByModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  recommendedByModalBackBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByModalTitleWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  recommendedByModalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  recommendedByModalList: {
    padding: 16,
    paddingBottom: 30,
  },
  recommendedByModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  recommendedByAvatar: {
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  recommendedByInfo: {
    flex: 1,
    justifyContent: "center",
  },
  recommendedByName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByRole: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedByModalFooter: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedByLoadMoreBtn: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  recommendedByLoadMoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedByModalEmpty: {
    padding: 20,
    alignItems: "center",
  },
  progressSection: {
    marginTop: 16,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressLabel: {
    width: 80,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  progressPerc: {
    width: 40,
    textAlign: "right",
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  featuresSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  featureLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  featureStars: {
    flexDirection: "row",
    gap: 4,
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
});

export default Profile;
