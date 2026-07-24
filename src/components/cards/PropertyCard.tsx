/**
 * PropertyCard - Tarjeta de propiedad para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share + navegación correcta a Messages
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { FeedItem, User } from "../../types";
import {
  useCurrentUserId,
  useFeedInteractions,
  useViewTracking,
} from "@/hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../../styles";
import { UserHeader, ImageGallery, ReportModal, Avatar } from "../shared";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import ConfirmDialog from "../shared/ConfirmDialog";
import CreateProperty from "../CreateContent/CreateProperty";
import { supabase } from "../../lib/supabase";
import { logger } from "@/utils/logger";
import ActionButtons from "../ActionButtons";

const log = logger.scoped("PropertyCard");
import { Toilet, Building2, MoveVertical } from "lucide-react-native";
import { useUserRecommendations } from "@/hooks/useUserRecommendations";
import RecommendedUsersModal from "../modals/RecommendedUsersModal";
import { buildRecommendedText } from "./recommendedText";
import { useChatInitiator } from "@/hooks/messaging/useChatInitiator";
import { MapModal } from "../shared/MapModal";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/context/ToastContext";
import firstUpperCase from "@/utils/firstUpperCase";
import { formatOperation } from "@/utils/priceFormatter";
import { formatDateShort } from "@/utils/dateFormatter";
import { getCamposVisibles, esTerreno } from "@/constants/propertyData";

interface PropertyCardProps {
  item: FeedItem;
  onClick: () => void;
  onUserClick?: (user: User) => void;
  onCommentClick: () => void;
  showContactButton?: boolean;
  currentUserId?: string;
  onPropertyUpdated?: () => void;
  /**
   * Se ejecuta (y se espera) ANTES de navegar a "Contactar". Se usa cuando la
   * tarjeta vive dentro de un <Modal> nativo (p. ej. Coincidencias): hay que
   * cerrar ese modal primero, si no la pantalla de mensajes se abre por detrás
   * en iOS y parece que "no funciona".
   */
  onBeforeNavigate?: () => void | Promise<void>;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  item,
  onClick,
  onUserClick,
  onCommentClick,
  showContactButton = true,
  currentUserId,
  onPropertyUpdated,
  onBeforeNavigate,
}) => {
  const {
    showOptions,
    showReportModal,
    setShowOptions,
    setShowReportModal,
    handleReport,
  } = useFeedInteractions();
  const contextUserId = useCurrentUserId();
  const userId = currentUserId ?? contextUserId;
  const { trackInteraction } = useViewTracking({
    feedItemId: item.id,
    userId: currentUserId,
    isVisible: true,
  });

  const { showToast } = useToast();

  const property = item.propertyDetails!;

  const isOwner = !!(userId && userId === item.user.id);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  // "Ver más / Ver menos" para descripciones largas (típico en fichas de
  // EasyBroker), que si no ocupan toda la pantalla en el feed.
  const [descExpanded, setDescExpanded] = React.useState(false);
  const isLongDesc = (item.content?.length ?? 0) > 160;

  const handleDeleteProperty = async () => {
    try {
      setDeleting(true);
      // Soft delete: set deleted_at timestamp (mismo patrón que ProfilePropertyGrid)
      const { error } = await supabase
        .from("propiedades")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", property.id);
      if (error) throw error;
      showToast("Propiedad eliminada correctamente", "success");
      setShowDeleteConfirm(false);
      onPropertyUpdated?.();
    } catch (error: any) {
      log.error("Error deleting property:", error);
      showToast(error.message || "No se pudo eliminar la propiedad", "error");
    } finally {
      setDeleting(false);
    }
  };

  const ownerMenuOptions: MenuOption[] = [
    {
      icon: "pencil-outline",
      label: "Editar",
      onPress: () => setShowEditModal(true),
    },
    {
      icon: "trash-outline",
      label: "Eliminar",
      onPress: () => setShowDeleteConfirm(true),
      danger: true,
    },
  ];

  const images = property.images || [];

  // Qué características mostrar según el tipo/subtipo (evita íconos que no
  // corresponden, p. ej. recámaras/baños en un rancho o terreno).
  const campos = getCamposVisibles(property.subtype, property.type);

  // Stats type-aware para el feed. Usa los MISMOS íconos que la pantalla de
  // detalle (PropertyDetail/PropertyTypeDetails) para mantener consistencia.
  // Industrial/Comercial ocultan baños/estacionamientos y muestran sus propias
  // características; la fila hace wrap si no caben en una línea.
  const isIndustrial = property.type === "industrial";
  const isComercial = property.type === "comercial";
  const isAgricola = property.type === "agricola";
  const isTerrenoComercial = isComercial && esTerreno(property.subtype);
  const f = property.features;
  const fmtM2 = (n: number) => `${n.toLocaleString("es-MX")}m²`;
  const fmtM = (n: number) => `${n.toLocaleString("es-MX")}m`;

  // Cada stat lleva un `label` de UNA sola palabra que se muestra junto al
  // ícono y el valor (p. ej. [ícono] Altura 8-10m).
  const stats: {
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
  }[] = [];
  const ICON_SIZE = 14;
  const ICON_COLOR = COLORS.textTertiary;
  const ionIcon = (name: keyof typeof Ionicons.glyphMap) => (
    <Ionicons name={name} size={ICON_SIZE} color={ICON_COLOR} />
  );
  const mcIcon = (name: keyof typeof MaterialCommunityIcons.glyphMap) => (
    <MaterialCommunityIcons name={name} size={ICON_SIZE} color={ICON_COLOR} />
  );
  const toiletIcon = <Toilet size={12} color={ICON_COLOR} />;
  const buildingIcon = <Building2 size={ICON_SIZE} color={ICON_COLOR} />;
  // Superficie (m²): cuadrado con esquinas. Altura: flecha vertical (≠ terreno).
  const superficieIcon = ionIcon("scan-outline");
  const alturaIcon = <MoveVertical size={ICON_SIZE} color={ICON_COLOR} />;
  const add = (
    key: string,
    icon: React.ReactNode,
    label: string,
    value = "",
  ) => stats.push({ key, icon, label, value });
  // Energía: muestra el monto (lo que va después de ":"), p. ej. "más de 150 kVA".
  const energiaMonto = (v: string) =>
    v.includes(":") ? v.split(":").slice(1).join(":").trim() : v;

  if (isTerrenoComercial) {
    // Terreno: la superficie de terreno va primero, luego frente, fondo y plaza.
    if (f.landSqft > 0) add("terreno", superficieIcon, "Terreno", fmtM2(f.landSqft));
    if ((f.frontMeters ?? 0) > 0) add("frente", ionIcon("resize-outline"), "Frente", fmtM(f.frontMeters!));
    if ((f.backMeters ?? 0) > 0) add("fondo", ionIcon("resize-outline"), "Fondo", fmtM(f.backMeters!));
    if (f.commercialLocation) add("ubicacion", ionIcon("storefront-outline"), "Ubicación", f.commercialLocation);
    if (f.enEsquina) add("enEsquina", mcIcon("crop"), "Esquina");
    if (f.sobreAvenida) add("avPrincipal", mcIcon("road-variant"), "Av. Principal");
  } else if (isComercial) {
    // Construcción primero, luego frente, fondo, plaza y el resto.
    if (f.constructionSqft > 0) add("construccion", buildingIcon, "Const.", fmtM2(f.constructionSqft));
    if ((f.frontMeters ?? 0) > 0) add("frente", ionIcon("resize-outline"), "Frente", fmtM(f.frontMeters!));
    if ((f.backMeters ?? 0) > 0) add("fondo", ionIcon("resize-outline"), "Fondo", fmtM(f.backMeters!));
    if (f.commercialLocation) add("ubicacion", ionIcon("storefront-outline"), "Ubicación", f.commercialLocation);
    if ((f.parking ?? 0) > 0) add("parking", ionIcon("car-outline"), "Estac.", `${f.parking}`);
    if (f.baths > 0) add("baths", toiletIcon, "Baños", `${f.baths}`);
    if ((f.halfBaths ?? 0) > 0) add("halfBaths", toiletIcon, "Medios", `${f.halfBaths}`);
    if ((f.floors ?? 0) > 0) add("floors", ionIcon("layers-outline"), "Niveles", `${f.floors}`);
    if (f.enEsquina) add("enEsquina", mcIcon("crop"), "Esquina");
    if (f.sobreAvenida) add("avPrincipal", mcIcon("road-variant"), "Av. Principal");
  } else if (isIndustrial) {
    // Construcción primero, luego el resto.
    if (f.constructionSqft > 0) add("construccion", buildingIcon, "Const.", fmtM2(f.constructionSqft));
    if (f.landSqft > 0) add("terreno", superficieIcon, "Terreno", fmtM2(f.landSqft));
    if (f.clearHeight) add("alturaLibre", alturaIcon, "Altura", f.clearHeight);
    if ((f.energiaKva?.length ?? 0) > 0) add("energia", ionIcon("flash-outline"), "Energía", energiaMonto(f.energiaKva![0]));
    if (f.ubicacionIndustrial) add("parque", ionIcon("business-outline"), "Ubicación", f.ubicacionIndustrial);
  } else if (isAgricola) {
    if (f.tieneAgua) add("agua", ionIcon("water-outline"), "Agua");
    if (f.electricidad) add("electricidad", ionIcon("flash-outline"), "Electricidad");
    if (f.pieCarretera) add("pieCarretera", ionIcon("trail-sign-outline"), "Carretera");
  } else {
    // Habitacional: construcción primero; en terrenos solo aparece la superficie de terreno.
    if (campos.m2Construccion && f.constructionSqft > 0) add("construccion", buildingIcon, "Const.", fmtM2(f.constructionSqft));
    if (campos.recamaras && f.beds > 0) add("beds", ionIcon("bed-outline"), "Rec.", `${f.beds}`);
    if (campos.banos && f.baths > 0) add("baths", toiletIcon, "Baños", `${f.baths}`);
    if (campos.banos && (f.halfBaths ?? 0) > 0) add("halfBaths", toiletIcon, "Medios", `${f.halfBaths}`);
    if (campos.estacionamientos && (f.parking ?? 0) > 0) add("parking", ionIcon("car-outline"), "Estac.", `${f.parking}`);
    if (campos.m2Terreno && f.landSqft > 0) add("terreno", superficieIcon, "Terreno", fmtM2(f.landSqft));
  }

  const { handleContact } = useChatInitiator();

  const [showMap, setShowMap] = React.useState(false);

  const handleContactPress = async () => {
    if (!userId) return;

    // Si la tarjeta está dentro de un modal nativo, cerrarlo antes de navegar.
    if (onBeforeNavigate) await onBeforeNavigate();

    handleContact(item.user.id, property.id, {
      id: item.user.id,
      nombre: item.user.name?.split(" ")[0] || "",
      apellido_paterno: item.user.name?.split(" ")[1] || "",
      foto: item.user.avatar || null,
    });
  };

  const positiveRecommendations = item.user.positiveRecommendations ?? 0;
  const recommendedByPreview = item.user.recommendedByPreview ?? [];
  // Mismo texto que PostCard/ReelCard ("X recomienda a este {ocupacion}"). Antes
  // esta tarjeta lo armaba aparte y solo mostraba los nombres, sin la frase.
  const recommendedText = buildRecommendedText(item.user);
  const [showRecommendedModal, setShowRecommendedModal] = React.useState(false);

  const { recommendedList, loadingRecommended, fetchRecommendations } =
    useUserRecommendations(item.user.id);

  const openRecommendedModal = async () => {
    setShowRecommendedModal(true);
    fetchRecommendations();
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showToast(`${label} copiado`, "success");
  };

  const location = `${property.colonia ? property.colonia + ", " : ""}${property.location.municipio ? property.location.municipio + ", " : ""}${property.location.state ? property.location.state : ""}`;

  const renderOperationsLabel = () => {
    if (property.operations && property.operations.length > 0) {
      return property.operations
        .map((op) => formatOperation(op.tipo_operacion, op.precio, op.moneda))
        .join(" / ");
    }
    const tipo = property.operation === "Sale" ? "venta" : "renta";
    return formatOperation(tipo, property.price, property.currency);
  };

  const title = `${firstUpperCase(property.subtype) || firstUpperCase(property.type)} en ${property.location.municipio || property.location.state}`;

  // Comisión real (total) de la primera operación, para mostrar en el feed.
  // No confundir con porcentaje_comision_compartida (la parte que se comparte).
  // Postgres devuelve NUMERIC como texto: normalizamos a número para el formato
  // (que salga "1 mes", no "1.0 meses") y para el orden porcentaje→meses→monto.
  const primeraOperacion = property.operations?.[0];
  const comPct = Number(primeraOperacion?.comision_porcentaje) || 0;
  const comMeses = Number(primeraOperacion?.comision_meses) || 0;
  const comMonto = Number(primeraOperacion?.comision_monto_fijo) || 0;
  const comisionReal =
    comPct
      ? `${comPct}%`
      : comMeses
        ? `${comMeses} ${comMeses === 1 ? "mes" : "meses"}`
        : comMonto
          ? `$${comMonto.toLocaleString("es-MX")}`
          : null;

  return (
    <View style={commonStyles.card}>
      {/* Header y recomendaciones clickeables */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.headerFill}
          activeOpacity={0.9}
          onPress={onClick}
        >
          <UserHeader
            user={item.user}
            timestamp={item.timestamp}
            onUserClick={onUserClick}
            showOptions={showOptions}
            setShowOptions={setShowOptions}
            onReport={() => setShowReportModal(true)}
            totalRatings={item.user.totalRatings}
            showRecommendedPreview={false}
            feedItemType="property"
          />
        </TouchableOpacity>
        {isOwner && (
          <View style={styles.headerMenuWrapper}>
            <ThreeDotsMenu
              options={ownerMenuOptions}
              iconColor={COLORS.textSecondary}
              menuPosition="top-right"
              buttonStyle={styles.menuButtonTransparent}
            />
          </View>
        )}
      </View>

      {positiveRecommendations > 0 && (
        <TouchableOpacity
          style={styles.recommendedRow}
          onPress={openRecommendedModal}
          activeOpacity={0.85}
        >
          <View style={styles.recommendedAvatars}>
            {recommendedByPreview.slice(0, 2).map((u, idx) => (
              <View
                key={`${u.id}-${idx}`}
                style={[
                  styles.recommendedAvatarWrapper,
                  idx > 0 && styles.recommendedAvatarOverlap,
                ]}
              >
                <Avatar
                  uri={u.avatar || undefined}
                  name={u.name}
                  size={18}
                  style={{ borderWidth: 1, borderColor: COLORS.white }}
                />
              </View>
            ))}
          </View>
          <Text style={styles.recommendedText}>
            {recommendedText}
          </Text>
        </TouchableOpacity>
      )}

      {/* Galería de imágenes - independiente para evitar conflictos de gestos */}
      <View style={styles.imageContainer}>
        <ImageGallery
          images={images}
          aspectRatio={DIMENSIONS.POST_ASPECT_RATIO}
          showDots={true}
          showImageCount={false}
          onImagePress={onClick}
        />

        {/* Velo lateral para que los iconos blancos se lean sobre fotos
            claras o sobre el marco lateral de fotos verticales. */}
        <LinearGradient
          colors={["transparent", "rgba(15,23,42,0.55)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          style={styles.actionsScrim}
        />

        {/* Botones de acción flotantes */}
        <View style={styles.floatingActions}>
          <ActionButtons
            feedItemId={item.id}
            feedItemType="property"
            initialLikes={item.likes}
            comments={item.comments}
            userId={currentUserId}
            onCommentClick={() => {
              trackInteraction("comentario");
              onCommentClick();
            }}
            onTrackInteraction={trackInteraction}
            shareTitle={property.title}
            shareDescription={`${renderOperationsLabel()} - ${
              property.location?.city
            }`}
            shareImageUrl={images[0]}
            showContactButton={false}
            orientation="vertical"
            tintColor={COLORS.white}
            authorId={item.user.id}
            propertyId={property.id}
            shareCode={property.codigo_propiedad || property.code}
            initialViews={item.views}
            initialShares={item.shares}
          />
        </View>
      </View>

      <Pressable
        style={styles.metaRow}
        onPress={() =>
          copyToClipboard(property.code || property.codigo_propiedad || "", "ID")
        }
      >
        <Text style={styles.metaText}>
          ID: {property.code ? property.code : property.codigo_propiedad}{" "}
          <Ionicons
            name="copy-outline"
            size={10}
            color={COLORS.textSecondary}
          />{" "}
          •{" "}
          {property.createdAt
            ? formatDateShort(property.createdAt)
            : item.timestamp}
        </Text>
      </Pressable>

      {/* Información de la propiedad clickeable */}
      <TouchableOpacity activeOpacity={0.9} onPress={onClick}>
        <View style={[commonStyles.cardContent, styles.compactContent]}>
          <Text style={commonStyles.title} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{renderOperationsLabel()}</Text>
            {comisionReal && (
              <View style={styles.commissionBadge}>
                <Text style={styles.commissionText}>
                  {comisionReal} comisión
                </Text>
              </View>
            )}
          </View>
          <Pressable
            style={styles.locationInline}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="location" size={12} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>{location}</Text>
          </Pressable>

          <View style={styles.descriptionRow}>
            <View style={styles.textContainer}>
              {item.content ? (
                <>
                  <Text
                    style={commonStyles.description}
                    numberOfLines={!descExpanded && isLongDesc ? 4 : undefined}
                  >
                    {item.content}
                  </Text>
                  {isLongDesc && (
                    <TouchableOpacity
                      onPress={() => setDescExpanded((v) => !v)}
                      hitSlop={8}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.verMasText}>
                        {descExpanded ? "Ver menos" : "Ver más"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : null}
            </View>

            {userId !== item.user.id && (
              <TouchableOpacity
                style={styles.smallContactBtn}
                onPress={handleContactPress}
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color={COLORS.white}
                />
                <Text style={styles.smallContactText}>Contactar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {stats.length > 0 && (
        <TouchableOpacity activeOpacity={0.9} onPress={onClick}>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View key={s.key} style={styles.statItem}>
                {s.icon}
                <Text style={styles.statLabel}>{s.label}</Text>
                {s.value ? (
                  <Text style={styles.statValue}>{s.value}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </TouchableOpacity>
      )}

      <MapModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        property={property}
      />

      {/* Modal de reporte */}
      <ReportModal
        visible={showReportModal}
        reportType="property"
        onClose={() => setShowReportModal(false)}
        onReport={handleReport}
      />
      <RecommendedUsersModal
        visible={showRecommendedModal}
        onClose={() => setShowRecommendedModal(false)}
        loading={loadingRecommended}
        users={recommendedList}
        totalCount={positiveRecommendations}
      />

      {/* Edición / eliminación (solo dueño) */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="¿Eliminar propiedad?"
        message="Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteProperty}
        onCancel={() => setShowDeleteConfirm(false)}
        danger
        loading={deleting}
      />
      <Modal visible={showEditModal} animationType="slide">
        <CreateProperty
          propertyId={property.id}
          onBack={() => {
            setShowEditModal(false);
            onPropertyUpdated?.();
          }}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerFill: {
    flex: 1,
  },
  headerMenuWrapper: {
    paddingRight: 12,
    paddingTop: 8,
  },
  menuButtonTransparent: {
    backgroundColor: "transparent",
  },
  imageContainer: {
    position: "relative",
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
  actionsScrim: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 84,
    zIndex: 9,
  },
  operationBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DIMENSIONS.BORDER_RADIUS_SMALL,
    zIndex: 10,
  },
  operationText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  compactContent: {
    paddingTop: 8,
  },
  recommendedRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
  },
  recommendedAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  recommendedAvatarWrapper: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  recommendedAvatarOverlap: {
    marginLeft: -8,
  },
  recommendedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    maxWidth: 220,
  },
  verMasText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
  },
  descriptionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  textContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  commissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  commissionText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: "600",
  },
  locationInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 5,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 16,
    rowGap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textTertiary,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  smallContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-end",
    minWidth: 90,
  },
  smallContactText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
});

export default React.memo(PropertyCard);
