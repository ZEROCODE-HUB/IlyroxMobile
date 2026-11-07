import { supabase } from "@/lib/supabase";
import { ReportesPropiedades } from "@/types";

// REV24: lectura de reportes por lotes y con cache corto, para mostrar el aviso en cada tarjeta del feed sin una
// consulta por tarjeta. Incluye el nombre de quien reporto.
type ReporteDetallado = {
  propiedad_id: string;
  motivo: string;
  clasificacion?: string | null;
  descripcion?: string | null;
  reportado_por?: string | null;
  reportante?: string | null;
};
const cacheReportes = new Map<string, { t: number; data: ReporteDetallado[] }>();
const colaReportes = new Map<string, Array<(d: ReporteDetallado[]) => void>>();
let temporizadorReportes: ReturnType<typeof setTimeout> | null = null;
const TTL_REPORTES_MS = 30000;
export function invalidarReportes(propiedad_id?: string) {
  if (propiedad_id) cacheReportes.delete(propiedad_id);
  else cacheReportes.clear();
}
async function vaciarColaReportes() {
  temporizadorReportes = null;
  const lote = new Map(colaReportes);
  colaReportes.clear();
  const ids = Array.from(lote.keys());
  let porProp = new Map<string, ReporteDetallado[]>();
  try {
    const { data: reps } = await supabase
      .from("reportes_propiedades")
      .select("propiedad_id, motivo, clasificacion, descripcion, reportado_por")
      .in("propiedad_id", ids);
    const filas = (reps ?? []) as ReporteDetallado[];
    const userIds = Array.from(new Set(filas.map((r) => r.reportado_por).filter(Boolean))) as string[];
    const nombres = new Map<string, string>();
    if (userIds.length) {
      const { data: pers } = await supabase.from("perfiles").select("id, nombre, apellido_paterno").in("id", userIds);
      (pers ?? []).forEach((p: any) => nombres.set(p.id, [p.nombre, p.apellido_paterno].filter(Boolean).join(" ")));
    }
    filas.forEach((r) => {
      r.reportante = r.reportado_por ? nombres.get(r.reportado_por) || null : null;
      const arr = porProp.get(r.propiedad_id) ?? [];
      arr.push(r);
      porProp.set(r.propiedad_id, arr);
    });
  } catch {
    porProp = new Map();
  }
  ids.forEach((id) => {
    const data = porProp.get(id) ?? [];
    cacheReportes.set(id, { t: Date.now(), data });
    (lote.get(id) ?? []).forEach((cb) => cb(data));
  });
}

export const reportService = {
  /** Reportes de una propiedad con el nombre de quien reporto (lotes + cache de 30 s). */
  getReportsDetailed(propiedad_id: string): Promise<ReporteDetallado[]> {
    const c = cacheReportes.get(propiedad_id);
    if (c && Date.now() - c.t < TTL_REPORTES_MS) return Promise.resolve(c.data);
    return new Promise((resolve) => {
      const cbs = colaReportes.get(propiedad_id) ?? [];
      cbs.push(resolve);
      colaReportes.set(propiedad_id, cbs);
      if (!temporizadorReportes) temporizadorReportes = setTimeout(vaciarColaReportes, 40);
    });
  },

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
    invalidarReportes(reporte.propiedad_id as string);
  },

  // REV13-09: quien reporto puede quitar SU reporte.
  async deleteMyReport(propiedad_id: string, reportado_por: string) {
    const { error } = await supabase
      .from("reportes_propiedades")
      .delete()
      .eq("propiedad_id", propiedad_id)
      .eq("reportado_por", reportado_por);
    if (error) throw error;
    invalidarReportes(propiedad_id);
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
