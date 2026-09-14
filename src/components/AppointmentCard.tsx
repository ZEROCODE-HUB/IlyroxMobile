import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { GoogleCalendarIcon } from "./shared/GoogleCalendarIcon";
import { COLORS } from "../constants/colors";

type AppointmentStatus =
  | "pendiente"
  | "confirmada"
  | "cancelada"
  | "pending"
  | "cancelled"
  | "rated";

interface AppointmentCardProps {
  appointment: {
    id: string;
    fecha: string; // YYYY-MM-DD
    hora: string; // HH:MM:SS
    estado: string;
    tipo: string;
    descripcion: string | null;
    user: {
      id: string;
      name: string;
      avatar: string | null;
      role: string;
    };
    propertyId?: string;
    propertyTitle?: string;
    propertyImage?: string;
    location: string;
    date: string;
    time: string;
    status: AppointmentStatus;
    rating?: number;
    hasUserRated?: boolean;
    google_event_id?: string | null;
    google_meet_url?: string | null;
    created_by?: string | null;
  };
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

export const AppointmentCard: React.FC<AppointmentCardProps> = React.memo(
  ({
    appointment,
    onMarkCancel,
    onAcceptAppointment,
    onOpenRating,
    onSyncCalendar,
    onContact,
    onEdit,
    activeTab,
    currentUserId,
    onPropertyPress,
    onUserPress,
  }) => {
    const canEdit =
      activeTab === "upcoming" &&
      appointment.estado !== "cancelada" &&
      !!currentUserId &&
      appointment.created_by === currentUserId;
    const canAccept =
      activeTab === "upcoming" &&
      appointment.estado === "pendiente" &&
      !!currentUserId &&
      appointment.created_by !== currentUserId;
    const statusLabel =
      appointment.estado === "pendiente"
        ? "Pendiente"
        : appointment.estado === "confirmada"
          ? "Aceptada"
          : appointment.estado === "cancelada"
              ? "Cancelada"
              : appointment.estado;
    const isPending = appointment.estado === "pendiente";
    const isCancelled = appointment.estado === "cancelada";
    const canJoinMeet =
      activeTab === "upcoming" &&
      appointment.estado === "confirmada" &&
      !!appointment.google_meet_url;

    return (
      <View style={styles.card}>
        <View style={styles.dateColumn}>
          <Ionicons name="calendar" size={20} color={COLORS.primaryDark} />
          <Text style={styles.dateText}>{appointment.date}</Text>
          <Text style={styles.timeText}>{appointment.time}</Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Pressable
              onPress={() => onUserPress?.(appointment.user.id)}
              style={styles.userInfo}
            >
              {appointment.user.avatar ? (
                <Image
                  source={{ uri: appointment.user.avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Ionicons
                    name="person"
                    size={16}
                    color={COLORS.textTertiary}
                  />
                </View>
              )}
              <View>
                <Text style={styles.userName}>{appointment.user.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{appointment.user.role}</Text>
                </View>
              </View>
            </Pressable>
            {(canEdit || onContact) && (
              <View style={styles.headerActions}>
                {canEdit && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onEdit?.(appointment.id)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={22}
                      color={COLORS.primaryDark}
                    />
                  </TouchableOpacity>
                )}
                {onContact && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onContact(appointment.id)}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={22}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.details}>
            {appointment.propertyImage && (
              <Pressable
                onPress={() => onPropertyPress?.(appointment.propertyId ?? "")}
                style={styles.propertyImage}
              >
                <Image
                  source={{ uri: appointment.propertyImage }}
                  style={styles.propertyImage}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            )}
            {appointment.propertyTitle && (
              <View style={styles.propertyContainer}>
                <Text style={styles.propertyTitle}>
                  {appointment.propertyTitle.charAt(0).toUpperCase() +
                    appointment.propertyTitle.slice(1)}
                </Text>
                <View style={styles.appointmentActionsCol}>
                  <View
                    style={[
                      styles.statusBadge,
                      isCancelled
                        ? styles.statusCancelled
                        : isPending
                          ? styles.statusPending
                          : styles.statusConfirmed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isCancelled
                          ? styles.statusCancelledText
                          : isPending
                          ? styles.statusPendingText
                          : styles.statusConfirmedText,
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                  {appointment.estado === "cancelada" ? (
                    <View style={styles.cancelBtn}>
                      <Text style={styles.completeBtnText}>Cita Cancelada</Text>
                    </View>
                  ) : activeTab === "past" ? null : (
                    <TouchableOpacity
                      onPress={() => onMarkCancel(appointment.id)}
                      style={styles.cancelBtn}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={16}
                        color={COLORS.white}
                      />
                      <Text style={styles.completeBtnText}>
                        {canAccept ? "Rechazar" : "Cancelar Cita"}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {canAccept && (
                    <TouchableOpacity
                      onPress={() => onAcceptAppointment(appointment.id)}
                      style={styles.acceptBtn}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={COLORS.white}
                      />
                      <Text style={styles.completeBtnText}>Aceptar Cita</Text>
                    </TouchableOpacity>
                  )}
                  {activeTab === "upcoming" &&
                    appointment.estado === "confirmada" && (
                      <TouchableOpacity
                        style={styles.calendarBtn}
                        onPress={() => onSyncCalendar(appointment.id)}
                      >
                        {appointment.google_event_id ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color={COLORS.primary}
                          />
                        ) : (
                          <GoogleCalendarIcon size={16} />
                        )}
                        <Text style={styles.calendarBtnText}>
                          {appointment.google_event_id
                            ? "Sincronizada"
                            : "Sincronizar"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  {canJoinMeet && (
                    <TouchableOpacity
                      style={styles.meetBtn}
                      onPress={() => Linking.openURL(appointment.google_meet_url!)}
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={16}
                        color={COLORS.white}
                      />
                      <Text style={styles.completeBtnText}>Unirse</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            {/* Mostrar botón "Calificar" si la cita ya fue aceptada y el usuario NO ha calificado */}
            {appointment.estado === "confirmada" &&
              activeTab === "past" &&
              !appointment.hasUserRated && (
                <View style={styles.rateContainer}>
                  <Text style={styles.rateLabel}>Calificar:</Text>
                  <TouchableOpacity
                    onPress={() => onOpenRating(appointment.id)}
                    style={[
                      styles.completeBtn,
                      { marginLeft: 8, paddingHorizontal: 8 },
                    ]}
                  >
                    <Ionicons name="star" size={16} color={COLORS.white} />
                    <Text style={styles.completeBtnText}>
                      Abrir calificación
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* Mostrar estrellas si el usuario ya calificó */}
            {appointment.hasUserRated && (
              <View style={styles.ratedContainer}>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={
                        i < (appointment.rating || 0) ? "star" : "star-outline"
                      }
                      size={16}
                      color={COLORS.warning}
                    />
                  ))}
                </View>
                <Text style={styles.ratedText}>(Has calificado esta cita)</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: "row",
    overflow: "hidden",
  },
  propertyContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 6,
  },
  appointmentActionsCol: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPending: {
    backgroundColor: COLORS.warningLight,
  },
  statusConfirmed: {
    backgroundColor: COLORS.successLight,
  },
  statusCancelled: {
    backgroundColor: COLORS.errorLight,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusPendingText: {
    color: COLORS.warningDark,
  },
  statusConfirmedText: {
    color: COLORS.successDark,
  },
  statusCancelledText: {
    color: COLORS.errorDark,
  },
  dateColumn: {
    backgroundColor: COLORS.primaryTransparent,
    width: 80,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: COLORS.primaryTransparent,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    textAlign: "center",
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 4,
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  roleBadge: {
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  roleText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  msgButton: {
    padding: 6,
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  details: {
    marginBottom: 12,
  },
  propertyImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    backgroundColor: COLORS.shimmer,
    marginBottom: 8,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    marginBottom: 2,
    flexShrink: 1,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 12,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.error,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
  },
  calendarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
  },
  calendarBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  meetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
    flexShrink: 0,
  },
  completeBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  rateContainer: {
    backgroundColor: COLORS.successLight,
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rateLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  ratedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ratedText: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
});