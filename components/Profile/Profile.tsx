import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { User, Property, perfiles, EstadisticasResenas } from "../../types";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";
import PropertyDetail from "../Details/PropertyDetail";
import { Avatar } from "../shared";
import { ProfileHeader } from "./ProfileHeader";
import SelectionModal from "../modals/SelectionModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

const { width } = Dimensions.get("window");

interface ProfileProps {
  userId?: string | null;
  onBack?: () => void;
}

type RecommendedByUser = {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  foto: string | null;
  rol: "admin" | "agente" | "cliente";
};

// Estados disponibles para filtrar
const FILTER_OPTIONS = [
  "Todas",
  "Publicada",
  "Suspendida",
  "Rentada",
  "Reservada",
  "Vendida",
];

const Profile: React.FC<ProfileProps> = ({ userId, onBack }) => {
  const { user: authUser, profile: authProfile } = useAuth();
  const navigation = useNavigation<any>();

  // State
  const [profile, setProfile] = useState<perfiles | null>(null);
  const [reviewStats, setReviewStats] = useState<EstadisticasResenas | null>(
    null
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingDetails, setShowRatingDetails] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("Todas");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null
  );
  const [userRecommendation, setUserRecommendation] = useState<boolean | null>(
    null
  );
  const [submittingRecommendation, setSubmittingRecommendation] =
    useState(false);
  const [recommendedByUsers, setRecommendedByUsers] = useState<
    RecommendedByUser[]
  >([]);
  const [loadingRecommendedBy, setLoadingRecommendedBy] = useState(false);
  const [recommendedByError, setRecommendedByError] = useState<string | null>(
    null
  );
  const [showRecommendedByModal, setShowRecommendedByModal] = useState(false);
  const [recommendedByHasMore, setRecommendedByHasMore] = useState(false);
  const [recommendedByPage, setRecommendedByPage] = useState(0);

  // Determine if viewing own profile
  const targetUserId = userId || authUser?.id;
  const isMe = !userId || targetUserId === authUser?.id;

  // Reset selected property when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      // Si se desea ocultar el modal al volver a entrar:
      setSelectedProperty(null);
    }, [])
  );

  // Helper functions
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

  const loadRecommendedByUsers = async (options?: { reset?: boolean }) => {
    if (!targetUserId) return;

    try {
      const reset = options?.reset === true;
      setLoadingRecommendedBy(true);
      setRecommendedByError(null);

      const pageSize = 30;
      const nextPage = reset ? 0 : recommendedByPage;
      const from = nextPage * pageSize;
      const to = from + pageSize - 1;

      const { data: recsData, error: recsError } = await supabase
        .from("recomendaciones_usuarios")
        .select("recomendado_por")
        .eq("usuario_recomendado_id", targetUserId)
        .eq("recomienda", true)
        .range(from, to);

      if (recsError) throw recsError;

      const recommendedByIds = (recsData || [])
        .map((r: any) => r?.recomendado_por)
        .filter(Boolean) as string[];
      const recommendedByIdsUnique = Array.from(new Set(recommendedByIds));

      if (recommendedByIdsUnique.length === 0 && reset) {
        setRecommendedByUsers([]);
        setRecommendedByHasMore(false);
        setRecommendedByPage(0);
        return;
      }

      if (recommendedByIdsUnique.length === 0) {
        setRecommendedByHasMore(false);
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from("perfiles")
        .select("id,nombre,apellido_paterno,apellido_materno,foto,rol")
        .in("id", recommendedByIdsUnique);

      if (profilesError) throw profilesError;

      const profiles = (profilesData || []) as RecommendedByUser[];
      const profilesById = new Map(profiles.map((p) => [p.id, p]));
      const ordered = recommendedByIdsUnique
        .map((id) => profilesById.get(id))
        .filter(Boolean) as RecommendedByUser[];

      setRecommendedByUsers((prev) =>
        reset ? ordered : [...prev, ...ordered]
      );
      setRecommendedByHasMore(recommendedByIdsUnique.length === pageSize);
      setRecommendedByPage(nextPage + 1);
    } catch (error: any) {
      if (options?.reset) {
        setRecommendedByUsers([]);
      }
      setRecommendedByHasMore(false);
      setRecommendedByError(
        error?.message || "Error al cargar recomendaciones"
      );
    } finally {
      setLoadingRecommendedBy(false);
    }
  };

  useEffect(() => {
    if (!showRatingDetails) return;
    setRecommendedByUsers([]);
    setRecommendedByHasMore(false);
    setRecommendedByPage(0);
    loadRecommendedByUsers({ reset: true });
  }, [showRatingDetails, targetUserId]);

  useEffect(() => {
    if (!showRecommendedByModal) return;
    if (recommendedByUsers.length > 0 || loadingRecommendedBy) return;
    if ((reviewStats?.total_recomiendan || 0) <= 0) return;
    setRecommendedByUsers([]);
    setRecommendedByHasMore(false);
    setRecommendedByPage(0);
    loadRecommendedByUsers({ reset: true });
  }, [showRecommendedByModal]);

  const handleRecommendation = async (recomienda: boolean) => {
    if (!authUser?.id || !targetUserId || isMe || submittingRecommendation)
      return;

    try {
      setSubmittingRecommendation(true);

      // Si ya existe y es el mismo valor, eliminar (toggle off)
      if (userRecommendation === recomienda) {
        const { error } = await supabase
          .from("recomendaciones_usuarios")
          .delete()
          .eq("usuario_recomendado_id", targetUserId)
          .eq("recomendado_por", authUser.id);

        if (error) throw error;
        setUserRecommendation(null);
      }
      // Si no existe, insertar
      else if (userRecommendation === null) {
        const { error } = await supabase
          .from("recomendaciones_usuarios")
          .insert({
            usuario_recomendado_id: targetUserId,
            recomendado_por: authUser.id,
            recomienda,
          });

        if (error) throw error;
        setUserRecommendation(recomienda);
      }
      // Si existe con diferente valor, actualizar
      else {
        const { error } = await supabase
          .from("recomendaciones_usuarios")
          .update({ recomienda })
          .eq("usuario_recomendado_id", targetUserId)
          .eq("recomendado_por", authUser.id);

        if (error) throw error;
        setUserRecommendation(recomienda);
      }

      // Recargar estadísticas
      const { data: statsData } = await supabase
        .from("vw_estadisticas_resenas")
        .select("*")
        .eq("profesional_id", targetUserId)
        .maybeSingle();

      if (statsData) {
        setReviewStats(statsData);
      }

      if (showRatingDetails || showRecommendedByModal) {
        setRecommendedByUsers([]);
        setRecommendedByHasMore(false);
        setRecommendedByPage(0);
        await loadRecommendedByUsers({ reset: true });
      }
    } catch (error: any) {
      console.error("Error updating recommendation:", error);
    } finally {
      setSubmittingRecommendation(false);
    }
  };

  // Fetch profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // If viewing own profile, use authProfile
        if (isMe && authProfile) {
          setProfile(authProfile);
        } else {
          // Fetch other user's profile
          const { data, error } = await supabase
            .from("perfiles")
            .select("*")
            .eq("id", targetUserId)
            .maybeSingle();

          if (error) {
            console.error("Error fetching profile:", error);
          } else {
            setProfile(data);
          }
        }

        // Fetch review statistics from vw_estadisticas_resenas
        const { data: statsData, error: statsError } = await supabase
          .from("vw_estadisticas_resenas")
          .select("*")
          .eq("profesional_id", targetUserId)
          .maybeSingle();

        if (statsError) {
          console.error("Error fetching review stats:", statsError);
        } else {
          setReviewStats(statsData);
        }

        // Fetch user's recommendation (if viewing another user's profile)
        if (!isMe && authUser?.id) {
          const { data: recData, error: recError } = await supabase
            .from("recomendaciones_usuarios")
            .select("recomienda")
            .eq("usuario_recomendado_id", targetUserId)
            .eq("recomendado_por", authUser.id)
            .maybeSingle();

          if (recError) {
            console.error("Error fetching recommendation:", recError);
          } else {
            setUserRecommendation(recData?.recomienda ?? null);
          }
        }

        setRecommendedByUsers([]);
        setRecommendedByError(null);

        // Fetch user's properties
        const { data: propsData, error: propsError } = await supabase
          .from("propiedades")
          .select(
            `
            id,
            tipo,
            subtipo,
            descripcion,
            ciudad,
            municipio,
            colonia,
            fotos,
            habitaciones,
            banos,
            metros_cuadrados_construccion,
            metros_cuadrados_terreno,
            activo,
            operaciones_propiedad (
              tipo_operacion,
              precio,
              moneda
            )
          `
          )
          .eq("created_by", targetUserId)
          .is("deleted_at", null);

        if (propsError) {
          console.error("Error fetching properties:", propsError);
        } else if (propsData) {
          // Transform to Property type
          const transformedProps: Property[] = propsData.map((p: any) => {
            const operation = p.operaciones_propiedad?.[0];

            // Mapear el estado de activo a un estado en español
            let status:
              | "Publicada"
              | "Suspendida"
              | "Rentada"
              | "Reservada"
              | "Vendida" = "Publicada";
            if (!p.activo) {
              status = "Suspendida";
            }
            // Aquí podrías agregar más lógica para determinar otros estados
            // basándote en otros campos de la BD si existen

            return {
              id: p.id,
              title: `${p.subtipo} en ${p.ciudad}`,
              description: p.descripcion,
              price: operation?.precio || 0,
              currency: operation?.moneda || "MXN",
              location: {
                address: "",
                country: "México",
                state: "",
                city: p.ciudad || "",
                municipio: p.municipio,
                colony: p.colonia || "",
              },
              images: p.fotos || [],
              features: {
                beds: p.habitaciones || 0,
                baths: p.banos || 0,
                constructionSqft: p.metros_cuadrados_construccion || 0,
                landSqft: p.metros_cuadrados_terreno || 0,
              },
              amenities: [],
              type: p.tipo,
              subtype: p.subtipo,
              operation:
                operation?.tipo_operacion === "venta" ? "Sale" : "Rent",
              status: status,
            };
          });
          setProperties(transformedProps);
        }
      } catch (error) {
        console.error("Error in fetchProfileData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [targetUserId, isMe, authProfile]);

  // Profile data
  const profileData = {
    name: formatFullName(profile),
    avatar: profile?.foto || undefined, // undefined para que Avatar use las iniciales
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
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Avatar
              uri={profileData.avatar}
              name={profileData.name}
              size={100}
              style={styles.avatar}
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
                  console.log("🚀 Navegando a Messages con initialUser:", {
                    id: targetUserId,
                    nombre: profile?.nombre,
                    apellido_paterno: profile?.apellido_paterno || "",
                  });
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

        {/* Sección de calificaciones */}
        <View style={styles.ratingSection}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowRatingDetails(!showRatingDetails)}
            style={styles.ratingCard}
            accessibilityLabel="Ver calificaciones del usuario"
            accessibilityRole="button"
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

              <View style={styles.progressSection}>
                {[5, 4, 3, 2, 1].map((stars) => {
                  // Obtener el total de reseñas para este nivel de estrellas
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
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
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

        {/* Toolbar de filtros */}
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

        {/* Grid de propiedades */}
        <View style={styles.grid}>
          {filteredProperties.map((property) => (
            <TouchableOpacity
              key={property.id}
              style={styles.gridItem}
              onPress={() => setSelectedProperty(property)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: property.images[0] }}
                style={styles.gridImage}
                resizeMode="cover"
              />

              <View
                style={[
                  styles.statusBadge,
                  property.status === "Publicada" && styles.statusPublicada,
                  property.status === "Suspendida" && styles.statusSuspendida,
                  property.status === "Rentada" && styles.statusRentada,
                  property.status === "Reservada" && styles.statusReservada,
                  property.status === "Vendida" && styles.statusVendida,
                ]}
              >
                <Text style={styles.statusText}>{property.status}</Text>
              </View>

              {isMe && (
                <TouchableOpacity
                  style={styles.editIconOverlay}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate("EditProperty", {
                      propertyId: property.id,
                    });
                  }}
                >
                  <Ionicons name="pencil" size={14} color={COLORS.white} />
                </TouchableOpacity>
              )}

              <View style={styles.gridInfo}>
                <View style={styles.priceRow}>
                  <Text style={styles.propertyPrice}>
                    $
                    {property.price >= 1000000
                      ? `${(property.price / 1000000).toFixed(1)}M`
                      : `${(property.price / 1000).toFixed(0)}k`}
                  </Text>
                  <Text style={styles.propertyCurrency}>
                    {property.currency}
                  </Text>
                </View>
                <Text style={styles.propertyLocation} numberOfLines={1}>
                  {property.location.city}
                </Text>
                <View style={styles.propertyFeatures}>
                  {property.features.beds > 0 && (
                    <View style={styles.featureBadge}>
                      <Ionicons
                        name="bed-outline"
                        size={10}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.featureBadgeText}>
                        {property.features.beds}
                      </Text>
                    </View>
                  )}
                  {property.features.baths > 0 && (
                    <View style={styles.featureBadge}>
                      <Ionicons
                        name="water-outline"
                        size={10}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.featureBadgeText}>
                        {property.features.baths}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredProperties.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No se encontraron propiedades en "{activeFilter}"
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modal de filtros */}
      <SelectionModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSelect={(value) => setActiveFilter(value)}
        title="Filtrar Propiedades"
        options={FILTER_OPTIONS}
        currentValue={activeFilter}
        searchable={false}
      />

      {/* Modal de detalle de propiedad */}
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
  avatar: {
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 3,
    borderColor: COLORS.white,
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
  recommendedByList: {
    gap: 12,
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
  recommendedByItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  recommendedByMoreText: {
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
    backgroundColor: COLORS.background,
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingTop: 12,
    justifyContent: "space-between",
  },
  gridItem: {
    width: `${(100 - 4) / 3}%`, // 3 items por fila con espacio entre ellos
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.background,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statusPublicada: {
    backgroundColor: COLORS.success,
  },
  statusSuspendida: {
    backgroundColor: COLORS.warning,
  },
  statusRentada: {
    backgroundColor: COLORS.info,
  },
  statusReservada: {
    backgroundColor: COLORS.tagPurple,
  },
  statusVendida: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  editIconOverlay: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  gridInfo: {
    padding: 10,
    backgroundColor: COLORS.white,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  propertyCurrency: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  propertyLocation: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  propertyFeatures: {
    flexDirection: "row",
    gap: 6,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
});

export default Profile;
