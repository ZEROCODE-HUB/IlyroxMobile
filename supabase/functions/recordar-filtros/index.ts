import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Busqueda = {
  id: string;
  usuario_id: string;
  precio_min: number | null;
  precio_max: number | null;
  habitaciones: number | null;
  municipio: string | null;
  colonia: string | null;
  subtipo: string[] | null;
  lead: { nombre: string } | null;
};

type Reminder = {
  criterio: "precio" | "habitaciones" | "zona" | "subtipo";
  heading: string;
  content: string;
};

function detectMissingCriteria(busqueda: Busqueda): Reminder | null {
  const lead = busqueda.lead?.nombre || "tu cliente";

  // Prioridad: precio > habitaciones > zona > subtipo
  if (!busqueda.precio_min && !busqueda.precio_max) {
    return {
      criterio: "precio",
      heading: `Afina el presupuesto de ${lead}`,
      content: `Los agentes con rango definido cierran 3x más rápido. Añade mín/máx ahora.`,
    };
  }

  if (!busqueda.habitaciones) {
    return {
      criterio: "habitaciones",
      heading: `¿Cuántas recámaras necesita ${lead}?`,
      content: `Sin este filtro recibes todo. Especifícalo y ahorra tiempo en cada revisión.`,
    };
  }

  if (!busqueda.municipio && !busqueda.colonia) {
    return {
      criterio: "zona",
      heading: `La zona importa para ${lead}`,
      content: `Acotar la colonia o municipio reduce ruido y acelera tu cierre.`,
    };
  }

  if (!busqueda.subtipo || busqueda.subtipo.length === 0) {
    return {
      criterio: "subtipo",
      heading: `¿Casa, depto o local para ${lead}?`,
      content: `El subtipo filtra el 60% del ruido. Añádelo y encuentra lo correcto más rápido.`,
    };
  }

  return null;
}

async function sendPush(
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
    const body = await req.json().catch(() => ({}));
    const { usuario_id } = body as { usuario_id?: string };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from("busquedas_guardadas")
      .select(`
        id,
        usuario_id,
        precio_min,
        precio_max,
        habitaciones,
        municipio,
        colonia,
        subtipo,
        lead:leads(nombre)
      `)
      .eq("activa", true)
      .is("deleted_at", null);

    if (usuario_id) {
      query = query.eq("usuario_id", usuario_id);
    }

    const { data: busquedas, error } = await query;
    if (error) throw error;
    if (!busquedas?.length) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    // Un recordatorio por búsqueda (el criterio más prioritario faltante)
    const sendPromises: Promise<void>[] = [];
    let sent = 0;

    for (const busqueda of busquedas as Busqueda[]) {
      const reminder = detectMissingCriteria(busqueda);
      if (!reminder) continue;

      sendPromises.push(
        sendPush(busqueda.usuario_id, reminder.heading, reminder.content, {
          type: "recordar_filtros",
          busqueda_id: busqueda.id,
          criterio: reminder.criterio,
        }),
      );
      sent++;
    }

    await Promise.allSettled(sendPromises);

    return new Response(JSON.stringify({ sent }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
