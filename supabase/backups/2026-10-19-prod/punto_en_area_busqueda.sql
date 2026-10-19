CREATE OR REPLACE FUNCTION public.punto_en_area_busqueda(p_lat double precision, p_lng double precision, p_bounds jsonb, p_polygons jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  v_punto geometry;
  v_poly jsonb;
  v_pt jsonb;
  v_points geometry[];
  v_ring geometry;
  v_has_polygons boolean;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN false;
  END IF;

  -- Check if we have polygons
  v_has_polygons := p_polygons IS NOT NULL 
    AND jsonb_typeof(p_polygons) = 'array' 
    AND jsonb_array_length(p_polygons) > 0;

  -- 1) POLYGONS: If polygons exist, ALWAYS verify against polygons
  --    (bounds is just a pre-filter for performance, not the actual area)
  IF v_has_polygons THEN
    v_punto := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    FOR v_poly IN SELECT value FROM jsonb_array_elements(p_polygons) AS value LOOP
      IF jsonb_typeof(v_poly) = 'array' AND jsonb_array_length(v_poly) >= 3 THEN
        v_points := ARRAY[]::geometry[];
        
        FOR v_pt IN SELECT value FROM jsonb_array_elements(v_poly) AS value LOOP
          v_points := array_append(
            v_points,
            ST_MakePoint(
              (v_pt->>'longitude')::double precision,
              (v_pt->>'latitude')::double precision
            )
          );
        END LOOP;
        
        -- Close the ring if needed
        IF NOT ST_Equals(v_points[1], v_points[array_length(v_points, 1)]) THEN
          v_points := array_append(v_points, v_points[1]);
        END IF;
        
        v_ring := ST_SetSRID(ST_MakePolygon(ST_MakeLine(v_points)), 4326);
        
        IF ST_Contains(v_ring, v_punto) THEN
          RETURN true;
        END IF;
      END IF;
    END LOOP;
    
    -- Point is not within any polygon
    RETURN false;
  END IF;

  -- 2) NO POLYGONS: Use bounds as the area filter
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

  -- No polygons and no bounds (or outside bounds)
  RETURN false;
END;
$function$
