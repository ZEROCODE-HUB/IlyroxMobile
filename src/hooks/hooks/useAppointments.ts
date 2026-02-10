import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useChatInitiator } from "../hooks/messaging/useChatInitiator";
import useAppointment from "../hooks/useAppointment";
import { router } from "expo-router";
import {
    AppointmentItem,
    AppointmentStatus,
    FeatureRatings,
} from "../../components/Appointments/appointmentTypes";

export const useAppointments = () => {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const { handleContact } = useChatInitiator();
    const { handleCancelAppointment } = useAppointment();

    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
    const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRateModal, setShowRateModal] = useState(false);
    const [rateApptId, setRateApptId] = useState<string | null>(null);

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

            if (activeTab === "upcoming") {
                query = query
                    .eq("estado", "pendiente")
                    .gte("fecha", new Date().toISOString().split("T")[0]);
            } else {
                query = query.or(
                    `estado.in.(completada,cancelada),fecha.lt.${new Date().toISOString().split("T")[0]
                    }`,
                );
            }

            query = query.order("fecha", { ascending: activeTab === "upcoming" });
            query = query.order("hora", { ascending: activeTab === "upcoming" });

            const { data, error } = await query;

            if (error) throw error;

            const transformedData: AppointmentItem[] = (data || []).map(
                (cita: any) => {
                    const isAgente = cita.agente_id === profile.id;
                    const otherUser = isAgente ? cita.cliente : cita.agente;

                    const userReview = (cita.resenas || []).find(
                        (resena: any) => resena.revisor_id === profile.id,
                    );

                    const hasUserRated = !!userReview;

                    return {
                        ...cita,
                        user: {
                            id: otherUser.id,
                            name: `${otherUser.nombre || ""} ${otherUser.apellido_paterno || ""
                                }`.trim(),
                            avatar: otherUser.foto,
                            role: isAgente ? "Cliente" : "Agente",
                        },
                        propertyId: cita.propiedad_id,
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
        date.setDate(date.getDate() + 1);
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
        handleOpenRating(id);
    };

    const handleMarkCancel = (id: string) => {
        Alert.alert("Cancelar Cita", "¿Estás seguro de cancelar esta cita?", [
            {
                text: "Volver",
                style: "cancel",
            },
            {
                text: "Cancelar Cita",
                style: "destructive",
                onPress: async () => {
                    const success = await handleCancelAppointment(id);
                    if (success) {
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

            const profesionalId =
                appointment.agente_id === profile.id
                    ? appointment.cliente_id
                    : appointment.agente_id;

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

            loadAppointments();
        } catch (error: any) {
            console.error("Error submitting rating:", error);
            showToast(error.message || "Error al enviar la calificación", "error");
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

    const handlePropertyPress = (id: string) => {
        router.push(`/property/${id}`);
    };

    const handleUserPress = (id: string) => {
        router.push(`/user/${id}`);
    };

    const closeRatingModal = () => {
        setShowRateModal(false);
        setRateApptId(null);
    };

    return {
        activeTab,
        setActiveTab,
        appointments,
        loading,
        showRateModal,
        handleMarkComplete,
        handleMarkCancel,
        handleOpenRating,
        handleSubmitRating,
        handleContactPress,
        handlePropertyPress,
        handleUserPress,
        closeRatingModal,
    };
};
