import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  clearPushLog,
  getPushLog,
  subscribePushLog,
} from "@/utils/pushDebug";

/**
 * TEMPORAL: botón flotante que muestra la traza de arranque por notificación.
 * Borrar junto con `utils/pushDebug.ts` cuando el bug de las push esté resuelto.
 */
export const PushDebugOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [log, setLog] = useState(getPushLog());
  const [copied, setCopied] = useState(false);

  useEffect(() => subscribePushLog(() => setLog(getPushLog())), []);

  const copy = async () => {
    await Clipboard.setStringAsync(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <Pressable
        style={styles.fab}
        onPress={() => setVisible(true)}
        hitSlop={8}
      >
        <Text style={styles.fabText}>LOG</Text>
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Traza de notificación</Text>

            <ScrollView style={styles.scroll}>
              <Text style={styles.log} selectable>
                {log}
              </Text>
            </ScrollView>

            <View style={styles.actions}>
              <Pressable style={styles.btn} onPress={copy}>
                <Text style={styles.btnText}>
                  {copied ? "¡Copiado!" : "Copiar"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                onPress={clearPushLog}
              >
                <Text style={[styles.btnText, styles.btnGhostText]}>
                  Limpiar
                </Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                onPress={() => setVisible(false)}
              >
                <Text style={[styles.btnText, styles.btnGhostText]}>
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    left: 8,
    bottom: 96,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 9999,
  },
  fabText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  scroll: { flexGrow: 0, marginBottom: 12 },
  log: { fontSize: 11, fontFamily: "monospace", color: "#111", lineHeight: 16 },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: "#45A0A5",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  btnGhost: { backgroundColor: "#EEF2F3" },
  btnGhostText: { color: "#333" },
});
