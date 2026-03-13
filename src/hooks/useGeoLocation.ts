import { useState, useEffect } from "react";
import { supabaseGeo } from "../lib/supabase-geo";

export interface GeoOption {
  label: string;
  value: string;
  latitud?: number;
  longitud?: number;
}

export const useGeoLocation = () => {
  const [estados, setEstados] = useState<GeoOption[]>([]);
  const [municipios, setMunicipios] = useState<GeoOption[]>([]);
  const [colonias, setColonias] = useState<GeoOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchEstados();
  }, []);

  const fetchEstados = async (busqueda: string = "") => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseGeo.rpc("obtener_estados", {
        p_nombre_busqueda: busqueda,
      });
      if (error) throw error;
      if (data) {
        setEstados(data.map((item: any) => ({ 
          label: item.nombre, 
          value: String(item.id),
          latitud: item.latitud,
          longitud: item.longitud 
        })));
      }
    } catch (error) {
      console.error("Error fetching estados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMunicipios = async (estadoId: string, busqueda: string = "") => {
    try {
      if (!estadoId) {
        setMunicipios([]);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabaseGeo.rpc("obtener_municipios_por_estado", {
        p_estado_id: parseInt(estadoId),
        p_nombre_busqueda: busqueda,
      });
      if (error) throw error;
      if (data) {
        setMunicipios(data.map((item: any) => ({ label: item.nombre, value: String(item.id) })));
      }
    } catch (error) {
      console.error("Error fetching municipios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchColonias = async (municipioId: string, estadoId?: string, busqueda: string = "") => {
    try {
      if (!municipioId && !estadoId) {
        setColonias([]);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabaseGeo.rpc("obtener_colonias_geografia", {
        p_municipio_id: municipioId ? parseInt(municipioId) : null,
        p_estado_id: estadoId ? parseInt(estadoId) : null,
        p_nombre_busqueda: busqueda,
      });
      if (error) throw error;
      if (data) {
        setColonias(data.map((item: any) => ({ 
          label: `${item.nombre} - ${item.municipio_nombre}`, 
          value: String(item.id),
          latitud: item.latitud,
          longitud: item.longitud 
        })));
      }
    } catch (error) {
      console.error("Error fetching colonias:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMunicipios = () => setMunicipios([]);
  const clearColonias = () => setColonias([]);

  return {
    estados,
    municipios,
    colonias,
    isLoading,
    fetchEstados,
    fetchMunicipios,
    fetchColonias,
    clearMunicipios,
    clearColonias
  };
};
