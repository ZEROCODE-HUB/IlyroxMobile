import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ListRenderItem,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

// Types
import {
  perfiles,
  Property,
  ProfileContentType,
  FeedItem,
  User,
  Post,
  Reel,
} from "../../types";

// Components
import { Avatar } from "../shared";
import { ProfileHeader } from "./ProfileHeader";
import ProfileAvatarPicker from "./ProfileAvatarPicker";
import ProfileTabs from "./ProfileTabs";
import PropertyDetail from "../Details/PropertyDetail";
import SelectionModal from "../modals/SelectionModal";
import { useProfile } from "../../hooks/hooks/profile/useProfile";
import { useGridProfile } from "../../hooks/hooks/profile/useGridProfile";
import ReelDetail from "../Reel/ReelDetail";
import FeedDetail from "../Feed/FeedDetail";
import CreateProperty from "../CreateContent/CreateProperty";
import CreatePost from "../CreateContent/CreatePost/CreatePost";
import CreateReel from "../CreateContent/CreateReel";
import AnimatedLike from "../../design-system/components/AnimatedLike";
import { useChatInitiator } from "@/hooks/hooks/messaging/useChatInitiator";
import { router } from "expo-router";
import ProfileReelItem from "./ProfileReelItem";
import ProfilePostItem from "./ProfilePostItem";
import ProfilePropertyItem from "./ProfilePropertyItem";
import ConfirmDialog from "../shared/ConfirmDialog";
import { supabase } from "../../lib/supabase";

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

/**
 * Helper: Map entities to FeedItem
 */
const mapProfileToUser = (p: perfiles): User => {
  const name = [p.nombre, p.apellido_paterno, p.apellido_materno]
    .filter(Boolean)
    .join(" ");

  return {
    id: p.id,
    nombre: p.nombre,
    name: p.nombre_completo || name || "Usuario",
    avatar: p.foto,
    role: (p.rol.charAt(0).toUpperCase() + p.rol.slice(1)) as any,
    rating: parseFloat(p.calificacion_promedio || "0"),
    totalRatings: parseInt(p.total_calificaciones || "0"),
    positiveRecommendations: parseInt(p.total_recomendaciones_positivas || "0"),
    negativeRecommendations: parseInt(p.total_recomendaciones_negativas || "0"),
    isFollowing: false,
  };
};

const mapPostToFeedItem = (
  post: any,
  profile: perfiles | null,
  targetUserId?: string,
): FeedItem => {
  const defaultUser: User = {
    id: targetUserId || "",
    name: "Usuario",
    avatar: "",
    role: "Cliente",
    isFollowing: false,
  };

  return {
    id: post.feed_item_id || post.id,
    type: "post",
    user: profile ? mapProfileToUser(profile) : defaultUser,
    content: post.contenido || "",
    postType:
      post.tipo
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "") || "post",
    images: post.imagenes || [],
    likes: post.likes_count || 0,
    comments: post.comentarios_count || 0,
    timestamp: post.created_at,
    status: post.status,
    foto_perfil_usuario: post.foto_perfil,
    fecha_hora: post.fecha_hora,
    nombre_asesor: post.nombre_asesor,
    ubicacion: post.ubicacion,
    foto_propiedad: post.foto_propiedad,
    antiguedad: post.antiguedad,
    postDetails: post,
    busquedas_json: post.busquedas_json,
  };
};

const mapReelToFeedItem = (
  reel: any,
  profile: perfiles | null,
  targetUserId?: string,
): FeedItem => {
  const defaultUser: User = {
    id: targetUserId || "",
    name: "Usuario",
    avatar: "",
    role: "Cliente",
    isFollowing: false,
  };

  return {
    id: reel.feed_item_id || reel.id,
    type: "reel",
    user: profile ? mapProfileToUser(profile) : defaultUser,
    content: reel.descripcion || "",
    videoUrl: reel.video_url,
    images: reel.thumbnail_url ? [reel.thumbnail_url] : [],
    likes: reel.likes_count || 0,
    comments: reel.comentarios_count || 0,
    timestamp: reel.created_at,
    reelDetails: reel,
  };
};

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

  const { deletePost, deleteReel } = useGridProfile();

  const { handleContact } = useChatInitiator();

  // Refresh Control
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    await fetchProfileData();
    setRefreshing(false);
  }, [fetchProfileData]);

  const handleSilentRefresh = useCallback(async () => {
    setRefreshTrigger((prev) => prev + 1);
    await fetchProfileData();
  }, [fetchProfileData]);

  // State - Content
  const [activeTab, setActiveTab] = useState<ProfileContentType>("properties");

  // State - Filters & Modals
  const [activeFilter, setActiveFilter] = useState<string>("Todas");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editReel, setEditReel] = useState<Reel | null>(null);

  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [showRecommendedByModal, setShowRecommendedByModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
  const [selectedReel, setSelectedReel] = useState<FeedItem | null>(null);

  const [showModal, setShowModal] = useState(false); // Property Modal
  const [showPostModal, setShowPostModal] = useState(false); // Post Modal
  const [showReelModal, setShowReelModal] = useState(false); // Reel Modal

  // Deletion State
  const [itemToDelete, setItemToDelete] = useState<{
    type: "property" | "post" | "reel";
    item: any;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Computed
  const targetUserId = userId || authUser?.id;
  const isMe = !userId || targetUserId === authUser?.id;

  useFocusEffect(
    useCallback(() => {
      setSelectedProperty(null);
    }, []),
  );

  /**
   * Helpers
   */
  const formatFullName = useCallback((p: perfiles | null): string => {
    if (!p) return "Usuario";
    const parts = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(
      Boolean,
    );
    return parts.length > 0 ? parts.join(" ") : p.nombre_completo || "Usuario";
  }, []);

  const formatPhoneNumber = useCallback(
    (prefix: string | null, number: string | null): string => {
      if (!number) return "No especificado";
      if (prefix) return `${prefix} ${number}`;
      return number;
    },
    [],
  );

  const formatLocation = useCallback(
    (estado: string | null, pais: string): string => {
      if (!estado) return pais || "No especificada";
      return `${estado}, ${pais}`;
    },
    [],
  );

  const formatRole = useCallback((rol: string): string => {
    const roleMap: Record<string, string> = {
      agente: "Agente",
      cliente: "Cliente",
      admin: "Admin",
    };
    return roleMap[rol] || rol;
  }, []);

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

  const handleDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;

    try {
      setDeleting(true);
      if (itemToDelete.type === "property") {
        const { error } = await supabase
          .from("propiedades")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", itemToDelete.item.id);
        if (error) throw error;
      } else if (itemToDelete.type === "post") {
        await deletePost(itemToDelete.item);
      } else if (itemToDelete.type === "reel") {
        await deleteReel(itemToDelete.item);
      }

      await handleRefresh();
      setItemToDelete(null);
    } catch (error: any) {
      console.error("Error deleting item:", error);
      Alert.alert("Error", error.message || "No se pudo eliminar el elemento");
    } finally {
      setDeleting(false);
    }
  }, [itemToDelete, supabase, deletePost, deleteReel, handleRefresh]);

  const profileData = useMemo(
    () => ({
      name: formatFullName(profile),
      avatar: profile?.foto || undefined,
      role: formatRole(profile?.rol || "cliente"),
      location: formatLocation(
        profile?.estado || null,
        profile?.pais || "México",
      ),
      phone: formatPhoneNumber(
        profile?.prefijo_celular || null,
        profile?.celular || null,
      ),
      anos_experiencia: profile?.anos_experiencia || 0,
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
    }),
    [profile, reviewStats],
  );

  const filteredProperties = useMemo(
    () =>
      activeFilter === "Todas"
        ? properties
        : properties.filter((p) => p.status === activeFilter),
    [properties, activeFilter],
  );

  const listData = useMemo(() => {
    switch (activeTab) {
      case "properties":
        return filteredProperties;
      case "posts":
        return posts;
      case "reels":
        return reels;
      default:
        return [];
    }
  }, [activeTab, filteredProperties, posts, reels]);

  const contentCounts = {
    properties: properties.length,
    posts: posts.length,
    reels: reels.length,
  };

  const handlePostPress = useCallback(
    (post: Post) => {
      const targetId = (post as any).feed_item_id || post.id;

      navigation.push("(stack)", {
        screen: "post/[id]",
        params: {
          id: targetId,
          item: JSON.stringify(mapPostToFeedItem(post, profile, targetUserId)),
        },
      });
    },
    [navigation, profile, targetUserId],
  );

  const handlePropertyPress = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  const handleEditProperty = useCallback((property: Property) => {
    setEditProperty(property);
    setShowModal(true);
  }, []);

  const handleDeleteProperty = useCallback((property: Property) => {
    setItemToDelete({ type: "property", item: property });
  }, []);

  const handleEditPost = useCallback((post: Post) => {
    setEditPost(post);
    setShowPostModal(true);
  }, []);

  const handleDeletePost = useCallback((post: Post) => {
    setItemToDelete({ type: "post", item: post });
  }, []);

  const handleEditReel = useCallback((reel: Reel) => {
    setEditReel(reel);
    setShowReelModal(true);
  }, []);

  const handleDeleteReel = useCallback((reel: Reel) => {
    setItemToDelete({ type: "reel", item: reel });
  }, []);

  const handleReelPress = useCallback(
    (reel: Reel) => {
      router.push({
        pathname: "/(stack)/reel/[id]",
        params: {
          id: reel.feed_item_id || reel.id,
          item: JSON.stringify(mapReelToFeedItem(reel, profile, targetUserId)),
        },
      });
    },
    [router, profile, targetUserId],
  );

  const renderHeader = () => (
    <>
      <ProfileHeader
        isOwnProfile={isMe}
        onBack={onBack}
        onSupport={() => router.push("/support")}
        onSettings={() => router.push("/settings")}
      />
      {/* Profile Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <ProfileAvatarPicker
            uri={profileData.avatar}
            name={profileData.name}
            size={100}
            userId={targetUserId!}
            isOwnProfile={isMe}
            onPhotoUpdated={updateProfilePhoto}
          />

          <View style={styles.infoRight}>
            <Text style={styles.name}>{profileData.name}</Text>
            <Text style={styles.biography}>{profileData.biography}</Text>
            {profileData.role === "Cliente" ? (
              <></>
            ) : (
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{profileData.role}</Text>
              </View>
            )}
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
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => {
                handleContact(targetUserId!, null, {
                  id: targetUserId!,
                  nombre: profile?.nombre || "",
                  apellido_paterno: profile?.apellido_paterno || "",
                  foto: profile?.foto || null,
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
          {/* Rating Info Group (Left) */}
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

          {/* Details Group (Right) */}
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
          <View style={styles.statsPanel}>
            {/* Recommends Row moved here */}
            <View style={styles.recommendsRow}>
              <TouchableOpacity
                style={[
                  styles.recItem,
                  isMe && styles.recItemDisabled,
                  { borderRightWidth: 1 },
                ]}
                onPress={() => handleRecommendation(true)}
                disabled={isMe || submittingRecommendation}
              >
                <AnimatedLike
                  isActive={userRecommendation === true}
                  onPress={() => handleRecommendation(true)}
                  activeColor={COLORS.primary}
                  inactiveColor={COLORS.textSecondary}
                  variant="thumbs-up"
                />
                <Text style={styles.recVal}>
                  {profileData.positiveRecommendations}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.recItem, isMe && styles.recItemDisabled]}
                onPress={() => handleRecommendation(false)}
                disabled={isMe || submittingRecommendation}
              >
                <AnimatedLike
                  isActive={userRecommendation === false}
                  onPress={() => handleRecommendation(false)}
                  activeColor={COLORS.error}
                  inactiveColor={COLORS.textSecondary}
                  variant="thumbs-down"
                />
                <Text style={styles.recVal}>
                  {profileData.negativeRecommendations}
                </Text>
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
                    <Text style={styles.progressLabel}>{stars} estrellas</Text>
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
    </>
  );

  const userProfileMapped = useMemo(
    () => (profile ? mapProfileToUser(profile) : undefined),
    [profile],
  );

  const renderItem: ListRenderItem<any> = useCallback(
    ({ item, index }) => {
      switch (activeTab) {
        case "properties":
          return (
            <ProfilePropertyItem
              item={item}
              onPress={handlePropertyPress}
              isOwnProfile={isMe}
              onEdit={handleEditProperty}
              onDelete={handleDeleteProperty}
              isLastInRow={(index + 1) % 3 === 0}
            />
          );
        case "posts":
          return (
            <ProfilePostItem
              item={item}
              user={userProfileMapped}
              onPress={handlePostPress}
              isOwnProfile={isMe}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          );
        case "reels":
          return (
            <ProfileReelItem
              item={item}
              onPress={handleReelPress}
              isOwnProfile={isMe}
              onEdit={handleEditReel}
              onDelete={handleDeleteReel}
            />
          );
        default:
          return null;
      }
    },
    [
      activeTab,
      isMe,
      handlePropertyPress,
      handleEditProperty,
      handleDeleteProperty,
      userProfileMapped,
      handlePostPress,
      handleEditPost,
      handleDeletePost,
      handleReelPress,
      handleEditReel,
      handleDeleteReel,
    ],
  );

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "properties":
        return "No hay propiedades aún";
      case "posts":
        return "No hay posts aún";
      case "reels":
        return "No hay reels aún";
      default:
        return "No hay contenido";
    }
  };

  const getEmptyIcon = () => {
    switch (activeTab) {
      case "properties":
        return "home-outline";
      case "posts":
        return "images-outline";
      case "reels":
        return "film-outline";
      default:
        return "alert-circle-outline";
    }
  };

  if (loading && !refreshing && !profile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        key={activeTab} // Forces refresh of FlatList config when tab changes
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={
          activeTab === "properties" ? styles.columnWrapper : undefined
        }
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={getEmptyIcon()}
              size={48}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
          </View>
        }
      />

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
              keyExtractor={(u, idx) => `${u.id}-${idx}`}
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
                      navigation.navigate("user/[id]", { id: u.id });
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
                      <Text style={styles.recommendedByName} numberOfLines={1}>
                        {fullName || "Usuario"}
                      </Text>
                      <Text style={styles.recommendedByRole} numberOfLines={1}>
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

      {/* Modal Rating Details */}
      {selectedPost && (
        <FeedDetail
          item={selectedPost}
          onClose={() => setSelectedPost(null)}
          currentUserId={authUser?.id}
        />
      )}

      {selectedReel && (
        <ReelDetail
          item={selectedReel}
          onClose={() => setSelectedReel(null)}
          currentUserId={authUser?.id}
        />
      )}

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
              goBack: (shouldRefresh?: boolean) => {
                setSelectedProperty(null);
                // Si hubo cambios, actualizamos
                if (shouldRefresh) handleSilentRefresh();
              },
              navigate: (screen: string, params: any) => {
                setSelectedProperty(null);
                navigation.navigate(screen, params);
              },
            }}
            onRefresh={handleSilentRefresh}
          />
        </Modal>
      )}

      {/* Edit Modals */}
      {showModal && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowModal(false)}
        >
          <CreateProperty
            onBack={(shouldRefresh) => {
              setShowModal(false);
              setEditProperty(null);
              if (shouldRefresh) handleRefresh();
            }}
            propertyId={editProperty?.id}
          />
        </Modal>
      )}

      {showPostModal && (
        <Modal visible={showPostModal}>
          <CreatePost
            post={editPost || undefined}
            onBack={() => {
              setShowPostModal(false);
              setEditPost(null);
              handleRefresh();
            }}
          />
        </Modal>
      )}

      {showReelModal && (
        <Modal visible={showReelModal}>
          <CreateReel
            reelId={editReel?.id}
            onBack={() => {
              setShowReelModal(false);
              setEditReel(null);
              handleRefresh();
            }}
          />
        </Modal>
      )}

      <ConfirmDialog
        visible={!!itemToDelete}
        title="Eliminar elemento"
        message="¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
        danger
        loading={deleting}
      />
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
    // Note: ProfileReelItem and ProfilePostItem use internal padding calculation.
    // The FlatList is the main container now.
  },
  columnWrapper: {
    justifyContent: "flex-start",
    paddingHorizontal: 12, // Apply padding here for Property rows
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
    marginBottom: 16,
    alignItems: "stretch", // Changed to stretch to control width via margins
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
  statsPanel: {
    marginTop: 16,
    padding: 20,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  recommendsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginBottom: 20,
  },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderColor: COLORS.cardBorder,
  },
  recItemDisabled: {
    opacity: 0.5,
  },
  recItemActive: {
    backgroundColor: COLORS.white,
  },
  recVal: {
    fontSize: 14,
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
  emptyState: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  biography: {
    fontSize: 12,
    color: COLORS.textQuaternary,
    marginBottom: 4,
  },
});

export default Profile;
