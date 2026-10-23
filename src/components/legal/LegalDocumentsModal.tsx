/**
 * LegalDocumentsModal - popup dentro de la app para leer los documentos legales.
 *
 * - initialCodigo = null  -> muestra la lista de los 5 documentos.
 * - initialCodigo = "..." -> abre ese documento directamente (registro, Configuracion).
 * El texto viene de la BD (misma version que queda como evidencia).
 */
import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Modal } from "@/design-system/components/Modal";
import { Button } from "@/design-system/components";
import { COLORS } from "@/constants/colors";
import { LEGAL_URLS } from "@/constants/legal";
import { legalService, LegalCodigo, LegalDocumento, LegalDocumentoResumen } from "@/services/legalService";

const DOC_INFO: { codigo: LegalCodigo; titulo: string; url: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { codigo: "terminos", titulo: "Términos y Condiciones", url: LEGAL_URLS.terms, icon: "document-text-outline" },
  { codigo: "privacidad", titulo: "Política de Privacidad", url: LEGAL_URLS.privacy, icon: "shield-checkmark-outline" },
  { codigo: "comunidad", titulo: "Normas de la Comunidad", url: LEGAL_URLS.community, icon: "people-outline" },
  { codigo: "seguridad_infantil", titulo: "Estándares de Seguridad Infantil", url: LEGAL_URLS.childSafety, icon: "happy-outline" },
  { codigo: "comunicaciones", titulo: "Autorización y Preferencias de Contacto", url: LEGAL_URLS.communications, icon: "mail-outline" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Documento a abrir directamente; null/undefined = lista. */
  initialCodigo?: LegalCodigo | null;
}

export function LegalDocumentsModal({ visible, onClose, initialCodigo = null }: Props) {
  const [codigo, setCodigo] = useState<LegalCodigo | null>(initialCodigo);
  const [doc, setDoc] = useState<LegalDocumento | null>(null);
  const [lista, setLista] = useState<LegalDocumentoResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible) setCodigo(initialCodigo ?? null);
  }, [visible, initialCodigo]);

  const cargar = useCallback(async (c: LegalCodigo | null) => {
    setFailed(false);
    setDoc(null);
    setLoading(true);
    try {
      if (c) setDoc(await legalService.obtenerDocumento(c));
      else setLista(await legalService.listarDocumentos());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) cargar(codigo);
  }, [visible, codigo, cargar]);

  const info = DOC_INFO.find((d) => d.codigo === codigo) || null;
  const openInBrowser = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const backButton =
    codigo && initialCodigo == null ? (
      <TouchableOpacity onPress={() => setCodigo(null)} hitSlop={8} accessibilityLabel="Volver a la lista de documentos">
        <Ionicons name="chevron-back" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>
    ) : undefined;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      variant="center"
      title={info ? info.titulo : "Documentos legales"}
      showCloseButton={true}
      headerRight={backButton}
      contentStyle={{ maxHeight: "80%", width: "90%", maxWidth: 500 }}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={true}>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />}

        {!loading && failed && (
          <View style={styles.center}>
            <Text style={styles.text}>No pudimos cargar el documento. Revisa tu conexión.</Text>
            <Button label="Reintentar" variant="outline" size="md" onPress={() => cargar(codigo)} style={styles.btn} />
            {info && (
              <Button label="Abrir en navegador" variant="outline" size="md" onPress={() => openInBrowser(info.url)} style={styles.btn} />
            )}
          </View>
        )}

        {!loading && !failed && !codigo &&
          DOC_INFO.map((d) => {
            const v = lista.find((x) => x.codigo === d.codigo);
            return (
              <TouchableOpacity key={d.codigo} style={styles.row} onPress={() => setCodigo(d.codigo)} activeOpacity={0.7}>
                <Ionicons name={d.icon} size={22} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.titulo}</Text>
                  {v ? <Text style={styles.rowSub}>Versión {v.version}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            );
          })}

        {!loading && !failed && codigo && doc && (
          <View style={{ gap: 10 }}>
            <Text style={styles.version}>
              Versión {doc.version}
              {doc.fecha_documento ? ` · ${doc.fecha_documento}` : ""}
            </Text>
            {doc.bloques.map(([tipo, texto], i) => {
              if (tipo === "h1") return <Text key={i} style={styles.h1}>{texto}</Text>;
              if (tipo === "sub") return <Text key={i} style={styles.sub}>{texto}</Text>;
              if (tipo === "h2") return <Text key={i} style={styles.h2}>{texto}</Text>;
              if (tipo === "kv") {
                const [k, ...rest] = texto.split(" — ");
                return (
                  <Text key={i} style={styles.kv}>
                    <Text style={styles.kvKey}>{k}: </Text>
                    {rest.join(" — ")}
                  </Text>
                );
              }
              return <Text key={i} style={styles.text}>{texto}</Text>;
            })}
            {info && (
              <View style={styles.actions}>
                <Button label="Abrir en navegador" variant="outline" size="md" onPress={() => openInBrowser(info.url)} style={styles.btn} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 4, paddingBottom: 16, gap: 10 },
  center: { alignItems: "center", gap: 12, paddingVertical: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  rowTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  version: { fontSize: 11, color: COLORS.textTertiary },
  h1: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, fontStyle: "italic" },
  h2: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginTop: 8 },
  kv: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  kvKey: { fontWeight: "600", color: COLORS.textPrimary },
  text: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 20 },
  actions: { paddingTop: 8, alignItems: "center" },
  btn: { minWidth: 200 },
});
