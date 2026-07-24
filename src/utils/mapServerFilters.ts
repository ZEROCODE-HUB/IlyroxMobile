import { MapServerFilters } from "@/hooks/useMapProperties";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

type StoreFilters = ReturnType<typeof usePropertyFiltersStore.getState>["filters"];

/**
 * Traduce los filtros del store a filtros que se aplican en Supabase (server-side).
 *
 * IMPORTANTE — UBICACIÓN NO va al servidor:
 * La ubicación (chips de colonia/municipio/estado y polígonos) se resuelve
 * SIEMPRE en el cliente (`usePropertyFilters`), que hace match por bounds O por
 * texto de colonia/municipio/estado (tolerante, sin acentos). Antes el mapa
 * mandaba los `bounds` de Google como filtro server-side (`lat/lng BETWEEN`),
 * pero la lista (`map-results`) NO lo hacía, y por eso divergían: una colonia
 * daba "0 en el mapa" (bounds de Google corridos ⇒ 0 del servidor) pero "16 en
 * la lista" (traía amplio y afinaba en cliente). Unificando aquí, mapa y lista
 * siempre coinciden.
 *
 * Nota de escala: con cientos de propiedades traer amplio y filtrar en cliente
 * es barato y correcto. Si el catálogo crece a miles, reintroducir un filtro
 * geográfico server-side (PostGIS o índice de colonia normalizada).
 */
export function extractServerFilters(filters: StoreFilters): MapServerFilters {
  const f: MapServerFilters = {};

  if (filters.tipoPropiedad) f.tipoPropiedad = filters.tipoPropiedad;
  if (filters.subtipo?.length > 0) f.subtipo = filters.subtipo;

  // Ubicación base (texto libre legacy). Los chips y polígonos se filtran en
  // cliente; aquí solo pasa el locationFilter base si estuviera poblado.
  const loc = filters.locationFilter;
  if (loc.estado) f.estado = loc.estado;
  if (loc.municipio) f.municipio = loc.municipio;

  if (filters.habitaciones && filters.habitaciones !== "No indicado") {
    const n = parseInt(filters.habitaciones);
    if (!isNaN(n)) f.habitacionesMin = n;
  }
  if (filters.banos && filters.banos !== "No indicado") {
    const n = parseInt(filters.banos);
    if (!isNaN(n)) f.banosMin = n;
  }
  if (filters.estacionamientos && filters.estacionamientos !== "No indicado") {
    const n = parseInt(filters.estacionamientos);
    if (!isNaN(n)) f.estacionamientosMin = n;
  }

  if (filters.m2ConstruccionMin) {
    const n = parseFloat(filters.m2ConstruccionMin.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) f.m2ConstruccionMin = n;
  }
  if (filters.m2TerrenoMin) {
    const n = parseFloat(filters.m2TerrenoMin.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) f.m2TerrenoMin = n;
  }
  if (filters.anchoTerrenoMin) {
    const n = parseFloat(filters.anchoTerrenoMin.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) f.anchoTerrenoMin = n;
  }
  if (filters.largoTerrenoMin) {
    const n = parseFloat(filters.largoTerrenoMin.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) f.largoTerrenoMin = n;
  }

  // Comercial
  if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) {
    const cf = filters.comercialFilters;
    if (cf.tipoUbicacion.length === 1) f.tipoUbicacion = cf.tipoUbicacion[0];
    if (cf.frenteMin) {
      const n = parseFloat(cf.frenteMin);
      if (!isNaN(n) && n > 0) f.frenteMin = n;
    }
    if (cf.sobreAvenidaPrincipal) f.sobreAvenidaPrincipal = true;
    if (cf.enEsquina) f.enEsquina = true;
    if (cf.altaVisibilidad) f.altaVisibilidad = true;
    if (cf.altoFlujoVehicular) f.altoFlujoVehicular = true;
  }

  // Industrial
  if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) {
    const inf = filters.industrialFilters;
    if (inf.ubicacion.length === 1) f.ubicacionIndustrial = inf.ubicacion[0];
    if (inf.alturaLibre) f.alturaLibre = inf.alturaLibre;
    if (inf.energiaKva?.length > 0) f.energiaKva = inf.energiaKva;
    if (inf.areaOficinasMin) {
      const n = parseFloat(inf.areaOficinasMin);
      if (!isNaN(n) && n > 0) f.areaOficinasMin = n;
    }
    if (inf.patioManiobrasMin) {
      const n = parseFloat(inf.patioManiobrasMin);
      if (!isNaN(n) && n > 0) f.patioManiobrasMin = n;
    }
  }

  // Agrícola
  if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) {
    const ag = filters.agricolaFilters;
    if (ag.tiposAgua?.length > 0) f.tiposAgua = ag.tiposAgua;
    if (ag.concesionAgua) f.concesionAgua = true;
    if (ag.usoTerreno.length === 1) f.usoTerreno = ag.usoTerreno[0];
    if (ag.tipoRiego.length === 1) f.tipoRiego = ag.tipoRiego[0];
    if (ag.electricidad) f.infraElectricidad = true;
    if (ag.caminoAcceso) f.infraCaminoAcceso = true;
    if (ag.cercado) f.infraCercado = true;
    if (ag.pieCarretera) f.accesoCarretera = true;
    if (ag.accesCamiones) f.accesoCamiones = true;
  }

  return f;
}
