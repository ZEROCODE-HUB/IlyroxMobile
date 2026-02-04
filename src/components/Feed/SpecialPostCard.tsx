import React from "react";
import { View, Text, StyleSheet, Image, Dimensions } from "react-native";
import { FeedItem, Post } from "../../types";
import { Ionicons } from "@expo/vector-icons";
import { CircularImageWithRays } from "../shared/Avatar";

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
  const postType = rawPostType?.toLowerCase().replace(/\s+/g, "");

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

  return null;
};

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    overflow: "hidden",
    // Aspect ratio cuadrado o rectangular según prefieras, o automático por contenido
    minHeight: 350,
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
});
