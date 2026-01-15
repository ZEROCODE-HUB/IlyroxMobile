import { supabase } from "../lib/supabase";

export const chartService = {
  async getDataChart(soloPublicadas?: boolean) {
    let query = supabase.from("propiedades").select(`
                created_at, 
                metros_cuadrados_construccion, 
                metros_cuadrados_terreno,
                tipo,
                operaciones_propiedad (
                    precio,
                    moneda,
                    tipo_operacion
                )
            `);

    if (soloPublicadas) {
      // Corregido: 'status' es la columna correcta segun el error reportado
      query = query.eq("status", "Publicada");
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getBusquedas() {
    const { data, error } = await supabase
      .from("busquedas_guardadas")
      .select("*");

    if (error) throw error;

    return data;
  },

  async getDataChart2() {
    // Para chart 4. Obtiene principalmente tipo de propiedad con precio
    const { data, error } = await supabase.from("propiedades").select(`
                created_at, 
                tipo,
                operaciones_propiedad (
                    precio,
                    moneda,
                    tipo_operacion
                )
            `);

    if (error) throw error;

    return data;
  },
};
