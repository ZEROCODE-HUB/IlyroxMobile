import { reportService } from "../services/reportService";
import { useState } from "react";
import { ReportesPropiedades } from "../types";
import * as Burnt from "burnt";

export const useReportProperty = () => {
  const [loading, setLoading] = useState(false);

  const getCounterReportsProperty = async (property_id: string) => {
    try {
      setLoading(true);
      const data = await reportService.getReports(property_id);
      return data?.length || 0;
    } catch (error) {
      console.error("Error fetching report count:", error);
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
      console.error("Error fetching reports:", error);
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
        duration: 2500,
      });
      return true;
    } catch (error) {
      console.error("Error reporting property:", error);
      Burnt.toast({
        title: "Error al reportar",
        preset: "error",
        duration: 2000,
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
