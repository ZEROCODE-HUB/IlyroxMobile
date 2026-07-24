-- ============================================================================
-- Búsqueda de perfiles tolerante a acentos, orden y espacios (2026-07).
--
-- Problema: el buscador hacía
--   .or(nombre_completo.ilike.%q%, nombre.ilike.%q%, apellido_paterno.ilike.%q%)
-- lo que fallaba en 3 casos:
--   1) "Alejandro G" NO encontraba "Alejandro  Gutiérrez" porque el dato tenía
--      DOBLE espacio y el patrón (un espacio) no matchea.
--   2) Sin unaccent: "Gutierrez" no encontraba "Gutiérrez".
--   3) No parte por palabras: buscaba el string completo contra columnas sueltas,
--      así que solo funcionaba contra nombre_completo (que puede ser NULL).
--
-- Solución: RPC que normaliza (unaccent + minúsculas + colapsa espacios) tanto la
-- consulta como el nombre completo armado de las partes, parte la consulta en
-- tokens y exige que TODOS estén presentes (AND). Así "alejandro g",
-- "gutierrez alejandro" o "ALEJANDRO GUTIERREZ" encuentran el mismo perfil.
--
-- SECURITY INVOKER (default): respeta las mismas RLS de `perfiles` que la consulta
-- directa anterior.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.buscar_perfiles(q text, lim integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  nombre text,
  nombre_completo text,
  apellido_paterno text,
  foto text,
  ocupacion text,
  calificacion_promedio numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  WITH params AS (
    SELECT array_remove(
      string_to_array(
        unaccent(lower(regexp_replace(btrim(coalesce(q, '')), '\s+', ' ', 'g'))),
        ' '
      ),
      ''
    ) AS toks
  )
  SELECT
    p.id, p.nombre, p.nombre_completo, p.apellido_paterno,
    p.foto, p.ocupacion, p.calificacion_promedio
  FROM perfiles p, params
  WHERE coalesce(p.estado_registro, '') <> 'eliminado'
    AND p.nombre IS NOT NULL
    AND array_length(params.toks, 1) IS NOT NULL
    AND (
      SELECT bool_and(
        unaccent(lower(regexp_replace(
          concat_ws(' ', p.nombre, p.apellido_paterno, p.apellido_materno, p.nombre_completo),
          '\s+', ' ', 'g'
        ))) LIKE '%' || tok || '%'
      )
      FROM unnest(params.toks) AS tok
    )
  ORDER BY p.calificacion_promedio DESC NULLS LAST
  LIMIT coalesce(lim, 10);
$function$;

-- ── Limpieza de datos existentes ────────────────────────────────────────────
-- Colapsa espacios dobles y recorta extremos en los campos de nombre, para que
-- lo que se MUESTRA quede limpio (la búsqueda ya tolera espacios por su cuenta).
UPDATE perfiles SET
  nombre           = NULLIF(btrim(regexp_replace(nombre, '\s+', ' ', 'g')), ''),
  apellido_paterno = NULLIF(btrim(regexp_replace(apellido_paterno, '\s+', ' ', 'g')), ''),
  apellido_materno = NULLIF(btrim(regexp_replace(apellido_materno, '\s+', ' ', 'g')), ''),
  nombre_completo  = NULLIF(btrim(regexp_replace(nombre_completo, '\s+', ' ', 'g')), '')
WHERE
  nombre           IS DISTINCT FROM NULLIF(btrim(regexp_replace(nombre, '\s+', ' ', 'g')), '')
  OR apellido_paterno IS DISTINCT FROM NULLIF(btrim(regexp_replace(apellido_paterno, '\s+', ' ', 'g')), '')
  OR apellido_materno IS DISTINCT FROM NULLIF(btrim(regexp_replace(apellido_materno, '\s+', ' ', 'g')), '')
  OR nombre_completo  IS DISTINCT FROM NULLIF(btrim(regexp_replace(nombre_completo, '\s+', ' ', 'g')), '');
