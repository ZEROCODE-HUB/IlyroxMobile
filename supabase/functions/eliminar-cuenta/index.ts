// Edge Function: eliminar-cuenta
//
// Borra de forma permanente la cuenta del usuario autenticado y todos sus datos
// (Apple App Store Guideline 5.1.1(v)). Flujo:
//   1) Valida el JWT del usuario (nunca confía en un id que venga del cliente).
//   2) Ejecuta el borrado en cascada de sus datos vía la función SQL
//      public.eliminar_cuenta(uuid) (maneja las FK NO ACTION y borra el perfil).
//   3) Elimina el registro de auth.users con privilegios admin (service_role).
//
// Desplegar: supabase functions deploy eliminar-cuenta
// Secretos requeridos (ya configurados en el proyecto): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  try {
    // 1) Extraer y validar el JWT del usuario
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return json({ error: "Falta el token de autorización" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return json({ error: "Token inválido o sesión expirada" }, 401);
    }

    const userId = userData.user.id;

    // 2) Borrado en cascada de los datos del usuario (perfil, propiedades, posts,
    //    reels, mensajes, matches, búsquedas, leads, etc.)
    const { error: rpcError } = await admin.rpc("eliminar_cuenta", {
      p_user_id: userId,
    });
    if (rpcError) {
      console.error("eliminar_cuenta RPC error:", rpcError);
      return json(
        { error: "No se pudieron borrar los datos de la cuenta" },
        500,
      );
    }

    // 3) Eliminar el registro de auth.users (requiere service_role)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("deleteUser error:", deleteError);
      return json(
        { error: "No se pudo eliminar la credencial de la cuenta" },
        500,
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error("eliminar-cuenta error:", err);
    return json({ error: "Error interno al eliminar la cuenta" }, 500);
  }
});
