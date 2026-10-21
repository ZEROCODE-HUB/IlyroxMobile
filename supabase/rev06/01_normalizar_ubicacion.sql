-- =====================================================================
-- REV05-06 / REV05-03 (parte BD): la normalizacion de ubicaciones no quitaba la
-- puntuacion, por eso 'ST. ANGELO RESIDENCE' != 'St Angelo Residence'.
--
-- Cambios (todos en este archivo, se ejecuta UNA vez, completo):
--   1. Funcion nueva  normalizar_texto_ubicacion(t): minusculas + sin acentos +
--      cualquier signo/puntuacion -> espacio + espacios colapsados. SIN alias.
--   2. normalizar_ubicacion(t): usa la funcion nueva y luego aplica los mismos
--      alias de estado de antes (las claves ya van sin puntuacion).
--   3. buscar_ubicaciones_desde_propiedades: el texto buscado se normaliza con la
--      funcion nueva (sin alias) para que 'st.' encuentre 'St Angelo'.
--
-- Respaldo de las versiones anteriores: supabase/backups/2026-10-19-prod/
-- Rollback: pegar esos archivos en el SQL Editor y ejecutar.
-- IMPORTANTE: el cliente (src/utils/locationMatch.ts) replica esta regla y se
-- cambia en el mismo release (parche B1 del script apply_rev06b.py).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.normalizar_texto_ubicacion(t text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT btrim(
           regexp_replace(
             lower(unaccent(btrim(coalesce(t, '')))),
             '[^a-z0-9]+', ' ', 'g'
           )
         );
$function$;

CREATE OR REPLACE FUNCTION public.normalizar_ubicacion(t text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  n text;
BEGIN
  IF t IS NULL THEN RETURN ''; END IF;
  n := normalizar_texto_ubicacion(t);
  -- Alias de divisiones de nivel 1 (estado): largo/oficial <-> corto/comun.
  -- Las claves van SIN puntuacion (el texto ya viene normalizado).
  n := CASE n
    -- Ciudad de Mexico
    WHEN 'ciudad de mexico'      THEN 'cdmx'
    WHEN 'ciudad de mexico cdmx' THEN 'cdmx'
    WHEN 'distrito federal'      THEN 'cdmx'
    WHEN 'mexico city'           THEN 'cdmx'
    -- Estado de Mexico
    WHEN 'estado de mexico' THEN 'estado de mexico'
    WHEN 'edomex'           THEN 'estado de mexico'
    WHEN 'mexico'           THEN 'estado de mexico'
    -- Estados con sufijo oficial
    WHEN 'coahuila de zaragoza'            THEN 'coahuila'
    WHEN 'michoacan de ocampo'             THEN 'michoacan'
    WHEN 'veracruz de ignacio de la llave' THEN 'veracruz'
    WHEN 'veracruz llave'                  THEN 'veracruz'
    ELSE n
  END;
  RETURN n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.buscar_ubicaciones_desde_propiedades(q text, p_estado_usuario text DEFAULT NULL::text, lim integer DEFAULT 10, p_pais text DEFAULT NULL::text)
 RETURNS TABLE(tipo text, nombre text, municipio text, estado text, total bigint, full_description text, lat_centroide double precision, lng_centroide double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
WITH qnorm AS (
  -- Sin alias: buscar 'mexico' debe seguir encontrando 'Ciudad de Mexico'.
  SELECT normalizar_texto_ubicacion(q) AS qn
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
    AND qnorm.qn <> ''
    AND (
      normalizar_texto_ubicacion(p.colonia) LIKE '%' || qnorm.qn || '%'
      OR normalizar_texto_ubicacion(p.municipio) LIKE '%' || qnorm.qn || '%'
      OR normalizar_texto_ubicacion(concat_ws(' ', p.colonia, p.municipio, p.estado)) LIKE '%' || qnorm.qn || '%'
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
$function$;
