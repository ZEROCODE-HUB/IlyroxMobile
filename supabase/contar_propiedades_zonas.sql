-- ============================================================================
-- contar_propiedades_zonas — conteo de propiedades por zona para el buscador.
-- ----------------------------------------------------------------------------
-- Recibe un lote de zonas [{tipo, nombre, municipio, estado}] y devuelve, por
-- cada una, cuántas propiedades activas/publicadas hay que coinciden con ESA
-- zona usando su JERARQUÍA completa (no solo el nombre), normalizada con
-- normalizar_ubicacion. Esto evita el falso positivo de nombres repetidos:
-- "Centro, CDMX" ya no cuenta los "Centro" de otros estados.
--   colonia   → colonia = nombre [+ municipio + estado de la sugerencia]
--   municipio → municipio = nombre [+ estado]
--   estado    → estado = nombre
-- El municipio/estado de la sugerencia se pasan opcionales: si vienen NULL, no
-- restringen (compatibilidad). Requiere geo_matching_functions.sql.
-- ============================================================================

-- El tipo de retorno cambió (se añadieron municipio/estado), por eso se elimina antes.
DROP FUNCTION IF EXISTS public.contar_propiedades_zonas(jsonb, text);

CREATE OR REPLACE FUNCTION public.contar_propiedades_zonas(
  p_zonas jsonb,
  p_pais  text DEFAULT NULL
)
RETURNS TABLE(tipo text, nombre text, municipio text, estado text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    z.tipo,
    z.nombre,
    z.municipio,
    z.estado,
    (
      SELECT count(*)
      FROM propiedades p
      WHERE p.activo = TRUE
        AND p.deleted_at IS NULL
        AND LOWER(TRIM(COALESCE(p.status, ''))) = 'publicada'
        AND (p_pais IS NULL OR p.pais = p_pais)
        AND (
          (z.tipo = 'estado'
            AND normalizar_ubicacion(p.estado) = normalizar_ubicacion(z.nombre))
          OR (z.tipo = 'municipio'
            AND normalizar_ubicacion(p.municipio) = normalizar_ubicacion(z.nombre)
            AND (z.estado IS NULL OR normalizar_ubicacion(p.estado) = normalizar_ubicacion(z.estado)))
          OR (z.tipo = 'colonia'
            AND normalizar_ubicacion(p.colonia) = normalizar_ubicacion(z.nombre)
            AND (z.municipio IS NULL OR normalizar_ubicacion(p.municipio) = normalizar_ubicacion(z.municipio))
            AND (z.estado IS NULL OR normalizar_ubicacion(p.estado) = normalizar_ubicacion(z.estado)))
        )
    ) AS total
  FROM jsonb_to_recordset(p_zonas)
       AS z(tipo text, nombre text, municipio text, estado text);
$function$;

GRANT EXECUTE ON FUNCTION public.contar_propiedades_zonas(jsonb, text) TO anon, authenticated;
