import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { COLORS } from "@/constants";
import { Bath } from "lucide-react-native";

import { useViewTracking } from "@/hooks";
import usePropertyDetails from "@/hooks/usePropertyDetails";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/context/ToastContext";
import { MapDetails } from "./MapDetails";
import CreateProperty from "../CreateContent/CreateProperty";
import { useChatInitiator } from "@/hooks/messaging/useChatInitiator";
import { logger } from "@/utils/logger";
import { parseImages } from "@/utils/imageParser";
import { formatDateShort } from "@/utils/dateFormatter";
import { router } from "expo-router";

import { PropertyDetailImages } from "./PropertyDetailImages";
import { PropertyFinancialSection } from "./PropertyFinancialSection";
import { PropertyOwnerContact } from "./PropertyOwnerContact";
import { propertyDetailStyles as styles } from "./propertyDetailStyles";

const log = logger.scoped("PropertyDetail");

interface PropertyDetailProps {
  propertyId: string;
  onContact?: (ownerId: string, propertyId: string) => void;
  onRefresh?: () => void;
  sinDatos?: boolean;
}


const PropertyDetail: React.FC<PropertyDetailProps> = ({
  propertyId,
  onContact,
  onRefresh,
  sinDatos,
}) => {
  const { user } = useAuth();
  const { propertyDetails, loading, refetch } = usePropertyDetails(
    propertyId || "",
  );
  const [, setProperty] = useState<any>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [propertyIdModal, setPropertyIdModal] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [, setHasChanges] = useState(false);

  const { handleContact } = useChatInitiator();

  const [refreshing, setRefreshing] = useState(false);
  const { showToast } = useToast();

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast("Código copiado al portapapeles", "success");
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refetch();
      setHasChanges(true);
      if (onRefresh) onRefresh();
    } catch (error) {
      log.error("Error refreshing property detail:", error);
    } finally {
      setRefreshing(false);
    }
  };

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
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Regresar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = parseImages(propertyDetails.fotos);
  const operations = propertyDetails.operaciones || [];
  const profile = propertyDetails.perfil;
  const amenities =
    propertyDetails.amenidades?.map((a: any) => a.amenidad.nombre) || [];
  const gravamenes = propertyDetails.gravamenes || [];
  const financiamientos =
    propertyDetails.financiamientos?.map((f: any) => f.tipo.nombre) || [];

  interface LocalStatItemProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string | number;
  }
  const StatItem = ({ icon, label, value }: LocalStatItemProps) => (
    <View style={styles.statItem}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
      </View>
      <View style={styles.statTextContainer}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
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
        <PropertyDetailImages
          images={images}
          currentImageIndex={currentImageIndex}
          onImageIndexChange={setCurrentImageIndex}
          onBack={() => router.back()}
          feedItemId={propertyDetails.feed_items.id}
          feedItemLikes={propertyDetails.feed_items.likes_count || 0}
          feedItemComments={propertyDetails.feed_items.comentarios_count || 0}
          userId={user?.id}
          propertyId={propertyDetails.id}
          shareTitle={`Propiedad: ${propertyDetails.subtipo} en ${propertyDetails.municipio}`}
          shareDescription={propertyDetails.descripcion?.substring(0, 100)}
          shareCode={
            propertyDetails.codigo_propiedad || propertyDetails.code
          }
          onCommentClick={() => setShowComments(true)}
          onTrackInteraction={trackInteraction as (kind: string) => void}
        />

        <View style={styles.content}>
          {/* Header Principal */}
          <View style={styles.headerInfo}>
            <View style={styles.metaRowContent}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  copyToClipboard(
                    propertyDetails.codigo_propiedad || propertyDetails.id,
                  )
                }
                style={styles.idContainer}
              >
                <Text style={styles.metaText}>
                  ID: {propertyDetails.codigo_propiedad || propertyDetails.id}
                </Text>
                <Ionicons
                  name="copy-outline"
                  size={14}
                  color={COLORS.textSecondary}
                  style={styles.copyIcon}
                />
              </TouchableOpacity>

              <Text style={styles.metaSeparator}>•</Text>

              <Text style={styles.metaText}>
                {propertyDetails.created_at
                  ? formatDateShort(propertyDetails.created_at)
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
                    <Bath size={16} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValue}>{propertyDetails.banos}</Text>
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

          {/* Financiamiento, Gravamen y Comisiones */}
          <PropertyFinancialSection
            operations={operations}
            gravamenes={gravamenes}
            financiamientos={financiamientos}
            sinDatos={sinDatos}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <MapDetails property={propertyDetails} />
          </View>

          {/* Perfil del Publicador y botón de acción */}
          <PropertyOwnerContact
            profile={profile}
            propertyId={propertyDetails.id}
            currentUserId={user?.id}
            sinDatos={sinDatos}
            loadingEdit={loadingEdit}
            onContactExternal={onContact}
            onContactInternal={(p) =>
              handleContact(p.id, propertyDetails.id, {
                id: p.id,
                nombre: p.nombre,
                foto: p.foto,
                apellido_paterno: p.apellido_paterno || "",
              })
            }
            onEditProperty={() => {
              setLoadingEdit(true);
              setShowModal(true);
              setPropertyIdModal(propertyDetails.id);
            }}
          />
        </View>
      </ScrollView>

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
          propertyId={propertyIdModal ?? undefined}
        />
      </Modal>
    </SafeAreaView>
  );
};

export default PropertyDetail;
