import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  Modal,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/constants";
import { Bath } from "lucide-react-native";
import { ActionButtons, Avatar } from "../shared";

import { useViewTracking } from "@/hooks/hooks";
import usePropertyDetails from "@/hooks/hooks/usePropertyDetails";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapDetails } from "./MapDetails";
import CreateProperty from "../CreateContent/CreateProperty";
import { useChatInitiator } from "@/hooks/hooks/messaging/useChatInitiator";
import { fetchPropertyData } from "@/services/pdfService";

const { width } = Dimensions.get("window");

interface PropertyDetailProps {
  propertyId: string;
  navigation: any;
  onContact?: (ownerId: string, propertyId: string) => void;
  onRefresh?: () => void;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({
  propertyId,
  navigation,
  onContact,
  onRefresh,
}) => {
  const { user } = useAuth();
  const { propertyDetails, loading, refetch } = usePropertyDetails(
    propertyId || "",
  );
  const [property, setProperty] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [propertyIdModal, setPropertyIdModal] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { handleContact } = useChatInitiator();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
      setHasChanges(true);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Error refreshing property detail:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Hook de view tracking
  const { trackInteraction } = useViewTracking({
    feedItemId: propertyDetails?.feed_items?.id,
    userId: user?.id,
    isVisible: true,
  });

  useEffect(() => {
    if (propertyDetails) {
      setProperty(propertyDetails);
    }
  }, [propertyDetails]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!propertyDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text>No se encontró la propiedad</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack(hasChanges)}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  let images: string[] = [];
  const rawFotos = propertyDetails.fotos;

  if (Array.isArray(rawFotos)) {
    images = rawFotos;
  } else if (typeof rawFotos === "string" && rawFotos.trim().startsWith("[")) {
    try {
      images = JSON.parse(rawFotos);
    } catch (e) {
      images = rawFotos.split(",").map((s) => s.trim());
    }
  } else if (typeof rawFotos === "string") {
    // Handle comma-separated strings that are NOT JSON arrays
    if (rawFotos.includes(",")) {
      images = rawFotos.split(",").map((s) => s.trim());
    } else {
      images = [rawFotos];
    }
  }

  const hasImages = images.length > 0;
  const operations = propertyDetails.operaciones || [];
  const profile = propertyDetails.perfil;
  const amenities =
    propertyDetails.amenidades?.map((a: any) => a.amenidad.nombre) || [];
  const gravamenes = propertyDetails.gravamenes || [];
  const financiamientos =
    propertyDetails.financiamientos?.map((f: any) => f.tipo.nombre) || [];

  const StatItem = ({ icon, label, value, subLabel }: any) => (
    <View style={styles.statItem}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const offset = e.nativeEvent.contentOffset.x;
              setCurrentImageIndex(Math.round(offset / width));
            }}
          >
            {hasImages ? (
              images.map((img: string, index: number) => (
                <Image key={index} source={{ uri: img }} style={styles.image} />
              ))
            ) : (
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1080&q=80",
                }}
                style={styles.image}
              />
            )}
          </ScrollView>

          <View style={styles.floatingActions}>
            <ActionButtons
              feedItemId={propertyDetails.feed_items.id}
              feedItemType="property"
              initialLikes={propertyDetails.feed_items.likes_count || 0}
              comments={propertyDetails.feed_items.comentarios_count || 0}
              userId={user?.id}
              onCommentClick={() => {
                trackInteraction("comentario");
                setShowComments(true);
              }}
              onTrackInteraction={trackInteraction}
              shareTitle={`Propiedad: ${propertyDetails.subtipo} en ${propertyDetails.municipio}`}
              shareDescription={propertyDetails.descripcion?.substring(0, 100)}
              shareImageUrl={hasImages ? images[0] : undefined}
              orientation="vertical"
              tintColor={COLORS.white}
              showContactButton={false}
              propertyId={propertyDetails.id}
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.goBack(hasChanges)}
            style={styles.backFloating}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {images.length > 1 && (
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>
                {currentImageIndex + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Header Principal */}
          <View style={styles.headerInfo}>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                ID: {propertyDetails.codigo_propiedad || propertyDetails.id} •{" "}
                {propertyDetails.created_at
                  ? new Date(propertyDetails.created_at).toLocaleDateString(
                      "es-MX",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      },
                    )
                  : ""}
              </Text>
            </View>

            <View style={styles.tagRow}>
              <View style={styles.typeTag}>
                <Text style={styles.typeTagText}>
                  {propertyDetails.subtipo}
                </Text>
              </View>
              <View
                style={[styles.typeTag, { backgroundColor: COLORS.background }]}
              >
                <Text
                  style={[styles.typeTagText, { color: COLORS.textSecondary }]}
                >
                  {propertyDetails.antiguedad
                    ? `${propertyDetails.antiguedad} años`
                    : "Nueva"}
                </Text>
              </View>
            </View>

            <Text style={styles.title}>
              {propertyDetails.subtipo} en {propertyDetails.municipio}
            </Text>

            <View style={styles.priceContainer}>
              {operations.map((op: any, idx: number) => (
                <View key={idx} style={styles.priceBadge}>
                  <Text style={styles.operationType}>
                    {op.tipo_operacion === "venta" ? "Venta" : "Renta"}
                  </Text>
                  <Text style={styles.price}>
                    {op.moneda} {op.precio.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.locationRow}>
              <Ionicons
                name="location"
                size={18}
                color={COLORS.textSecondary}
              />
              <Text style={styles.locationText}>
                {propertyDetails.calle
                  ? `${propertyDetails.calle} ${
                      propertyDetails.numero_exterior
                        ? propertyDetails.numero_exterior
                        : ""
                    }, `
                  : ""}
                {propertyDetails.colonia ? propertyDetails.colonia + ", " : ""}
                {propertyDetails.municipio}, {propertyDetails.ciudad}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Características Principales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Características</Text>
            <View style={styles.statsGrid}>
              {propertyDetails.habitaciones > 0 &&
                (propertyDetails.tipo?.toLowerCase() === "industrial" ? (
                  <StatItem
                    icon="grid-outline"
                    label="Espacios"
                    value={propertyDetails.habitaciones}
                  />
                ) : (
                  <StatItem
                    icon="bed-outline"
                    label="Recámaras"
                    value={propertyDetails.habitaciones}
                  />
                ))}
              {propertyDetails.banos > 0 && (
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Bath size={14} color={COLORS.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.statValue}>
                      {propertyDetails.banos}
                    </Text>
                    <Text style={styles.statLabel}>Baños</Text>
                  </View>
                </View>
              )}
              {propertyDetails.estacionamientos > 0 && (
                <StatItem
                  icon="car-outline"
                  label="Estacionamientos"
                  value={propertyDetails.estacionamientos}
                />
              )}
              {propertyDetails.pisos && (
                <StatItem
                  icon="business-outline"
                  label="Niveles"
                  value={propertyDetails.pisos}
                />
              )}
              {propertyDetails.metros_cuadrados_construccion && (
                <StatItem
                  icon="home-outline"
                  label="Construcción"
                  value={`${propertyDetails.metros_cuadrados_construccion} m²`}
                />
              )}
              {propertyDetails.metros_cuadrados_terreno && (
                <StatItem
                  icon="resize-outline"
                  label="Terreno"
                  value={`${propertyDetails.metros_cuadrados_terreno} m²`}
                />
              )}
            </View>

            <View style={[styles.statsGrid, { marginTop: 12 }]}>
              {propertyDetails.amueblado &&
                propertyDetails.amueblado !== "No" && (
                  <View style={styles.chip}>
                    <Ionicons
                      name="briefcase-outline"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.chipText}>
                      Amueblado: {propertyDetails.amueblado}
                    </Text>
                  </View>
                )}
              {propertyDetails.pet_friendly === "Sí" && (
                <View style={styles.chip}>
                  <Ionicons
                    name="paw-outline"
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.chipText}>Pet Friendly</Text>
                </View>
              )}
            </View>
          </View>

          {/* Amenidades */}
          {amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenidades</Text>
              <View style={styles.amenitiesContainer}>
                {amenities.map((amenity: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.amenityChip,
                      { borderColor: COLORS.cardBorder },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={14}
                      color={COLORS.primary}
                    />
                    <Text
                      style={[
                        styles.amenityText,
                        { color: COLORS.textSecondary },
                      ]}
                    >
                      {amenity}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* Descripción */}
          {propertyDetails.descripcion && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.descriptionText}>
                {propertyDetails.descripcion}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Financiamiento y Gravamen */}
          {(financiamientos.length > 0 || gravamenes.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financiero y Legal</Text>

              {gravamenes.length > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color={COLORS.error}
                  />
                  <View>
                    <Text style={styles.warningTitle}>
                      Propiedad con Gravamen
                    </Text>
                    {gravamenes.map((g: any, i: number) => (
                      <Text key={i} style={styles.warningText}>
                        {g.institucion?.nombre} :
                        {g.monto ? g.monto : " Monto no especificado"}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {financiamientos.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.label, { marginBottom: 8 }]}>
                    Acepta Financiamiento:
                  </Text>
                  <View style={styles.amenitiesContainer}>
                    {financiamientos.map((f: string, i: number) => (
                      <View
                        key={i}
                        style={[
                          styles.amenityChip,
                          { borderColor: COLORS.cardBorder },
                        ]}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={14}
                          color={COLORS.textSecondary}
                        />
                        <Text
                          style={[
                            styles.amenityText,
                            { color: COLORS.textSecondary },
                          ]}
                        >
                          {f}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Comisiones (Solo visible si comparte) */}
          {operations.some((op: any) => op.comparte_comision) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Esquema de Comisión</Text>
              {operations.map((op: any, i: number) =>
                op.comparte_comision ? (
                  <View key={i} style={styles.commissionBox}>
                    <Text style={styles.commissionTitle}>
                      {op.tipo_operacion === "venta" ? "Venta" : "Renta"}
                    </Text>
                    <View style={styles.commissionRow}>
                      <Text style={styles.commissionLabel}>Comisión:</Text>
                      <Text style={styles.commissionValue}>
                        {op.comision_porcentaje
                          ? `${op.comision_porcentaje}%`
                          : op.comision_monto_fijo
                            ? `$${op.comision_monto_fijo}`
                            : "No especificado"}
                      </Text>
                    </View>
                    <View style={styles.commissionRow}>
                      <Text style={styles.commissionLabel}>Comparte:</Text>
                      <Text style={styles.commissionValue}>
                        {op.porcentaje_comision_compartida
                          ? `${op.porcentaje_comision_compartida}%`
                          : op.monto_comision_compartida
                            ? `$${op.monto_comision_compartida.toLocaleString()}`
                            : "No especificado"}
                      </Text>
                    </View>
                    {op.condiciones_comision_compartida && (
                      <View style={styles.commissionRow}>
                        <Text style={styles.commissionLabel}>Condiciones:</Text>
                        <Text style={styles.commissionValue} numberOfLines={2}>
                          {op.condiciones_comision_compartida}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null,
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <MapDetails property={propertyDetails} />
          </View>

          {/* Perfil del Publicador */}
          {profile && (
            <View style={styles.profileSection}>
              <Avatar
                uri={profile.foto}
                name={profile.nombre}
                size={50}
                style={styles.profileFoto}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile.nombre}</Text>
                <Text style={styles.profileRole}>Agente Inmobiliario</Text>
              </View>

              {user.id === profile.id ? (
                <View></View>
              ) : (
                <TouchableOpacity
                  style={styles.contactIconBtn}
                  onPress={() => {
                    if (onContact) {
                      onContact(profile.id, propertyDetails.id);
                    } else {
                      handleContact(profile.id, propertyDetails.id, {
                        id: profile.id,
                        nombre: profile.nombre,
                        foto: profile.foto,
                        apellido_paterno: profile.apellido_paterno || "",
                      });
                    }
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={24}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Botón de Acción Principal */}
          {user?.id === profile?.id ? (
            <TouchableOpacity
              style={[styles.mainContactBtn, { backgroundColor: COLORS.info }]}
              onPress={() => {
                setLoadingEdit(true);
                setShowModal(true);
                setPropertyIdModal(propertyDetails.id);
              }}
            >
              <Text style={styles.mainContactBtnText}>
                {loadingEdit ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <>
                    <Ionicons
                      name="pencil"
                      size={20}
                      color={COLORS.white}
                      style={{ marginRight: 8, gap: 8 }}
                    />
                    <Text style={{ marginLeft: 8 }}>Editar Propiedad</Text>
                  </>
                )}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.mainContactBtn}
              onPress={() => {
                if (onContact) {
                  onContact(profile.id, propertyDetails.id);
                } else {
                  handleContact(profile.id, propertyDetails.id, {
                    id: profile.id,
                    nombre: profile.nombre,
                    foto: profile.foto,
                    apellido_paterno: profile.apellido_paterno || "",
                  });
                }
              }}
            >
              <Ionicons
                name="call"
                size={20}
                color={COLORS.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.mainContactBtnText}>Contactar ahora</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Modal de comentarios */}
      <CommentsBottomSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        feedItemId={propertyDetails.feed_items.id}
        currentUserId={user?.id}
      />

      <Modal visible={showModal} onRequestClose={() => setShowModal(false)}>
        <CreateProperty
          onBack={(shouldRefresh) => {
            setShowModal(false);
            setLoadingEdit(false);
            if (shouldRefresh) handleRefresh();
          }}
          propertyId={propertyIdModal}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  statIcon: {
    backgroundColor: COLORS.primaryLight,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: "600",
  },
  imageContainer: {
    width: "100%",
    backgroundColor: COLORS.white,
  },
  image: {
    width: width,
    height: 350,
    resizeMode: "cover",
  },
  placeholderImage: {
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  backFloating: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blackTransparent50,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  imageBadge: {
    position: "absolute",
    bottom: 30,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.blackTransparent60,
  },
  imageBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  content: {
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },

  floatingActions: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 10,
    alignItems: "center",
  },
  headerInfo: {
    marginBottom: 16,
  },
  metaRow: {
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  tagRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  typeTag: {
    backgroundColor: COLORS.gradientBackground,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeTagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
    lineHeight: 30,
  },
  priceContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  operationType: {
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  locationText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    width: "31%",
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gradientBackground,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statSubLabel: {
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  amenityText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: "500",
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 26,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  warningBox: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.warning,
    gap: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.warningDark,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: COLORS.warning,
    lineHeight: 20,
    flex: 1,
  },
  infoBox: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.info,
    gap: 12,
    marginTop: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.infoDark,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  infoIcon: {
    color: COLORS.info,
  },
  infoLink: {
    color: COLORS.infoDark,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  commissionBox: {
    backgroundColor: COLORS.infoLight,
    borderWidth: 1,
    borderColor: COLORS.info,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commissionTitle: {
    fontWeight: "bold",
    color: COLORS.infoDark,
    marginBottom: 8,
    fontSize: 14,
  },
  commissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commissionLabel: {
    fontSize: 13,
    color: COLORS.info,
  },
  commissionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.infoDark,
    maxWidth: "60%",
    textAlign: "right",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  profileFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  profileRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  contactIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  mainContactBtn: {
    backgroundColor: COLORS.primary,
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  mainContactBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.white,
    marginBottom: 25,
  },
});

export default PropertyDetail;
