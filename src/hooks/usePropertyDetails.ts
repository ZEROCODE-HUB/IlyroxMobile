import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { blockService } from "@/services/blockService";
import { useAuth } from "@/context/AuthContext";
import { usePropertyCacheStore, CachedPropertyData } from "@/store/propertyCacheStore";

interface UsePropertyDetailsOptions {
  initialData?: CachedPropertyData | null;
}

const usePropertyDetails = (
  feedItemId: string,
  options: UsePropertyDetailsOptions = {}
) => {
  const { initialData } = options;
  const { user } = useAuth();
  const setCache = usePropertyCacheStore((state) => state.setProperty);

  const fetchPropertyDetails = useCallback(async () => {
    const { data, error } = await supabase
      .from("propiedades")
      .select(
        `
        *,
        operaciones:operaciones_propiedad(*),
        perfil:perfiles!propiedades_creado_por_fkey(*),
        amenidades:propiedad_amenidades(amenidad:catalogo_amenidades(nombre)),
        gravamenes:propiedad_gravamenes(*, institucion:catalogo_instituciones_financieras(nombre)),
        financiamientos:propiedad_financiamientos(tipo:catalogo_tipos_financiamiento(nombre))
        `,
      )
      .eq("id", feedItemId)
      .single();

    if (error) throw error;

    const blockedUserIds = await blockService.getBlockedUserIds(user?.id);
    if (data?.created_by && blockedUserIds.includes(data.created_by)) {
      return null;
    }

    const { data: feed_items } = await supabase
      .from("feed_items")
      .select("*")
      .eq("contenido_id", feedItemId)
      .single();

    const result = {
      ...data,
      feed_items: feed_items || {},
    };

    setCache(feedItemId, data);
    return result;
  }, [feedItemId, user?.id, setCache]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["property", feedItemId],
    queryFn: fetchPropertyDetails,
    initialData: initialData ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  return { propertyDetails: data ?? null, loading: isLoading, error, refetch };
};

export default usePropertyDetails;
