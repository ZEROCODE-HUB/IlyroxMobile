import { supabase } from "../lib/supabase";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/context/ToastContext";
import { googleCalendarService } from "@/services/googleCalendarService";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { logger } from "@/utils/logger";

const log = logger.scoped("useAppointment");

const isMissingGoogleMeetColumn = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  String((error as { message?: unknown }).message).includes("google_meet_url");

const useAppointment = (userId?: string | null) => {
  const { showModal } = useModal();
  const { showToast } = useToast();
  const { ensureConnection } = useGoogleCalendar(userId);

  const handleCancelAppointment = async (
    id: string,
    googleEventId?: string | null,
    googleOwnerId?: string | null,
  ): Promise<boolean> => {
    try {
      try {
        const result = await googleCalendarService.syncAppointmentOnServer(
          "delete",
          id,
        );
        if (!result?.ok) {
          throw new Error(result?.skipped || "server_calendar_delete_skipped");
        }
      } catch (serverError) {
        log.warn("Server Google Calendar delete failed", serverError);
        if (googleEventId) {
          if (googleOwnerId && userId !== googleOwnerId) {
            showToast(
              "Cita cancelada en Ilyrox. El asesor debe reconectar Google Calendar para cancelar el evento externo.",
              "info",
            );
          } else {
            const connection = await ensureConnection();
            if (connection) {
              await googleCalendarService.deleteEvent(connection, googleEventId);
              await googleCalendarService.clearEventFromAppointment(id);
            } else {
              showToast(
                "Cita cancelada en Ilyrox. El asesor debe reconectar Google Calendar para cancelar el evento externo.",
                "info",
              );
            }
          }
        } else {
          showToast(
            "Cita cancelada en Ilyrox. No había evento de Google Calendar ligado para borrar.",
            "info",
          );
        }
      }

      const update = {
        estado: "cancelada",
        google_event_id: null,
        google_calendar_id: null,
        google_meet_url: null,
        google_sync_origin: "ilyrox",
        google_last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let { error } = await supabase
        .from("citas")
        .update(update)
        .eq("id", id);

      if (isMissingGoogleMeetColumn(error)) {
        const { google_meet_url: _ignored, ...withoutMeetUrl } = update;
        const retry = await supabase
          .from("citas")
          .update(withoutMeetUrl)
          .eq("id", id);
        error = retry.error;
      }

      if (error) throw error;

      showModal({
        title: "Éxito",
        message: "Cita ha sido cancelada exitosamente",
        confirmText: "OK",
      });
      return true;
    } catch (error) {
      log.error("Error canceling appointment:", error);
      showModal({
        title: "Error",
        message: "No se pudo cancelar la cita",
        confirmText: "OK",
      });
      return false;
    }
  };

  return {
    handleCancelAppointment,
  };
};

export default useAppointment;