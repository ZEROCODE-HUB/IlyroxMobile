/**
 * useSessionRefresh.ts
 * Hook para refrescar automáticamente la sesión de Supabase
 */

import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { logger } from "@/utils/logger";

const log = logger.scoped("session-refresh");

export const useSessionRefresh = (session: Session | null) => {
  useEffect(() => {
    if (!session) return;

    // Refrescar sesión cada 50 minutos
    const refreshInterval = setInterval(async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (currentSession) {
          log.info("Refreshing session...");
          const { error } = await supabase.auth.refreshSession();

          if (error) {
            log.error("Error refreshing session:", error);
          } else {
            log.info("Session refreshed successfully");
          }
        }
      } catch (err) {
        log.error("Error in refresh interval:", err);
      }
    }, 50 * 60 * 1000); // 50 minutos

    return () => {
      clearInterval(refreshInterval);
    };
  }, [session]);
};