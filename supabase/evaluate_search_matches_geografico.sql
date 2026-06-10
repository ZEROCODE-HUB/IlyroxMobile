-- ============================================================================
-- evaluate_search_matches — camino BÚSQUEDA → propiedades (al guardar/editar
-- una búsqueda). Se actualiza SOLO la parte de UBICACIÓN para alinearla con
-- evaluar_match: si la búsqueda tiene área (bounds/polígono) se usa matching
-- geográfico (punto dentro de área); si no, texto NORMALIZADO. El resto de la
-- lógica (precios, características, filtros comercial/industrial/agrícola,
-- comisiones, coincidencia/similar) se conserva igual.
-- Requiere: geo_matching_functions.sql.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluate_search_matches(p_busqueda_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_search      RECORD;
  v_prop        RECORD;
  v_match_type  text;
  v_detalle_text text;
  v_pmin        numeric;
  v_pmax        numeric;
  v_cf          jsonb;
  v_inf         jsonb;
  v_ag          jsonb;
  v_tiene_area  boolean := FALSE;
BEGIN
  SELECT * INTO v_search
  FROM public.busquedas_guardadas
  WHERE id = p_busqueda_id
    AND activa = TRUE
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    UPDATE public.matches SET activo = FALSE
    WHERE busqueda_id = p_busqueda_id AND activo = TRUE;
    RETURN;
  END IF;

  -- ¿La búsqueda define un área geográfica? (bounds o polígonos)
  v_tiene_area := (v_search.bounds IS NOT NULL AND jsonb_typeof(v_search.bounds) = 'object')
    OR (v_search.polygon_coords IS NOT NULL
        AND jsonb_typeof(v_search.polygon_coords) = 'array'
        AND jsonb_array_length(v_search.polygon_coords) > 0);

  -- Guard: búsqueda vacía sin criterios reales (incluye ausencia de área)
  IF (v_search.tipo_propiedad IS NULL OR TRIM(v_search.tipo_propiedad) = '')
     AND (v_search.subtipo IS NULL OR array_length(v_search.subtipo, 1) IS NULL)
     AND (v_search.estado IS NULL OR array_length(v_search.estado, 1) IS NULL)
     AND (v_search.ciudad IS NULL OR TRIM(v_search.ciudad) = '')
     AND (v_search.municipio IS NULL OR array_length(v_search.municipio, 1) IS NULL)
     AND (v_search.colonias IS NULL OR array_length(v_search.colonias, 1) IS NULL)
     AND NOT v_tiene_area
     AND COALESCE(v_search.precio_min, 0) = 0 AND COALESCE(v_search.precio_max, 0) = 0
     AND v_search.habitaciones IS NULL AND v_search.banos IS NULL
     AND v_search.estacionamientos IS NULL
     AND COALESCE(v_search.metros_terreno, 0) = 0
     AND COALESCE(v_search.metros_construccion, 0) = 0
  THEN RETURN; END IF;

  FOR v_prop IN
    SELECT
      p.*,
      op.tipo_operacion,
      op.precio,
      op.comision_porcentaje,
      op.comision_meses
    FROM public.propiedades p
    JOIN public.operaciones_propiedad op
      ON op.propiedad_id = p.id
      AND COALESCE(op.activa, TRUE) = TRUE
    WHERE p.deleted_at IS NULL
      AND COALESCE(p.activo, FALSE) = TRUE
      AND LOWER(TRIM(COALESCE(p.status, ''))) = 'publicada'
      AND p.created_by IS DISTINCT FROM v_search.usuario_id
      -- Pre-filtro: país (multi-país)
      AND (v_search.pais IS NULL OR p.pais IS NULL OR p.pais = v_search.pais)
      -- Pre-filtro: tipo de propiedad
      AND (
        v_search.tipo_propiedad IS NULL OR TRIM(v_search.tipo_propiedad) = ''
        OR LOWER(TRIM(p.tipo)) = LOWER(TRIM(v_search.tipo_propiedad))
      )
      -- Ubicación GEOGRÁFICA si la búsqueda tiene área (punto dentro del área).
      AND (
        NOT v_tiene_area
        OR punto_en_area_busqueda(p.latitud, p.longitud, v_search.bounds, v_search.polygon_coords)
      )
      -- Pre-filtro de texto NORMALIZADO (solo si NO hay área)
      AND (
        v_tiene_area
        OR v_search.estado IS NULL OR array_length(v_search.estado, 1) IS NULL
        OR normalizar_ubicacion(p.estado) = ANY(
          SELECT normalizar_ubicacion(e) FROM unnest(v_search.estado) AS e
        )
      )
      AND (
        v_tiene_area
        OR v_search.ciudad IS NULL OR TRIM(v_search.ciudad) = ''
        OR normalizar_ubicacion(p.ciudad) = normalizar_ubicacion(v_search.ciudad)
      )
      AND (
        v_tiene_area
        OR v_search.municipio IS NULL OR array_length(v_search.municipio, 1) IS NULL
        OR normalizar_ubicacion(p.municipio) = ANY(
          SELECT normalizar_ubicacion(m) FROM unnest(v_search.municipio) AS m
        )
      )
      -- Pre-filtro: tipo de operación
      AND (
        v_search.tipo_operacion IS NULL
        OR LOWER(TRIM(op.tipo_operacion::text)) = LOWER(TRIM(v_search.tipo_operacion::text))
      )
      -- Pre-filtro: precio con tolerancia ±15% (para cubrir similares)
      AND (COALESCE(v_search.precio_min, 0) = 0 OR op.precio >= v_search.precio_min * 0.85)
      AND (COALESCE(v_search.precio_max, 0) = 0 OR op.precio <= v_search.precio_max * 1.15)
  LOOP
    v_match_type := NULL;

    -- Subtipo
    IF v_search.subtipo IS NOT NULL AND array_length(v_search.subtipo, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.subtipo) AS s
        WHERE LOWER(TRIM(s)) = LOWER(TRIM(COALESCE(v_prop.subtipo, '')))
      ) THEN CONTINUE; END IF;
    END IF;

    -- Colonias: solo aplica como filtro de texto si la búsqueda NO tiene área.
    IF NOT v_tiene_area
       AND v_search.colonias IS NOT NULL AND array_length(v_search.colonias, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.colonias) AS c
        WHERE normalizar_ubicacion(c) = normalizar_ubicacion(COALESCE(v_prop.colonia::text, ''))
      ) THEN CONTINUE; END IF;
    END IF;

    -- Filtros especializados - Comercial
    IF LOWER(TRIM(COALESCE(v_prop.tipo, ''))) = 'comercial' THEN
      v_cf := v_search.criterios_busqueda -> 'comercial';
      IF v_cf IS NOT NULL THEN
        IF (v_cf ->> 'tipoUbicacion') IS NOT NULL AND TRIM(v_cf ->> 'tipoUbicacion') <> '' THEN
          IF LOWER(TRIM(v_cf ->> 'tipoUbicacion')) <> LOWER(TRIM(COALESCE(v_prop.tipo_ubicacion_comercial, ''))) THEN CONTINUE; END IF;
        END IF;
        IF (v_cf ->> 'frenteMin') IS NOT NULL AND TRIM(v_cf ->> 'frenteMin') <> '' THEN
          IF COALESCE(v_prop.frente_metros, 0) < (v_cf ->> 'frenteMin')::numeric THEN CONTINUE; END IF;
        END IF;
        IF COALESCE((v_cf ->> 'sobreAvenidaPrincipal')::boolean, FALSE) AND NOT COALESCE(v_prop.sobre_avenida_principal, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_cf ->> 'enEsquina')::boolean, FALSE) AND NOT COALESCE(v_prop.en_esquina, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_cf ->> 'altaVisibilidad')::boolean, FALSE) AND NOT COALESCE(v_prop.alta_visibilidad, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_cf ->> 'altoFlujoVehicular')::boolean, FALSE) AND NOT COALESCE(v_prop.alto_flujo_vehicular, FALSE) THEN CONTINUE; END IF;
      END IF;
    END IF;

    -- Filtros especializados - Industrial
    IF LOWER(TRIM(COALESCE(v_prop.tipo, ''))) = 'industrial' THEN
      v_inf := v_search.criterios_busqueda -> 'industrial';
      IF v_inf IS NOT NULL THEN
        IF (v_inf ->> 'ubicacion') IS NOT NULL AND TRIM(v_inf ->> 'ubicacion') <> '' THEN
          IF LOWER(TRIM(v_inf ->> 'ubicacion')) <> LOWER(TRIM(COALESCE(v_prop.ubicacion_industrial, ''))) THEN CONTINUE; END IF;
        END IF;
        IF (v_inf ->> 'alturaLibre') IS NOT NULL AND TRIM(v_inf ->> 'alturaLibre') <> '' THEN
          IF LOWER(TRIM(v_inf ->> 'alturaLibre')) <> LOWER(TRIM(COALESCE(v_prop.altura_libre_m, ''))) THEN CONTINUE; END IF;
        END IF;
        IF jsonb_typeof(v_inf -> 'energiaKva') = 'array' AND jsonb_array_length(v_inf -> 'energiaKva') > 0 THEN
          IF v_prop.tipo_energia_kva IS NULL OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_inf -> 'energiaKva') req_e
            WHERE req_e = ANY(v_prop.tipo_energia_kva)
          ) THEN CONTINUE; END IF;
        END IF;
        IF (v_inf ->> 'areaOficinasMin') IS NOT NULL AND TRIM(v_inf ->> 'areaOficinasMin') <> '' THEN
          IF COALESCE(v_prop.area_oficinas_m2, 0) < (v_inf ->> 'areaOficinasMin')::numeric THEN CONTINUE; END IF;
        END IF;
        IF (v_inf ->> 'patioManiobrasMin') IS NOT NULL AND TRIM(v_inf ->> 'patioManiobrasMin') <> '' THEN
          IF COALESCE(v_prop.patio_maniobras_m2, 0) < (v_inf ->> 'patioManiobrasMin')::numeric THEN CONTINUE; END IF;
        END IF;
      END IF;
    END IF;

    -- Filtros especializados - Agricola
    IF LOWER(TRIM(COALESCE(v_prop.tipo, ''))) = 'agricola' THEN
      v_ag := v_search.criterios_busqueda -> 'agricola';
      IF v_ag IS NOT NULL THEN
        IF jsonb_typeof(v_ag -> 'tiposAgua') = 'array' AND jsonb_array_length(v_ag -> 'tiposAgua') > 0 THEN
          IF v_prop.tipo_agua IS NULL OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_ag -> 'tiposAgua') req_a
            WHERE req_a = ANY(v_prop.tipo_agua)
          ) THEN CONTINUE; END IF;
        END IF;
        IF COALESCE((v_ag ->> 'concesionAgua')::boolean, FALSE) AND NOT COALESCE(v_prop.concesion_agua, FALSE) THEN CONTINUE; END IF;
        IF (v_ag ->> 'usoTerreno') IS NOT NULL AND TRIM(v_ag ->> 'usoTerreno') <> '' THEN
          IF LOWER(TRIM(v_ag ->> 'usoTerreno')) <> LOWER(TRIM(COALESCE(v_prop.uso_terreno, ''))) THEN CONTINUE; END IF;
        END IF;
        IF (v_ag ->> 'tipoRiego') IS NOT NULL AND TRIM(v_ag ->> 'tipoRiego') <> '' THEN
          IF LOWER(TRIM(v_ag ->> 'tipoRiego')) <> LOWER(TRIM(COALESCE(v_prop.tipo_riego, ''))) THEN CONTINUE; END IF;
        END IF;
        IF COALESCE((v_ag ->> 'electricidad')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_electricidad, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'caminoAcceso')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_camino_acceso, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'cercado')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_cercado, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'pieCarretera')::boolean, FALSE) AND NOT COALESCE(v_prop.acceso_carretera, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'accesCamiones')::boolean, FALSE) AND NOT COALESCE(v_prop.acceso_camiones, FALSE) THEN CONTINUE; END IF;
      END IF;
    END IF;

    -- Comisión mínima de venta
    IF v_search.comision_venta_min IS NOT NULL AND v_search.comision_venta_min > 0
       AND LOWER(TRIM(COALESCE(v_prop.tipo_operacion, ''))) = 'venta' THEN
      IF COALESCE(v_prop.comision_porcentaje, 0) < v_search.comision_venta_min THEN CONTINUE; END IF;
    END IF;

    -- Comisión mínima de renta
    IF v_search.comision_renta_min IS NOT NULL AND v_search.comision_renta_min > 0
       AND LOWER(TRIM(COALESCE(v_prop.tipo_operacion, ''))) = 'renta' THEN
      IF COALESCE(v_prop.comision_meses, 0) < v_search.comision_renta_min THEN CONTINUE; END IF;
    END IF;

    -- Coincidencia exacta
    IF (
      (v_search.precio_min IS NULL OR v_search.precio_min = 0 OR v_prop.precio >= v_search.precio_min)
      AND (v_search.precio_max IS NULL OR v_search.precio_max = 0 OR v_prop.precio <= v_search.precio_max)
      AND (v_search.habitaciones IS NULL OR COALESCE(v_prop.habitaciones, 0) >= v_search.habitaciones)
      AND (v_search.banos IS NULL OR COALESCE(v_prop.banos, 0) >= v_search.banos)
      AND (v_search.estacionamientos IS NULL OR COALESCE(v_prop.estacionamientos, 0) >= v_search.estacionamientos)
      AND (v_search.pisos IS NULL OR v_search.pisos = 0 OR COALESCE(v_prop.pisos, 0) >= v_search.pisos)
      AND (v_search.metros_terreno IS NULL OR v_search.metros_terreno = 0 OR COALESCE(v_prop.metros_cuadrados_terreno, 0) >= v_search.metros_terreno)
      AND (v_search.metros_terreno_max IS NULL OR v_search.metros_terreno_max = 0 OR COALESCE(v_prop.metros_cuadrados_terreno, 0) <= v_search.metros_terreno_max)
      AND (v_search.metros_construccion IS NULL OR v_search.metros_construccion = 0 OR COALESCE(v_prop.metros_cuadrados_construccion, 0) >= v_search.metros_construccion)
      AND (v_search.metros_construccion_max IS NULL OR v_search.metros_construccion_max = 0 OR COALESCE(v_prop.metros_cuadrados_construccion, 0) <= v_search.metros_construccion_max)
    ) THEN v_match_type := 'coincidencia'; END IF;

    -- Similar (±15% precio, 85% m², -1 en características)
    IF v_match_type IS NULL THEN
      v_pmin := COALESCE(NULLIF(v_search.precio_min, 0) * 0.85, 0);
      v_pmax := COALESCE(NULLIF(v_search.precio_max, 0) * 1.15, 999999999999);
      IF v_prop.precio BETWEEN v_pmin AND v_pmax
         AND (v_search.habitaciones IS NULL OR COALESCE(v_prop.habitaciones, 0) >= GREATEST(v_search.habitaciones - 1, 0))
         AND (v_search.banos IS NULL OR COALESCE(v_prop.banos, 0) >= GREATEST(v_search.banos - 1, 0))
         AND (v_search.pisos IS NULL OR v_search.pisos = 0 OR COALESCE(v_prop.pisos, 0) >= GREATEST(v_search.pisos - 1, 1))
         AND (v_search.metros_terreno IS NULL OR v_search.metros_terreno = 0 OR COALESCE(v_prop.metros_cuadrados_terreno, 0) >= v_search.metros_terreno * 0.85)
         AND (v_search.metros_construccion IS NULL OR v_search.metros_construccion = 0 OR COALESCE(v_prop.metros_cuadrados_construccion, 0) >= v_search.metros_construccion * 0.85)
      THEN v_match_type := 'similar'; END IF;
    END IF;

    IF v_match_type IS NOT NULL THEN
      v_detalle_text := CASE WHEN v_match_type = 'coincidencia'
        THEN 'Cumple con todos tus filtros'
        ELSE 'Cerca de tus preferencias de precio y espacio'
      END;
      INSERT INTO public.matches (propiedad_id, busqueda_id, usuario_id, tipo_match, activo, estado, detalle, created_at)
      VALUES (v_prop.id, p_busqueda_id, v_search.usuario_id, v_match_type, TRUE, 'pendiente',
              jsonb_build_object('mensaje', v_detalle_text), NOW())
      ON CONFLICT (propiedad_id, busqueda_id) DO UPDATE SET
        tipo_match   = EXCLUDED.tipo_match,
        activo       = TRUE,
        estado       = CASE WHEN matches.estado IN ('descartado', 'contactado', 'visto') THEN matches.estado ELSE 'pendiente' END,
        detalle      = EXCLUDED.detalle,
        created_at   = matches.created_at;
    ELSE
      UPDATE public.matches SET activo = FALSE
      WHERE propiedad_id = v_prop.id AND busqueda_id = p_busqueda_id AND activo = TRUE;
    END IF;

  END LOOP;

  -- Desactivar matches de propiedades que ya no cumplen requisitos básicos
  UPDATE public.matches m
  SET activo = FALSE
  WHERE m.busqueda_id = p_busqueda_id
    AND m.activo = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.propiedades p
      WHERE p.id = m.propiedad_id
        AND p.deleted_at IS NULL
        AND COALESCE(p.activo, FALSE) = TRUE
        AND LOWER(TRIM(COALESCE(p.status, ''))) = 'publicada'
    );

END;
$function$;
