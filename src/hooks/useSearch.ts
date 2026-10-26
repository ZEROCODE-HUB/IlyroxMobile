import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocationSearchStore } from "@/store/locationSearchStore";
import { useSearchStore } from "@/store/searchStore";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { usePropertyCacheStore } from "@/store/propertyCacheStore";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { logger } from "@/utils/logger";
import { router } from "expo-router";
import { blockService } from "@/services/blockService";
import { normalizeStr } from "@/utils/stringNormalizer";
import { pickOperacion } from "@/utils/operaciones";

const log = logger.scoped("useSearch");

export interface SearchUser {
  id: string;
  name: string;
  avatar?: string;
  ocupacion?: string;
  rating?: number;
  is_blocked?: boolean;
}

export interface SearchPost {
  id: string;
  feed_item_id: string;
  img?: string;
  tipo?: string;
  fecha_hora?: string;
  ubicacion?: string;
  foto_propiedad?: string;
  busquedas_json?: any;
  antiguedad?: number;
  nombre_asesor?: string;
  foto_perfil_usuario?: string;
  status?: string;
}

export interface SearchReel {
  id: string;
  feed_item_id: string;
  img?: string;
  views?: string;
}

export interface SearchLocation {
  id: string;
  name: string;
  count: number;
  type?: "estado" | "municipio" | "colonia";
  municipio?: string;
  estado?: string;
  estadoId?: number;
  /** Descripción completa de Google Places (ej. "Polanco, Miguel Hidalgo, CDMX, México") */
  fullDescription?: string;
  /** placeId de Google Places: identifica unívocamente el lugar para centrar el mapa exacto */
  placeId?: string;
  /**
   * Centroide (promedio de lat/lng de las propiedades de la zona).
   * Solo presente para sugerencias del fallback a la BD de propiedades.
   * Permite centrar el mapa en el lugar exacto sin depender de Google.
   */
  centroide?: { lat: number; lng: number };
}

export interface SearchProperty {
  id: string;
  codigo_propiedad: string;
  fotos: string[] | null;
  precio: number | null;
  moneda: string | null;
  colonia: string | null;
  municipio: string | null;
  estado: string | null;
  habitaciones: number | null;
  banos: number | null;
  metros_cuadrados_construccion: number | null;
  metros_cuadrados_terreno: number | null;
  /** Estado de la publicacion (Publicada, Suspendida, Vendida...). REV06-01 */
  status?: string | null;
}

export interface SearchResults {
  users: SearchUser[];
  posts: SearchPost[];
  reels: SearchReel[];
  locations: SearchLocation[];
  properties: SearchProperty[];
}

const EMPTY_RESULTS: SearchResults = {
  users: [],
  posts: [],
  reels: [],
  locations: [],
  properties: [],
};

const isNotBlocked = (id: string | null | undefined, blockedIds: string[]) =>
  !id || !blockedIds.includes(id);

async function fetchUsers(
  q: string,
  blockedUserIds: string[],
): Promise<SearchUser[]> {
  // RPC `buscar_perfiles`: normaliza acentos/espacios y exige que TODAS las
  // palabras del término estén presentes (AND) sobre el nombre completo armado
  // de las partes. Reemplaza el `.or(...ilike...)` que fallaba con acentos
  // ("Gutierrez" ≠ "Gutiérrez"), con apellidos parciales ("Alejandro G") y con
  // datos que traían dobles espacios. Ver supabase/buscar_perfiles.sql.
  const { data } = await supabase.rpc("buscar_perfiles", { q: normalizeStr(q), lim: 10 });

  return ((data as any[]) ?? [])
    .map((p) => ({
      id: p.id,
      name: p.nombre_completo || [p.nombre, p.apellido_paterno].filter(Boolean).join(" ") || "Usuario",
      avatar: p.foto || undefined,
      ocupacion: p.ocupacion || undefined,
      rating: p.calificacion_promedio ? parseFloat(p.calificacion_promedio) : undefined,
      is_blocked: blockedUserIds.includes(p.id),
    }));
}

async function fetchPosts(q: string, blockedUserIds: string[]): Promise<SearchPost[]> {
  const FIELDS = "id, publicado_por, tipo, imagenes, fecha_hora, ubicacion, foto_propiedad, busquedas_json, antiguedad, nombre_asesor, foto_perfil_usuario, status";
  const base = () => supabase.from("posts").select(FIELDS).is("deleted_at", null).limit(9);

  const [{ data: byContenido }, { data: byUbicacion }, { data: byTipo }] = await Promise.all([
    base().ilike("contenido", `%${q}%`),
    base().ilike("ubicacion", `%${q}%`),
    base().ilike("tipo", `%${q}%`),
  ]);

  const seen = new Set<string>();
  const posts: any[] = [];
  for (const row of [...(byContenido ?? []), ...(byUbicacion ?? []), ...(byTipo ?? [])]) {
    if (!seen.has(row.id) && isNotBlocked(row.publicado_por, blockedUserIds)) {
      seen.add(row.id);
      posts.push(row);
    }
  }
  if (!posts.length) return [];

  const postIds = posts.map((p) => p.id);
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select("id, contenido_id, estado_moderacion")
    .eq("tipo_contenido", "post")
    .eq("estado_moderacion", "activo")
    .in("contenido_id", postIds);

  const feedMap = new Map((feedItems ?? []).map((f) => [f.contenido_id, f]));

  return posts
    .map((p) => {
      const fi = feedMap.get(p.id);
      if (!fi) return null;
      const img = Array.isArray(p.imagenes) ? p.imagenes[0] : undefined;
      return {
        id: p.id,
        feed_item_id: fi.id,
        img,
        tipo: p.tipo,
        fecha_hora: p.fecha_hora ?? undefined,
        ubicacion: p.ubicacion ?? undefined,
        busquedas_json: p.busquedas_json ?? undefined,
        antiguedad: p.antiguedad ?? undefined,
        nombre_asesor: p.nombre_asesor ?? undefined,
        foto_propiedad: p.foto_propiedad ?? undefined,
        foto_perfil_usuario: p.foto_perfil_usuario ?? undefined,
        status: p.status ?? undefined,
      };
    })
    .filter(Boolean) as SearchPost[];
}

async function fetchReels(q: string, blockedUserIds: string[]): Promise<SearchReel[]> {
  const { data: reels } = await supabase
    .from("reels")
    .select("id, publicado_por, thumbnail_url")
    .ilike("descripcion", `%${q}%`)
    .is("deleted_at", null)
    .limit(6);

  const visibleReels = (reels ?? []).filter((r) =>
    isNotBlocked(r.publicado_por, blockedUserIds),
  );

  if (!visibleReels.length) return [];

  const reelIds = visibleReels.map((r) => r.id);
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select("id, contenido_id, vistas_count")
    .eq("tipo_contenido", "reel")
    .eq("estado_moderacion", "activo")
    .in("contenido_id", reelIds);

  const feedMap = new Map((feedItems ?? []).map((f) => [f.contenido_id, f]));

  return visibleReels
    .map((r) => {
      const fi = feedMap.get(r.id);
      if (!fi) return null;
      const views = fi.vistas_count ?? 0;
      const viewsStr =
        views >= 1000 ? `${(views / 1000).toFixed(1)}K` : String(views);
      return {
        id: r.id,
        feed_item_id: fi.id,
        img: r.thumbnail_url || undefined,
        views: views > 0 ? viewsStr : undefined,
      };
    })
    .filter(Boolean) as SearchReel[];
}

/**
 * Convierte lo escrito por el usuario en un patron ILIKE tolerante a acentos
 * para colonia / municipio (REV05-25). PostgREST no admite funciones (unaccent)
 * dentro de un filtro .or(), asi que cada vocal (con o sin acento) y la n con
 * tilde se sustituyen por "_" (un caracter cualquiera) y los signos de
 * puntuacion y los espacios por "%". Los comodines escritos por el usuario se
 * descartan.
 */
function toZoneIlikeTerm(q: string): string {
  return q
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[%_\\*]/g, " ")
    .replace(/[,;:()"'.\-]/g, "%")
    .replace(/[aeiouáéíóúüñ]/g, "_")
    .replace(/\s+/g, "%")
    .replace(/%+/g, "%");
}

async function fetchProperties(
  q: string,
  blockedUserIds: string[],
  currentUserId?: string,
): Promise<SearchProperty[]> {
  // Terminos para el filtro .or() de PostgREST (REV05-25).
  //  - codeTerm: codigo de propiedad, sin comodines ni signos que rompen la
  //    sintaxis del filtro.
  //  - zoneTerm: patron tolerante a acentos para colonia / municipio.
  const codeTerm = q.trim().replace(/[%_\\*,()"']/g, "");
  const zoneTerm = toZoneIlikeTerm(q);
  if (!codeTerm) return [];
  let query = supabase
    .from("propiedades")
    .select("id, created_by, codigo_propiedad, status, fotos, colonia, municipio, estado, habitaciones, banos, metros_cuadrados_construccion, metros_cuadrados_terreno, operaciones_propiedad(precio, moneda)")
    .or(`codigo_propiedad.ilike.%${codeTerm}%,colonia.ilike.%${zoneTerm}%,municipio.ilike.%${zoneTerm}%`)
    .is("deleted_at", null)
    .limit(20);

  // REV06-01: solo se ofrecen fichas DISPONIBLES (activo = true), igual que el
  // mapa, mas las propias del usuario aunque no esten disponibles (Suspendida,
  // Vendida, Rentada...). Un segundo .or() se combina con Y con el .or() de texto.
  // REV10-04: ademas, de otros asesores solo las que comparten comision (el creador ve siempre las suyas).
  if (currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId)) {
    query = query.or(`and(activo.eq.true,comparte_comision.eq.true,or(sin_comision.is.null,sin_comision.eq.false)),created_by.eq.${currentUserId}`);
  } else {
    query = query.eq("activo", true).eq("comparte_comision", true).or("sin_comision.is.null,sin_comision.eq.false");
  }

  if (blockedUserIds.length > 0) {
    query = query.not("created_by", "in", `(${blockedUserIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    // Antes el error se ignoraba: la consulta fallaba en silencio y la lupa
    // mostraba "No encuentro ninguna propiedad" (REV05-25).
    log.warn("fetchProperties fallo:", error.message, error.code);
    return [];
  }

  return (data ?? []).map((p) => {
    const op = pickOperacion(p.operaciones_propiedad) ?? null;
    return {
      id: p.id,
      codigo_propiedad: p.codigo_propiedad,
      fotos: p.fotos ?? null,
      precio: op?.precio ?? null,
      moneda: op?.moneda ?? null,
      colonia: p.colonia ?? null,
      municipio: p.municipio ?? null,
      estado: p.estado ?? null,
      status: p.status ?? null,
      habitaciones: p.habitaciones ?? null,
      banos: p.banos ?? null,
      metros_cuadrados_construccion: p.metros_cuadrados_construccion ?? null,
      metros_cuadrados_terreno: p.metros_cuadrados_terreno ?? null,
    };
  });
}

export function useSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const currentQueryRef = useRef<string>("");

  const { profile, user } = useAuth();
  const { searchLocations, suggestions, isLoading: locLoading } = useLocationSearchStore();
  const { clearFilters, setPendingOpenMap } = usePropertyFiltersStore();
  const { setCurrentSearchId } = useSearchStore();
  const { setSelectedLocation } = useApp();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setResults(EMPTY_RESULTS);
      currentQueryRef.current = "";
      return;
    }

    currentQueryRef.current = trimmed;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const blockedUserIds = await blockService.getBlockedUserIds(user?.id);
        const [users, posts, reels, properties] = await Promise.all([
          fetchUsers(trimmed, blockedUserIds),
          fetchPosts(trimmed, blockedUserIds),
          fetchReels(trimmed, blockedUserIds),
          fetchProperties(trimmed, blockedUserIds, user?.id),
        ]);
        if (!mountedRef.current) return;
        if (currentQueryRef.current !== trimmed) return;
        searchLocations(trimmed, undefined, {
          restrictToRegions: false,
          withCounts: false,
          estado: profile?.estado,
        });
        if (!mountedRef.current) return;
        if (currentQueryRef.current !== trimmed) return;
        setResults({ users, posts, reels, locations: [], properties });
      } catch (err) {
        log.warn("Error en búsqueda:", err);
        if (mountedRef.current) setResults(EMPTY_RESULTS);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, profile?.estado, user?.id]);

  // Sync location suggestions from store into results
  useEffect(() => {
    if (suggestions.length === 0) return;

    // El store locationSearchStore ya maneja race conditions con latestSearchRequestId
    // No necesitamos filtrar por query aquí, solo transferimos los resultados

    const locations: SearchLocation[] = suggestions.map((s, i) => ({
      id: `${s.type}-${i}`,
      name: s.name,
      count: s.propertyCount ?? 0,
      type: s.type,
      municipio: s.municipio_nombre,
      estado: s.estado_nombre,
      estadoId: s.estado_id,
      fullDescription: s.fullDescription,
      placeId: s.placeId,
      centroide: s.centroide,
    }));
    setResults((prev) => ({ ...prev, locations }));
  }, [suggestions]);

  const selectLocation = useCallback(
    (loc: SearchLocation, isRestoring = false) => {
      const baseName = loc.name.split(",")[0].trim();
      // Detectar si viene del fallback a la BD de propiedades (placeId sintético).
      const isFromDbFallback = loc.placeId?.startsWith("prop-") ?? false;
      // DEBUG: log al recibir la ubicación seleccionada
      console.log("[DEBUG selectLocation] ENTRADA:", {
        source: isFromDbFallback ? "DB_FALLBACK" : "GOOGLE",
        placeId: loc.placeId,
        name: loc.name,
        baseName,
        type: loc.type,
        municipio: loc.municipio,
        estado: loc.estado,
        fullDescription: loc.fullDescription,
        hasCentroide: !!loc.centroide,
        centroide: loc.centroide,
      });
      // Limpiar filtros si NO estamos restaurando desde historial.
      // Esta función se llama SOLO desde el SearchOverlay (Home), NO desde
      // el buscador del mapa (que usa addLocationChip directamente). Por lo
      // tanto, limpiar aquí no rompe la acumulación de chips: cada nueva
      // búsqueda desde el Home es una búsqueda "fresca".
      // Excepción: si se está restaurando desde historial, NO limpiar
      // (la búsqueda guardada se aplica tal cual).
      if (!isRestoring) {
        usePropertyFiltersStore.getState().clearFilters();
        // También limpiar el currentSearchId del searchStore para que cuando
        // entremos al mapa se cree una NUEVA búsqueda en el historial (con
        // coords) en vez de actualizar la anterior.
        setCurrentSearchId(null);
      }
      // Regla de centrado:
      //   - Google (placeId real): usar getPlaceDetails en el mapa
      //   - DB fallback (placeId sintético): usar el centroide real de la BD
      //   - Sin nada: caer al geocode fallback con texto completo
      const useCentroide = isFromDbFallback && loc.centroide != null;
      setSelectedLocation({
        type: loc.type ?? "colonia",
        name: baseName,
        estado_id: loc.estadoId ?? 0,
        municipio_nombre: loc.municipio,
        estado_nombre: loc.estado,
        // Si hay centroide real, lo usamos y NO pasamos el placeId falso.
        // Si no, pasamos el placeId (real o sintético) para que el mapa decida.
        placeId: useCentroide ? undefined : loc.placeId,
        lat: useCentroide ? loc.centroide!.lat : undefined,
        lng: useCentroide ? loc.centroide!.lng : undefined,
      });
      setPendingOpenMap(true);
    },
    [clearFilters, setSelectedLocation, setPendingOpenMap],
  );

  const navigateToUser = useCallback((userId: string) => {
    router.push(`/(stack)/user/${userId}`);
  }, []);

  const navigateToPost = useCallback((feedItemId: string) => {
    router.push(`/(stack)/post/${feedItemId}`);
  }, []);

  const navigateToReel = useCallback((feedItemId: string) => {
    router.push(`/(stack)/reel/${feedItemId}`);
  }, []);

  const navigateToProperty = useCallback((propertyId: string, propertyData?: SearchProperty) => {
    if (propertyData) {
      usePropertyCacheStore.getState().setProperty(propertyId, propertyData as any);
    }
    router.push({
      pathname: "/(stack)/property/[id]",
      params: { id: propertyId },
    });
  }, []);

  return {
    query,
    setQuery,
    loading: loading || locLoading,
    results,
    selectLocation,
    navigateToUser,
    navigateToPost,
    navigateToReel,
    navigateToProperty,
  };
}