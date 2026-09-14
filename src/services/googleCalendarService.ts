import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { getSupabaseFunctionErrorDetail } from "../utils/supabaseFunctionError";
import {
  DEFAULT_APPOINTMENT_TIME_ZONE,
  getDeviceTimeZone,
} from "@/utils/timeZone";

const log = logger.scoped("googleCalendarService");

const CONNECTION_KEY_PREFIX = "ilyrox.googleCalendarConnection";
const DEFAULT_CALENDAR_ID = "primary";
const TOKEN_EXPIRY_GRACE_MS = 60 * 1000;
const db = supabase as any;

const isMissingGoogleMeetColumn = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  String((error as { message?: unknown }).message).includes("google_meet_url");

export interface GoogleCalendarConnection {
  accessToken: string;
  expiresAt: number;
  calendarId: string;
  serverSynced?: boolean;
}

export interface CalendarAppointmentInput {
  id: string;
  fecha: string;
  hora: string;
  tipo: string;
  descripcion?: string | null;
  propertyTitle?: string | null;
  location?: string | null;
  otherUserName?: string | null;
  otherUserEmail?: string | null;
  createMeet?: boolean;
  creatorTimeZone?: string | null;
}

export interface GoogleCalendarEventResult {
  id: string;
  status?: string;
  htmlLink?: string;
  hangoutLink?: string;
  attendees?: Array<{
    email?: string;
    responseStatus?: string;
  }>;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
  googleMeetUrl?: string | null;
}

export type CalendarSyncAction =
  | "create"
  | "update"
  | "delete"
  | "reconcile"
  | "accept";

const getConnectionKey = (userId: string) =>
  `${CONNECTION_KEY_PREFIX}.${userId}`;

const typeLabels: Record<string, string> = {
  visita: "Visita",
  llamada: "Llamada",
  videollamada: "Videollamada",
  reunion: "Reunión",
};

const padTime = (time: string) => {
  const [hours = "09", minutes = "00"] = time.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
};

const addOneHourLocal = (fecha: string, hora: string) => {
  const [year, month, day] = fecha.split("-").map(Number);
  const [hours, minutes, seconds] = padTime(hora).split(":").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  date.setUTCHours(date.getUTCHours() + 1);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}T${String(
    date.getUTCHours(),
  ).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(
    date.getUTCSeconds(),
  ).padStart(2, "0")}`;
};

const getMeetUrl = (event: GoogleCalendarEventResult) =>
  event.hangoutLink ??
  event.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint.entryPointType === "video",
  )?.uri ??
  null;

const withMeetUrl = (event: GoogleCalendarEventResult) => ({
  ...event,
  googleMeetUrl: getMeetUrl(event),
});

const buildEventBody = (appointment: CalendarAppointmentInput) => {
  const typeLabel = typeLabels[appointment.tipo] ?? appointment.tipo;
  const timeZone =
    appointment.creatorTimeZone ||
    getDeviceTimeZone() ||
    DEFAULT_APPOINTMENT_TIME_ZONE;
  const startDateTime = `${appointment.fecha}T${padTime(appointment.hora)}`;
  const endDateTime = addOneHourLocal(appointment.fecha, appointment.hora);
  const titleBase = appointment.propertyTitle || "Cita Ilyrox";
  const summary = `${typeLabel} - ${titleBase}`;
  const details = [
    "Cita creada desde Ilyrox.",
    appointment.otherUserName ? `Con: ${appointment.otherUserName}` : undefined,
    appointment.descripcion ? `Detalles: ${appointment.descripcion}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const body: Record<string, unknown> = {
    summary,
    location: appointment.location || undefined,
    description: details,
    start: {
      dateTime: startDateTime,
      timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone,
    },
    attendees: appointment.otherUserEmail
      ? [
          {
            email: appointment.otherUserEmail,
            displayName: appointment.otherUserName || undefined,
          },
        ]
      : undefined,
    reminders: {
      useDefault: true,
    },
    extendedProperties: {
      private: {
        ilyroxAppointmentId: appointment.id,
      },
    },
  };

  if (appointment.createMeet !== false) {
    body.conferenceData = {
      createRequest: {
        requestId: `ilyrox-${appointment.id}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  return body;
};

const calendarFetch = async <T>(
  accessToken: string,
  url: string,
  init: RequestInit,
): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Calendar error ${response.status}: ${text}`);
  }

  return response.json();
};

export const googleCalendarService = {
  async saveConnection(userId: string, connection: GoogleCalendarConnection) {
    await AsyncStorage.setItem(
      getConnectionKey(userId),
      JSON.stringify(connection),
    );
  },

  async getConnection(
    userId: string,
  ): Promise<GoogleCalendarConnection | null> {
    const raw = await AsyncStorage.getItem(getConnectionKey(userId));
    if (!raw) return null;

    try {
      return JSON.parse(raw) as GoogleCalendarConnection;
    } catch (error) {
      log.warn("Invalid stored Google Calendar connection", { userId, error });
      await AsyncStorage.removeItem(getConnectionKey(userId));
      return null;
    }
  },

  async getValidConnection(
    userId: string,
  ): Promise<GoogleCalendarConnection | null> {
    const connection = await googleCalendarService.getConnection(userId);
    if (!connection) return null;

    if (connection.expiresAt <= Date.now() + TOKEN_EXPIRY_GRACE_MS) {
      await googleCalendarService.clearConnection(userId);
      return null;
    }

    return connection;
  },

  async clearConnection(userId: string) {
    await AsyncStorage.removeItem(getConnectionKey(userId));
  },

  async createEvent(
    connection: GoogleCalendarConnection,
    appointment: CalendarAppointmentInput,
  ): Promise<GoogleCalendarEventResult> {
    const calendarId = encodeURIComponent(
      connection.calendarId || DEFAULT_CALENDAR_ID,
    );
    const event = await calendarFetch<GoogleCalendarEventResult>(
      connection.accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?sendUpdates=all&conferenceDataVersion=1`,
      {
        method: "POST",
        body: JSON.stringify(buildEventBody(appointment)),
      },
    );
    return withMeetUrl(event);
  },

  async updateEvent(
    connection: GoogleCalendarConnection,
    eventId: string,
    appointment: CalendarAppointmentInput,
  ): Promise<GoogleCalendarEventResult> {
    const calendarId = encodeURIComponent(
      connection.calendarId || DEFAULT_CALENDAR_ID,
    );
    const event = await calendarFetch<GoogleCalendarEventResult>(
      connection.accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        eventId,
      )}?sendUpdates=all&conferenceDataVersion=1`,
      {
        method: "PATCH",
        body: JSON.stringify(buildEventBody(appointment)),
      },
    );
    return withMeetUrl(event);
  },

  async getEvent(
    connection: GoogleCalendarConnection,
    eventId: string,
  ): Promise<GoogleCalendarEventResult> {
    const calendarId = encodeURIComponent(
      connection.calendarId || DEFAULT_CALENDAR_ID,
    );
    const event = await calendarFetch<GoogleCalendarEventResult>(
      connection.accessToken,
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        eventId,
      )}?conferenceDataVersion=1`,
      {
        method: "GET",
      },
    );
    return withMeetUrl(event);
  },

  async deleteEvent(connection: GoogleCalendarConnection, eventId: string) {
    const calendarId = encodeURIComponent(
      connection.calendarId || DEFAULT_CALENDAR_ID,
    );
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(
        eventId,
      )}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 410 && response.status !== 404) {
      const text = await response.text();
      throw new Error(`Google Calendar error ${response.status}: ${text}`);
    }
  },

  async attachEventToAppointment(
    appointmentId: string,
    eventId: string,
    googleMeetUrl?: string | null,
  ) {
    const update = {
      google_event_id: eventId,
      google_calendar_id: DEFAULT_CALENDAR_ID,
      google_meet_url: googleMeetUrl ?? null,
      google_last_synced_at: new Date().toISOString(),
      google_sync_origin: "ilyrox",
    };

    let { error } = await db
      .from("citas")
      .update(update)
      .eq("id", appointmentId);

    if (isMissingGoogleMeetColumn(error)) {
      const { google_meet_url: _ignored, ...withoutMeetUrl } = update;
      const retry = await db
        .from("citas")
        .update(withoutMeetUrl)
        .eq("id", appointmentId);
      error = retry.error;
    }

    if (error) {
      log.warn("Could not persist Google Calendar event id", {
        appointmentId,
        error,
      });
      throw error;
    }
  },

  async clearEventFromAppointment(appointmentId: string) {
    const update = {
      google_event_id: null,
      google_calendar_id: null,
      google_meet_url: null,
      google_last_synced_at: new Date().toISOString(),
      google_sync_origin: "ilyrox",
    };

    let { error } = await db
      .from("citas")
      .update(update)
      .eq("id", appointmentId);

    if (isMissingGoogleMeetColumn(error)) {
      const { google_meet_url: _ignored, ...withoutMeetUrl } = update;
      const retry = await db
        .from("citas")
        .update(withoutMeetUrl)
        .eq("id", appointmentId);
      error = retry.error;
    }

    if (error) {
      log.warn("Could not clear Google Calendar event id", {
        appointmentId,
        error,
      });
    }
  },

  async syncAppointmentOnServer(
    action: CalendarSyncAction,
    appointmentId: string,
  ) {
    const { data, error } = await supabase.functions.invoke(
      "google-calendar-appointment-sync",
      {
        body: {
          action,
          appointmentId,
        },
      },
    );

    if (error) {
      const detail = await getSupabaseFunctionErrorDetail(error);
      log.warn("Appointment sync function failed", detail);
      throw new Error(JSON.stringify(detail));
    }

    return data as {
      ok?: boolean;
      skipped?: string;
      changed?: boolean;
      status?: string;
      eventId?: string;
      meetUrl?: string | null;
    };
  },
};