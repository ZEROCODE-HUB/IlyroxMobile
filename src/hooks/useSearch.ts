import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLocationSearchStore } from "@/store/locationSearchStore";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { useApp } from "@/context/AppContext";
import { router } from "expo-router";

export interface SearchUser {
  id: string;
  name: string;
  avatar?: string;
  ocupacion?: string;
  rating?: number;
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

/** Categorías que se paginan. `locations` no: Google Places no es paginable. */
export type SearchCategory = "users" | "posts" | "reels" | "properties";

/**
 * Tamaño de página por categoría. `posts` va más bajo porque lanza tres
 * consultas (contenido, ubicación y tipo) y se quedaría con el triple de filas.
 */
const PAGE_SIZE: Record<SearchCategory, number> = {
  users: 20,
  posts: 10,
  reels: 12,
  properties: 20,
};

const EMPTY_PAGES: Record<SearchCategory, number> = {
  users: 0,
  posts: 0,
  reels: 0,
  properties: 0,
};

const FULL_HAS_MORE: Record<SearchCategory, boolean> = {
  users: true,
  posts: true,
  reels: true,
  properties: true,
};

const NO_LOADING: Record<SearchCategory, boolean> = {
  users: false,
  posts: false,
  reels: false,
  properties: false,
};

/** Una tanda de resultados: lo traído y si vale la pena pedir más. */
interface Page<T> {
  items: T[];
  hasMore: boolean;
}

async function fetchUsers(q: string, page = 0): Promise<Page<SearchUser>> {
  // RPC `buscar_perfiles`: normaliza acentos/espacios y exige que TODAS las
  // palabras del término estén presentes (AND) sobre el nombre completo armado
  // de las partes. Reemplaza el `.or(...ilike...)` que fallaba con acentos
  // ("Gutierrez" ≠ "Gutiérrez"), con apellidos parciales ("Alejandro G") y con
  // datos que traían dobles espacios. Ver supabase/buscar_perfiles.sql.
  // El RPC solo acepta `lim`, no offset, así que se pagina pidiendo un tope
  // creciente y reemplazando la lista. A esta escala re-traer las filas ya
  // vistas es más barato que cambiar la firma de la función en producción.
  const lim = (page + 1) * PAGE_SIZE.users;
  const { data } = await supabase.rpc("buscar_perfiles", { q, lim });

  const rows = (data as any[]) ?? [];

  return {
    items: rows.map((p) => ({
      id: p.id,
      name: p.nombre_completo || [p.nombre, p.apellido_paterno].filter(Boolean).join(" ") || "Usuario",
      avatar: p.foto || undefined,
      ocupacion: p.ocupacion || undefined,
      rating: p.calificacion_promedio ? parseFloat(p.calificacion_promedio) : undefined,
    })),
    // Si vino justo el tope pedido, es probable que haya más detrás.
    hasMore: rows.length >= lim,
  };
}

async function fetchPosts(q: string, page = 0): Promise<Page<SearchPost>> {
  const FIELDS = "id, tipo, imagenes, fecha_hora, ubicacion, foto_propiedad, busquedas_json, antiguedad, nombre_asesor, foto_perfil_usuario, status";
  const size = PAGE_SIZE.posts;
  const from = page * size;
  // El rango se aplica a cada criterio por separado: son tres consultas
  // independientes que después se deduplican por id.
  // El orden explícito es obligatorio al paginar: sin ORDER BY, Postgres no
  // garantiza el mismo orden entre páginas y se repetirían o perderían filas.
  const base = () =>
    supabase
      .from("posts")
      .select(FIELDS)
      .is("deleted_at", null)
      .order("id")
      .range(from, from + size - 1);

  const [{ data: byContenido }, { data: byUbicacion }, { data: byTipo }] = await Promise.all([
    base().ilike("contenido", `%${q}%`),
    base().ilike("ubicacion", `%${q}%`),
    base().ilike("tipo", `%${q}%`),
  ]);

  // Basta con que un criterio siga dando páginas llenas para que haya más.
  const hasMore = [byContenido, byUbicacion, byTipo].some(
    (rows) => (rows?.length ?? 0) >= size,
  );

  const seen = new Set<string>();
  const posts: any[] = [];
  for (const row of [...(byContenido ?? []), ...(byUbicacion ?? []), ...(byTipo ?? [])]) {
    if (!seen.has(row.id)) { seen.add(row.id); posts.push(row); }
  }
  if (!posts.length) return { items: [], hasMore };

  const postIds = posts.map((p) => p.id);
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select("id, contenido_id, estado_moderacion")
    .eq("tipo_contenido", "post")
    .eq("estado_moderacion", "activo")
    .in("contenido_id", postIds);

  const feedMap = new Map((feedItems ?? []).map((f) => [f.contenido_id, f]));

  const items = posts
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

  return { items, hasMore };
}

async function fetchReels(q: string, page = 0): Promise<Page<SearchReel>> {
  const size = PAGE_SIZE.reels;
  const from = page * size;
  const { data: reels } = await supabase
    .from("reels")
    .select("id, thumbnail_url")
    .ilike("descripcion", `%${q}%`)
    .is("deleted_at", null)
    .order("id")
    .range(from, from + size - 1);

  const hasMore = (reels?.length ?? 0) >= size;

  if (!reels?.length) return { items: [], hasMore };

  const reelIds = reels.map((r) => r.id);
  const { data: feedItems } = await supabase
    .from("feed_items")
    .select("id, contenido_id, vistas_count")
    .eq("tipo_contenido", "reel")
    .eq("estado_moderacion", "activo")
    .in("contenido_id", reelIds);

  const feedMap = new Map((feedItems ?? []).map((f) => [f.contenido_id, f]));

  const items = reels
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

  return { items, hasMore };
}

async function fetchProperties(q: string, page = 0): Promise<Page<SearchProperty>> {
  const size = PAGE_SIZE.properties;
  const from = page * size;
  const { data } = await supabase
    .from("propiedades")
    .select("id, codigo_propiedad, fotos, colonia, municipio, estado, habitaciones, banos, metros_cuadrados_construccion, metros_cuadrados_terreno, operaciones_propiedad(precio, moneda)")
    .ilike("codigo_propiedad", `%${q}%`)
    .is("deleted_at", null)
    .order("id")
    .range(from, from + size - 1);

  const items = (data ?? []).map((p) => {
    const op = Array.isArray(p.operaciones_propiedad) ? p.operaciones_propiedad[0] : null;
    return {
      id: p.id,
      codigo_propiedad: p.codigo_propiedad,
      fotos: p.fotos ?? null,
      precio: op?.precio ?? null,
      moneda: op?.moneda ?? null,
      colonia: p.colonia ?? null,
      municipio: p.municipio ?? null,
      estado: p.estado ?? null,
      habitaciones: p.habitaciones ?? null,
      banos: p.banos ?? null,
      metros_cuadrados_construccion: p.metros_cuadrados_construccion ?? null,
      metros_cuadrados_terreno: p.metros_cuadrados_terreno ?? null,
    };
  });

  return { items, hasMore: items.length >= size };
}

const FETCHERS = {
  users: fetchUsers,
  posts: fetchPosts,
  reels: fetchReels,
  properties: fetchProperties,
} as const;

export function useSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [pages, setPages] = useState(EMPTY_PAGES);
  const [hasMore, setHasMore] = useState(FULL_HAS_MORE);
  const [loadingMore, setLoadingMore] = useState(NO_LOADING);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { searchLocations, suggestions, isLoading: locLoading } = useLocationSearchStore();
  const { clearFilters, setPendingOpenMap } = usePropertyFiltersStore();
  const { setSelectedLocation } = useApp();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    // Término nuevo: se vuelve a empezar desde la primera página en todas las
    // categorías, para no mezclar resultados de la búsqueda anterior.
    setPages(EMPTY_PAGES);
    setHasMore(FULL_HAS_MORE);
    setLoadingMore(NO_LOADING);

    if (!trimmed) {
      setResults(EMPTY_RESULTS);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [users, posts, reels, properties] = await Promise.all([
          fetchUsers(trimmed),
          fetchPosts(trimmed),
          fetchReels(trimmed),
          fetchProperties(trimmed),
        ]);
        setHasMore({
          users: users.hasMore,
          posts: posts.hasMore,
          reels: reels.hasMore,
          properties: properties.hasMore,
        });
        // Buscador general: sin filtro "(regions)" para encontrar TODO (igual que
        // el buscador de los posts de búsqueda) y sin contar propiedades (ese
        // contador se quitó de la UI del overlay).
        searchLocations(trimmed, undefined, {
          restrictToRegions: false,
          withCounts: false,
        });
        setResults({
          users: users.items,
          posts: posts.items,
          reels: reels.items,
          locations: [],
          properties: properties.items,
        });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Sync location suggestions from store into results
  useEffect(() => {
    const locations: SearchLocation[] = suggestions.map((s, i) => ({
      id: `${s.type}-${i}`,
      // `name` queda solo con la zona (se usa al seleccionar); la fila muestra
      // `fullDescription` completa separada por comas, estilo Google.
      name: s.name,
      count: s.propertyCount ?? 0,
      type: s.type,
      municipio: s.municipio_nombre,
      estado: s.estado_nombre,
      estadoId: s.estado_id,
      fullDescription: s.fullDescription,
      placeId: s.placeId,
    }));
    setResults((prev) => ({ ...prev, locations }));
  }, [suggestions]);

  /**
   * Trae la siguiente página de una categoría (scroll infinito de su pestaña).
   *
   * `users` reemplaza la lista en vez de concatenar: el RPC no acepta offset y
   * se pagina subiendo el tope, así que cada tanda ya trae todo lo anterior.
   * Las demás concatenan deduplicando por id, porque en `posts` una misma fila
   * puede venir por más de un criterio en páginas distintas.
   */
  const loadMore = useCallback(
    async (categoria: SearchCategory) => {
      const trimmed = query.trim();
      // `loading` incluido: si la primera página aún viene en camino, pedir la
      // segunda dejaría un hueco en la lista.
      if (!trimmed || loading || loadingMore[categoria] || !hasMore[categoria])
        return;

      const siguiente = pages[categoria] + 1;
      setLoadingMore((prev) => ({ ...prev, [categoria]: true }));
      try {
        const pagina = await FETCHERS[categoria](trimmed, siguiente);

        setResults((prev) => {
          if (categoria === "users") {
            return { ...prev, users: pagina.items as SearchUser[] };
          }
          const actuales = prev[categoria] as { id: string }[];
          const vistos = new Set(actuales.map((i) => i.id));
          const nuevos = (pagina.items as { id: string }[]).filter(
            (i) => !vistos.has(i.id),
          );
          return { ...prev, [categoria]: [...actuales, ...nuevos] };
        });

        setPages((prev) => ({ ...prev, [categoria]: siguiente }));
        setHasMore((prev) => ({ ...prev, [categoria]: pagina.hasMore }));
      } finally {
        setLoadingMore((prev) => ({ ...prev, [categoria]: false }));
      }
    },
    [query, loading, pages, hasMore, loadingMore],
  );

  const selectLocation = useCallback(
    (loc: SearchLocation) => {
      const baseName = loc.name.split(",")[0].trim();
      clearFilters({ estado: "", ciudad: "", municipio: "", colonia: "" });
      setSelectedLocation({
        type: loc.type ?? "colonia",
        name: baseName,
        estado_id: loc.estadoId ?? 0,
        municipio_nombre: loc.municipio,
        estado_nombre: loc.estado,
        // El placeId centra el mapa en el lugar EXACTO (vía Place Details),
        // evitando que se geocodifique otra zona con el mismo nombre.
        placeId: loc.placeId,
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

  const navigateToProperty = useCallback((propertyId: string) => {
    router.push(`/(stack)/property/${propertyId}`);
  }, []);

  return {
    query,
    setQuery,
    loading: loading || locLoading,
    results,
    loadMore,
    hasMore,
    loadingMore,
    selectLocation,
    navigateToUser,
    navigateToPost,
    navigateToReel,
    navigateToProperty,
  };
}
