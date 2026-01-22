import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { AppHeader } from "./AppHeader";
import { AppointmentCard } from "./AppointmentCard";
import { RatingModal } from "./RatingModal";
import { COLORS } from "../constants/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useChatInitiator } from "../hooks/hooks/messaging/useChatInitiator";
import useAppointment from "../hooks/hooks/useAppointment";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { router } from "expo-router";

type AppointmentStatus = "pending" | "completed" | "cancelled" | "rated";

interface FeatureRatings {
  conocimiento_mercado: number;
  comunicacion: number;
  profesionalismo: number;
  disponibilidad: number;
}

interface AppointmentItem {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  descripcion: string | null;
  estado: string;
  agente_id: string;
  cliente_id: string;
  propiedad_id: string;
  user: {
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
  featureRatings?: FeatureRatings;
  agente?: {
    id: string;
    nombre: string;
    apellido_paterno: string;
    foto: string | null;
  };
  cliente?: {
    id: string;
    nombre: string;
    apellido_paterno: string;
    foto: string | null;
  };
}

const Appointments: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { handleContact } = useChatInitiator();
  const { handleCancelAppointment } = useAppointment();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRateModal, setShowRateModal] = useState(false);
  const [rateApptId, setRateApptId] = useState<string | null>(null);

  // Cargar citas desde Supabase
  useEffect(() => {
    if (profile?.id) {
      loadAppointments();
    }
  }, [profile?.id, activeTab]);

  const loadAppointments = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      let query = supabase
        .from("citas")
        .select(
          `
          *,
          agente:perfiles!agente_id(id, nombre, apellido_paterno, foto, rol),
          cliente:perfiles!cliente_id(id, nombre, apellido_paterno, foto, rol),
          propiedad:propiedades(id, tipo, subtipo, ciudad, fotos),
          resenas:resenas(id, revisor_id, calificacion_general)
        `,
        )
        .or(`agente_id.eq.${profile.id},cliente_id.eq.${profile.id}`)
        .is("deleted_at", null);

      // Filtrar según el tab activo
      if (activeTab === "upcoming") {
        query = query
          .eq("estado", "pendiente")
          .gte("fecha", new Date().toISOString().split("T")[0]);
      } else {
        query = query.or(
          `estado.in.(completada,cancelada),fecha.lt.${
            new Date().toISOString().split("T")[0]
          }`,
        );
      }

      query = query.order("fecha", { ascending: activeTab === "upcoming" });
      query = query.order("hora", { ascending: activeTab === "upcoming" });

      const { data, error } = await query;

      if (error) throw error;

      // Transformar datos
      const transformedData: AppointmentItem[] = (data || []).map(
        (cita: any) => {
          const isAgente = cita.agente_id === profile.id;
          const otherUser = isAgente ? cita.cliente : cita.agente;

          // Verificar si el usuario actual ya calificó esta cita
          const userReview = (cita.resenas || []).find(
            (resena: any) => resena.revisor_id === profile.id,
          );

          const hasUserRated = !!userReview;

          return {
            ...cita,
            user: {
              name: `${otherUser.nombre || ""} ${
                otherUser.apellido_paterno || ""
              }`.trim(),
              avatar: otherUser.foto,
              role: isAgente ? "Cliente" : "Agente",
            },
            propertyTitle: cita.propiedad
              ? `${cita.propiedad.tipo} en ${cita.propiedad.ciudad}`
              : undefined,
            propertyImage: cita.propiedad?.fotos?.[0],
            location: cita.propiedad?.ciudad || "No especificado",
            date: formatDate(cita.fecha),
            time: formatTime(cita.hora),
            status: cita.estado as AppointmentStatus,
            hasUserRated,
            rating: userReview?.calificacion_general,
          };
        },
      );

      setAppointments(transformedData);
    } catch (error: any) {
      console.error("Error loading appointments:", error);
      showToast(error.message || "Error al cargar las citas", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = date.toDateString();
    const todayOnly = today.toDateString();
    const tomorrowOnly = tomorrow.toDateString();

    if (dateOnly === todayOnly) return "Hoy";
    if (dateOnly === tomorrowOnly) return "Mañana";

    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleMarkComplete = (id: string) => {
    // Solo abrir modal de calificación
    // La cita se marcará como completada cuando se guarde la primera reseña
    handleOpenRating(id);
  };

  const handleMarkCancel = (id: string) => {
    Alert.alert("Cancelar Cita", "¿Estás seguro de cancelar esta cita?", [
      {
        text: "Volver",
        onPress: () => console.log("Cancelado"),
        style: "cancel",
      },
      {
        text: "Cancelar Cita",
        style: "destructive",
        onPress: async () => {
          const success = await handleCancelAppointment(id);
          if (success) {
            // Recargar para que desaparezca de 'Próximas'
            loadAppointments();
          }
        },
      },
    ]);
  };

  const handleOpenRating = (id: string) => {
    setRateApptId(id);
    setShowRateModal(true);
  };

  const handleSubmitRating = async (
    overallRating: number,
    featureRatings: FeatureRatings,
    comentario: string,
  ) => {
    if (!rateApptId || !profile?.id) return;

    try {
      const appointment = appointments.find((a) => a.id === rateApptId);
      if (!appointment) return;

      // Determinar quién recibe la calificación (el profesional)
      const profesionalId =
        appointment.agente_id === profile.id
          ? appointment.cliente_id
          : appointment.agente_id;

      // Insertar reseña
      const { error: reviewError } = await supabase.from("resenas").insert({
        revisor_id: profile.id,
        profesional_id: profesionalId,
        cita_id: rateApptId,
        calificacion_general: overallRating,
        conocimiento_mercado: featureRatings.conocimiento_mercado,
        comunicacion: featureRatings.comunicacion,
        profesionalismo: featureRatings.profesionalismo,
        disponibilidad: featureRatings.disponibilidad,
        comentario: comentario.trim() || null,
        tipo_resena: "detallada",
        visible: true,
      });

      if (reviewError) throw reviewError;

      // Marcar la cita como completada (si aún está pendiente)
      if (appointment.estado === "pendiente") {
        const { error: updateError } = await supabase
          .from("citas")
          .update({
            estado: "completada",
            completado_en: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", rateApptId);

        if (updateError) throw updateError;
      }

      showToast("Calificación enviada exitosamente", "success");
      setShowRateModal(false);
      setRateApptId(null);

      // Recargar citas para reflejar los cambios
      loadAppointments();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      showToast(error.message || "Error al enviar la calificación", "error");
      // Re-lanzar el error para que el modal pueda manejar el estado de carga
      throw error;
    }
  };

  const handleContactPress = (id: string) => {
    const appointment = appointments.find((a) => a.id === id);
    if (!appointment || !profile?.id) return;

    const isAgente = appointment.agente_id === profile.id;
    const otherUser = isAgente ? appointment.cliente : appointment.agente;
    const otherUserId = isAgente
      ? appointment.cliente_id
      : appointment.agente_id;

    if (!otherUserId || !otherUser) {
      showToast("No se pudo identificar al usuario contactar", "error");
      return;
    }

    handleContact(
      otherUserId,
      appointment.propiedad_id || null,
      {
        id: otherUserId,
        nombre: otherUser.nombre,
        apellido_paterno: otherUser.apellido_paterno,
        foto: otherUser.foto,
      },
      true,
    );
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Citas"
        showBackButton
        onBack={() => router.push("/(tabs)")}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab("upcoming")}
            style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "upcoming" && styles.activeTabText,
              ]}
            >
              Próximas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("past")}
            style={[styles.tab, activeTab === "past" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "past" && styles.activeTabText,
              ]}
            >
              Historial
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de citas */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando citas...</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={COLORS.textDisabled}
            />
            <Text style={styles.emptyText}>
              No hay citas{" "}
              {activeTab === "upcoming" ? "próximas" : "en el historial"}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                onMarkComplete={handleMarkComplete}
                onMarkCancel={handleMarkCancel}
                onOpenRating={handleOpenRating}
                onContact={handleContactPress}
                activeTab={activeTab}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de calificación */}
      <RatingModal
        visible={showRateModal}
        onClose={() => {
          setShowRateModal(false);
          setRateApptId(null);
        }}
        onSubmit={handleSubmitRating}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",

    padding: 16,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundDark,
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderStyle: "dashed",
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  list: {
    gap: 16,
  },
});

export default Appointments;
