import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { FeedItem } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { Avatar, CircularImageWithRays } from "../shared/Avatar";
import { COLORS } from "../../constants";
import { normalizePostType } from "../../utils/stringNormalizer";
import { useChatInitiator } from "@/hooks/messaging/useChatInitiator";
import firstUpperCase from "@/utils/firstUpperCase";
import { formatPrice } from "@/utils/priceFormatter";

interface SpecialPostCardProps {
  item: FeedItem;
  mode?: "preview" | "detail" | "grid" | "compact";
}

const SPECIAL_COLORS = {
  aniversario: COLORS.eventAnniversary,
  openhouse: COLORS.tagPurpleDark,
  sold: COLORS.sold,
  textWhite: COLORS.white,
};

export const SpecialPostCard: React.FC<SpecialPostCardProps> = ({
  item,
  mode = "preview",
}) => {
  const {
    postType: rawPostType,
    user,
    images,
    propertyDetails,
  } = item;
  const postType = normalizePostType(rawPostType);
  const { handleContact } = useChatInitiator();

  const handleOfferProperty = () => {
    if (!item.user?.id) return;
    handleContact(item.user.id, null, {
      id: item.user.id,
      nombre: item.user.name?.split(" ")[0] || item.user.name || "",
      apellido_paterno: item.user.name?.split(" ")[1] || "",
      foto: item.user.avatar || null,
    });
  };

  // Datos variables
  const userName = item.nombre_asesor || user.nombre || user.name || "Usuario";
  const userLocation =
    item.ubicacion ||
    propertyDetails?.location?.address ||
    "Ubicación pendiente";
  const eventDate = item.fecha_hora || "Próximamente";
  // Asumimos antiguedad viene en el item aunque no esté en el tipo estricto aún, o usamos 1 por defecto
  const years = item.antiguedad || 1;
  const userAvatar = item.postDetails?.foto_perfil_usuario;
  const headerImage = item.foto_propiedad || images?.[0] || propertyDetails?.images?.[0];

  // --- RENDER: COMPACT MODE (para grids de 2 columnas) ---
  if (mode === "compact") {
    // COMPACT: OPEN HOUSE / SOLD
    if (postType === "openhouse" || postType === "sold") {
      const isSold =
        postType === "sold" ||
        item.status?.toLowerCase() === "vendida" ||
        item.status?.toLowerCase() === "sold";
      const mainColor = isSold ? SPECIAL_COLORS.sold : SPECIAL_COLORS.openhouse;
      const bannerText = isSold ? "VENDIDO" : "OPEN\nHOUSE";
      const formattedDate =
        eventDate !== "Próximamente"
          ? new Date(eventDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
          : null;

      return (
        <View style={styles.compactContainer}>
          {headerImage ? (
            <Image source={{ uri: headerImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: mainColor, opacity: headerImage ? 0.72 : 1 }]} />
          {userAvatar && (
            <View style={styles.compactAvatar}>
              <Avatar uri={userAvatar} name={userName} size={34} />
            </View>
          )}
          <Text style={styles.compactBannerText}>{bannerText}</Text>
          {!isSold && formattedDate && (
            <Text style={styles.compactSubText} numberOfLines={1}>{formattedDate}</Text>
          )}
          <View style={styles.compactLocationRow}>
            <Ionicons name="location-sharp" size={10} color="rgba(255,255,255,0.9)" />
            <Text style={styles.compactLocationText} numberOfLines={2}>{userLocation}</Text>
          </View>
        </View>
      );
    }

    // COMPACT: BUSQUEDA
    if (postType === "busqueda" && item.postDetails?.busquedas_json) {
      const { busquedas_json } = item.postDetails;
      return (
        <View style={[styles.compactContainer, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.cardBorder }]}>
          <View style={styles.compactSearchHeader}>
            <Ionicons name={busquedas_json.icon || "search-outline"} size={18} color={COLORS.primary} />
            <Text style={styles.compactSearchTitle}>SE BUSCA</Text>
          </View>
          <Text style={styles.compactSearchType} numberOfLines={1}>
            {busquedas_json.filtros?.tipo_propiedad
              ? busquedas_json.filtros.tipo_propiedad.charAt(0).toUpperCase() + busquedas_json.filtros.tipo_propiedad.slice(1)
              : "Propiedad"}
          </Text>
          <View style={styles.compactBadge}>
            <Text style={styles.compactBadgeText}>{busquedas_json.filtros?.operacion || "Compra"}</Text>
          </View>
          {(busquedas_json.filtros?.ubicacion?.ciudad || busquedas_json.filtros?.ubicacion?.colonia) && (
            <View style={styles.compactLocationRow}>
              <Ionicons name="location-outline" size={10} color={COLORS.textTertiary} />
              <Text style={[styles.compactLocationText, { color: COLORS.textSecondary }]} numberOfLines={2}>
                {[busquedas_json.filtros.ubicacion.ciudad, busquedas_json.filtros.ubicacion.colonia]
                  .filter(Boolean).join(", ")}
              </Text>
            </View>
          )}
        </View>
      );
    }

    // COMPACT: ANIVERSARIO
    if (postType === "aniversario") {
      return (
        <View style={[styles.compactContainer, { backgroundColor: SPECIAL_COLORS.aniversario, justifyContent: "center" }]}>
          <View style={styles.compactBurstCircle}>
            <Avatar uri={userAvatar} name={userName} size={44} />
          </View>
          <Text style={styles.compactAniYears}>{years > 1 ? `${years} Años` : `${years} Año`}</Text>
          <Text style={styles.compactAniLabel}>Aniversario</Text>
          <Text style={styles.compactAniName} numberOfLines={1}>{userName}</Text>
        </View>
      );
    }

    return null;
  }

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
            <Avatar
              uri={userAvatar}
              name={userName}
              size={40}
              style={styles.gridAvatar}
            />
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
            <CircularImageWithRays uri={userAvatar} name={userName} />
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
            <Avatar
              uri={userAvatar}
              name={userName}
              size={110}
              style={styles.overlapAvatar}
            />
          </View>

          {/* Textos (Right) */}
          <View style={styles.openHouseInfo}>
            <Text style={styles.joinUsText}>
              {isSold ? "¡PROPIEDAD VENDIDA!" : "----- UNETENOS -----"}
            </Text>

            {!isSold && (
              <View>
                <Text style={styles.dateTimeText}>
                  Inicia:{" "}
                  {new Date(eventDate).toLocaleString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                {item.postDetails?.fecha_finalizacion && (
                  <Text style={[styles.dateTimeText]}>
                    Finaliza:{" "}
                    {new Date(
                      item.postDetails.fecha_finalizacion,
                    ).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </View>
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
    const f = busquedas_json.filtros ?? {};

    // Título grande: subtipo principal o tipo_propiedad
    const subtipoArr: string[] = Array.isArray(f.subtipo) ? f.subtipo : [];
    const rawTipo = subtipoArr[0] || f.tipo_propiedad || "Propiedad";
    const titulo = firstUpperCase(rawTipo);

    // Rango de presupuesto
    const moneda = f.moneda || "MXN";
    const precioMin = typeof f.precio_min === "number" && f.precio_min > 0 ? f.precio_min : null;
    const precioMax = typeof f.precio_max === "number" && f.precio_max > 0 ? f.precio_max : null;
    let presupuestoText = "Sin especificar";
    if (precioMin && precioMax) {
      presupuestoText = `${formatPrice(precioMin)} – ${formatPrice(precioMax)} ${moneda}`;
    } else if (precioMin) {
      presupuestoText = `Desde ${formatPrice(precioMin)} ${moneda}`;
    } else if (precioMax) {
      presupuestoText = `Hasta ${formatPrice(precioMax)} ${moneda}`;
    }

    // Zonas (chips de locationChips)
    const zonas: Array<{ id?: string; label: string }> = Array.isArray(f.zonas_interes)
      ? f.zonas_interes
      : [];

    // Fallback de ubicación: si no hay zonas pero sí hay ubicacion explícita, mostrarla como un chip
    const ubicacionFallback = !zonas.length
      ? [f.ubicacion?.ciudad, f.ubicacion?.colonia, f.ubicacion?.municipio, f.ubicacion?.estado]
          .filter((s) => typeof s === "string" && s.trim().length > 0)
          .slice(0, 1)
      : [];

    const habitaciones = f.caracteristicas?.habitaciones;
    const banos = f.caracteristicas?.banos;
    const nota: string = typeof f.nota === "string" ? f.nota : "";

    return (
      <View style={[styles.cardContainer, isDetail && styles.detailContainer]}>
        <View
          style={[
            styles.searchPostContainer,
            isDetail && styles.searchPostDetail,
          ]}
        >
          {/* Chip SE BUSCA */}
          <View style={styles.busquedaTagRow}>
            <Ionicons name="search-outline" size={14} color={COLORS.primary} />
            <Text style={styles.busquedaTagText}>SE BUSCA</Text>
          </View>

          {/* Título grande */}
          <Text style={styles.busquedaTitulo} numberOfLines={2}>
            {titulo}
          </Text>

          {/* Presupuesto */}
          <Text style={styles.busquedaLabel}>PRESUPUESTO</Text>
          <Text style={styles.busquedaPresupuesto}>{presupuestoText}</Text>

          {/* Zonas de interés */}
          {(zonas.length > 0 || ubicacionFallback.length > 0) && (
            <>
              <Text style={styles.busquedaLabel}>ZONAS DE INTERÉS</Text>
              <View style={styles.busquedaZonasRow}>
                {zonas.map((z, idx) => (
                  <View key={z.id ?? `${z.label}-${idx}`} style={styles.busquedaZonaChip}>
                    <Text style={styles.busquedaZonaPin}>📍</Text>
                    <Text style={styles.busquedaZonaText} numberOfLines={1}>
                      {z.label}
                    </Text>
                  </View>
                ))}
                {ubicacionFallback.map((label, idx) => (
                  <View key={`fallback-${idx}`} style={styles.busquedaZonaChip}>
                    <Text style={styles.busquedaZonaPin}>📍</Text>
                    <Text style={styles.busquedaZonaText} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Características */}
          {(habitaciones || banos) && (
            <View style={styles.busquedaStatsRow}>
              {habitaciones ? (
                <Text style={styles.busquedaStat}>
                  🛏️ <Text style={styles.busquedaStatValue}>{habitaciones}</Text> rec.
                </Text>
              ) : null}
              {banos ? (
                <Text style={styles.busquedaStat}>
                  🚽 <Text style={styles.busquedaStatValue}>{banos}</Text> baños
                </Text>
              ) : null}
            </View>
          )}

          {/* Nota */}
          {nota.trim().length > 0 && (
            <>
              <View style={styles.busquedaSeparator} />
              <Text style={styles.busquedaNota}>
                <Text style={styles.busquedaNotaLabel}>Nota: </Text>
                {nota}
              </Text>
            </>
          )}
        </View>

        {/* Botón Ofrecer propiedad */}
        <TouchableOpacity
          style={[styles.busquedaCta, isDetail && styles.busquedaCtaDetail]}
          onPress={handleOfferProperty}
          activeOpacity={0.85}
        >
          <Text style={styles.busquedaCtaText}>Ofrecer propiedad 👋</Text>
        </TouchableOpacity>
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
    borderColor: COLORS.white,
    borderStyle: "dashed", // Simula los rayos del diseño
  },
  largeAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: COLORS.white,
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
    borderColor: COLORS.white, // Borde blanco como en la imagen
  },
  openHouseInfo: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 5,
  },
  joinUsText: {
    color: COLORS.white,
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
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 28,
    textTransform: "uppercase",
    letterSpacing: 2,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#D32F2F",
    borderColor: COLORS.white,
    borderWidth: 2,
  },
  openHouseText: {
    color: COLORS.white,
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
    borderColor: COLORS.white,
    borderStyle: "dashed",
    marginBottom: 4,
    marginTop: 8,
  },
  gridAvatar: {
    width: 40, // Avatar mucho más pequeño
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  gridTinyText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  gridLargeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
  },
  // Grid OpenHouse/Sold
  gridBannerText: {
    color: COLORS.white,
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
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPostDetail: {
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    padding: 24,
  },
  busquedaTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  busquedaTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 1.2,
  },
  busquedaTitulo: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16,
    lineHeight: 28,
  },
  busquedaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  busquedaPresupuesto: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  busquedaZonasRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  busquedaZonaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxWidth: "100%",
  },
  busquedaZonaPin: {
    fontSize: 13,
  },
  busquedaZonaText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: 180,
  },
  busquedaStatsRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  busquedaStat: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  busquedaStatValue: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  busquedaSeparator: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 14,
  },
  busquedaNota: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  busquedaNotaLabel: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  busquedaCta: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  busquedaCtaDetail: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  busquedaCtaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // ================= ESTILOS COMPACT (2 columnas) =================
  compactContainer: {
    width: "100%",
    aspectRatio: 3 / 4,
    overflow: "hidden",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 10,
    gap: 3,
  },
  compactAvatar: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
    overflow: "hidden",
  },
  compactBannerText: {
    color: COLORS.white,
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
    textAlign: "center",
    lineHeight: 18,
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  compactSubText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  compactLocationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 3,
    width: "100%",
  },
  compactLocationText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    flex: 1,
    lineHeight: 13,
  },
  // Compact busqueda
  compactSearchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
  },
  compactSearchTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 0.5,
  },
  compactSearchType: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginTop: "auto" as any,
  },
  compactBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  compactBadgeText: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  // Compact aniversario
  compactBurstCircle: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    borderStyle: "dashed",
    padding: 3,
    marginBottom: 6,
  },
  compactAniYears: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
  },
  compactAniLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 1,
  },
  compactAniName: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
});
