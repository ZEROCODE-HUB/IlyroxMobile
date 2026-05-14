import { useState, useEffect } from "react";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import Constants from "expo-constants";
import { logger } from "@/utils/logger";const log = logger.scoped("useVersionCheck");

export interface VersionInfo {
  platform: string;
  version: string;
  store_url: string;
  enabled: boolean;
}

export const useVersionCheck = () => {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    if (Platform.OS === "web") {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const platform = Platform.OS === "android" ? "android" : "ios";
      const currentVersion = Constants.expoConfig?.version || "1.0.0";

      const { data, error } = await supabase
        .from("app_versions")
        .select("*")
        .eq("platform", platform)
        .eq("enabled", true)
        .single();

      if (error) throw error;

      if (data) {
        const latestVersion = data.version;
        if (isVersionLower(currentVersion, latestVersion)) {
          setUpdateRequired(true);
          setVersionInfo(data);
        }
      }
    } catch (error) {
      log.error("Error al verificar versión:", error);
    } finally {
      setLoading(false);
    }
  };

  const isVersionLower = (current: string, latest: string) => {
    const currentParts = current.split(".").map(Number);
    const latestParts = latest.split(".").map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const cur = currentParts[i] || 0;
      const lat = latestParts[i] || 0;
      if (cur < lat) return true;
      if (cur > lat) return false;
    }
    return false;
  };

  return { updateRequired, versionInfo, loading, checkVersion };
};
