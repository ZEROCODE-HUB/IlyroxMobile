import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Property } from "@/types";
import { COLORS } from "@/constants/colors";

interface Props {
  /** Propiedades que comparten la misma ubicación. `null` = oculto. */
  properties: Property[] | null;
  onClose: () => void;
  onSelect: (property: Property) => void;
}

function formatPrice(price: number, currency: "USD" | "MXN" = "MXN"): string {
  const symbol = currency === "USD" ? "USD" : "MXN";
  if (!price) return `${symbol} 0`;
  if (price >= 1_000_000) return `${symbol} ${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `${symbol} ${Math.round(price / 1_000)}k`;
  return `${symbol} ${price}`;
}

/**
 * Selector que aparece cuando un pin del mapa representa VARIAS propiedades en
 * la misma coordenada. Sin esto, esas propiedades quedaban encimadas y solo se
 * podía abrir una (el contador decía "2" pero solo salía una publicación).
 */
export const CoincidentPropertiesSheet: React.FC<Props> = ({
  properties,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const visible = !!properties && properties.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* El contenido no propaga el toque al backdrop */}
        <Pressable
          style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}
          onPress={() => {}}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {properties?.length ?? 0} propiedades en esta ubicación
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Elige cuál quieres ver</Text>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {properties?.map((p) => (
              <Pressable
                key={p.id}
                style={styles.card}
                onPress={() => onSelect(p)}
                android_ripple={{ color: COLORS.primary + "22" }}
              >
                {p.images?.[0] ? (
                  <Image source={{ uri: p.images[0] }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="home" size={22} color={COLORS.textTertiary} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.price} numberOfLines={1}>
                    {formatPrice(p.price, p.currency)}
                  </Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.location} numberOfLines={1}>
                    {p.location?.colony || p.colonia || p.location?.city || ""}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: "75%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.mediumGray,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.dividerGray,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#F0F0F0",
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardTitle: {
    fontSize: 13,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  location: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
