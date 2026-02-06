import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { FeedItem, Post } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { CircularImageWithRays } from "../shared/Avatar";
import { COLORS } from "../../constants";

interface SpecialPostCardProps {
  item: FeedItem;
  mode?: "preview" | "detail" | "grid"; // Para ajustar tamaños de fuentes si es necesario
}

// Colores extraídos de tus imágenes de referencia
const SPECIAL_COLORS = {
  aniversario: "#74b5c3ff", // Azul claro tipo 'Celebración'
  openhouse: "#6A1B9A", // Morado oscuro
  sold: "#D32F2F", // Rojo para vendido
  textWhite: "#FFFFFF",
};

export const SpecialPostCard: React.FC<SpecialPostCardProps> = ({
  item,
  mode = "preview",
}) => {
  const {
    postType: rawPostType,
    user,
    content,
    images,
    propertyDetails,
  } = item;
  const postType = rawPostType
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

  // Datos variables
  const userName = item.nombre_asesor || user.nombre || user.name || "Usuario";
  const userLocation =
    item.ubicacion ||
    propertyDetails?.location?.address ||
    "Ubicación pendiente";
  const eventDate = item.fecha_hora || "Próximamente";
  // Asumimos antiguedad viene en el item aunque no esté en el tipo estricto aún, o usamos 1 por defecto
  const years = item.antiguedad || 1;
  const userAvatar = item.foto_perfil || user.avatar;

  // --- RENDER: GRID MODE (Prioridad Alta) ---
  if (mode === "grid") {
    // --- GRID: ANIVERSARIO ---
    if (postType === "aniversario") {
      return (
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: SPECIAL_COLORS.aniversario },
          ]}
        >
          {/* Versión miniatura del avatar con burst */}
          <View style={styles.gridBurstCircle}>
            <Image source={{ uri: userAvatar }} style={styles.gridAvatar} />
          </View>
          <Text style={styles.gridTinyText}>Aniversario</Text>
          <Text style={styles.gridLargeText}>
            {years > 1 ? `${years} Años` : `${years} Año`}
          </Text>
        </View>
      );
    }

    // --- GRID: OPEN HOUSE / SOLD ---
    if (postType === "openhouse" || postType === "sold") {
      const isSold =
        postType === "sold" ||
        item.status?.toLowerCase() === "vendida" ||
        item.status?.toLowerCase() === "sold";
      const mainColor = isSold ? SPECIAL_COLORS.sold : SPECIAL_COLORS.openhouse;
      // Usamos salto de línea para que quepa mejor en un cuadro pequeño
      const centerText = isSold ? "VENDIDO" : "OPEN\nHOUSE";

      return (
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: mainColor, justifyContent: "center" },
          ]}
        >
          {/* Solo texto grande centrado sobre el color característico */}
          <Text style={styles.gridBannerText}>{centerText}</Text>
          {!isSold && (
            // Opcional: Una fecha muy pequeña para Open House
            <Text style={styles.gridTinyDate} numberOfLines={1}>
              {eventDate !== "Próximamente"
                ? new Date(eventDate).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })
                : "Próx."}
            </Text>
          )}
        </View>
      );
    }

    // --- GRID: BUSQUEDA ---
    if (
      postType === "busqueda" &&
      item.postDetails?.busquedas_json &&
      mode === "grid"
    ) {
      const { busquedas_json } = item.postDetails;
      return (
        <View
          style={[
            styles.gridContainer,
            { backgroundColor: COLORS.primaryLight + "30" },
          ]}
        >
          <View style={styles.gridSearchIcon}>
            <Ionicons
              name={busquedas_json.icon || "search-outline"}
              size={24}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.gridSearchTitle}>SE BUSCA</Text>
          <Text style={styles.gridSearchType} numberOfLines={1}>
            {busquedas_json.filtros?.tipo_propiedad?.charAt(0).toUpperCase() +
              busquedas_json.filtros?.tipo_propiedad?.slice(1) || "Propiedad"}
          </Text>
          <View style={styles.gridSearchBadge}>
            <Text style={styles.gridSearchBadgeText}>
              {busquedas_json.filtros?.operacion || "Compra"}
            </Text>
          </View>
        </View>
      );
    }
    return null; // Si no es un tipo especial, no debería llegar aquí en grid
  }

  // --- RENDER: ANIVERSARIO (Full Card) ---
  if (postType === "aniversario") {
    return (
      <View
        style={[
          styles.cardContainer,
          styles.aniversaryContainer,
          { backgroundColor: SPECIAL_COLORS.aniversario },
        ]}
      >
        {/* Decoración superior */}
        <View style={styles.aniversaryHeader}>
          <Text style={styles.aniversaryTitle}>
            🎉 ¡Hoy celebro {years} años en el mundo inmobiliario! 🎉
          </Text>
        </View>

        {/* Avatar Central con efecto 'burst' */}
        <View style={styles.aniversaryAvatarContainer}>
          <View>
            <CircularImageWithRays uri={userAvatar} />
          </View>
        </View>

        {/* Info Inferior */}
        <View style={styles.aniversaryFooter}>
          <Text style={styles.roleText}>Asesor Inmobiliario</Text>
          <Text style={styles.nameTextLarge}>{userName}</Text>
          <Text style={styles.locationText}>{userLocation}</Text>
        </View>
      </View>
    );
  }

  // --- RENDER: OPEN HOUSE y SOLD ---
  if (postType === "openhouse" || postType === "sold") {
    // Check item.status for 'sold' or fallback to postType
    const isSold =
      postType === "sold" ||
      item.status?.toLowerCase() === "vendida" ||
      item.status?.toLowerCase() === "sold";

    const mainColor = isSold ? SPECIAL_COLORS.sold : SPECIAL_COLORS.openhouse;
    const bannerText = isSold ? "VENDIDO" : "OPEN HOUSE";
    // Usamos item.foto_propiedad, o la primera imagen del post/propiedad
    const headerImage =
      item.foto_propiedad || images?.[0] || propertyDetails?.images?.[0];

    return (
      <View style={styles.cardContainer}>
        {/* Imagen Principal */}
        <View style={styles.openHouseImageContainer}>
          {headerImage ? (
            <Image
              source={{ uri: headerImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverImage, { backgroundColor: "#ccc" }]} />
          )}
        </View>

        {/* Banner Central */}
        <View style={[styles.bannerStrip, { backgroundColor: mainColor }]}>
          <Text
            style={[
              styles.bannerText,
              isSold ? styles.soldText : styles.openHouseText,
            ]}
          >
            {bannerText}
          </Text>
        </View>

        {/* Footer Info */}
        <View style={[styles.openHouseFooter, { backgroundColor: mainColor }]}>
          {/* Avatar sobrepuesto (Left) */}
          <View style={styles.overlappingAvatarContainer}>
            <Image source={{ uri: userAvatar }} style={styles.overlapAvatar} />
          </View>

          {/* Textos (Right) */}
          <View style={styles.openHouseInfo}>
            <Text style={styles.joinUsText}>
              {isSold ? "¡PROPIEDAD VENDIDA!" : "----- UNETENOS -----"}
            </Text>

            {!isSold && (
              <Text style={styles.dateTimeText}>
                {new Date(eventDate).toLocaleString("es-ES", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}

            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={12} color="white" />
              <Text style={styles.addressText} numberOfLines={2}>
                {userLocation}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // --- RENDER: BUSQUEDA ---
  if (postType === "busqueda" && item.postDetails?.busquedas_json) {
    const { busquedas_json } = item.postDetails;
    const isDetail = mode === "detail";

    return (
      <View style={[styles.cardContainer, isDetail && styles.detailContainer]}>
        <View
          style={[
            styles.searchPostContainer,
            isDetail && styles.searchPostDetail,
          ]}
        >
          <View style={styles.searchHeader}>
            <Ionicons
              name={busquedas_json.icon || "search-outline"}
              size={isDetail ? 24 : 20}
              color={COLORS.primary}
            />
            <Text
              style={[styles.searchTitle, isDetail && styles.searchTitleDetail]}
            >
              {busquedas_json.titulo || "SE BUSCA"}
            </Text>
          </View>

          <View style={styles.searchInfoContent}>
            <View style={styles.searchMainRow}>
              <View
                style={[
                  styles.searchBadge,
                  { backgroundColor: COLORS.primary + "15" },
                ]}
              >
                <Ionicons
                  name={
                    busquedas_json.filtros?.icon_operacion || "cash-outline"
                  }
                  size={14}
                  color={COLORS.primary}
                />
                <Text
                  style={[styles.searchBadgeText, { color: COLORS.primary }]}
                >
                  {busquedas_json.filtros?.operacion?.toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.searchBadge,
                  { backgroundColor: COLORS.info + "15" },
                ]}
              >
                <Ionicons
                  name={busquedas_json.filtros?.icon_tipo || "business-outline"}
                  size={14}
                  color={COLORS.info}
                />
                <Text style={[styles.searchBadgeText, { color: COLORS.info }]}>
                  {busquedas_json.filtros?.tipo_propiedad
                    ?.charAt(0)
                    .toUpperCase() +
                    busquedas_json.filtros?.tipo_propiedad?.slice(1) ||
                    "Propiedad"}
                </Text>
              </View>
            </View>

            <View style={styles.searchLocationRow}>
              <Ionicons
                name="location-outline"
                size={isDetail ? 20 : 16}
                color={COLORS.textTertiary}
              />
              <Text
                style={[
                  styles.searchLocationText,
                  isDetail && styles.searchLocationTextDetail,
                ]}
                numberOfLines={2}
              >
                {[
                  busquedas_json.filtros?.ubicacion?.ciudad,
                  busquedas_json.filtros?.ubicacion?.colonia,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>

            <View
              style={[
                styles.searchPriceRow,
                isDetail && styles.searchPriceRowDetail,
              ]}
            >
              <Text
                style={[
                  styles.searchPriceText,
                  isDetail && styles.searchPriceTextDetail,
                ]}
              >
                {busquedas_json.filtros?.precio_min &&
                busquedas_json.filtros?.precio_max
                  ? busquedas_json.filtros?.moneda +
                    " - " +
                    "Min. " +
                    busquedas_json.filtros?.precio_min +
                    " - " +
                    "Max. " +
                    busquedas_json.filtros?.precio_max
                  : busquedas_json.filtros?.precio_min
                    ? busquedas_json.filtros?.moneda +
                      " - " +
                      "Min. " +
                      busquedas_json.filtros?.precio_min
                    : busquedas_json.filtros?.precio_max
                      ? busquedas_json.filtros?.moneda +
                        " - " +
                        "Max. " +
                        busquedas_json.filtros?.precio_max
                      : "Sin especificar"}
              </Text>
            </View>

            <View style={styles.searchCharacteristicsGrid}>
              {busquedas_json.filtros?.caracteristicas?.habitaciones && (
                <View style={styles.searchCharItem}>
                  <Ionicons
                    name="bed-outline"
                    size={isDetail ? 18 : 14}
                    color={COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.searchCharText,
                      isDetail && styles.searchCharTextDetail,
                    ]}
                  >
                    {busquedas_json.filtros.caracteristicas.habitaciones}
                  </Text>
                </View>
              )}
              {busquedas_json.filtros?.caracteristicas?.banos && (
                <View style={styles.searchCharItem}>
                  <Ionicons
                    name="water-outline"
                    size={isDetail ? 18 : 14}
                    color={COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.searchCharText,
                      isDetail && styles.searchCharTextDetail,
                    ]}
                  >
                    {busquedas_json.filtros.caracteristicas.banos}
                  </Text>
                </View>
              )}
              {busquedas_json.filtros?.caracteristicas?.estacionamientos && (
                <View style={styles.searchCharItem}>
                  <Ionicons
                    name="car-outline"
                    size={isDetail ? 18 : 14}
                    color={COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.searchCharText,
                      isDetail && styles.searchCharTextDetail,
                    ]}
                  >
                    {busquedas_json.filtros.caracteristicas.estacionamientos}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    overflow: "hidden",
    // Reducido para evitar el espacio inferior excesivo
    minHeight: 200,
  },
  detailContainer: {
    minHeight: 200,
  },

  // --- ESTILOS ANIVERSARIO ---
  aniversaryContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  aniversaryHeader: {
    padding: 10,
    alignItems: "center",
  },
  aniversaryEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  aniversaryTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#6A1B9A",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  aniversaryAvatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  burstCircle: {
    padding: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "dashed", // Simula los rayos del diseño
  },
  largeAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#fff",
  },
  aniversaryFooter: {
    padding: 20,
    alignItems: "center",
  },
  roleText: {
    color: "#6A1B9A", // Azul más oscuro
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
  },
  nameTextLarge: {
    color: "#6A1B9A",
    fontWeight: "900",
    fontSize: 22,
    marginVertical: 4,
  },
  locationText: {
    color: "#6A1B9A",
    fontSize: 14,
  },

  // --- ESTILOS OPEN HOUSE / SOLD ---
  openHouseImageContainer: {
    width: "100%",
    height: 220, // Altura fija para la imagen superior
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  bannerStrip: {
    paddingVertical: 8,

    alignItems: "center",
    justifyContent: "center",
    zIndex: 2, // Para asegurar que quede encima si hay solapamientos
    marginTop: -10,
    paddingLeft: 120,
  },
  bannerText: {
    color: "#ffffffff",
    fontWeight: "900",
    fontSize: 28,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  openHouseFooter: {
    flexDirection: "row",
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    minHeight: 120,
  },
  overlappingAvatarContainer: {
    marginTop: -50, // Truco para que suba hacia el banner/imagen
    marginRight: 15,
    zIndex: 10,
  },
  overlapAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#fff", // Borde blanco como en la imagen
  },
  openHouseInfo: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 5,
  },
  joinUsText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
    textAlign: "center",
  },
  dateTimeText: {
    color: "#ffffffff", // Azul claro para contrastar con morado
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 5,
    textAlign: "center",
  },
  addressRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  addressText: {
    color: "#ffffffff",
    fontSize: 12,
    textAlign: "center",
    flexShrink: 1,
  },
  soldText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 28,
    textTransform: "uppercase",
    letterSpacing: 2,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#D32F2F",
    borderColor: "#fff",
    borderWidth: 2,
  },
  openHouseText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 30,
    textTransform: "uppercase",
    letterSpacing: 4,
  },

  // ================= ESTILOS GRID =================
  gridContainer: {
    width: "100%",
    // Esto fuerza a que sea un cuadrado perfecto, ideal para grids
    aspectRatio: 1,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    overflow: "hidden",
    // No usamos minHeight aquí para que se adapte a la celda del grid
  },
  // Grid Aniversario
  gridBurstCircle: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#fff",
    borderStyle: "dashed",
    marginBottom: 4,
    marginTop: 8,
  },
  gridAvatar: {
    width: 40, // Avatar mucho más pequeño
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  gridTinyText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  gridLargeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  // Grid OpenHouse/Sold
  gridBannerText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18, // Tamaño suficiente para leer en pequeño
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 20, // Ajustado para cuando hay salto de línea (OPEN\nHOUSE)
  },
  gridTinyDate: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "bold",
  },
  // Grid Busqueda
  gridSearchIcon: {
    marginTop: 10,
    marginBottom: 5,
  },
  gridSearchTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    opacity: 0.8,
  },
  gridSearchType: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginVertical: 4,
  },
  gridSearchBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: "auto",
    marginBottom: 10,
  },
  gridSearchBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  // --- ESTILOS BUSQUEDA ---
  searchPostContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPostDetail: {
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 0,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    padding: 24,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    paddingBottom: 8,
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  searchTitleDetail: {
    fontSize: 16,
  },
  searchInfoContent: {
    gap: 10,
  },
  searchMainRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  searchLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchLocationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  searchLocationTextDetail: {
    fontSize: 16,
  },
  searchPriceRow: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
  },
  searchPriceRowDetail: {
    padding: 20,
  },
  searchPriceText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  searchPriceTextDetail: {
    fontSize: 22,
  },
  searchCharacteristicsGrid: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
  searchCharItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchCharText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  searchCharTextDetail: {
    fontSize: 16,
  },
});
