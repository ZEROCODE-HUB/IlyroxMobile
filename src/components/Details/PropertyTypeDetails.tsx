import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Truck } from "lucide-react-native";
import { COLORS } from "@/constants";
import { propertyDetailStyles as styles } from "./propertyDetailStyles";

export interface PropertyTypeDetailsProps {
  property: any;
}

interface Stat {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Ícono custom (p. ej. de lucide) cuando Ionicons no tiene el glyph. */
  iconNode?: React.ReactNode;
  label: string;
  value: string | number;
}

interface ChipGroup {
  label: string;
  items: string[];
}

/** Formatea un número con separadores de miles (es-MX). */
const fmt = (n: number | string) => Number(n).toLocaleString("es-MX");

/**
 * Muestra las características específicas de la propiedad según su tipo
 * (agrícola, comercial o industrial). Solo renderiza los campos con valor;
 * si no hay nada que mostrar, retorna null.
 */
export const PropertyTypeDetails: React.FC<PropertyTypeDetailsProps> = ({
  property,
}) => {
  const tipo = property?.tipo?.toLowerCase();

  const stats: Stat[] = [];
  const chipGroups: ChipGroup[] = [];
  const flags: string[] = [];

  let sectionTitle = "";

  if (tipo === "agricola") {
    sectionTitle = "Características Agrícolas";

    const usoTerrenoText = Array.isArray(property.uso_terreno)
      ? property.uso_terreno.join(", ")
      : property.uso_terreno;
    const tipoRiegoText = Array.isArray(property.tipo_riego)
      ? property.tipo_riego.join(", ")
      : property.tipo_riego;

    if (usoTerrenoText)
      stats.push({
        icon: "leaf-outline",
        label: "Uso de Terreno",
        value: usoTerrenoText,
      });
    if (tipoRiegoText)
      stats.push({
        icon: "water-outline",
        label: "Sistema de Riego",
        value: tipoRiegoText,
      });

    if (Array.isArray(property.tipo_agua) && property.tipo_agua.length > 0)
      chipGroups.push({ label: "Fuente de Agua", items: property.tipo_agua });

    if (property.concesion_agua) flags.push("Concesión de Agua");
    if (property.infra_electricidad) flags.push("Electricidad");
    if (property.infra_camino_acceso) flags.push("Acceso/Camino");
    if (property.infra_cercado) flags.push("Cercado");
    if (property.acceso_carretera) flags.push("A pie de Carretera");
    if (property.acceso_camiones) flags.push("Acceso para tráiler");
  } else if (tipo === "comercial") {
    sectionTitle = "Características Comerciales";

    if (property.tipo_ubicacion_comercial)
      stats.push({
        icon: "storefront-outline",
        label: "Ubicación",
        value: property.tipo_ubicacion_comercial,
      });
    if (property.ancho_terreno)
      stats.push({
        icon: "resize-outline",
        label: "Frente",
        value: `${fmt(property.ancho_terreno)} m`,
      });
    if (property.largo_terreno)
      stats.push({
        icon: "resize-outline",
        label: "Fondo",
        value: `${fmt(property.largo_terreno)} m`,
      });
    if (property.nivel_piso)
      stats.push({
        icon: "layers-outline",
        label: "Nivel de piso",
        value: property.nivel_piso,
      });

    if (property.sobre_avenida_principal) flags.push("Sobre Avenida Principal");
    if (property.en_esquina) flags.push("En Esquina");
    if (property.alta_visibilidad) flags.push("Alta Visibilidad");
    if (property.alto_flujo_vehicular) flags.push("Alto Flujo Vehicular");
  } else if (tipo === "industrial") {
    sectionTitle = "Características Industriales";

    if (property.ubicacion_industrial)
      stats.push({
        icon: "business-outline",
        label: "Ubicación",
        value: property.ubicacion_industrial,
      });
    if (property.altura_libre_m)
      stats.push({
        icon: "resize-outline",
        label: "Altura Libre",
        value: property.altura_libre_m,
      });
    if (property.area_oficinas_m2)
      stats.push({
        icon: "scan-outline",
        label: "Área Operativa",
        value: `${fmt(property.area_oficinas_m2)} m²`,
      });
    if (property.patio_maniobras_m2)
      stats.push({
        iconNode: <Truck size={16} color={COLORS.textSecondary} />,
        label: "Patio de Maniobras",
        value: `${fmt(property.patio_maniobras_m2)} m²`,
      });

    if (
      Array.isArray(property.tipo_energia_kva) &&
      property.tipo_energia_kva.length > 0
    )
      chipGroups.push({
        label: "Energía (kVA)",
        items: property.tipo_energia_kva,
      });
  }

  const hasContent =
    stats.length > 0 || chipGroups.length > 0 || flags.length > 0;

  if (!hasContent) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>

      {stats.length > 0 && (
        <View style={styles.statsGrid}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statItem}>
              <View style={styles.statIconContainer}>
                {s.iconNode ?? (
                  <Ionicons
                    name={s.icon!}
                    size={16}
                    color={COLORS.textSecondary}
                  />
                )}
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {chipGroups.map((group, gi) => (
        <View key={gi} style={{ marginTop: 12 }}>
          <Text style={[styles.label, { marginBottom: 8 }]}>{group.label}:</Text>
          <View style={styles.amenitiesContainer}>
            {group.items.map((item, i) => (
              <View
                key={i}
                style={[styles.amenityChip, { borderColor: COLORS.cardBorder }]}
              >
                <Text style={[styles.amenityText, { color: COLORS.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {flags.length > 0 && (
        <View style={[styles.amenitiesContainer, { marginTop: 12 }]}>
          {flags.map((flag, i) => (
            <View
              key={i}
              style={[styles.amenityChip, { borderColor: COLORS.cardBorder }]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={14}
                color={COLORS.primary}
              />
              <Text style={[styles.amenityText, { color: COLORS.textSecondary }]}>
                {flag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
