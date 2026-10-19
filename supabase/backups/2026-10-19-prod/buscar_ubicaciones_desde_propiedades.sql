CREATE OR REPLACE FUNCTION public.buscar_ubicaciones_desde_propiedades(q text, p_estado_usuario text DEFAULT NULL::text, lim integer DEFAULT 10, p_pais text DEFAULT NULL::text)
 RETURNS TABLE(tipo text, nombre text, municipio text, estado text, total bigint, full_description text, lat_centroide double precision, lng_centroide double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH qnorm AS (
  SELECT lower(unaccent(btrim(q))) AS qn
),
matches AS (
  SELECT
    p.colonia,
    p.municipio,
    p.estado,
    p.latitud,
    p.longitud
  FROM propiedades p, qnorm
  WHERE p.activo = TRUE
    AND p.deleted_at IS NULL
    AND lower(trim(coalesce(p.status, ''))) = 'publicada'
    AND p.colonia IS NOT NULL
    AND p.municipio IS NOT NULL
    AND p.estado IS NOT NULL
    AND p.latitud IS NOT NULL
    AND p.longitud IS NOT NULL
    AND (p_pais IS NULL OR p.pais = p_pais)
    AND (
      normalizar_ubicacion(p.colonia) LIKE '%' || qnorm.qn || '%'
      OR normalizar_ubicacion(p.municipio) LIKE '%' || qnorm.qn || '%'
      OR normalizar_ubicacion(concat_ws(' ', p.colonia, p.municipio, p.estado)) LIKE '%' || qnorm.qn || '%'
    )
)
SELECT
  'colonia'::text AS tipo,
  m.colonia AS nombre,
  m.municipio,
  m.estado,
  count(*)::bigint AS total,
  trim(both ', ' FROM concat_ws(', ', nullif(m.colonia,''), nullif(m.municipio,''), nullif(m.estado,''))) AS full_description,
  AVG(m.latitud)::double precision AS lat_centroide,
  AVG(m.longitud)::double precision AS lng_centroide
FROM matches m
GROUP BY m.colonia, m.municipio, m.estado
ORDER BY
  CASE
    WHEN p_estado_usuario IS NOT NULL
      AND normalizar_ubicacion(m.estado) = normalizar_ubicacion(p_estado_usuario)
    THEN 0 ELSE 1
  END,
  count(*) DESC,
  m.estado,
  m.municipio,
  m.colonia
LIMIT lim;
$function$
