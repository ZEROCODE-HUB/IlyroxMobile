-- ============================================================================
-- Caminos de matching unificados: ambos delegan en evaluar_par_match.
-- ----------------------------------------------------------------------------
--  evaluate_property_matches(prop)  → al crear/editar una propiedad (itera búsquedas)
--  evaluate_search_matches(busq)    → al crear/editar una búsqueda  (itera propiedades)
-- Antes cada una tenía su propia copia de la lógica (riesgo de divergencia).
-- Ahora solo arman el conjunto de candidatos y delegan la DECISIÓN a
-- evaluar_par_match → mismo par, mismo resultado, sin importar quién dispare.
-- evaluate_search_matches pre-filtra por lat/lng BETWEEN (usa índices B-tree)
-- cuando la búsqueda tiene bounds.
-- Requiere: evaluar_par_match.sql.
-- ============================================================================

-- ── Camino PROPIEDAD → búsquedas ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.evaluate_property_matches(
  p_propiedad_id uuid,
  p_tipo_operacion text DEFAULT NULL,  -- (ya no se usa; se mantiene por compat de firma)
  p_precio numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_prop RECORD;
  v_busq RECORD;
  v_r    RECORD;
BEGIN
  SELECT created_by, activo, status, deleted_at INTO v_prop
  FROM public.propiedades WHERE id = p_propiedad_id;

  -- Si la propiedad ya no es válida, desactivar sus matches y salir.
  IF NOT FOUND OR v_prop.deleted_at IS NOT NULL
     OR COALESCE(v_prop.activo, FALSE) = FALSE
     OR LOWER(TRIM(COALESCE(v_prop.status, ''))) <> 'publicada' THEN
    UPDATE public.matches SET activo = FALSE
    WHERE propiedad_id = p_propiedad_id AND activo = TRUE;
    RETURN;
  END IF;

  FOR v_busq IN
    SELECT id, usuario_id FROM public.busquedas_guardadas
    WHERE activa = TRUE AND deleted_at IS NULL
      AND usuario_id IS DISTINCT FROM v_prop.created_by
  LOOP
    SELECT * INTO v_r FROM public.evaluar_par_match(p_propiedad_id, v_busq.id);
    IF v_r.es_match THEN
      INSERT INTO public.matches (propiedad_id, busqueda_id, usuario_id, tipo_match, activo, estado, detalle, created_at)
      VALUES (p_propiedad_id, v_busq.id, v_busq.usuario_id, v_r.tipo_match, TRUE, 'pendiente', v_r.detalle, NOW())
      ON CONFLICT (propiedad_id, busqueda_id) DO UPDATE SET
        tipo_match = EXCLUDED.tipo_match, activo = TRUE,
        estado = CASE WHEN matches.estado IN ('descartado','contactado','visto') THEN matches.estado ELSE 'pendiente' END,
        detalle = EXCLUDED.detalle, created_at = matches.created_at;
    ELSE
      UPDATE public.matches SET activo = FALSE
      WHERE propiedad_id = p_propiedad_id AND busqueda_id = v_busq.id AND activo = TRUE;
    END IF;
  END LOOP;
END;
$function$;

-- ── Camino BÚSQUEDA → propiedades ───────────────────────────────────────────
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

  -- Desactivar matches de propiedades que ya no cumplen los requisitos básicos.
  UPDATE public.matches m SET activo = FALSE
  WHERE m.busqueda_id = p_busqueda_id AND m.activo = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.propiedades p
      WHERE p.id = m.propiedad_id AND p.deleted_at IS NULL
        AND COALESCE(p.activo, FALSE) = TRUE
        AND LOWER(TRIM(COALESCE(p.status, ''))) = 'publicada'
    );
END;
$function$;
