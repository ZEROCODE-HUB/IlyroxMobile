import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const usePropertyDetails = (feedItemId: string) => {
  const [loading, setLoading] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState<any>(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPropertyDetails();
  }, [feedItemId]);

  const fetchPropertyDetails = async () => {
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
        .eq("id", feedItemId)
        .single();

      const { data: feed_items, error: feed_items_error } = await supabase
        .from("feed_items")
        .select("*")
        .eq("contenido_id", feedItemId)
        .single();

      setPropertyDetails({
        ...data,
        feed_items: feed_items || {},
      });

      if (error) throw error;
      if (feed_items_error) {
        console.warn("No feed_item found for property:");
      }
    } catch (error) {
      console.error("Error fetching property details:", error);
    } finally {
      setLoading(false);
    }
  };

  return { propertyDetails, loading, error };
};

export default usePropertyDetails;
