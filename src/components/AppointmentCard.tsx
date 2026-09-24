import React, { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { AppointmentItem } from "./Appointments/appointmentTypes";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";

interface AppointmentCardProps {
  appointment: AppointmentItem;
  onMarkCancel: (id: string) => void;
  onAcceptAppointment: (id: string) => void;
  onOpenRating: (id: string) => void;
  onSyncCalendar: (id: string) => void;
  onContact?: (id: string) => void;
  onEdit?: (id: string) => void;
  activeTab?: string;
  currentUserId?: string;
  onPropertyPress?: (id: string) => void;
  onUserPress?: (id: string) => void;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onMarkCancel,
  onAcceptAppointment,
  onContact,
  onEdit,
  activeTab,
  currentUserId,
  onPropertyPress,
  onUserPress,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCoordinationSheet, setShowCoordinationSheet] = useState(false);

  const isRequester = !!currentUserId && appointment.created_by === currentUserId;
  const isInvited = !isRequester;
  const isPending = appointment.estado === "pendiente";
  const isConfirmed = appointment.estado === "confirmada";
  const isCancelled = appointment.estado === "cancelada";
  const showGuestActions = isInvited && isPending;

  const getOtherUserPhone = () => {
    if (appointment.agente?.celular) {
      const prefix = appointment.agente.prefijo_celular || "";
      return `${prefix}${appointment.agente.celular}`;
    }
    if (appointment.cliente?.celular) {
      const prefix = appointment.cliente.prefijo_celular || "";
      return `${prefix}${appointment.cliente.celular}`;
    }
    return null;
  };

  const getOtherUserName = () => {
    return appointment.user?.name || "";
  };

  const getCreatorName = () => {
    if (!isRequester) {
      return getOtherUserName();
    }
    if (appointment.agente_id === currentUserId && appointment.cliente) {
      return `${appointment.cliente.nombre || ""} ${appointment.cliente.apellido_paterno || ""}`.trim();
    }
    if (appointment.cliente_id === currentUserId && appointment.agente) {
      return `${appointment.agente.nombre || ""} ${appointment.agente.apellido_paterno || ""}`.trim();
    }
    return getOtherUserName();
  };

  const handleCall = (fromSheet: boolean = false) => {
    const phone = getOtherUserPhone();
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
    }
    if (!fromSheet) {
      setShowMenu(false);
    }
  };

  const handleMessage = () => {
    onContact?.(appointment.id);
  };

  const handleEdit = () => {
    onEdit?.(appointment.id);
    setShowMenu(false);
  };

  const handleCancel = () => {
    onMarkCancel?.(appointment.id);
    setShowMenu(false);
  };

  const otherUserName = getOtherUserName();
  const creatorName = getCreatorName();

  const formatTitle = (title: string | undefined) => {
    if (!title) return "Sin propiedad";
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const timeParts = appointment.time ? appointment.time.slice(0, 5).split(":") : ["", ""];
  const hour = timeParts[0];
  const minute = timeParts[1];
  const hourNum = parseInt(hour, 10);
  const minuteNum = parseInt(minute, 10);

  let timeText = "--:--";
  let ampmText = "";

  if (!isNaN(hourNum) && !isNaN(minuteNum)) {
    const isPM = hourNum >= 12;
    const displayHour = hourNum > 12 ? String(hourNum - 12) : (hourNum === 0 ? "12" : hour);
    timeText = `${displayHour}:${minute}`;
    ampmText = isPM ? "PM" : "AM";
  }

  return (
    <View style={styles.card}>
      <View style={styles.leftColumn}>
        <Text style={styles.timeText}>{timeText}</Text>
        <Text style={styles.ampm}>{ampmText}</Text>
      </View>

      <View style={styles.rightColumn}>
        <View style={styles.contentRow}>
          <Pressable onPress={() => onPropertyPress?.(appointment.propertyId || appointment.propiedad_id)}>
            {appointment.propertyImage ? (
              <Image
                source={{ uri: appointment.propertyImage }}
                style={styles.propertyImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.propertyImage, styles.propertyImagePlaceholder]}>
                <Ionicons name="image-outline" size={24} color={COLORS.textTertiary} />
              </View>
            )}
          </Pressable>

          <View style={styles.titleBadgeColumn}>
            <Text numberOfLines={2} style={styles.propertyTitle}>
              {formatTitle(appointment.propertyTitle)}
            </Text>

            {isPending && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>
                  {isInvited ? "Esperando tu respuesta" : `Esperando respuesta de ${creatorName}`}
                </Text>
              </View>
            )}
            {isConfirmed && (
              <View style={styles.confirmedBadge}>
                <Text style={styles.confirmedBadgeText}>Cita confirmada</Text>
              </View>
            )}
            {isCancelled && (
              <View style={styles.cancelledBadge}>
                <Text style={styles.cancelledBadgeText}>Cita cancelada</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.userInfo}>
          <Pressable onPress={() => onUserPress?.(appointment.user.id)} style={styles.userRow}>
            {appointment.user.avatar ? (
              <Image
                source={{ uri: appointment.user.avatar }}
                style={styles.avatarMedium}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.avatarMedium, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.userText}>
              <Text numberOfLines={1} style={styles.userName}>{otherUserName}</Text>
              <Text style={styles.userRole}>Asesor</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          {showGuestActions ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.confirmBtn]}
                onPress={() => onAcceptAppointment?.(appointment.id)}
              >
                <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                <Text style={[styles.actionBtnText, styles.confirmBtnText]}>Confirmar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.coordinateBtn]}
                onPress={() => setShowCoordinationSheet(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Coordinar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleCall()}>
                <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Llamar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={() => handleMessage()}>
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Mensaje</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="create-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.menuItemText}>Editar cita</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleCancel}>
              <Ionicons name="close-circle-outline" size={20} color={COLORS.error} />
              <Text style={[styles.menuItemText, { color: COLORS.error }]}>Cancelar cita</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <AppBottomSheet
        visible={showCoordinationSheet}
        onClose={() => setShowCoordinationSheet(false)}
      >
        <View style={styles.coordinationSheet}>
          <Text style={styles.coordinationSheetTitle}>Coordinar con {otherUserName}</Text>

          <TouchableOpacity
            style={styles.coordinationOption}
            onPress={() => {
              handleCall(true);
              setShowCoordinationSheet(false);
            }}
          >
            <Ionicons name="call" size={24} color={COLORS.primary} />
            <Text style={styles.coordinationOptionText}>Llamar a {otherUserName}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.coordinationOption}
            onPress={() => {
              handleMessage();
              setShowCoordinationSheet(false);
            }}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={COLORS.primary} />
            <Text style={styles.coordinationOptionText}>Escribir a {otherUserName}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.coordinationCancelBtn}
            onPress={() => setShowCoordinationSheet(false)}
          >
            <Text style={styles.coordinationCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </AppBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: "hidden",
    shadowColor: COLORS.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  leftColumn: {
    width: 56,
    backgroundColor: COLORS.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  ampm: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  rightColumn: {
    flex: 1,
    padding: 12,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  propertyImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  propertyImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadgeColumn: {
    flex: 1,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  pendingBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.warningDark,
  },
  confirmedBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.successDark,
  },
  cancelledBadge: {
    backgroundColor: COLORS.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  cancelledBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.errorDark,
  },
  userInfo: {
    marginTop: 12,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarMedium: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  userRole: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  confirmBtn: {
    backgroundColor: COLORS.success,
    flex: 1,
  },
  confirmBtnText: {
    color: COLORS.white,
  },
  coordinateBtn: {
    backgroundColor: COLORS.background,
    flex: 1,
  },
  menuBtn: {
    width: 44,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 8,
    width: 240,
    shadowColor: COLORS.black,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  coordinationSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  coordinationSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  coordinationOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  coordinationOptionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 16,
  },
  coordinationCancelBtn: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  coordinationCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});

export default AppointmentCard;
