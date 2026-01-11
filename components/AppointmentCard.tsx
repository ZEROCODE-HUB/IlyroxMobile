import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

type AppointmentStatus = "pending" | "completed" | "cancelled" | "rated";

interface AppointmentCardProps {
  appointment: {
    id: string;
    fecha: string; // YYYY-MM-DD
    hora: string; // HH:MM:SS
    estado: string;
    user: {
      name: string;
      avatar: string | null;
      role: string;
    };
    propertyTitle?: string;
    propertyImage?: string;
    location: string;
    date: string;
    time: string;
    status: AppointmentStatus;
    rating?: number;
    hasUserRated?: boolean;
  };
  onMarkComplete: (id: string) => void;
  onOpenRating: (id: string) => void;
  onMessage?: (id: string) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onMarkComplete,
  onOpenRating,
  onMessage,
}) => {
  // Verificar si la fecha y hora de la cita ya pasaron
  const canMarkAsCompleted = () => {
    if (appointment.estado !== "pendiente") return false;

    // Combinar fecha y hora para comparar con el momento actual
    const appointmentDateTime = new Date(
      `${appointment.fecha}T${appointment.hora}`
    );
    const now = new Date();

    return appointmentDateTime <= now;
  };

  return (
    <View style={styles.card}>
      <View style={styles.dateColumn}>
        <Ionicons name="calendar" size={20} color={COLORS.primaryDark} />
        <Text style={styles.dateText}>{appointment.date}</Text>
        <Text style={styles.timeText}>{appointment.time}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            {appointment.user.avatar ? (
              <Image
                source={{ uri: appointment.user.avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color={COLORS.textTertiary} />
              </View>
            )}
            <View>
              <Text style={styles.userName}>{appointment.user.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{appointment.user.role}</Text>
              </View>
            </View>
          </View>
          {onMessage && (
            <TouchableOpacity
              style={styles.msgButton}
              onPress={() => onMessage(appointment.id)}
            >
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.details}>
          {appointment.propertyImage && (
            <Image
              source={{ uri: appointment.propertyImage }}
              style={styles.propertyImage}
            />
          )}
          {appointment.propertyTitle && (
            <Text style={styles.propertyTitle}>
              {appointment.propertyTitle.charAt(0).toUpperCase() +
                appointment.propertyTitle.slice(1)}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {/* Mostrar botón "Marcar como completada" solo si está pendiente y fecha+hora ya pasaron */}
          {canMarkAsCompleted() && (
            <TouchableOpacity
              onPress={() => onMarkComplete(appointment.id)}
              style={styles.completeBtn}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={COLORS.white}
              />
              <Text style={styles.completeBtnText}>Marcar como completada</Text>
            </TouchableOpacity>
          )}

          {/* Mostrar botón "Calificar" si está completada y el usuario NO ha calificado */}
          {appointment.estado === "completada" && !appointment.hasUserRated && (
            <View style={styles.rateContainer}>
              <Text style={styles.rateLabel}>Calificar:</Text>
              <TouchableOpacity
                onPress={() => onOpenRating(appointment.id)}
                style={[styles.completeBtn, { marginLeft: 8 }]}
              >
                <Ionicons name="star" size={16} color={COLORS.white} />
                <Text style={styles.completeBtnText}>Abrir calificación</Text>
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
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    flexDirection: "row",
    overflow: "hidden",
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
