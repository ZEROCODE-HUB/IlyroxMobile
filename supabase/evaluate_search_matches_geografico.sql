-- ============================================================================
-- evaluate_search_matches — camino BÚSQUEDA → propiedades (al guardar/editar
-- una búsqueda). Delega la decisión de match en evaluar_par_match (que aplica el
-- chequeo geográfico + criterios completo). El bucle principal usa un pre-filtro
-- indexado por bounding box como optimización.
--
-- IMPORTANTE: tras el bucle se re-evalúan TODAS las coincidencias activas
-- restantes (incluidas las que quedaron fuera del nuevo bounding box al reducir
-- el área) para desactivar las que ya no cumplen. Sin esto, al achicar el área
-- o endurecer criterios quedaban coincidencias "fantasma" fuera del filtro.
--
-- Requiere: evaluar_par_match, punto_en_area_busqueda.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluate_search_matches(p_busqueda_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_busq RECORD;
  v_prop RECORD;
  v_r    RECORD;
  v_tiene_bounds boolean := FALSE;
  v_south double precision; v_north double precision;
  v_west  double precision; v_east  double precision;
BEGIN
  SELECT * INTO v_busq FROM public.busquedas_guardadas
  WHERE id = p_busqueda_id AND activa = TRUE AND deleted_at IS NULL;
  IF NOT FOUND THEN
    UPDATE public.matches SET activo = FALSE
    WHERE busqueda_id = p_busqueda_id AND activo = TRUE;
    RETURN;
  END IF;

  -- Pre-filtro indexado por bounding box (aprovecha los índices B-tree de lat/lng).
  IF v_busq.bounds IS NOT NULL AND jsonb_typeof(v_busq.bounds) = 'object'
     AND v_busq.bounds ? 'north' AND v_busq.bounds ? 'south'
     AND v_busq.bounds ? 'east'  AND v_busq.bounds ? 'west' THEN
    v_tiene_bounds := TRUE;
    v_south := (v_busq.bounds->>'south')::double precision;
    v_north := (v_busq.bounds->>'north')::double precision;
    v_west  := (v_busq.bounds->>'west')::double precision;
    v_east  := (v_busq.bounds->>'east')::double precision;
  END IF;

  FOR v_prop IN
    SELECT p.id FROM public.propiedades p
    WHERE p.deleted_at IS NULL AND COALESCE(p.activo, FALSE) = TRUE
      AND LOWER(TRIM(COALESCE(p.status, ''))) = 'publicada'
      AND p.created_by IS DISTINCT FROM v_busq.usuario_id
      AND (NOT v_tiene_bounds
           OR (p.latitud BETWEEN v_south AND v_north
               AND p.longitud BETWEEN v_west AND v_east))
  LOOP
    SELECT * INTO v_r FROM public.evaluar_par_match(v_prop.id, p_busqueda_id);
    IF v_r.es_match THEN
      INSERT INTO public.matches (propiedad_id, busqueda_id, usuario_id, tipo_match, activo, estado, detalle, created_at)
      VALUES (v_prop.id, p_busqueda_id, v_busq.usuario_id, v_r.tipo_match, TRUE, 'pendiente', v_r.detalle, NOW())
      ON CONFLICT (propiedad_id, busqueda_id) DO UPDATE SET
        tipo_match = EXCLUDED.tipo_match, activo = TRUE,
        estado = CASE WHEN matches.estado IN ('descartado','contactado','visto') THEN matches.estado ELSE 'pendiente' END,
        detalle = EXCLUDED.detalle, created_at = matches.created_at;
    ELSE
      UPDATE public.matches SET activo = FALSE
      WHERE propiedad_id = v_prop.id AND busqueda_id = p_busqueda_id AND activo = TRUE;
    END IF;
  END LOOP;

  -- Re-evaluar TODAS las coincidencias activas restantes (incluidas las que
  -- quedaron fuera del nuevo bounding box al reducir el área) y desactivar las
  -- que ya no cumplen tras editar la búsqueda. evaluar_par_match aplica el
  -- chequeo geográfico y de criterios completo, así que cubre cualquier reducción.
  FOR v_prop IN
    SELECT m.propiedad_id AS id FROM public.matches m
    WHERE m.busqueda_id = p_busqueda_id AND m.activo = TRUE
  LOOP
    SELECT * INTO v_r FROM public.evaluar_par_match(v_prop.id, p_busqueda_id);
    IF NOT COALESCE(v_r.es_match, FALSE) THEN
      UPDATE public.matches SET activo = FALSE
      WHERE propiedad_id = v_prop.id AND busqueda_id = p_busqueda_id AND activo = TRUE;
    END IF;
  END LOOP;
END;
$function$;
