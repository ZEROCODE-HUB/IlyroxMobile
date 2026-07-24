import { reportService } from "@/services/reportService";
import { useState } from "react";
import { ReportesPropiedades } from "@/types";
import * as Burnt from "burnt";
import { logger } from "@/utils/logger";const log = logger.scoped("useReportProperty");

export const useReportProperty = () => {
  const [loading, setLoading] = useState(false);

  const getCounterReportsProperty = async (property_id: string) => {
    try {
      setLoading(true);
      const data = await reportService.getReports(property_id);
      return data?.length || 0;
    } catch (error) {
      log.error("Error fetching report count:", error);
      return 0;
    } finally {
      setLoading(false);
    }
  };

  const getReportsByProperty = async (property_id: string) => {
    try {
      setLoading(true);
      const data = await reportService.getReports(property_id);
      return data;
    } catch (error) {
      log.error("Error fetching reports:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const reportProperty = async (report: Partial<ReportesPropiedades>) => {
    try {
      setLoading(true);
      await reportService.reportProperty(report);
      Burnt.toast({
        title: "Propiedad Reportada",
        preset: "done",
        // Burnt mide la duración en SEGUNDOS: 2500 eran ~41 min (nunca se iba).
        duration: 2.5,
      });
      return true;
    } catch (error) {
      log.error("Error reporting property:", error);
      Burnt.toast({
        title: "Error al reportar",
        preset: "error",
        duration: 2,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getCounterReportsProperty,
    getReportsByProperty,
    reportProperty,
  };
};
