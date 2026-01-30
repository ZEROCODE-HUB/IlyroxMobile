import { supabase } from "@/lib/supabase";
import { ReportesPropiedades } from "@/types";

export const reportService = {
  async getReports(propiedad_id: string) {
    const { data, error } = await supabase
      .from("reportes_propiedades")
      .select("*")
      .eq("propiedad_id", propiedad_id);

    if (error) throw error;
    return data;
  },

  async reportProperty(reporte: Partial<ReportesPropiedades>) {
    const { error } = await supabase
      .from("reportes_propiedades")
      .insert([
        {
          propiedad_id: reporte.propiedad_id,
          reportado_por: reporte.reportado_por,
          propietario_id: reporte.propietario_id,
          motivo: reporte.motivo,
          descripcion: reporte.descripcion,
          estado: reporte.estado || "pendiente",
        },
      ])
      .select()
      .throwOnError();

    if (error) throw error;
  },
};
