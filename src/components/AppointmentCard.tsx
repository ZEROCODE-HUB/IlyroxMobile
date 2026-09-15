import React, { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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

interface StatusConfig {
  color: string;
  tint: string;
  pulse: boolean;
  title: string;
  subtitle: string;
}

const PulsingDot: React.FC<{ color: string }> = ({ color }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />
  );
};

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
    const isRequester =
      !!currentUserId && appointment.created_by === currentUserId;
    const isPending = appointment.estado === "pendiente";
    const isConfirmed = appointment.estado === "confirmada";
    const isCancelled = appointment.estado === "cancelada";
    const canAccept =
      activeTab === "upcoming" &&
      isPending &&
      !!currentUserId &&
      !isRequester;
    const canEdit =
      activeTab === "upcoming" &&
      !isCancelled &&
      !!currentUserId &&
      isRequester;
    const canJoinMeet =
      activeTab === "upcoming" &&
      isConfirmed &&
      !!appointment.google_meet_url;
    const isSynced = !!appointment.google_event_id;
    const hasProperty = !!appointment.propertyTitle;
    const propertyTitle = appointment.propertyTitle
      ? appointment.propertyTitle.charAt(0).toUpperCase() +
        appointment.propertyTitle.slice(1)
      : "";

    const status: StatusConfig = isCancelled
      ? {
          color: COLORS.errorDark,
          tint: COLORS.errorLight,
          pulse: false,
          title: "Cita cancelada",
          subtitle: "Esta cita ya no está vigente",
        }
      : isPending && !isRequester
        ? {
            color: COLORS.warningDark,
            tint: COLORS.warningLight,
            pulse: true,
            title: "Requiere tu confirmación",
            subtitle: `${appointment.user.name} te invitó · decide abajo`,
          }
        : isPending
          ? {
              color: COLORS.warningDark,
              tint: COLORS.warningLight,
              pulse: true,
              title: "Esperando confirmación",
              subtitle: "",
            }
          : {
              color: COLORS.successDark,
              tint: COLORS.successLight,
              pulse: false,
              title: "Cita confirmada",
              subtitle: `Reunión agendada con ${appointment.user.name}`,
            };

    const otherName =
      appointment.user.name.charAt(0).toUpperCase() +
      appointment.user.name.slice(1);
    const tipo = appointment.tipo
      ? appointment.tipo.charAt(0).toUpperCase() + appointment.tipo.slice(1)
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.dateColumn}>
          <Ionicons name="calendar" size={20} color={COLORS.primaryDark} />
          <Text style={styles.dateText}>{appointment.date}</Text>
          <Text style={styles.timeText}>{appointment.time}</Text>
        </View>

        <View style={styles.cardBody}>
          {hasProperty ? (
            <Pressable
              style={styles.propertyMain}
              onPress={() => onPropertyPress?.(appointment.propertyId ?? "")}
            >
              {appointment.propertyImage && (
                <Image
                  source={{ uri: appointment.propertyImage }}
                  style={styles.propertyThumb}
                  contentFit="cover"
                  transition={200}
                />
              )}
              <View style={styles.propertyInfo}>
                <View style={styles.propertyTitleRow}>
                  <Text numberOfLines={1} style={styles.propertyTitle}>
                    {propertyTitle}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={COLORS.textTertiary}
                  />
                </View>
                <View style={styles.metaRow}>
                  {tipo && (
                    <View style={styles.tipoChip}>
                      <Text style={styles.tipoChipText}>{tipo}</Text>
                    </View>
                  )}
                  {canEdit && onEdit && (
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => onEdit(appointment.id)}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color={COLORS.primaryDark}
                      />
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={styles.metaRow}>
              {tipo && (
                <View style={styles.tipoChip}>
                  <Text style={styles.tipoChipText}>{tipo}</Text>
                </View>
              )}
              {canEdit && onEdit && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => onEdit(appointment.id)}
                >
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={COLORS.primaryDark}
                  />
                  <Text style={styles.editBtnText}>Editar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.statusRow}>
          <View style={[styles.statusChip, { backgroundColor: status.tint }]}>
            {status.pulse ? (
              <PulsingDot color={status.color} />
            ) : (
              <View style={[styles.dot, { backgroundColor: status.color }]} />
            )}
          </View>
          <View style={styles.statusTextCol}>
            <Text style={styles.statusTitle}>{status.title}</Text>
            {!!status.subtitle && (
              <Text style={styles.statusSubtitle}>{status.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.contactRow}>
          <Pressable
            onPress={() => onUserPress?.(appointment.user.id)}
            style={styles.contactInfo}
          >
            {appointment.user.avatar ? (
              <Image
                source={{ uri: appointment.user.avatar }}
                style={styles.contactAvatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.contactAvatar, styles.contactAvatarPlaceholder]}>
                <Ionicons name="person" size={13} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.contactCol}>
              <Text numberOfLines={1} style={styles.contactName}>{otherName}</Text>
              <View style={styles.contactRoleChip}>
                <Text style={styles.contactRoleText}>{appointment.user.role}</Text>
              </View>
            </View>
          </Pressable>

          {onContact && (
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={() => onContact(appointment.id)}
            >
              <Ionicons name="chatbubble-outline" size={15} color={COLORS.primaryDark} />
              <Text style={styles.msgBtnText}>Mensaje</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeTab === "upcoming" && (
          <View style={styles.actions}>
            {canAccept ? (
              <>
                <TouchableOpacity
                  style={styles.heroBtn}
                  onPress={() => onAcceptAppointment(appointment.id)}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.heroBtnText}>Aceptar cita</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quietTextBtn}
                  onPress={() => onMarkCancel(appointment.id)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={15}
                    color={COLORS.error}
                  />
                  <Text style={styles.quietText}>Rechazar invitación</Text>
                </TouchableOpacity>
              </>
            ) : isPending ? (
              <TouchableOpacity
                style={styles.quietCancelBtn}
                onPress={() => onMarkCancel(appointment.id)}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={COLORS.error}
                />
                <Text style={styles.quietCancelText}>Cancelar cita</Text>
              </TouchableOpacity>
            ) : isConfirmed ? (
              <>
                <View style={styles.actionsRow}>
                  {isSynced ? (
                    <View style={styles.syncedPill}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.successDark}
                      />
                      <Text style={styles.syncedPillText}>Sincronizada</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.outlineBtn}
                      onPress={() => onSyncCalendar(appointment.id)}
                    >
                      <GoogleCalendarIcon size={18} />
                      <Text style={styles.outlineBtnText}>Sincronizar</Text>
                    </TouchableOpacity>
                  )}
                  {canJoinMeet && (
                    <TouchableOpacity
                      style={styles.joinBtn}
                      onPress={() =>
                        Linking.openURL(appointment.google_meet_url!)
                      }
                    >
                      <Ionicons
                        name="videocam-outline"
                        size={18}
                        color={COLORS.white}
                      />
                      <Text style={styles.joinBtnText}>Unirse a Meet</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.quietTextBtn}
                  onPress={() => onMarkCancel(appointment.id)}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={15}
                    color={COLORS.error}
                  />
                  <Text style={styles.quietText}>Cancelar cita</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        )}

        {activeTab === "past" && isConfirmed && !appointment.hasUserRated && (
          <View style={styles.rateContainer}>
            <Text style={styles.rateLabel}>Calificar:</Text>
            <TouchableOpacity
              onPress={() => onOpenRating(appointment.id)}
              style={styles.completeBtn}
            >
              <Ionicons name="star" size={16} color={COLORS.white} />
              <Text style={styles.completeBtnText}>Abrir calificación</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "past" && appointment.hasUserRated && (
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
    );
  },
);

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
  cardBody: {
    flex: 1,
    padding: 6,
  },
  propertyMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  propertyThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.shimmer,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  propertyTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  tipoChip: {
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tipoChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primaryDark,
    textTransform: "capitalize",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: COLORS.background,
    marginLeft: "auto",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  contactAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  contactAvatarPlaceholder: {
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  contactCol: {
    flex: 1,
  },
  contactName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  contactRoleChip: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  contactRoleText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: COLORS.background,
  },
  msgBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryDark,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  statusChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextCol: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textPrimary,
  },
  statusSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 8,
    gap: 8,
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  heroBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  quietTextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quietText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.error,
  },
  quietCancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-end",
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.white,
  },
  quietCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.error,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  syncedPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.successLight,
  },
  syncedPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.successDark,
  },
  joinBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDark,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  completeBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  rateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.successLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginTop: 16,
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: "700",
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
    marginTop: 16,
  },
  ratedText: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
});

export default AppointmentCard;