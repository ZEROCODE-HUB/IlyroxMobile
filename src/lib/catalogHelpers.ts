/**
 * catalogHelpers.ts
 * Funciones helper para buscar IDs de catálogos en la base de datos
 */

import { supabase } from "./supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("catalogHelpers");

/**
 * Buscar ID de institución financiera por nombre
 */
export const findInstitucionFinancieraId = async (
  nombre: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("catalogo_instituciones_financieras")
      .select("id")
      .eq("nombre", nombre)
      .single();

    if (error) {
      log.error("Error buscando institución financiera:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    log.error("Error en findInstitucionFinancieraId:", err);
    return null;
  }
};

/**
 * Buscar ID de tipo de financiamiento por nombre
 */
export const findTipoFinanciamientoId = async (
  nombre: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("catalogo_tipos_financiamiento")
      .select("id")
      .eq("nombre", nombre)
      .single();

    if (error) {
      log.error("Error buscando tipo de financiamiento:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    log.error("Error en findTipoFinanciamientoId:", err);
    return null;
  }
};

/**
 * Buscar ID de amenidad por nombre
 */
export const findAmenidadId = async (nombre: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("catalogo_amenidades")
      .select("id")
      .eq("nombre", nombre)
      .single();

    if (error) {
      log.error("Error buscando amenidad:", error);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    log.error("Error en findAmenidadId:", err);
    return null;
  }
};

/**
 * Buscar IDs de múltiples amenidades
 */
export const findAmenidadesIds = async (
  nombres: string[]
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("catalogo_amenidades")
      .select("id, nombre")
      .in("nombre", nombres);

    if (error) {
      log.error("Error buscando amenidades:", error);
      return [];
    }

    return data?.map((item) => item.id) || [];
  } catch (err) {
    log.error("Error en findAmenidadesIds:", err);
    return [];
  }
};

/**
 * Buscar IDs de múltiples tipos de financiamiento
 */
export const findTiposFinanciamientoIds = async (
  nombres: string[]
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("catalogo_tipos_financiamiento")
      .select("id, nombre")
      .in("nombre", nombres);

    if (error) {
      log.error("Error buscando tipos de financiamiento:", error);
      return [];
    }

    return data?.map((item) => item.id) || [];
  } catch (err) {
    log.error("Error en findTiposFinanciamientoIds:", err);
    return [];
  }
};

/**
 * Poblar catálogos si no existen (ejecutar una vez)
 */
export const poblarCatalogos = async () => {
  try {
    // Poblar instituciones financieras
    const instituciones = [
      "BBVA",
      "Santander",
      "Banorte",
      "HSBC",
      "Scotiabank",
      "Citibanamex",
      "Banco Azteca",
      "Infonavit",
      "Fovissste",
      "Hipotecaria Nacional",
    ];

    for (const nombre of instituciones) {
      await supabase
        .from("catalogo_instituciones_financieras")
        .upsert({ nombre }, { onConflict: "nombre" });
    }

    // Poblar tipos de financiamiento
    const tiposFinanciamiento = [
      "Crédito bancario",
      "Infonavit",
      "Fovissste",
      "Cofinavit",
      "Arrendamiento financiero",
      "Crédito puente",
      "Desarrollador",
      "Pago de contado",
    ];

    for (const nombre of tiposFinanciamiento) {
      await supabase
        .from("catalogo_tipos_financiamiento")
        .upsert({ nombre }, { onConflict: "nombre" });
    }

    // Poblar amenidades
    const amenidades = [
      "Alberca",
      "Jardín",
      "Terraza",
      "Roof garden",
      "Gym",
      "Salón de eventos",
      "Cancha deportiva",
      "Área de juegos infantiles",
      "Seguridad 24/7",
      "Portón eléctrico",
      "Sistema de alarma",
      "Intercomunicador",
      "Cocina integral",
      "Closets",
      "Aire acondicionado",
      "Calefacción",
      "Amueblado",
      "Mascotas permitidas",
      "Cuarto de servicio",
      "Bodega/storage",
    ];

    for (const nombre of amenidades) {
      await supabase
        .from("catalogo_amenidades")
        .upsert({ nombre }, { onConflict: "nombre" });
    }

    log.debug("Catálogos poblados exitosamente");
  } catch (error) {
    log.error("Error poblando catálogos:", error);
  }
};