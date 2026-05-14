import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Property, PropertyType } from "@/types";

interface SupabaseOperacion {
  precio: number | null;
  moneda: string | null;
  tipo_operacion: string | null;
}

interface SupabaseProperty {
  id: string;
  tipo: string | null;
  subtipo: string | null;
  municipio: string | null;
  descripcion: string | null;
  estado: string | null;
  ciudad: string | null;
  colonia: string | null;
  calle: string | null;
  numero_exterior: string | null;
  latitud: string | null;
  longitud: string | null;
  fotos: string[] | null;
  habitaciones: number | null;
  banos: number | null;
  metros_cuadrados_construccion: number | null;
  metros_cuadrados_terreno: number | null;
  amenidades: string[] | null;
  activo: boolean | null;
  deleted_at: string | null;
  operaciones_propiedad: SupabaseOperacion[] | null;
  pais: string | null;
  status: string | null;
  antiguedad: number | null;
  // Campos especializados
  tipo_ubicacion_comercial: string | null;
  frente_metros: number | null;
  nivel_piso: number | null;
  sobre_avenida_principal: boolean | null;
  en_esquina: boolean | null;
  alta_visibilidad: boolean | null;
  alto_flujo_vehicular: boolean | null;
  ubicacion_industrial: string | null;
  altura_libre_m: string | null;
  tipo_energia_kva: string[] | null;
  area_oficinas_m2: number | null;
  patio_maniobras_m2: number | null;
  tipo_agua: string[] | null;
  concesion_agua: boolean | null;
  uso_terreno: string | null;
  tipo_riego: string | null;
  infra_electricidad: boolean | null;
  infra_camino_acceso: boolean | null;
  infra_cercado: boolean | null;
  acceso_carretera: boolean | null;
  acceso_camiones: boolean | null;
  [key: string]: unknown;
}

function mapProperty(p: SupabaseProperty): Property {
  const operacion = p.operaciones_propiedad?.[0];
  return {
    ...p,
    id: p.id,
    title: `${p.subtipo} en ${p.municipio}`,
    description: p.descripcion ?? undefined,
    price: operacion?.precio || 0,
    currency: (operacion?.moneda || "MXN") as "MXN" | "USD",
    location: {
      address: `${p.calle} ${p.numero_exterior || ""}`,
      country: "México",
      state: p.estado || "",
      city: p.ciudad || "",
      colony: p.colonia || "",
      municipio: p.municipio || "",
    },
    coordinates:
      p.latitud && p.longitud
        ? { lat: parseFloat(p.latitud), lng: parseFloat(p.longitud) }
        : undefined,
    images: p.fotos || [],
    features: {
      beds: p.habitaciones || 0,
      baths: p.banos || 0,
      constructionSqft: p.metros_cuadrados_construccion || 0,
      landSqft: p.metros_cuadrados_terreno || 0,
    },
    amenities: p.amenidades || [],
    type: (p.tipo || "habitacional").toLowerCase() as PropertyType,
    subtype: (p.subtipo || "").toLowerCase(),
    operation: operacion?.tipo_operacion === "venta" ? "Sale" : "Rent",
    status: "Publicada",
  } as Property;
}

const MAP_PROPERTIES_KEY = ["map-properties"] as const;

async function fetchMapProperties(): Promise<Property[]> {
  const { data, error } = await supabase
    .from("propiedades")
    .select(`*, operaciones_propiedad (*)`)
    .eq("activo", true)
    .is("deleted_at", null)
    .limit(500);

  if (error) throw error;
  return (data as SupabaseProperty[]).map(mapProperty);
}

export function useMapProperties() {
  return useQuery({
    queryKey: MAP_PROPERTIES_KEY,
    queryFn: fetchMapProperties,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/** Invalida el cache del mapa (llamar después de publicar una propiedad) */
export function useInvalidateMapProperties() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MAP_PROPERTIES_KEY });
}
