import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { formatPriceShort } from "../../utils/priceFormatter";
import { Property, operaciones_propiedad } from "../../types";
import ThreeDotsMenu, { MenuOption } from "../shared/ThreeDotsMenu";
import { Bath } from "lucide-react-native";
import { SafePressable } from "@/design-system";

const { width } = Dimensions.get("window");
const GAP = 8;
const ITEM_SIZE = (width - 24 - GAP * 2) / 3;

/** Color por operación: azul = venta, verde = renta (se distinguen de un vistazo). */
const OP_COLOR = {
  Venta: "#1D4ED8",
  Renta: "#047857",
} as const;

/** Una línea de precio de la tarjeta: "Venta · $1.5M · MXN" */
type PriceLine = {
  /** "Venta" / "Renta". null cuando la propiedad tiene una sola operación
   *  (entonces no hace falta rotular: el precio se ve igual que antes). */
  label: "Venta" | "Renta" | null;
  price: string;
  currency: string;
  /** "/mes" en renta: aclaraba que la periodicidad es mensual. */
  suffix: string;
};

/**
 * Precios de la tarjeta, Derivados de `operations` (una fila por operación).
 *
 * Con una sola operación devuelve UNA línea sin etiqueta → la tarjeta se ve
 * exactamente como antes. Con venta+renta devuelve DOS líneas rotuladas, para
 * saber cuál es cuál (antes solo se pintaba `operations[0]`, cuyo orden no
 * garantiza Postgres, y sin decir si era venta o renta).
 *
 * Si `operations` viniera vacío (item cacheado de antes de la migration) cae a
 * los campos planos `price`/`currency`/`operation`.
 */
function getPriceLines(item: Property): PriceLine[] {
  const ops = (item.operations ?? []).filter(
    (op) => op?.tipo_operacion === "venta" || op?.tipo_operacion === "renta",
  );

  const toLine = (op: operaciones_propiedad): PriceLine => {
    const monto = Number(op.precio);
    return {
      label: null,
      price: monto > 0 ? formatPriceShort(monto) : "Consultar",
      currency: op.moneda || item.currency || "MXN",
      suffix: op.tipo_operacion === "renta" ? "/mes" : "",
    };
  };

  const venta = ops.find((o) => o.tipo_operacion === "venta");
  const renta = ops.find((o) => o.tipo_operacion === "renta");

  if (venta || renta) {
    const lines = [venta && toLine(venta), renta && toLine(renta)].filter(
      Boolean,
    ) as PriceLine[];
    // Con DOS operaciones se rotula cada una (si no, no se sabe cuál es cuál).
    if (lines.length > 1) {
      return lines.map((l, i) => ({
        ...l,
        label: i === 0 ? ("Venta" as const) : ("Renta" as const),
      }));
    }
    return lines;
  }

  // Fallback: item sin `operations` (cache viejo).
  const monto = Number(item.price);
  return [
    {
      label: null,
      price: monto > 0 ? formatPriceShort(monto) : "Consultar",
      currency: item.currency || "MXN",
      suffix: item.operation === "Rent" ? "/mes" : "",
    },
  ];
}

interface ProfilePropertyItemProps {
  item: Property;
  onPress: (item: Property) => void;
  isOwnProfile?: boolean;
  onEdit?: (item: Property) => void;
  onDelete?: (item: Property) => void;
  onPublishOpenHouse?: (item: Property) => void;
  /** true = la propiedad ya tiene un Open House activo → mostrar "Editar Open House" */
  hasOpenHouse?: boolean;
  isLastInRow?: boolean;
}

const ProfilePropertyItem: React.FC<ProfilePropertyItemProps> = React.memo(
  ({ item, onPress, isOwnProfile, onEdit, onDelete, onPublishOpenHouse, hasOpenHouse, isLastInRow }) => {
    const commissionText = formatCommission(item.commission);
    const priceLines = getPriceLines(item);

    const menuOptions: MenuOption[] = [
      {
        icon: "pencil-outline",
        label: "Editar",
        onPress: () => onEdit && onEdit(item),
      },
      {
        icon: hasOpenHouse ? "create-outline" : "home-outline",
        label: hasOpenHouse ? "Editar Open House" : "Publicar Open House",
        onPress: () => onPublishOpenHouse && onPublishOpenHouse(item),
      },
      {
        icon: "trash-outline",
        label: "Eliminar",
        onPress: () => onDelete && onDelete(item),
        danger: true,
      },
    ];

    return (
      <SafePressable
        style={[styles.gridItem, isLastInRow && { marginRight: 0 }]}
        onPress={() => onPress(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.images[0] }}
          style={styles.gridImage}
          contentFit="cover"
          transition={0}
          cachePolicy="memory-disk"
        />

        {item.status === "Vendida" ? (
          <View style={[styles.statusBadge, styles.vendidaBadge]}>
            <Ionicons name="checkmark-circle" size={10} color="#fff" />
            <Text style={styles.statusText}> Vendida</Text>
          </View>
        ) : item.status === "Suspendida" ? (
          <View style={[styles.statusBadge, styles.suspendedBadge]}>
            <Ionicons name="pause-circle" size={10} color="#fff" />
            <Text style={styles.statusText}> Suspendida</Text>
          </View>
        ) : item.status === "Reservada" ? (
          <View style={[styles.statusBadge, styles.reservadaBadge]}>
            <Ionicons name="bookmark" size={10} color="#fff" />
            <Text style={styles.statusText}> Reservada</Text>
          </View>
        ) : item.status === "Rentada" ? (
          <View style={[styles.statusBadge, styles.rentadaBadge]}>
            <Ionicons name="key" size={10} color="#fff" />
            <Text style={styles.statusText}> Rentada</Text>
          </View>
        ) : item.sin_comision ? (
          <View style={[styles.statusBadge, styles.sinComisionBadge]}>
            <Ionicons name="alert-circle" size={10} color="#fff" />
            <Text style={styles.statusText}> Sin comisión</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: "#03a58fd7" }]}>
            {commissionText ? (
              <Text style={styles.statusText}>{commissionText} comisión</Text>
            ) : (
              <Text style={styles.statusText}>{item.status}</Text>
            )}
          </View>
        )}

        {isOwnProfile &&
          !item.sin_comision &&
          item.comparte_comision === false && (
            <View style={[styles.statusBadge, styles.privadaBadge, { top: ITEM_SIZE - 24 }]}>
              <Ionicons name="eye-off" size={10} color="#fff" />
              <Text style={styles.statusText}> Solo tú</Text>
            </View>
          )}

        {isOwnProfile && (
          <View style={styles.menuContainer}>
            <ThreeDotsMenu options={menuOptions} />
          </View>
        )}

        <View style={styles.infoContainer}>
          {/* El bloque de texto ocupa el alto sobrante de la tarjeta y ancla la
              colonia abajo: cuando una tarjeta de la misma fila es más alta
              (venta+renta), el espacio extra se reparte sin descuadrar nada. */}
          <View style={styles.textStack}>
            <View>
              {priceLines.map((line, idx) => {
                const isSecondary = idx > 0;
                const opColor = line.label
                  ? line.label === "Venta"
                    ? OP_COLOR.Venta
                    : OP_COLOR.Renta
                  : undefined;
                // Ambas operaciones casi siempre comparten moneda (el formulario
                // usa una sola). Si es la misma, no se repite en la segunda
                // línea: eso libera ancho para que el precio de renta se vea
                // grande. Si difieren, sí se muestra.
                const sameCurrency =
                  idx > 0 && line.currency === priceLines[0]?.currency;
                const trailing = `${sameCurrency ? "" : line.currency}${line.suffix}`;
                return (
                  <View
                    key={`${line.label ?? "precio"}-${idx}`}
                    style={[
                      styles.priceRow,
                      isSecondary && styles.priceRowSecondary,
                    ]}
                  >
                    {line.label ? (
                      <Text
                        style={[styles.priceTag, { color: opColor }]}
                        numberOfLines={1}
                      >
                        {line.label}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.propertyPrice,
                        line.label && styles.propertyPriceLabeled,
                        isSecondary && styles.secondaryPrice,
                        opColor ? { color: opColor } : null,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {line.price}
                    </Text>
                    {trailing ? (
                      <Text
                        style={[
                          styles.propertyCurrency,
                          line.label && styles.currencyLabeled,
                          isSecondary && styles.secondaryCurrency,
                        ]}
                        numberOfLines={1}
                      >
                        {trailing}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View>
              {isOwnProfile && item.precio_contrato && (item.status === "Vendida" || item.status === "Rentada") && (
                <View style={styles.contractPriceRow}>
                  <Text style={styles.contractPriceLabel}>
                    {item.status === "Rentada" ? "Rentada en" : "Vendida en"}
                  </Text>
                  <Text style={styles.contractPrice}>
                    {formatPriceShort(item.precio_contrato)}
                  </Text>
                  <Text style={styles.propertyCurrency}>{item.moneda_contrato}</Text>
                </View>
              )}
              <Text style={styles.propertyLocation} numberOfLines={1}>
                {/* Colonia (la ubicación específica), no el municipio. Fallback a
                    municipio/ciudad si la propiedad no tiene colonia. */}
                {item.location.colony ||
                  item.location.municipio ||
                  item.location.city}
              </Text>
            </View>
          </View>

          <View style={styles.propertyFeatures}>
            {item.features.beds > 0 && (
              <View
                style={{
                  ...styles.featureBadge,
                  borderRightWidth: 1,
                  paddingRight: 5,
                  borderRightColor: "#cccccc",
                }}
              >
                <Ionicons
                  name="bed-outline"
                  size={10}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.featureBadgeText}>
                  {item.features.beds}
                </Text>
              </View>
            )}
            {(item.features.baths > 0 || (item.features.halfBaths ?? 0) > 0) && (
              <View
                style={{
                  ...styles.featureBadge,
                  borderRightWidth: 1,
                  paddingRight: 5,
                  borderRightColor: "#cccccc",
                }}
              >
                <Bath size={10} color={COLORS.textPrimary} />
                <Text style={styles.featureBadgeText}>
                  {item.features.baths}
                  {(item.features.halfBaths ?? 0) > 0 ? "½" : ""}
                </Text>
              </View>
            )}
            {item.features.constructionSqft > 0 ? (
              <View
                style={{
                  ...styles.featureBadge,
                  paddingHorizontal: 3,
                  borderRightColor: "#cccccc",
                }}
              >
                <Text style={styles.featureBadgeText}>
                  {item.features.constructionSqft} m²
                </Text>
              </View>
            ) : (
              <View
                style={{
                  ...styles.featureBadge,
                  paddingHorizontal: 3,
                  borderRightColor: "#cccccc",
                }}
              >
                <Text style={styles.featureBadgeText}>
                  {item.features.landSqft} m²
                </Text>
              </View>
            )}
          </View>
        </View>
      </SafePressable>
    );
  },
);

const formatCommission = (commission?: {
  shared: boolean;
  percentage?: number;
  months?: number;
  condition?: string;
}): string | null => {
  if (!commission) return null;
  // Postgres devuelve NUMERIC como texto ("1.0"), así que normalizamos a número
  // para mostrar "1 mes" y no "1.0 meses".
  const meses = Number(commission.months);
  if (meses) {
    return `${meses} mes${meses !== 1 ? "es" : ""}`;
  }
  const pct = Number(commission.percentage);
  if (pct) {
    return `${pct}%`;
  }
  return null;
};

const styles = StyleSheet.create({
  gridItem: {
    width: ITEM_SIZE,
    marginBottom: 12,
    marginRight: GAP,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  gridImage: {
    width: "100%",
    height: ITEM_SIZE,
  },
  statusBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  sinComisionBadge: {
    backgroundColor: "#C53030",
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  vendidaBadge: {
    backgroundColor: "#2e7d32",
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  suspendedBadge: {
    backgroundColor: "#ed6c02",
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  reservadaBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  rentadaBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  privadaBadge: {
    backgroundColor: "#2D3748e6",
    flexDirection: "row",
    alignItems: "center",
  },
  menuContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 9999,
  },
  infoContainer: {
    backgroundColor: COLORS.white,
    padding: 8,
    // Absorbe el alto sobrante cuando la tarjeta se estira por ser la más alta
    // de su fila (FlatList numColumns estira las celdas de la línea).
    flex: 1,
  },
  /**
   * Precios arriba, colonia abajo. Con `flex: 1` + `space-between` el espacio
   * extra de una tarjeta estirada se reparte entre ambos bloques en vez de dejar
   * un hueco pegado al separador de las amenidades.
   */
  textStack: {
    flex: 1,
    justifyContent: "space-between",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  priceRowSecondary: {
    marginTop: 2,
  },
  /**
   * Etiqueta "Venta"/"Renta". Ancho FIJO + flexShrink 0: nunca se estira ni se
   * parte, y deja el resto del ancho al precio.
   */
  priceTag: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textQuaternary,
    width: 30,
    flexShrink: 0,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textQuaternary,
    // flex:1 + minWidth:0 es IMPRESINDIBLE en RN: sin minWidth el Text no baja
    // de su ancho intrínseco dentro de la fila y se desborda fuera de la tarjeta.
    flex: 1,
    minWidth: 0,
  },
  propertyPriceLabeled: {
    fontSize: 13,
  },
  propertyCurrency: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textQuaternary,
    flexShrink: 0,
  },
  currencyLabeled: {
    fontSize: 10,
  },
  /** Precio de la segunda operación (renta): mismo cuerpo que el de venta,
   *  solo un punto más chico para mantener la jerarquía. */
  secondaryPrice: {
    fontSize: 13,
  },
  /** Solo el "/mes" (la moneda se omite si es la misma que la de arriba). */
  secondaryCurrency: {
    fontSize: 10,
  },
  contractPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 2,
  },
  contractPriceLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#2e7d32",
    flexShrink: 0,
  },
  contractPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2e7d32",
    flex: 1,
    minWidth: 0,
  },
  propertyLocation: {
    fontSize: 10,
    color: COLORS.textQuaternary,
    marginTop: 2,
    flex: 1,
    minWidth: 0,
  },
  propertyFeatures: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 4,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  featureBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textQuaternary,
  },
});

export default ProfilePropertyItem;
