-- ============================================================================
-- Matching geográfico de ubicaciones (PostGIS) + normalización de texto
-- ============================================================================
-- La verdad de "dónde está una propiedad" es su coordenada (lat/lng), y "qué
-- zona se busca" es un área (bounds/polígono). Comparar punto-dentro-de-área
-- resuelve a la vez el problema de normalización de nombres ("CDMX" vs "Ciudad
-- de México") y el de jerarquía (una búsqueda por colonia trae propiedades del
-- municipio que la contiene, y viceversa), porque la contención es transitiva.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Normaliza un nombre de ubicación para comparación robusta de texto (fallback
-- cuando una búsqueda no tiene área geográfica). Incluye alias de los estados
-- de México con nombre oficial largo vs. nombre común corto.
CREATE OR REPLACE FUNCTION public.normalizar_ubicacion(t text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  n text;
BEGIN
  IF t IS NULL THEN RETURN ''; END IF;
  n := lower(unaccent(btrim(t)));
  -- Alias de divisiones de nivel 1 (estado): largo/oficial ↔ corto/común.
  n := CASE n
    -- Ciudad de México
    WHEN 'ciudad de mexico'        THEN 'cdmx'
    WHEN 'ciudad de mexico (cdmx)' THEN 'cdmx'
    WHEN 'distrito federal'        THEN 'cdmx'
    WHEN 'mexico city'             THEN 'cdmx'
    -- Estado de México
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

-- Devuelve TRUE si el punto (lat,lng) cae dentro del área de una búsqueda,
-- definida por bounds (jsonb {north,south,east,west}) y/o polygon_coords
-- (jsonb: array de polígonos, cada uno array de {latitude,longitude}).
-- Para BOUNDS usa comparación aritmética (BETWEEN) — barata por-par y, en
-- pre-filtros SQL, aprovecha los índices B-tree de lat/lng. PostGIS solo se usa
-- para polígonos arbitrarios (donde sí aporta valor).
CREATE OR REPLACE FUNCTION public.punto_en_area_busqueda(
  p_lat double precision,
  p_lng double precision,
  p_bounds jsonb,
  p_polygons jsonb
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  v_punto geometry;
  v_poly jsonb;
  v_pt jsonb;
  v_points geometry[];
  v_ring geometry;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN false;
  END IF;

  -- 1) Bounding box (aritmético; sin PostGIS)
  IF p_bounds IS NOT NULL
     AND p_bounds ? 'north' AND p_bounds ? 'south'
     AND p_bounds ? 'east'  AND p_bounds ? 'west' THEN
    IF p_lat BETWEEN (p_bounds->>'south')::double precision
                 AND (p_bounds->>'north')::double precision
       AND p_lng BETWEEN (p_bounds->>'west')::double precision
                     AND (p_bounds->>'east')::double precision THEN
      RETURN true;
    END IF;
  END IF;

  -- 2) Polígonos dibujados (PostGIS)
  IF p_polygons IS NOT NULL AND jsonb_typeof(p_polygons) = 'array' THEN
    v_punto := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    FOR v_poly IN SELECT value FROM jsonb_array_elements(p_polygons) AS value LOOP
      IF jsonb_typeof(v_poly) = 'array' AND jsonb_array_length(v_poly) >= 3 THEN
        v_points := ARRAY[]::geometry[];
        FOR v_pt IN SELECT value FROM jsonb_array_elements(v_poly) AS value LOOP
          v_points := array_append(
            v_points,
            ST_MakePoint((v_pt->>'longitude')::double precision,
                         (v_pt->>'latitude')::double precision));
        END LOOP;
        -- Cerrar el anillo si hace falta
        IF NOT ST_Equals(v_points[1], v_points[array_length(v_points,1)]) THEN
          v_points := array_append(v_points, v_points[1]);
        END IF;
        v_ring := ST_SetSRID(ST_MakePolygon(ST_MakeLine(v_points)), 4326);
        IF ST_Contains(v_ring, v_punto) THEN
          RETURN true;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN false;
END;
$function$;
