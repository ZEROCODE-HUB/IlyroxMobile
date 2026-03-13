import { supabaseGeo } from "../lib/supabase-geo";

export const getMunicipiosPorEstado = async (
  id_estado_seleccionado: string,
  busquedaInput: string,
) => {
  const { data } = await supabaseGeo.rpc("obtener_municipios_por_estado", {
    p_estado_id: id_estado_seleccionado,
    p_nombre_busqueda: busquedaInput,
  });
  return data;
};

export const getColoniasPorMunicipio = async (
  id_municipio_seleccionado: string,
  busquedaInput: string,
) => {
  const { data } = await supabaseGeo.rpc("obtener_colonias_geografia", {
    p_municipio_id: id_municipio_seleccionado,
    p_nombre_busqueda: busquedaInput,
  });
  return data;
};
