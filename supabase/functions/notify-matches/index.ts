import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Secretos: supabase secrets set ONESIGNAL_APP_ID=... ONESIGNAL_REST_API_KEY=...
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Match = {
  usuario_id: string;
  tipo_match: "coincidencia" | "similar";
  busqueda_id: string;
  busqueda: {
    lead_id: string;
    lead: { nombre: string } | null;
  } | null;
  propiedad: {
    tipo: string;
    ciudad: string;
    habitaciones: number | null;
  } | null;
  operacion: {
    precio: number;
    moneda: string;
    tipo_operacion: string;
  } | null;
};

type UserGroup = {
  coincidencias: Match[];
  similares: Match[];
  // Primer lead encontrado para el título (pueden ser varios leads por usuario)
  leadNombre: string;
  leadId: string;
  busquedaId: string;
  ciudad: string;
  tipo: string;
  propiedadId: string;
};

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function buildNotificationCopy(group: UserGroup, propiedadId: string): {
  heading: string;
  content: string;
} {
  const lead = group.leadNombre || "tu cliente";
  const ciudad = capitalize(group.ciudad || "la zona");
  const tipo = capitalize(group.tipo || "Propiedad");
  const nExactas = group.coincidencias.length;
  const nSimilares = group.similares.length;

  if (nExactas > 0 && nSimilares > 0) {
    return {
      heading: `¡Nuevos matches para ${lead}!`,
      content: `${nExactas} exacta${nExactas > 1 ? "s" : ""} y ${nSimilares} similar${nSimilares > 1 ? "es" : ""}. ¡A revisar antes que otro agente!`,
    };
  }

  if (nExactas > 1) {
    return {
      heading: `${nExactas} propiedades para ${lead}`,
      content: `Nuevas coincidencias exactas en ${ciudad}. ¡Contáctalo hoy y cierra!`,
    };
  }

  if (nExactas === 1) {
    return {
      heading: `¡Propiedad exacta para ${lead}!`,
      content: `${tipo} en ${ciudad} que cumple todos sus filtros. Contáctalo hoy y cierra.`,
    };
  }

  if (nSimilares > 1) {
    return {
      heading: `${nSimilares} opciones similares para ${lead}`,
      content: `Propiedades cerca de lo que busca en ${ciudad}. Revísalas y filtra.`,
    };
  }

  return {
    heading: `Opción cercana para ${lead}`,
    content: `${tipo} en ${ciudad}, precio similar. Puede ser la indicada.`,
  };
}

async function sendPushNotification(
  userId: string,
  heading: string,
  content: string,
  data: Record<string, string>,
): Promise<void> {
  const body = {
    app_id: ONESIGNAL_APP_ID,
    include_external_user_ids: [userId],
    headings: { es: heading, en: heading },
    contents: { es: content, en: content },
    data,
  };

  await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

serve(async (req) => {
  try {
    const { propiedad_id } = await req.json();
    if (!propiedad_id) {
      return new Response(JSON.stringify({ error: "propiedad_id requerido" }), { status: 400 });
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Consultar matches pendientes y aún no notificados para esta propiedad.
    // No filtramos por created_at (la ventana de 60 s era frágil y fallaba
    // cuando el match ya existía por un ON CONFLICT sin actualizar created_at).
    // Usamos notificado_en IS NULL para ser idempotente: si procesar-matches
    // ya notificó, esta función no envía duplicados.
    const { data: matches, error } = await db
      .from("matches")
      .select(`
        id,
        usuario_id,
        tipo_match,
        busqueda_id,
        busqueda:busquedas_guardadas(
          lead_id,
          lead:leads(nombre)
        ),
        propiedad:propiedades(tipo, ciudad, habitaciones)
      `)
      .eq("propiedad_id", propiedad_id)
      .eq("estado", "pendiente")
      .is("notificado_en", null);

    if (error) throw error;
    if (!matches?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no_pending_matches" }), { status: 200 });
    }

    // Marcar como notificado ANTES de enviar para evitar race condition si
    // procesar-matches también está corriendo simultáneamente.
    const matchIds = (matches as any[]).map((m) => m.id);
    await db
      .from("matches")
      .update({ notificado_en: new Date().toISOString() })
      .in("id", matchIds);

    // Agrupar por usuario_id + lead_id para enviar un push personalizado por lead
    const groups = new Map<string, UserGroup>();

    for (const match of matches as Match[]) {
      const leadId = match.busqueda?.lead_id ?? "unknown";
      const key = `${match.usuario_id}::${leadId}`;

      if (!groups.has(key)) {
        groups.set(key, {
          coincidencias: [],
          similares: [],
          leadNombre: match.busqueda?.lead?.nombre ?? "",
          leadId,
          busquedaId: match.busqueda_id,
          ciudad: match.propiedad?.ciudad ?? "",
          tipo: match.propiedad?.tipo ?? "",
          propiedadId: propiedad_id,
        });
      }

      const group = groups.get(key)!;
      if (match.tipo_match === "coincidencia") {
        group.coincidencias.push(match);
      } else {
        group.similares.push(match);
      }
    }

    // Enviar un push personalizado por cada (usuario, lead)
    const sendPromises: Promise<void>[] = [];

    for (const [key, group] of groups.entries()) {
      const userId = key.split("::")[0];
      const { heading, content } = buildNotificationCopy(group, propiedad_id);

      sendPromises.push(
        sendPushNotification(userId, heading, content, {
          type: "new_match",
          propiedad_id,
          lead_id: group.leadId,
          busqueda_id: group.busquedaId,
        }),
      );
    }

    await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({ sent: groups.size }),
      { status: 200 },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
