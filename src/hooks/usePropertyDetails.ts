import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { logger } from "@/utils/logger";const log = logger.scoped("usePropertyDetails");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El detalle se abre con dos identificadores distintos:
 * - navegación interna y push → `id` (uuid de propiedades)
 * - links compartidos → `codigo_propiedad` (numérico, es lo que va en la URL)
 *
 * Hay que elegir la columna ANTES de consultar: pasarle un código a `id` no
 * devuelve vacío, revienta con "invalid input syntax for type uuid".
 */
const usePropertyDetails = (feedItemId: string) => {
  const [loading, setLoading] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState<any>(null);
  const [error] = useState(null);

  const fetchPropertyDetails = useCallback(async () => {
    try {
      setLoading(true);
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
        .eq(UUID_RE.test(feedItemId) ? "id" : "codigo_propiedad", feedItemId)
        .single();

      if (error) throw error;

      // El feed_item se busca con el uuid ya resuelto: si entramos por código,
      // `feedItemId` no sirve para `contenido_id`.
      const propiedadId = data?.id;
      const { data: feed_items, error: feed_items_error } = propiedadId
        ? await supabase
            .from("feed_items")
            .select("*")
            .eq("contenido_id", propiedadId)
            .single()
        : { data: null, error: null };

      setPropertyDetails({
        ...data,
        feed_items: feed_items || {},
      });

      if (feed_items_error) {
        log.warn("No feed_item found for property:");
      }
    } catch (error) {
      log.error("Error fetching property details:", error);
    } finally {
      setLoading(false);
    }
  }, [feedItemId]);

  useEffect(() => {
    fetchPropertyDetails();
  }, [fetchPropertyDetails]);

  return { propertyDetails, loading, error, refetch: fetchPropertyDetails };
};

export default usePropertyDetails;
