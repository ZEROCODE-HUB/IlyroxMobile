import React, { useEffect, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "@/constants/colors";
import { supabase } from "../../lib/supabase";

interface ChatPropertyBannerProps {
  /** Propiedad asociada a la conversación. */
  propertyId: string;
}

interface PropInfo {
  id: string;
  tipo: string;
  subtipo: string | null;
  ciudad: string | null;
  foto: string | null;
  precio: number;
  moneda: string;
}

const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/**
 * Cuadrito de la propiedad asociada a un chat. Se muestra debajo del header de
 * la conversación para indicar a qué propiedad pertenece. Al tocarlo navega al
 * detalle de la propiedad.
 */
export const ChatPropertyBanner: React.FC<ChatPropertyBannerProps> = ({
  propertyId,
}) => {
  const router = useRouter();
  const [info, setInfo] = useState<PropInfo | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("propiedades")
        .select(
          "id, tipo, subtipo, ciudad, fotos, operaciones_propiedad(precio, moneda)",
        )
        .eq("id", propertyId)
        .single();
      if (!active || error || !data) return;
      const op = Array.isArray(data.operaciones_propiedad)
        ? data.operaciones_propiedad[0]
        : (data.operaciones_propiedad as any);
      setInfo({
        id: data.id,
        tipo: data.tipo,
        subtipo: data.subtipo,
        ciudad: data.ciudad,
        foto:
          Array.isArray(data.fotos) && data.fotos.length ? data.fotos[0] : null,
        precio: op?.precio || 0,
        moneda: op?.moneda || "MXN",
      });
    })();
    return () => {
      active = false;
    };
  }, [propertyId]);

  if (!info) return null;

  const title = `${info.subtipo || capitalize(info.tipo)}${
    info.ciudad ? ` · ${info.ciudad}` : ""
  }`;
  const price =
    info.precio > 0
      ? `$${info.precio.toLocaleString("es-MX")} ${info.moneda}`
      : "";

  return (
    <Pressable
      style={styles.container}
      onPress={() =>
        router.push({
          pathname: "/(stack)/property/[id]",
          params: { id: info.id },
        } as any)
      }
    >
      {info.foto ? (
        <Image source={{ uri: info.foto }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="home-outline" size={18} color={COLORS.textTertiary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {price ? (
          <Text style={styles.price} numberOfLines={1}>
            {price}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  image: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  price: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
  },
});
