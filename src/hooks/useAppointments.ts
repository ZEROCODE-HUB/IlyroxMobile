import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useModal } from "../context/ModalContext";
import { useChatInitiator } from "../hooks/messaging/useChatInitiator";
import useAppointment from "../hooks/useAppointment";
import { router } from "expo-router";
import {
    AppointmentItem,
    AppointmentStatus,
    FeatureRatings,
    RatingTarget,
} from "../components/Appointments/appointmentTypes";
import { profileService } from "../services/profileService";
import { formatPhoneNumber } from "../components/Profile/profileFormatters";
import { googleCalendarService } from "@/services/googleCalendarService";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { logger } from "@/utils/logger";
import {
    formatAppointmentDateTimeForTimeZone,
    getAppointmentViewerTimeZone,
} from "@/utils/timeZone";

const log = logger.scoped("useAppointments");

export const useAppointments = () => {
    const { profile } = useAuth();
    const { showToast } = useToast();
    const { showModal } = useModal();
    const { handleContact } = useChatInitiator();
    const { ensureConnection } = useGoogleCalendar(profile?.id);
    const { handleCancelAppointment } = useAppointment(profile?.id);

    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
    const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRateModal, setShowRateModal] = useState(false);
    const [rateApptId, setRateApptId] = useState<string | null>(null);
    const [editingAppointment, setEditingAppointment] =
        useState<AppointmentItem | null>(null);

    useEffect(() => {
        if (profile?.id) {
            loadAppointments();
        }
    }, [profile?.id, activeTab]);

    const buildCalendarPayload = (appointment: AppointmentItem) => ({
        id: appointment.id,
        fecha: appointment.fecha,
        hora: appointment.hora,
        tipo: appointment.tipo,
        descripcion: appointment.descripcion,
        propertyTitle: appointment.propertyTitle,
        location: appointment.location,
        otherUserName: appointment.user.name,
        otherUserEmail: appointment.user.email,
        creatorTimeZone: appointment.creator_timezone,
    });

    const wasAcceptedInGoogle = (
        appointment: AppointmentItem,
        attendees?: Array<{ email?: string; responseStatus?: string }>,
    ) => {
        const expectedEmail = appointment.user.email?.toLowerCase();
        return (attendees ?? []).some((attendee) => {
            if (attendee.responseStatus !== "accepted") return false;
            if (!expectedEmail) return true;
            return attendee.email?.toLowerCase() === expectedEmail;
        });
    };

    const reconcilePendingGoogleResponses = async (
        items: AppointmentItem[],
    ) => {
        if (!profile?.id || activeTab !== "upcoming") return;

        const pendingWithGoogleEvent = items.filter(
            (appointment) =>
                appointment.estado === "pendiente" &&
                !!appointment.google_event_id,
        );

        if (pendingWithGoogleEvent.length === 0) return;

        let changed = false;

        for (const appointment of pendingWithGoogleEvent) {
            try {
                const result = await googleCalendarService.syncAppointmentOnServer(
                    "reconcile",
                    appointment.id,
                );
                if (result?.changed) {
                    changed = true;
                }
            } catch (error) {
                log.warn("Server Google Calendar reconcile failed", {
                    appointmentId: appointment.id,
                    error,
                });
            }
        }

        if (changed) {
            await loadAppointments();
            return;
        }

        const connection = await googleCalendarService.getValidConnection(
            profile.id,
        );
        if (!connection) return;

        for (const appointment of pendingWithGoogleEvent) {
            try {
                const googleEvent = await googleCalendarService.getEvent(
                    connection,
                    appointment.google_event_id!,
                );

                if (googleEvent.status === "cancelled") {
                    const { error } = await supabase
                        .from("citas")
                        .update({
                            estado: "cancelada",
                            google_event_id: null,
                            google_calendar_id: null,
                            google_meet_url: null,
                            google_sync_origin: "google",
                            google_last_synced_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", appointment.id);

                    if (error) throw error;
                    changed = true;
                    continue;
                }

                if (!wasAcceptedInGoogle(appointment, googleEvent.attendees)) {
                    continue;
                }

                let meetUrl = appointment.google_meet_url ?? googleEvent.googleMeetUrl;
                if (appointment.created_by === profile.id) {
                    const eventWithMeet = await googleCalendarService.updateEvent(
                        connection,
                        appointment.google_event_id!,
                        {
                            ...buildCalendarPayload(appointment),
                            createMeet: true,
                        },
                    );
                    meetUrl = eventWithMeet.googleMeetUrl;
                }

                const { error } = await supabase
                    .from("citas")
                    .update({
                        estado: "confirmada",
                        google_event_id: googleEvent.id,
                        google_calendar_id: "primary",
                        google_meet_url: meetUrl ?? null,
                        google_sync_origin: "google-local-reconcile",
                        google_last_synced_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", appointment.id);

                if (error) throw error;
                await syncConfirmedAppointment({
                    ...appointment,
                    estado: "confirmada",
                    google_meet_url: meetUrl ?? null,
                });
                changed = true;
            } catch (error) {
                log.warn("Could not reconcile Google Calendar response", {
                    appointmentId: appointment.id,
                    error,
                });
            }
        }

        if (changed) {
            await loadAppointments();
        }
    };

    const loadAppointments = async () => {
        if (!profile?.id) return;

        try {
            setLoading(true);

            let query = supabase
                .from("citas")
                .select(
                    `
          *,
          agente:perfiles!agente_id(id, nombre, apellido_paterno, foto, rol, prefijo_celular, celular, email),
          cliente:perfiles!cliente_id(id, nombre, apellido_paterno, foto, rol, prefijo_celular, celular, email),
          propiedad:propiedades(id, tipo, subtipo, ciudad, fotos),
          resenas:resenas(id, revisor_id, calificacion_general)
        `,
                )
                .or(`agente_id.eq.${profile.id},cliente_id.eq.${profile.id}`)
                .is("deleted_at", null);

            if (activeTab === "upcoming") {
                query = query
                    .in("estado", ["pendiente", "confirmada"])
                    .gte("fecha", new Date().toISOString().split("T")[0]);
            } else {
                query = query.or(
                    `estado.eq.cancelada,fecha.lt.${new Date().toISOString().split("T")[0]
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
                    const viewerTimeZone = getAppointmentViewerTimeZone(
                        cita.creator_timezone,
                        cita.created_by === profile.id,
                    );

                    const sanitizedFecha = (cita.fecha && String(cita.fecha).trim()) ? String(cita.fecha) : null;
                    const sanitizedHora = (cita.hora && String(cita.hora).trim()) ? String(cita.hora) : null;

                    const { dateLabel, timeLabel } =
                        (sanitizedFecha && sanitizedHora)
                            ? formatAppointmentDateTimeForTimeZone(
                                  sanitizedFecha,
                                  sanitizedHora,
                                  cita.creator_timezone,
                                  viewerTimeZone,
                              )
                            : { dateLabel: "Fecha pendiente", timeLabel: "--:--" };

                    return {
                        ...cita,
                        user: {
                            id: otherUser.id,
                            name: `${otherUser.nombre || ""} ${otherUser.apellido_paterno || ""
                                }`.trim(),
                            avatar: otherUser.foto,
                            role: isAgente ? "Cliente" : "Agente",
                            email: otherUser.email,
                        },
                        propertyId: cita.propiedad_id,
                        propertyTitle: cita.propiedad
                            ? `${cita.propiedad.tipo} en ${cita.propiedad.ciudad}`
                            : undefined,
                        propertyImage: cita.propiedad?.fotos?.[0],
                        location: cita.propiedad?.ciudad || "No especificado",
                        date: dateLabel,
                        time: timeLabel,
                        status: cita.estado as AppointmentStatus,
                        hasUserRated,
                        rating: userReview?.calificacion_general,
                    };
                },
            );

            setAppointments(transformedData);
            reconcilePendingGoogleResponses(transformedData);
        } catch (error: any) {
            log.error("Error loading appointments:", error);
            showToast(error.message || "Error al cargar las citas", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel(`appointments-list-${profile.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "citas",
                    filter: `agente_id=eq.${profile.id}`,
                },
                () => {
                    loadAppointments();
                },
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "citas",
                    filter: `cliente_id=eq.${profile.id}`,
                },
                () => {
                    loadAppointments();
                },
            )
            .subscribe((status) => {
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    log.warn("Realtime de lista de citas no disponible", status);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, activeTab]);

    const handleMarkCancel = (id: string) => {
        const appointment = appointments.find((a) => a.id === id);
        const isRejecting =
            appointment?.estado === "pendiente" &&
            !!profile?.id &&
            appointment.created_by !== profile.id;

        showModal({
            title: isRejecting ? "Rechazar Cita" : "Cancelar Cita",
            message: isRejecting
                ? "¿Estás seguro de que deseas rechazar esta cita? Se cancelará también para quien la creó."
                : "¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.",
            confirmText: isRejecting ? "Sí, rechazar" : "Sí, cancelar",
            cancelText: "Volver",
            confirmVariant: "danger",
            onCancel: () => {},
            onConfirm: async () => {
                const appointmentToCancel = appointments.find((a) => a.id === id);
                const previousState = appointmentToCancel
                    ? { estado: appointmentToCancel.estado, status: appointmentToCancel.status }
                    : null;

                setAppointments((current) =>
                    current.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  estado: "cancelada",
                                  status: "cancelada" as AppointmentStatus,
                              }
                            : item,
                    ),
                );

                const success = await handleCancelAppointment(
                    id,
                    appointment?.google_event_id,
                    appointment?.created_by || appointment?.agente_id,
                );

                if (success) {
                    showToast(
                        isRejecting
                            ? "Cita rechazada correctamente"
                            : "Cita cancelada correctamente",
                        "success",
                    );
                } else {
                    if (previousState) {
                        setAppointments((current) =>
                            current.map((item) =>
                                item.id === id
                                    ? { ...item, estado: previousState.estado, status: previousState.status }
                                    : item,
                            ),
                        );
                    }
                    showToast("No se pudo cancelar la cita", "error");
                }
            },
        });
    };

    const syncConfirmedAppointment = async (appointment: AppointmentItem) => {
        if (!profile?.id) return false;

        try {
            const result = await googleCalendarService.syncAppointmentOnServer(
                appointment.google_event_id ? "update" : "create",
                appointment.id,
            );

            if (result?.ok) return true;
        } catch (serverError) {
            log.warn("Server Google Calendar sync failed", serverError);
        }

        if (profile.id !== appointment.created_by) {
            showToast(
                "Cita aceptada. Quien envió la invitación debe tener Google Calendar conectado para crear el evento con Meet",
                "info",
            );
            return false;
        }

        const connection = await ensureConnection();
        if (!connection?.serverSynced) {
            showToast(
                "Conecta Google Calendar nuevamente para activar la sincronización con Supabase",
                "info",
            );
            return false;
        }

        const payload = {
            ...buildCalendarPayload(appointment),
            createMeet: true,
        };
        const event = appointment.google_event_id
            ? await googleCalendarService.updateEvent(
                connection,
                appointment.google_event_id,
                payload,
            )
            : await googleCalendarService.createEvent(connection, payload);

        await googleCalendarService.attachEventToAppointment(
            appointment.id,
            event.id,
            event.googleMeetUrl,
        );

        return true;
    };

    const handleAcceptAppointment = async (id: string) => {
        const appointment = appointments.find((a) => a.id === id);
        if (!appointment || !profile?.id) return;

        if (appointment.created_by === profile.id) {
            showToast("Debe aceptar la cita la persona invitada", "info");
            return;
        }

        try {
            const result = await googleCalendarService.syncAppointmentOnServer(
                "accept",
                id,
            );

            if (!result?.ok) {
                throw new Error(result?.skipped || "No se pudo aceptar la cita");
            }

            setAppointments((current) =>
                current.map((item) =>
                    item.id === id
                        ? {
                            ...item,
                            estado: "confirmada",
                            status: "confirmada" as AppointmentStatus,
                            google_meet_url: result.meetUrl ?? item.google_meet_url,
                            google_event_id: result.eventId ?? item.google_event_id,
                        }
                        : item,
                ),
            );

            await loadAppointments();
            showToast(
                result.meetUrl
                    ? "Cita aceptada y creada en Google Calendar con Meet"
                    : "Cita aceptada correctamente",
                "success",
            );
        } catch (error: any) {
            log.warn("Error accepting appointment:", error);
            showToast(error.message || "No se pudo aceptar la cita", "error");
        }
    };

    const handleSyncCalendar = async (id: string) => {
        const appointment = appointments.find((a) => a.id === id);
        if (!appointment || !profile?.id) return;

        try {
            if (appointment.estado !== "confirmada") {
                showToast(
                    "La cita se sincroniza cuando la persona invitada la acepta",
                    "info",
                );
                return;
            }

            const synced = await syncConfirmedAppointment(appointment);
            await loadAppointments();
            if (synced) {
                showToast("Cita sincronizada con Google Calendar", "success");
            }
        } catch (error: any) {
            log.warn("Error syncing Google Calendar:", error);
            showToast(
                error.message || "No se pudo sincronizar Google Calendar",
                "error",
            );
        }
    };

    const handleOpenRating = (id: string) => {
        setRateApptId(id);
        setShowRateModal(true);
    };

    const handleEditAppointment = (id: string) => {
        if (!profile?.id) return;

        const appointment = appointments.find((appt) => appt.id === id);
        if (!appointment) return;

        if (appointment.created_by !== profile.id) {
            showToast("Solo quien creó la cita puede editarla", "info");
            return;
        }

        setEditingAppointment(appointment);
    };

    const closeEditModal = () => {
        setEditingAppointment(null);
    };

    const handleAppointmentUpdated = async () => {
        await loadAppointments();
    };

    const handleSubmitRating = async (
        featureRatings: FeatureRatings,
        comentario: string,
        recomienda: boolean | null,
    ) => {
        if (!rateApptId || !profile?.id) return;

        try {
            const appointment = appointments.find((a) => a.id === rateApptId);
            if (!appointment) return;

            const profesionalId =
                appointment.agente_id === profile.id
                    ? appointment.cliente_id
                    : appointment.agente_id;

            // La calificación general la calcula el sistema (trigger en BD:
            // promedio simple de las 4 categorías).
            const { error: reviewError } = await supabase.from("resenas").insert({
                revisor_id: profile.id,
                profesional_id: profesionalId,
                cita_id: rateApptId,
                profesionalismo: featureRatings.profesionalismo,
                etica_valores: featureRatings.etica_valores,
                pago_comisiones: featureRatings.pago_comisiones,
                comunicacion_servicio: featureRatings.comunicacion_servicio,
                comentario: comentario.trim() || null,
                tipo_resena: "detallada",
                visible: true,
            });

            if (reviewError) throw reviewError;

            // La recomendación (¿Trabajarías nuevamente?) usa el mismo mecanismo
            // que el botón del perfil: tabla recomendaciones_usuarios.
            if (recomienda !== null && profesionalId) {
                try {
                    const current = await profileService.getUserRecommendation(
                        profile.id,
                        profesionalId,
                    );
                    // Fijar el valor (no alternar): solo insertar/actualizar si cambió.
                    if (current !== recomienda) {
                        await profileService.toggleRecommendation(
                            profile.id,
                            profesionalId,
                            current,
                            recomienda,
                        );
                    }
                } catch (recError) {
                    log.error("Error guardando recomendación:", recError);
                }
            }

            showToast("Calificación enviada exitosamente", "success");
            setShowRateModal(false);
            setRateApptId(null);

            loadAppointments();
        } catch (error: any) {
            log.error("Error submitting rating:", error);
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
        router.push(`/(stack)/property/${id}`);
    };

    const handleUserPress = (id: string) => {
        router.push(`/(stack)/user/${id}`);
    };

    const closeRatingModal = () => {
        setShowRateModal(false);
        setRateApptId(null);
    };

    // Datos del asesor a calificar (contraparte de la cita) para la tarjeta del modal.
    const rateTarget: RatingTarget | null = (() => {
        if (!rateApptId || !profile?.id) return null;
        const appt = appointments.find((a) => a.id === rateApptId);
        if (!appt) return null;
        const isAgente = appt.agente_id === profile.id;
        const other = isAgente ? appt.cliente : appt.agente;
        const otherId = isAgente ? appt.cliente_id : appt.agente_id;
        if (!other || !otherId) return null;
        const phone = formatPhoneNumber(
            other.prefijo_celular ?? null,
            other.celular ?? null,
        );
        return {
            id: otherId,
            name:
                `${other.nombre || ""} ${other.apellido_paterno || ""}`.trim() ||
                "Asesor",
            avatar: other.foto ?? null,
            phone: phone === "No especificado" ? null : phone,
            location:
                appt.location && appt.location !== "No especificado"
                    ? appt.location
                    : null,
        };
    })();

    return {
        activeTab,
        setActiveTab,
        appointments,
        loading,
        showRateModal,
        editingAppointment,
        rateTarget,
        handleMarkCancel,
        handleAcceptAppointment,
        handleOpenRating,
        handleEditAppointment,
        handleSyncCalendar,
        handleSubmitRating,
        handleAppointmentUpdated,
        handleContactPress,
        handlePropertyPress,
        handleUserPress,
        closeRatingModal,
        closeEditModal,
    };
};