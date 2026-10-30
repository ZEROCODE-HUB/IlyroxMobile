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
          clasificacion: reporte.clasificacion,
          motivo: reporte.motivo,
          descripcion: reporte.descripcion,
          estado: reporte.estado || "pendiente",
        },
      ])
      .select()
      .throwOnError();

    if (error) throw error;
  },

  // REV13-09: quien reporto puede quitar SU reporte.
  async deleteMyReport(propiedad_id: string, reportado_por: string) {
    const { error } = await supabase
      .from("reportes_propiedades")
      .delete()
      .eq("propiedad_id", propiedad_id)
      .eq("reportado_por", reportado_por);
    if (error) throw error;
  },

  // REV13-09: reportes recibidos por las propiedades de un dueno (para el aviso amarillo en su perfil).
  async getReportsForOwner(propietario_id: string) {
    const { data, error } = await supabase
      .from("reportes_propiedades")
      .select("propiedad_id, motivo, clasificacion, descripcion")
      .eq("propietario_id", propietario_id);
    if (error) throw error;
    return data ?? [];
  },
};
