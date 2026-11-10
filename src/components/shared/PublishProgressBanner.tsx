import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePublishQueueStore } from "@/store/publishQueueStore";
import { COLORS } from "@/constants/colors";

/** REV26 (#5): barra flotante con el avance de la publicacion en segundo plano. */
export default function PublishProgressBanner() {
  const insets = useSafeAreaInsets();
  const status = usePublishQueueStore((s) => s.status);
  const progress = usePublishQueueStore((s) => s.progress);
  const retry = usePublishQueueStore((s) => s.retry);
  const clear = usePublishQueueStore((s) => s.clear);
  if (!status) return null;

  const texto =
    status === "preparando"
      ? "Preparando tu video…"
      : status === "subiendo"
        ? `Subiendo tu reel… ${Math.min(progress, 99)}%`
        : status === "publicando"
          ? "Publicando…"
          : status === "listo"
            ? "Tu reel ya está publicado"
            : "No se pudo publicar tu reel";

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <View pointerEvents={status === "error" ? "auto" : "none"} style={[styles.card, status === "error" && styles.cardError]}>
        <View style={styles.row}>
          {status === "listo" ? (
            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
          ) : status === "error" ? (
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
          ) : (
            <ActivityIndicator size="small" color={COLORS.primary} />
          )}
          <Text style={styles.text} numberOfLines={1}>
            {texto}
          </Text>
          {status === "error" && (
            <>
              <TouchableOpacity onPress={retry} hitSlop={8}>
                <Text style={styles.action}>Reintentar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clear} hitSlop={8}>
                <Text style={styles.actionMuted}>Descartar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {(status === "subiendo" || status === "preparando") && (
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, zIndex: 9999, elevation: 20 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#d4d4d8",
  },
  cardError: { borderColor: "#dc2626" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  text: { flex: 1, fontSize: 14, color: "#18181b", fontWeight: "600" },
  action: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },
  actionMuted: { fontSize: 13, color: "#71717a", fontWeight: "600" },
  bar: { height: 4, backgroundColor: "#e4e4e7", borderRadius: 2, marginTop: 8, overflow: "hidden" },
  fill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },
});
