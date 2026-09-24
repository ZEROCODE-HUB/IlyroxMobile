import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { getDeviceTimeZone } from "@/utils/timeZone";

const log = logger.scoped("appointmentService");

export type AppointmentType = "visita" | "llamada" | "videollamada" | string;
export type AppointmentStatus =
  | "pendiente"
  | "confirmada"
  | "cancelada"
  | "completada";

export interface CreateAppointmentInput {
  propertyId: string;
  agenteId: string;
  clienteId: string;
  createdBy: string;
  fecha: string;
  hora: string;
  tipo: AppointmentType;
  descripcion?: string | null;
  creatorTimeZone?: string | null;
}

export interface UpdateAppointmentInput {
  fecha: string;
  hora: string;
  tipo: AppointmentType;
  descripcion?: string | null;
}

export interface PropertyCalendarInfo {
  titulo: string;
  location: string;
}

export interface UserBasicInfo {
  nombre: string;
  apellido_paterno: string;
  email?: string | null;
}

export const appointmentService = {
  async getUserRole(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", userId)
      .single();

    if (error) {
      log.warn("getUserRole failed", { userId, error });
      return null;
    }
    return data?.rol ?? null;
  },

  async resolveRoles(currentUserId: string, otherUserId: string) {
    const [currentRole, otherRole] = await Promise.all([
      appointmentService.getUserRole(currentUserId),
      appointmentService.getUserRole(otherUserId),
    ]);

    if (currentRole === "agente") {
      return { agenteId: currentUserId, clienteId: otherUserId };
    }
    if (otherRole === "agente") {
      return { agenteId: otherUserId, clienteId: currentUserId };
    }
    return { agenteId: currentUserId, clienteId: otherUserId };
  },

  async checkAvailability(
    agenteId: string,
    fecha: string,
    hora: string,
  ): Promise<{ available: boolean; conflictingAppointment?: { id: string; hora: string; tipo: string } }> {
    const { data, error } = await supabase
      .from("citas")
      .select("id, hora, tipo")
      .eq("agente_id", agenteId)
      .eq("fecha", fecha)
      .eq("hora", hora)
      .in("estado", ["pendiente", "confirmada"])
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      log.warn("checkAvailability failed", { agenteId, fecha, hora, error });
      return { available: true };
    }

    return {
      available: !data,
      conflictingAppointment: data ?? undefined,
    };
  },

  async createAppointment(input: CreateAppointmentInput) {
    const availability = await appointmentService.checkAvailability(
      input.agenteId,
      input.fecha,
      input.hora,
    );

    if (!availability.available && availability.conflictingAppointment) {
      const tipoReadable = availability.conflictingAppointment.tipo || "cita";
      throw new Error(
        `Ya tienes una ${tipoReadable} programada a las ${availability.conflictingAppointment.hora.slice(0, 5)} para esta fecha.`,
      );
    }

    const payload = {
      propiedad_id: input.propertyId,
      agente_id: input.agenteId,
      cliente_id: input.clienteId,
      created_by: input.createdBy,
      fecha: input.fecha,
      hora: input.hora,
      tipo: input.tipo,
      descripcion: input.descripcion ?? null,
      estado: "pendiente" as AppointmentStatus,
      creator_timezone: input.creatorTimeZone ?? getDeviceTimeZone(),
    };

    const create = (insertPayload: Record<string, unknown>) =>
      supabase
        .from("citas")
        .insert(insertPayload)
        .select()
        .single();

    let { data, error } = await create(payload);

    if (
      error &&
      typeof error.message === "string" &&
      error.message.includes("creator_timezone")
    ) {
      const { creator_timezone: _ignored, ...withoutTimeZone } = payload;
      ({ data, error } = await create(withoutTimeZone));
    }

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "Ya tienes una cita a esta hora para esta fecha. Por favor elige otro horario.",
        );
      }
      log.error("createAppointment failed", error);
      throw error;
    }
    return data;
  },

  async updateAppointment(appointmentId: string, input: UpdateAppointmentInput) {
    const { data, error } = await supabase
      .from("citas")
      .update({
        fecha: input.fecha,
        hora: input.hora,
        tipo: input.tipo,
        descripcion: input.descripcion ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) {
      log.error("updateAppointment failed", error);
      throw error;
    }
    return data;
  },

  async getPropertyCalendarInfo(
    propertyId: string,
  ): Promise<PropertyCalendarInfo | null> {
    if (!propertyId) return null;

    const { data, error } = await supabase
      .from("propiedades")
      .select("tipo, subtipo, calle, numero_exterior, ciudad, codigo_postal")
      .eq("id", propertyId)
      .single();

    if (error || !data) {
      log.warn("getPropertyCalendarInfo failed", { propertyId, error });
      return null;
    }

    const parts = [data.calle, data.numero_exterior, data.ciudad, data.codigo_postal]
      .filter(Boolean)
      .join(", ");

    return {
      titulo:
        [data.tipo, data.subtipo, data.ciudad].filter(Boolean).join(" en ") ||
        "Propiedad",
      location: parts,
    };
  },

  async getUserBasicInfo(userId: string): Promise<UserBasicInfo | null> {
    const { data, error } = await supabase
      .from("perfiles")
      .select("nombre, apellido_paterno, email")
      .eq("id", userId)
      .single();

    if (error || !data) {
      log.warn("getUserBasicInfo failed", { userId, error });
      return null;
    }
    return {
      nombre: data.nombre ?? "",
      apellido_paterno: data.apellido_paterno ?? "",
      email: data.email ?? null,
    };
  },
};