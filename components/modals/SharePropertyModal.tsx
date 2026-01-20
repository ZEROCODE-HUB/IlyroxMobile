import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { pdfService } from "../../services/pdfService";

//////////////////////////////////////
// URL a futuro:
// https://i360.app/property/${propertyId}
// https://i360.app/post/${postId}
// https://i360.app/reel/${reelId}
//////////////////////////////////////

interface SharePropertyModalProps {
  visible: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyId: string;
}

const SharePropertyModal: React.FC<SharePropertyModalProps> = ({
  visible,
  onClose,
  propertyTitle,
  propertyId,
}) => {
  const [activeTab, setActiveTab] = useState<"con" | "sin">("con");
  const [downloading, setDownloading] = useState(false);

  const shareUrl = useMemo(
    () => `https://i360.app/property/${propertyId}`,
    [propertyId],
  );

  const copyUrl = async () => {
    let Clipboard: any = null;
    try {
      Clipboard = require("expo-clipboard");
    } catch {}

    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert("Copiado", "URL copiada al portapapeles");
    } else {
      Alert.alert("URL", shareUrl);
    }
  };

  /**
   * Descarga el PDF de la propiedad
   * @param includeAllData - true para "Con Datos", false para "Sin Datos"
   *
   * CONFIGURACION DE CAMPOS:
   * Para modificar qué campos se muestran en cada modo, edita los siguientes
   * objetos en services/pdfService.ts:
   *
   * - PDF_FIELD_CONFIG: Configuración base con todos los campos disponibles
   * - PDF_SIN_DATOS_OVERRIDE: Campos que se ocultan en modo "Sin Datos"
   *
   * Ejemplo para ocultar el precio en modo "Sin Datos":
   * export const PDF_SIN_DATOS_OVERRIDE = {
   *   ...
   *   showPrecio: false,
   * };
   */
  const downloadPdf = async (includeAllData: boolean = true) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const result = await pdfService.generateAndOpenPropertyPdf(
        propertyId,
        includeAllData,
      );

      if (!result?.opened && result?.filePath) {
        Alert.alert(
          "PDF guardado",
          `El PDF se ha generado correctamente.\nRuta: ${result.filePath}`,
        );
      }

      onClose();
    } catch (e: any) {
      console.error("Error generating PDF:", e);
      Alert.alert("Error", e?.message || "No se pudo generar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Compartir Propiedad</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "con" && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab("con")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "con" && styles.tabTextActive,
                ]}
              >
                Con datos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === "sin" && styles.tabBtnActive,
              ]}
              onPress={() => setActiveTab("sin")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "sin" && styles.tabTextActive,
                ]}
              >
                Sin datos
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.tabDescription}>
            {activeTab === "con"
              ? "Incluye todos los datos de la propiedad, información del agente y comisiones."
              : "PDF simplificado sin información de contacto, comisiones ni gravámenes."}
          </Text>

          {activeTab === "con" ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={copyUrl}
                activeOpacity={0.85}
              >
                <Ionicons name="link" size={18} color={COLORS.primary} />
                <Text style={styles.actionText}>Copiar URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  downloading && styles.actionBtnDisabled,
                  { marginBottom: 30 },
                ]}
                onPress={() => downloadPdf(true)}
                activeOpacity={0.85}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.actionText}>Generando PDF...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="download"
                      size={18}
                      color={COLORS.primary}
                    />
                    <Text style={styles.actionText}>
                      Descargar PDF completo
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  downloading && styles.actionBtnDisabled,
                  { marginBottom: 30 },
                ]}
                onPress={() => downloadPdf(false)}
                activeOpacity={0.85}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.actionText}>Generando PDF...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="download"
                      size={18}
                      color={COLORS.primary}
                    />
                    <Text style={styles.actionText}>
                      Descargar PDF simplificado
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  backdrop: {
    flex: 1,
  },
  container: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actions: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});

export default SharePropertyModal;
