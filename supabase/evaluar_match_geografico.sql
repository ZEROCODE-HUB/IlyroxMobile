-- ============================================================================
-- evaluar_match — versión con matching geográfico de ubicación
-- ----------------------------------------------------------------------------
-- Cambios vs. la versión por texto:
--   * Filtro de país (multi-país): la búsqueda solo cruza propiedades del mismo país.
--   * Ubicación GEOGRÁFICA: si la búsqueda tiene área (bounds/polygon_coords) se
--     usa punto_en_area_busqueda (PostGIS, punto dentro del área). Esto resuelve
--     la normalización de nombres y la jerarquía colonia↔municipio de raíz.
--   * Fallback de TEXTO NORMALIZADO (normalizar_ubicacion) solo si la búsqueda
--     no tiene área, para compatibilidad con búsquedas viejas.
-- Requiere: geo_matching_functions.sql (normalizar_ubicacion, punto_en_area_busqueda).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluar_match(p_propiedad_id uuid, p_busqueda_id uuid)
 RETURNS TABLE(es_match boolean, tipo_match character varying, detalle jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_prop RECORD;
  v_operacion RECORD;
  v_busq RECORD;
  v_coinc_precio_pct NUMERIC;
  v_sim_precio_min_pct NUMERIC;
  v_sim_precio_max_pct NUMERIC;
  v_coinc_hab_tol NUMERIC;
  v_sim_hab_tol NUMERIC;
  v_coinc_ban_tol NUMERIC;
  v_sim_ban_tol NUMERIC;
  v_coinc_estac_tol NUMERIC;
  v_sim_estac_tol NUMERIC;
  v_coinc_m2_const_tol NUMERIC;
  v_sim_m2_const_tol NUMERIC;
  v_coinc_m2_terreno_tol NUMERIC;
  v_sim_m2_terreno_tol NUMERIC;
  v_precio_prop_usd NUMERIC;
  v_precio_min_busq_usd NUMERIC;
  v_precio_max_busq_usd NUMERIC;
  v_precio_coinc_min NUMERIC;
  v_precio_coinc_max NUMERIC;
  v_precio_sim_inf_min NUMERIC;
  v_precio_sim_inf_max NUMERIC;
  v_precio_sim_sup_min NUMERIC;
  v_precio_sim_sup_max NUMERIC;
  v_precio_en_coincidencia BOOLEAN := FALSE;
  v_precio_en_similar BOOLEAN := FALSE;
  v_cumple_coincidencia BOOLEAN := TRUE;
  v_cumple_similar BOOLEAN := TRUE;
  v_tiene_area BOOLEAN := FALSE;
  v_detalle_json JSONB;
BEGIN
  SELECT * INTO v_prop
  FROM propiedades
  WHERE id = p_propiedad_id
    AND activo = TRUE
    AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), '{}'::JSONB;
    RETURN;
  END IF;

  SELECT * INTO v_busq
  FROM busquedas_guardadas
  WHERE id = p_busqueda_id
    AND activa = TRUE
    AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), '{}'::JSONB;
    RETURN;
  END IF;

  -- Filtro de país: una búsqueda solo matchea propiedades del mismo país.
  IF v_prop.pais IS DISTINCT FROM v_busq.pais THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'pais_no_coincide');
    RETURN;
  END IF;

  -- ── Ubicación ──────────────────────────────────────────────────────────
  -- Si la búsqueda define un área geográfica, se usa matching por geometría
  -- (punto de la propiedad dentro del área). Si no, fallback a texto normalizado.
  v_tiene_area := (v_busq.bounds IS NOT NULL AND jsonb_typeof(v_busq.bounds) = 'object')
    OR (v_busq.polygon_coords IS NOT NULL
        AND jsonb_typeof(v_busq.polygon_coords) = 'array'
        AND jsonb_array_length(v_busq.polygon_coords) > 0);

  IF v_tiene_area THEN
    IF NOT punto_en_area_busqueda(v_prop.latitud, v_prop.longitud, v_busq.bounds, v_busq.polygon_coords) THEN
      RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'fuera_de_area');
      RETURN;
    END IF;
  ELSE
    -- Fallback: comparación por texto normalizado (sin acentos, minúsculas, alias).
    IF v_busq.estado IS NOT NULL AND array_length(v_busq.estado, 1) > 0 THEN
      IF v_prop.estado IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(v_busq.estado) AS e
        WHERE normalizar_ubicacion(e) = normalizar_ubicacion(v_prop.estado)
      ) THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'estado_no_coincide');
        RETURN;
      END IF;
    END IF;

    IF v_busq.ciudad IS NOT NULL AND btrim(v_busq.ciudad) <> '' THEN
      IF v_prop.ciudad IS NULL OR normalizar_ubicacion(v_prop.ciudad) <> normalizar_ubicacion(v_busq.ciudad) THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'ciudad_no_coincide');
        RETURN;
      END IF;
    END IF;

    IF v_busq.municipio IS NOT NULL AND array_length(v_busq.municipio, 1) > 0 THEN
      IF v_prop.municipio IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(v_busq.municipio) AS m
        WHERE normalizar_ubicacion(m) = normalizar_ubicacion(v_prop.municipio)
      ) THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'municipio_no_coincide');
        RETURN;
      END IF;
    END IF;

    IF v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0 THEN
      IF v_prop.colonia IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(v_busq.colonias) AS c
        WHERE normalizar_ubicacion(c) = normalizar_ubicacion(v_prop.colonia)
      ) THEN
        RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'colonia_no_coincide');
        RETURN;
      END IF;
    END IF;
  END IF;

  -- ── Tolerancias de matching ────────────────────────────────────────────
  SELECT
    MAX(CASE WHEN criterio = 'precio' THEN coincidencia_tolerancia_porcentaje END),
    MAX(CASE WHEN criterio = 'precio' THEN similar_tolerancia_porcentaje_min END),
    MAX(CASE WHEN criterio = 'precio' THEN similar_tolerancia_porcentaje_max END),
    MAX(CASE WHEN criterio = 'habitaciones' THEN coincidencia_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'habitaciones' THEN similar_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'banos' THEN coincidencia_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'banos' THEN similar_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'estacionamientos' THEN coincidencia_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'estacionamientos' THEN similar_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'metros_construccion' THEN coincidencia_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'metros_construccion' THEN similar_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'metros_terreno' THEN coincidencia_tolerancia_valor END),
    MAX(CASE WHEN criterio = 'metros_terreno' THEN similar_tolerancia_valor END)
  INTO
    v_coinc_precio_pct, v_sim_precio_min_pct, v_sim_precio_max_pct,
    v_coinc_hab_tol, v_sim_hab_tol,
    v_coinc_ban_tol, v_sim_ban_tol,
    v_coinc_estac_tol, v_sim_estac_tol,
    v_coinc_m2_const_tol, v_sim_m2_const_tol,
    v_coinc_m2_terreno_tol, v_sim_m2_terreno_tol
  FROM configuracion_matches
  WHERE activa = TRUE;

  IF v_busq.tipo_operacion IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'tipo_operacion_requerido');
    RETURN;
  END IF;

  SELECT * INTO v_operacion
  FROM operaciones_propiedad
  WHERE propiedad_id = p_propiedad_id
    AND tipo_operacion = v_busq.tipo_operacion
    AND activa = TRUE
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'operacion_no_disponible');
    RETURN;
  END IF;

  -- ── Precio ─────────────────────────────────────────────────────────────
  IF v_busq.precio_min IS NOT NULL OR v_busq.precio_max IS NOT NULL THEN
    v_precio_prop_usd := convertir_a_usd(v_operacion.precio, v_operacion.moneda);
    v_precio_min_busq_usd := COALESCE(convertir_a_usd(v_busq.precio_min, v_busq.moneda), 0);
    v_precio_max_busq_usd := COALESCE(convertir_a_usd(v_busq.precio_max, v_busq.moneda), 999999999);
    v_precio_coinc_min := v_precio_min_busq_usd * (1 - COALESCE(v_coinc_precio_pct, 0.10));
    v_precio_coinc_max := v_precio_max_busq_usd * (1 + COALESCE(v_coinc_precio_pct, 0.10));
    v_precio_sim_inf_min := v_precio_min_busq_usd * (1 - COALESCE(v_sim_precio_max_pct, 0.20));
    v_precio_sim_inf_max := v_precio_min_busq_usd * (1 - COALESCE(v_sim_precio_min_pct, 0.10));
    v_precio_sim_sup_min := v_precio_max_busq_usd * (1 + COALESCE(v_sim_precio_min_pct, 0.10));
    v_precio_sim_sup_max := v_precio_max_busq_usd * (1 + COALESCE(v_sim_precio_max_pct, 0.20));
    v_precio_en_coincidencia := v_precio_prop_usd BETWEEN v_precio_coinc_min AND v_precio_coinc_max;
    v_precio_en_similar := (v_precio_prop_usd BETWEEN v_precio_sim_inf_min AND v_precio_sim_inf_max)
                         OR (v_precio_prop_usd BETWEEN v_precio_sim_sup_min AND v_precio_sim_sup_max);
    IF NOT v_precio_en_coincidencia AND NOT v_precio_en_similar THEN
      RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'precio_fuera_rango');
      RETURN;
    END IF;
  ELSE
    v_precio_en_coincidencia := TRUE;
    v_precio_en_similar := TRUE;
  END IF;

  -- ── Tipo / subtipo ─────────────────────────────────────────────────────
  IF v_busq.tipo_propiedad IS NOT NULL AND v_prop.tipo != v_busq.tipo_propiedad THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'tipo_no_coincide');
    RETURN;
  END IF;

  IF v_busq.subtipo IS NOT NULL AND array_length(v_busq.subtipo, 1) > 0
     AND (v_prop.subtipo IS NULL OR NOT (v_prop.subtipo = ANY(v_busq.subtipo))) THEN
    RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), jsonb_build_object('error', 'subtipo_no_coincide');
    RETURN;
  END IF;

  -- ── Características (coincidencia/similar) ──────────────────────────────
  IF v_busq.habitaciones IS NOT NULL THEN
    IF ABS(v_prop.habitaciones - v_busq.habitaciones) > COALESCE(v_sim_hab_tol, 1) THEN
      v_cumple_similar := FALSE;
    END IF;
    IF ABS(v_prop.habitaciones - v_busq.habitaciones) > COALESCE(v_coinc_hab_tol, 0) THEN
      v_cumple_coincidencia := FALSE;
    END IF;
  END IF;

  IF v_busq.banos IS NOT NULL THEN
    IF ABS(v_prop.banos - v_busq.banos) > COALESCE(v_sim_ban_tol, 1) THEN
      v_cumple_similar := FALSE;
    END IF;
    IF ABS(v_prop.banos - v_busq.banos) > COALESCE(v_coinc_ban_tol, 0) THEN
      v_cumple_coincidencia := FALSE;
    END IF;
  END IF;

  IF v_busq.estacionamientos IS NOT NULL THEN
    IF ABS(v_prop.estacionamientos - v_busq.estacionamientos) > COALESCE(v_sim_estac_tol, 1) THEN
      v_cumple_similar := FALSE;
    END IF;
    IF ABS(v_prop.estacionamientos - v_busq.estacionamientos) > COALESCE(v_coinc_estac_tol, 0) THEN
      v_cumple_coincidencia := FALSE;
    END IF;
  END IF;

  IF v_busq.metros_construccion IS NOT NULL AND v_prop.metros_cuadrados_construccion IS NOT NULL THEN
    IF ABS(v_prop.metros_cuadrados_construccion - v_busq.metros_construccion) > COALESCE(v_sim_m2_const_tol, 20) THEN
      v_cumple_similar := FALSE;
    END IF;
    IF ABS(v_prop.metros_cuadrados_construccion - v_busq.metros_construccion) > COALESCE(v_coinc_m2_const_tol, 0) THEN
      v_cumple_coincidencia := FALSE;
    END IF;
  END IF;

  IF v_busq.metros_terreno IS NOT NULL AND v_prop.metros_cuadrados_terreno IS NOT NULL THEN
    IF ABS(v_prop.metros_cuadrados_terreno - v_busq.metros_terreno) > COALESCE(v_sim_m2_terreno_tol, 50) THEN
      v_cumple_similar := FALSE;
    END IF;
    IF ABS(v_prop.metros_cuadrados_terreno - v_busq.metros_terreno) > COALESCE(v_coinc_m2_terreno_tol, 0) THEN
      v_cumple_coincidencia := FALSE;
    END IF;
  END IF;

  v_detalle_json := jsonb_build_object(
    'precio_propiedad', v_operacion.precio,
    'moneda_propiedad', v_operacion.moneda,
    'precio_usd', v_precio_prop_usd,
    'tipo_operacion', v_busq.tipo_operacion,
    'match_ubicacion', CASE WHEN v_tiene_area THEN 'geografico' ELSE 'texto' END
  );

  IF v_precio_en_coincidencia AND v_cumple_coincidencia THEN
    RETURN QUERY SELECT TRUE, 'coincidencia'::VARCHAR(20), v_detalle_json;
    RETURN;
  END IF;

  IF (v_precio_en_similar OR v_precio_en_coincidencia) AND v_cumple_similar THEN
    RETURN QUERY SELECT TRUE, 'similar'::VARCHAR(20), v_detalle_json;
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::VARCHAR(20), v_detalle_json;
END;
$function$;
