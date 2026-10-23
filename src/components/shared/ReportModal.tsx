/**
 * ReportModal - Modal de reportes reutilizable (usuarios, publicaciones, reels, propiedades y chats)
 *
 * Al elegir un motivo se registra el reporte en Supabase (RPC reportar_a_moderacion) y se
 * confirma con un aviso. Si no se pasan targetId / reportedUserId (uso antiguo), solo se
 * llama a onReport para no romper a quien ya lo use.
 *
 * @example
 * <ReportModal
 *   visible={showModal}
 *   reportType="post"
 *   targetId={post.id}
 *   reportedUserId={post.user.id}
 *   onClose={() => setShowModal(false)}
 * />
 */

import React, { useState } from "react";
import { Modal, TouchableOpacity, View, Text, ActivityIndicator } from "react-native";
import { commonStyles } from "../../../styles";
import { useToast } from "../../context/ToastContext";
import { legalService, ReporteTipo } from "../../services/legalService";

export type ReportKind = "post" | "property" | "reel" | "user" | "chat";

export interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportType: ReportKind;
  onReport?: (reason: string) => void;
  /** Id de la publicación / reel / propiedad reportada. */
  targetId?: string | null;
  /** Usuario dueño del contenido (o usuario reportado). */
  reportedUserId?: string | null;
  /** Conversación reportada (solo reportType="chat"). */
  conversationId?: string | null;
}

const TIPO_REPORTE: Record<ReportKind, ReporteTipo> = {
  post: "publicacion",
  property: "propiedad",
  reel: "reel",
  user: "usuario",
  chat: "chat",
};

const MOTIVOS: Record<ReportKind, string[]> = {
  post: [
    "Información falsa",
    "Contenido inapropiado",
    "Spam o publicidad",
    "Acoso o discriminación",
    "Seguridad infantil (menores)",
  ],
  reel: [
    "Información falsa",
    "Contenido inapropiado",
    "Spam o publicidad",
    "Acoso o discriminación",
    "Seguridad infantil (menores)",
  ],
  property: [
    "Información falsa",
    "Posible fraude o estafa",
    "Pagos incompletos de comisiones",
    "Contenido inapropiado",
  ],
  user: [
    "Acoso o amenazas",
    "Suplantación de identidad",
    "Spam o publicidad no solicitada",
    "Posible fraude o estafa",
    "Contenido inapropiado",
    "Seguridad infantil (menores)",
  ],
  chat: [
    "Acoso o amenazas",
    "Spam o publicidad no solicitada",
    "Posible fraude o estafa",
    "Contenido inapropiado",
    "Seguridad infantil (menores)",
  ],
};

const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  reportType,
  onReport,
  targetId,
  reportedUserId,
  conversationId,
}) => {
  const { showToast } = useToast();
  const [sending, setSending] = useState(false);
  const reportOptions = MOTIVOS[reportType] ?? MOTIVOS.post;
  const canPersist = !!(targetId || reportedUserId || conversationId);

  const handleReport = async (reason: string) => {
    onReport?.(reason);
    if (!canPersist) {
      onClose();
      return;
    }
    try {
      setSending(true);
      await legalService.reportarContenido({
        tipo: TIPO_REPORTE[reportType],
        objetivoId: targetId ?? null,
        usuarioReportadoId: reportedUserId ?? null,
        motivo: reason,
        conversacionId: conversationId ?? null,
      });
      showToast("Gracias. Revisaremos tu reporte.", "success");
    } catch (e: any) {
      const msg = String(e?.message || "");
      showToast(
        msg.includes("ti mismo")
          ? "No puedes reportar tu propio contenido"
          : msg.includes("Limite diario")
            ? "Alcanzaste el límite diario de reportes"
            : "No se pudo enviar el reporte. Inténtalo de nuevo.",
        "error",
      );
    } finally {
      setSending(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={commonStyles.modalOverlay}
        activeOpacity={1}
        onPress={sending ? undefined : onClose}
      >
        <View style={commonStyles.menuContainer}>
          {sending && <ActivityIndicator style={{ margin: 12 }} />}
          {!sending &&
            reportOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={commonStyles.menuItem}
                onPress={() => handleReport(option)}
              >
                <Text style={commonStyles.menuItemText}>{option}</Text>
              </TouchableOpacity>
            ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default React.memo(ReportModal);
