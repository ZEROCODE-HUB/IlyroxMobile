import { createClient } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";const log = logger.scoped("supabase-geo");

const supabaseUrlGeo = process.env.EXPO_PUBLIC_SUPABASE_GEO_URL;
const supabaseAnonKeyGeo = process.env.EXPO_PUBLIC_SUPABASE_GEO_ANON_KEY;

if (!supabaseUrlGeo || !supabaseAnonKeyGeo) {
  log.error("Geo config missing!");
} else {
  log.debug("Geo config loaded:", {
    urlLength: supabaseUrlGeo.length,
    keyLength: supabaseAnonKeyGeo.length,
    urlStart: supabaseUrlGeo.substring(0, 8) + "...",
  });
}

export const supabaseGeo = createClient(supabaseUrlGeo, supabaseAnonKeyGeo, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
