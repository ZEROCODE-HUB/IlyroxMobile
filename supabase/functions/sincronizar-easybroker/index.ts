import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EASYBROKER_BASE = "https://api.easybroker.com/v1";
const BATCH_SIZE = 5;      // Propiedades en paralelo por lote
const BATCH_DELAY_MS = 200; // Delay entre lotes (respeta rate limit de 20 req/s)
const PAGE_LIMIT = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let syncId: string | undefined;
  let usuario_id: string | undefined;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const body = await req.json();
    usuario_id = body.usuario_id;
    const test_only = body.test_only ?? false;
    let api_key = body.api_key;

    if (!api_key) {
      const { data: config, error: configError } = await supabaseClient
        .from("easybroker_config")
        .select("api_key, ultima_sincronizacion")
        .eq("usuario_id", usuario_id)
        .single();

      if (configError || !config) {
        throw new Error(
          "No se encontró API Key de EasyBroker. Por favor configúrala primero.",
        );
      }
      api_key = config.api_key;
    }

    if (!usuario_id || !api_key) {
      throw new Error("Faltan parámetros requeridos: usuario_id y api_key");
    }

    // ── Modo test: solo validar que la API key es correcta ────────────────
    if (test_only) {
      const testRes = await fetch(
        `${EASYBROKER_BASE}/properties?limit=1`,
        { headers: { "X-Authorization": api_key, accept: "application/json" } },
      );
      if (!testRes.ok) {
        return new Response(
          JSON.stringify({ success: false, error: "API Key inválida o sin permisos" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 },
        );
      }
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`\n========================================`);
    console.log(`Iniciando sincronización para usuario: ${usuario_id}`);
    console.log(`Fecha/Hora: ${new Date().toISOString()}`);
    console.log(`========================================\n`);

    // Crear registro de sincronización
    const { data: syncRecord, error: syncError } = await supabaseClient
      .from("sincronizaciones_easybroker")
      .insert({
        usuario_id,
        status: "en_progreso",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (syncError) throw new Error(`Error al crear registro: ${syncError.message}`);
    syncId = syncRecord.id;

    // Pre-cargar: última sync y IDs existentes en BD (en paralelo para no bloquear)
    const [configRes, propEnBDRes] = await Promise.all([
      supabaseClient
        .from("easybroker_config")
        .select("ultima_sincronizacion")
        .eq("usuario_id", usuario_id)
        .single(),
      supabaseClient
        .from("propiedades")
        .select("id, easybroker_id")
        .eq("created_by", usuario_id)
        .eq("es_easybroker", true)
        .is("deleted_at", null),
    ]);

    await supabaseClient
      .from("easybroker_config")
      .update({ sincronizacion_en_progreso: true, updated_at: new Date().toISOString() })
      .eq("usuario_id", usuario_id);

    const ultimaSyncStr = configRes.data?.ultima_sincronizacion;
    const ultimaSync = ultimaSyncStr ? new Date(ultimaSyncStr) : null;
    const existingEBIds = new Set((propEnBDRes.data ?? []).map((p: any) => p.easybroker_id));

    console.log(`  📅 Última sincronización: ${ultimaSync?.toISOString() ?? "nunca"}`);
    console.log(`  🏠 Propiedades existentes en BD: ${existingEBIds.size}`);

    // ── Paginar todas las propiedades publicadas ──────────────────────────
    const todasLasPropiedades: any[] = [];
    let paginaActual = 1;
    let hayMasPaginas = true;

    console.log(`📄 Obteniendo propiedades publicadas...`);

    while (hayMasPaginas) {
      const url = new URL(`${EASYBROKER_BASE}/properties`);
      url.searchParams.append("page", paginaActual.toString());
      url.searchParams.append("limit", PAGE_LIMIT.toString());
      url.searchParams.append("search[statuses][]", "published");

      const res = await fetch(url.toString(), {
        headers: { "X-Authorization": api_key, accept: "application/json" },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error al obtener propiedades (pág ${paginaActual}): ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      const pagina = data.content || [];
      todasLasPropiedades.push(...pagina);

      console.log(`  ✓ Página ${paginaActual}: ${pagina.length} propiedades (total: ${todasLasPropiedades.length})`);

      const pagination = data.pagination;
      if (
        pagina.length < PAGE_LIMIT ||
        pagination?.next_page == null ||
        todasLasPropiedades.length >= (pagination?.total ?? 0)
      ) {
        hayMasPaginas = false;
      } else {
        paginaActual++;
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    console.log(`\n📊 Total publicadas: ${todasLasPropiedades.length} — procesando en lotes de ${BATCH_SIZE}...\n`);

    await supabaseClient
      .from("sincronizaciones_easybroker")
      .update({ total_publicadas: todasLasPropiedades.length })
      .eq("id", syncId);

    if (todasLasPropiedades.length === 0) {
      await supabaseClient
        .from("sincronizaciones_easybroker")
        .update({ status: "completada", completed_at: new Date().toISOString(), total_publicadas: 0 })
        .eq("id", syncId);

      await supabaseClient
        .from("easybroker_config")
        .update({ sincronizacion_en_progreso: false, updated_at: new Date().toISOString() })
        .eq("usuario_id", usuario_id);

      return new Response(
        JSON.stringify({ success: true, message: "No hay propiedades publicadas", propiedades_procesadas: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Procesar en lotes paralelos ───────────────────────────────────────
    let contador = 0;
    let errores = 0;
    let actualizadas = 0;
    let nuevas = 0;
    let sinCambios = 0;
    let sinComision = 0;
    const erroresDetalle: any[] = [];

    for (let i = 0; i < todasLasPropiedades.length; i += BATCH_SIZE) {
      const batch = todasLasPropiedades.slice(i, i + BATCH_SIZE);

      const resultados = await Promise.allSettled(
        batch.map(async (propiedad) => {
          const publicId = propiedad.public_id;

          // Detectar propiedades sin cambios: existe en BD Y no fue modificada desde última sync
          if (ultimaSync && existingEBIds.has(publicId)) {
            const propUpdatedAt = propiedad.updated_at ? new Date(propiedad.updated_at) : null;
            if (propUpdatedAt && propUpdatedAt <= ultimaSync) {
              return { publicId, operacion: "sin_cambios" as const, sinComisionFlag: false };
            }
          }

          const detalleRes = await fetch(
            `${EASYBROKER_BASE}/properties/${publicId}`,
            { headers: { "X-Authorization": api_key, accept: "application/json" } },
          );

          if (!detalleRes.ok) {
            const t = await detalleRes.text();
            throw Object.assign(
              new Error(`HTTP ${detalleRes.status}: ${t}`),
              { publicId },
            );
          }

          const detalle = await detalleRes.json();

          const { data, error } = await supabaseClient.rpc(
            "insertar_propiedad_easybroker",
            { p_usuario_id: usuario_id, p_easybroker_data: detalle },
          );

          if (error) throw Object.assign(new Error(error.message), { publicId });
          if (!data?.success) throw Object.assign(new Error(data?.message || "Error en RPC"), { publicId });

          const sinComisionFlag = !detalle.share_commission;

          return { publicId, operacion: data.operacion as "insert" | "update" | "reactivada", sinComisionFlag };
        }),
      );

      // Agregar resultados del lote (sin race conditions — loop síncrono)
      for (const resultado of resultados) {
        if (resultado.status === "fulfilled") {
          const { publicId, operacion, sinComisionFlag } = resultado.value;
          if (operacion === "sin_cambios") {
            sinCambios++;
            console.log(`  ⏭️  SIN CAMBIOS: ${publicId}`);
          } else {
            contador++;
            if (operacion === "update") {
              actualizadas++;
              console.log(`  ✅ ACTUALIZADA: ${publicId}`);
            } else {
              // "reactivada" = estaba borrada en Ilyrox y sigue publicada en EasyBroker;
              // para el usuario reaparece, así que cuenta como nueva.
              nuevas++;
              console.log(`  ✅ ${operacion === "reactivada" ? "REACTIVADA" : "NUEVA"}: ${publicId}`);
            }
            if (sinComisionFlag) {
              sinComision++;
              console.log(`  ⚠️  SIN COMISIÓN: ${publicId}`);
            }
          }
        } else {
          errores++;
          const publicId = (resultado.reason as any)?.publicId ?? "desconocida";
          erroresDetalle.push({ propiedad_id: publicId, error: resultado.reason?.message });
          console.error(`  ❌ ERROR ${publicId}: ${resultado.reason?.message}`);
        }
      }

      // Actualizar progreso una vez por lote (no por propiedad)
      await supabaseClient
        .from("sincronizaciones_easybroker")
        .update({
          propiedades_procesadas: contador + sinCambios,
          propiedades_nuevas: nuevas,
          propiedades_actualizadas: actualizadas,
          propiedades_sin_cambios: sinCambios,
          errores,
        })
        .eq("id", syncId);

      if (i + BATCH_SIZE < todasLasPropiedades.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // ── Cleanup: soft-delete propiedades que ya no están en EasyBroker ────
    try {
      const easybrokerIds = new Set(todasLasPropiedades.map((p) => p.public_id));

      const idsParaEliminar = (propEnBDRes.data ?? [])
        .filter((p: any) => !easybrokerIds.has(p.easybroker_id))
        .map((p: any) => p.id);

      if (idsParaEliminar.length > 0) {
        await supabaseClient
          .from("propiedades")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", idsParaEliminar);

        console.log(`🗑️  ${idsParaEliminar.length} propiedades eliminadas de EasyBroker → marcadas como borradas`);
      }
    } catch (cleanupErr: any) {
      console.warn(`⚠️ Error en cleanup de propiedades eliminadas: ${cleanupErr.message}`);
    }

    // ── Marcar completada ─────────────────────────────────────────────────
    await supabaseClient
      .from("sincronizaciones_easybroker")
      .update({
        status: "completada",
        completed_at: new Date().toISOString(),
        propiedades_procesadas: contador,
        propiedades_nuevas: nuevas,
        propiedades_actualizadas: actualizadas,
        propiedades_sin_cambios: sinCambios,
        errores,
        errores_detalle: erroresDetalle.length > 0 ? erroresDetalle : null,
        total_publicadas: todasLasPropiedades.length,
      })
      .eq("id", syncId);

    await supabaseClient
      .from("easybroker_config")
      .update({
        sincronizacion_en_progreso: false,
        ultima_sincronizacion: new Date().toISOString(),
        total_propiedades_sincronizadas: contador,
        updated_at: new Date().toISOString(),
      })
      .eq("usuario_id", usuario_id);

    // Notificación push
    try {
      const partesSinComision = sinComision > 0 ? ` ${sinComision} requieren comisión.` : "";
      let mensaje: string;
      if (nuevas === 0 && actualizadas === 0) {
        mensaje = `Todo al día. ${sinCambios} propiedades sin cambios.${partesSinComision}`;
      } else if (errores > 0) {
        mensaje = `${nuevas} nuevas, ${actualizadas} actualizadas, ${sinCambios} sin cambios, ${errores} errores.${partesSinComision}`;
      } else {
        mensaje = `${nuevas} nuevas, ${actualizadas} actualizadas, ${sinCambios} sin cambios.${partesSinComision}`;
      }

      await supabaseClient.functions.invoke("enviar_notificacion_push", {
        body: {
          userId: usuario_id,
          title: "Sincronización EasyBroker",
          message: mensaje,
          screen: "misInmuebles",
          additionalData: { type: "sincronizacion_easybroker", nuevas, actualizadas, sinCambios, errores, sinComision },
        },
      });
    } catch (notifErr: any) {
      console.warn(`⚠️ Error enviando notificación push: ${notifErr.message}`);
    }

    console.log(`\n🎉 Sincronización finalizada — ${nuevas} nuevas, ${actualizadas} actualizadas, ${sinCambios} sin cambios, ${errores} errores\n`);

    return new Response(
      JSON.stringify({
        success: true,
        propiedades_procesadas: contador,
        propiedades_nuevas: nuevas,
        propiedades_actualizadas: actualizadas,
        propiedades_sin_cambios: sinCambios,
        sin_comision: sinComision,
        errores,
        total_publicadas: todasLasPropiedades.length,
        ...(errores > 0 && { errores_detalle: erroresDetalle }),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error(`\n❌ ERROR CRÍTICO: ${error.message}\n`);

    if (syncId) {
      await supabaseClient
        .from("sincronizaciones_easybroker")
        .update({ status: "error", completed_at: new Date().toISOString(), mensaje_error: error.message })
        .eq("id", syncId);
    }

    if (usuario_id) {
      await supabaseClient
        .from("easybroker_config")
        .update({ sincronizacion_en_progreso: false, updated_at: new Date().toISOString() })
        .eq("usuario_id", usuario_id);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
