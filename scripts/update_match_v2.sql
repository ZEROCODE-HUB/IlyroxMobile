-- 1. Agregar columnas faltantes en busquedas_guardadas
ALTER TABLE public.busquedas_guardadas
  ADD COLUMN IF NOT EXISTS antiguedad text,
  ADD COLUMN IF NOT EXISTS comision_venta_min numeric,
  ADD COLUMN IF NOT EXISTS comision_renta_min numeric;

-- 2. Actualizar evaluate_property_matches: pisos + comisiones
CREATE OR REPLACE FUNCTION public.evaluate_property_matches(
  p_propiedad_id uuid,
  p_tipo_operacion text DEFAULT NULL,
  p_precio numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_propiedad RECORD;
  v_op RECORD;
  v_search RECORD;
  v_match_type text;
  v_detalle_text text;
  v_punto geometry;
  v_in_polygon boolean;
  v_polygon jsonb;
  v_ring_geom geometry;
  v_pmin numeric;
  v_pmax numeric;
  v_tipo_op text;
  v_precio numeric;
  v_comision_porcentaje numeric;
  v_comision_meses numeric;
  v_cf jsonb;
  v_inf jsonb;
  v_ag jsonb;
BEGIN
  SELECT * INTO v_propiedad
  FROM public.propiedades
  WHERE id = p_propiedad_id
    AND deleted_at IS NULL
    AND COALESCE(activo, FALSE) = TRUE
    AND LOWER(TRIM(COALESCE(status, ''))) = 'publicada';

  IF NOT FOUND THEN
    UPDATE public.matches SET activo = FALSE
    WHERE propiedad_id = p_propiedad_id AND activo = TRUE;
    RETURN;
  END IF;

  IF p_tipo_operacion IS NOT NULL AND p_precio IS NOT NULL THEN
    v_tipo_op := p_tipo_operacion;
    v_precio  := p_precio;
  ELSE
    SELECT tipo_operacion, precio INTO v_op
    FROM public.operaciones_propiedad
    WHERE propiedad_id = p_propiedad_id AND COALESCE(activa, TRUE) = TRUE
    ORDER BY created_at ASC LIMIT 1;
    IF NOT FOUND THEN RETURN; END IF;
    v_tipo_op := v_op.tipo_operacion;
    v_precio  := v_op.precio;
  END IF;

  -- Cargar datos de comision de la operacion relevante
  SELECT comision_porcentaje, comision_meses INTO v_op
  FROM public.operaciones_propiedad
  WHERE propiedad_id = p_propiedad_id
    AND COALESCE(activa, TRUE) = TRUE
    AND LOWER(TRIM(tipo_operacion)) = LOWER(TRIM(COALESCE(v_tipo_op, '')))
  ORDER BY created_at ASC LIMIT 1;

  v_comision_porcentaje := COALESCE(v_op.comision_porcentaje, 0);
  v_comision_meses      := COALESCE(v_op.comision_meses, 0);

  FOR v_search IN
    SELECT bg.* FROM public.busquedas_guardadas bg
    WHERE bg.activa = TRUE AND bg.deleted_at IS NULL
      AND bg.usuario_id IS DISTINCT FROM v_propiedad.created_by
      AND (
        bg.tipo_operacion IS NULL
        OR LOWER(TRIM(bg.tipo_operacion::text)) = LOWER(TRIM(COALESCE(v_tipo_op, '')))
      )
  LOOP
    v_match_type := NULL;

    IF (v_search.tipo_propiedad IS NULL OR TRIM(v_search.tipo_propiedad) = '')
       AND (v_search.subtipo IS NULL OR array_length(v_search.subtipo, 1) IS NULL)
       AND (v_search.estado IS NULL OR array_length(v_search.estado, 1) IS NULL)
       AND (v_search.ciudad IS NULL OR TRIM(v_search.ciudad) = '')
       AND (v_search.municipio IS NULL OR array_length(v_search.municipio, 1) IS NULL)
       AND (v_search.colonias IS NULL OR array_length(v_search.colonias, 1) IS NULL)
       AND (v_search.polygon_coords IS NULL OR jsonb_typeof(v_search.polygon_coords) <> 'array' OR jsonb_array_length(v_search.polygon_coords) = 0)
       AND COALESCE(v_search.precio_min, 0) = 0 AND COALESCE(v_search.precio_max, 0) = 0
       AND v_search.habitaciones IS NULL AND v_search.banos IS NULL
       AND v_search.estacionamientos IS NULL
       AND COALESCE(v_search.metros_terreno, 0) = 0
       AND COALESCE(v_search.metros_construccion, 0) = 0
    THEN CONTINUE; END IF;

    -- Tipo de propiedad
    IF v_search.tipo_propiedad IS NOT NULL AND TRIM(v_search.tipo_propiedad) <> ''
       AND LOWER(TRIM(v_search.tipo_propiedad)) <> LOWER(TRIM(COALESCE(v_propiedad.tipo, ''))) THEN
      CONTINUE;
    END IF;

    -- Subtipo
    IF v_search.subtipo IS NOT NULL AND array_length(v_search.subtipo, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_search.subtipo) AS s WHERE LOWER(TRIM(s)) = LOWER(TRIM(COALESCE(v_propiedad.subtipo, '')))) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Estado
    IF v_search.estado IS NOT NULL AND array_length(v_search.estado, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_search.estado) AS e WHERE LOWER(TRIM(e)) = LOWER(TRIM(COALESCE(v_propiedad.estado, '')))) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Ciudad
    IF v_search.ciudad IS NOT NULL AND TRIM(v_search.ciudad) <> '' THEN
      IF LOWER(TRIM(v_search.ciudad)) <> LOWER(TRIM(COALESCE(v_propiedad.ciudad, ''))) THEN CONTINUE; END IF;
    END IF;

    -- Municipio
    IF v_search.municipio IS NOT NULL AND array_length(v_search.municipio, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_search.municipio) AS m WHERE LOWER(TRIM(m)) = LOWER(TRIM(COALESCE(v_propiedad.municipio, '')))) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Colonias
    IF v_search.colonias IS NOT NULL AND array_length(v_search.colonias, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_search.colonias) AS c WHERE LOWER(TRIM(c)) = LOWER(TRIM(COALESCE(v_propiedad.colonia::text, '')))) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Filtros especializados - Comercial
    IF LOWER(TRIM(COALESCE(v_propiedad.tipo, ''))) = 'comercial' THEN
      v_cf := v_search.criterios_busqueda -> 'comercial';
      IF v_cf IS NOT NULL THEN
        IF (v_cf ->> 'tipoUbicacion') IS NOT NULL AND TRIM(v_cf ->> 'tipoUbicacion') <> '' THEN
          IF LOWER(TRIM(v_cf ->> 'tipoUbicacion')) <> LOWER(TRIM(COALESCE(v_propiedad.tipo_ubicacion_comercial, ''))) THEN CONTINUE; END IF;
        END IF;
        IF (v_cf ->> 'frenteMin') IS NOT NULL AND TRIM(v_cf ->> 'frenteMin') <> '' THEN
          IF COALESCE(v_propiedad.frente_metros, 0) < (v_cf ->> 'frenteMin')::numeric THEN CONTINUE; END IF;
        END IF;
        IF COALESCE((v_cf ->> 'sobreAvenidaPrincipal')::boolean, FALSE) AND NOT COALESCE(v_propiedad.sobre_avenida_principal, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_cf ->> 'enEsquina')::boolean, FALSE) AND NOT COALESCE(v_propiedad.en_esquina, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_cf ->> 'altaVisibilidad')::boolean, FALSE) AND NOT COALESCE(v_propiedad.alta_visibilidad, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_cf ->> 'altoFlujoVehicular')::boolean, FALSE) AND NOT COALESCE(v_propiedad.alto_flujo_vehicular, FALSE) THEN CONTINUE; END IF;
      END IF;
    END IF;

    -- Filtros especializados - Industrial
    IF LOWER(TRIM(COALESCE(v_propiedad.tipo, ''))) = 'industrial' THEN
      v_inf := v_search.criterios_busqueda -> 'industrial';
      IF v_inf IS NOT NULL THEN
        IF (v_inf ->> 'ubicacion') IS NOT NULL AND TRIM(v_inf ->> 'ubicacion') <> '' THEN
          IF LOWER(TRIM(v_inf ->> 'ubicacion')) <> LOWER(TRIM(COALESCE(v_propiedad.ubicacion_industrial, ''))) THEN CONTINUE; END IF;
        END IF;
        IF (v_inf ->> 'alturaLibre') IS NOT NULL AND TRIM(v_inf ->> 'alturaLibre') <> '' THEN
          IF LOWER(TRIM(v_inf ->> 'alturaLibre')) <> LOWER(TRIM(COALESCE(v_propiedad.altura_libre_m, ''))) THEN CONTINUE; END IF;
        END IF;
        IF jsonb_typeof(v_inf -> 'energiaKva') = 'array' AND jsonb_array_length(v_inf -> 'energiaKva') > 0 THEN
          IF v_propiedad.tipo_energia_kva IS NULL OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_inf -> 'energiaKva') req_e WHERE req_e = ANY(v_propiedad.tipo_energia_kva)
          ) THEN CONTINUE; END IF;
        END IF;
        IF (v_inf ->> 'areaOficinasMin') IS NOT NULL AND TRIM(v_inf ->> 'areaOficinasMin') <> '' THEN
          IF COALESCE(v_propiedad.area_oficinas_m2, 0) < (v_inf ->> 'areaOficinasMin')::numeric THEN CONTINUE; END IF;
        END IF;
        IF (v_inf ->> 'patioManiobrasMin') IS NOT NULL AND TRIM(v_inf ->> 'patioManiobrasMin') <> '' THEN
          IF COALESCE(v_propiedad.patio_maniobras_m2, 0) < (v_inf ->> 'patioManiobrasMin')::numeric THEN CONTINUE; END IF;
        END IF;
      END IF;
    END IF;

    -- Filtros especializados - Agricola
    IF LOWER(TRIM(COALESCE(v_propiedad.tipo, ''))) = 'agricola' THEN
      v_ag := v_search.criterios_busqueda -> 'agricola';
      IF v_ag IS NOT NULL THEN
        IF jsonb_typeof(v_ag -> 'tiposAgua') = 'array' AND jsonb_array_length(v_ag -> 'tiposAgua') > 0 THEN
          IF v_propiedad.tipo_agua IS NULL OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_ag -> 'tiposAgua') req_a WHERE req_a = ANY(v_propiedad.tipo_agua)
          ) THEN CONTINUE; END IF;
        END IF;
        IF COALESCE((v_ag ->> 'concesionAgua')::boolean, FALSE) AND NOT COALESCE(v_propiedad.concesion_agua, FALSE) THEN CONTINUE; END IF;
        IF (v_ag ->> 'usoTerreno') IS NOT NULL AND TRIM(v_ag ->> 'usoTerreno') <> '' THEN
          IF LOWER(TRIM(v_ag ->> 'usoTerreno')) <> LOWER(TRIM(COALESCE(v_propiedad.uso_terreno, ''))) THEN CONTINUE; END IF;
        END IF;
        IF (v_ag ->> 'tipoRiego') IS NOT NULL AND TRIM(v_ag ->> 'tipoRiego') <> '' THEN
          IF LOWER(TRIM(v_ag ->> 'tipoRiego')) <> LOWER(TRIM(COALESCE(v_propiedad.tipo_riego, ''))) THEN CONTINUE; END IF;
        END IF;
        IF COALESCE((v_ag ->> 'electricidad')::boolean, FALSE) AND NOT COALESCE(v_propiedad.infra_electricidad, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'caminoAcceso')::boolean, FALSE) AND NOT COALESCE(v_propiedad.infra_camino_acceso, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'cercado')::boolean, FALSE) AND NOT COALESCE(v_propiedad.infra_cercado, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'pieCarretera')::boolean, FALSE) AND NOT COALESCE(v_propiedad.acceso_carretera, FALSE) THEN CONTINUE; END IF;
        IF COALESCE((v_ag ->> 'accesCamiones')::boolean, FALSE) AND NOT COALESCE(v_propiedad.acceso_camiones, FALSE) THEN CONTINUE; END IF;
      END IF;
    END IF;

    -- Comision minima de venta
    IF v_search.comision_venta_min IS NOT NULL AND v_search.comision_venta_min > 0
       AND LOWER(TRIM(COALESCE(v_tipo_op, ''))) = 'venta' THEN
      IF v_comision_porcentaje < v_search.comision_venta_min THEN CONTINUE; END IF;
    END IF;

    -- Comision minima de renta (meses)
    IF v_search.comision_renta_min IS NOT NULL AND v_search.comision_renta_min > 0
       AND LOWER(TRIM(COALESCE(v_tipo_op, ''))) = 'renta' THEN
      IF v_comision_meses < v_search.comision_renta_min THEN CONTINUE; END IF;
    END IF;

    -- Poligonos (point-in-polygon PostGIS)
    IF v_search.polygon_coords IS NOT NULL
       AND jsonb_typeof(v_search.polygon_coords) = 'array'
       AND jsonb_array_length(v_search.polygon_coords) > 0
       AND v_propiedad.latitud IS NOT NULL AND v_propiedad.longitud IS NOT NULL THEN

      v_punto := ST_SetSRID(ST_MakePoint(v_propiedad.longitud::float, v_propiedad.latitud::float), 4326);
      v_in_polygon := FALSE;

      FOR v_polygon IN SELECT value FROM jsonb_array_elements(v_search.polygon_coords) LOOP
        IF jsonb_typeof(v_polygon) = 'array' AND jsonb_array_length(v_polygon) >= 3 THEN
          BEGIN
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(pts.geom ORDER BY pts.ord)), 4326)
            INTO v_ring_geom
            FROM (
              SELECT ST_MakePoint((coord.value->>'longitude')::float, (coord.value->>'latitude')::float) AS geom, coord.ord AS ord
              FROM jsonb_array_elements(v_polygon) WITH ORDINALITY AS coord(value, ord)
              UNION ALL
              SELECT ST_MakePoint((v_polygon->0->>'longitude')::float, (v_polygon->0->>'latitude')::float), 999999
            ) pts;
            IF v_ring_geom IS NOT NULL AND ST_Contains(v_ring_geom, v_punto) THEN
              v_in_polygon := TRUE; EXIT;
            END IF;
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      END LOOP;
      IF NOT v_in_polygon THEN CONTINUE; END IF;
    END IF;

    -- Coincidencia exacta
    IF (
      (v_search.precio_min IS NULL OR v_search.precio_min = 0 OR v_precio >= v_search.precio_min)
      AND (v_search.precio_max IS NULL OR v_search.precio_max = 0 OR v_precio <= v_search.precio_max)
      AND (v_search.habitaciones IS NULL OR COALESCE(v_propiedad.habitaciones, 0) >= v_search.habitaciones)
      AND (v_search.banos IS NULL OR COALESCE(v_propiedad.banos, 0) >= v_search.banos)
      AND (v_search.estacionamientos IS NULL OR COALESCE(v_propiedad.estacionamientos, 0) >= v_search.estacionamientos)
      AND (v_search.pisos IS NULL OR v_search.pisos = 0 OR COALESCE(v_propiedad.pisos, 0) >= v_search.pisos)
      AND (v_search.metros_terreno IS NULL OR v_search.metros_terreno = 0 OR COALESCE(v_propiedad.metros_cuadrados_terreno, 0) >= v_search.metros_terreno)
      AND (v_search.metros_terreno_max IS NULL OR v_search.metros_terreno_max = 0 OR COALESCE(v_propiedad.metros_cuadrados_terreno, 0) <= v_search.metros_terreno_max)
      AND (v_search.metros_construccion IS NULL OR v_search.metros_construccion = 0 OR COALESCE(v_propiedad.metros_cuadrados_construccion, 0) >= v_search.metros_construccion)
      AND (v_search.metros_construccion_max IS NULL OR v_search.metros_construccion_max = 0 OR COALESCE(v_propiedad.metros_cuadrados_construccion, 0) <= v_search.metros_construccion_max)
    ) THEN v_match_type := 'coincidencia'; END IF;

    -- Similar (precio +/-15%, m2 >=85%, habitaciones/banos/pisos tolerancia 1)
    IF v_match_type IS NULL THEN
      v_pmin := COALESCE(NULLIF(v_search.precio_min, 0) * 0.85, 0);
      v_pmax := COALESCE(NULLIF(v_search.precio_max, 0) * 1.15, 999999999999);
      IF v_precio BETWEEN v_pmin AND v_pmax
         AND (v_search.habitaciones IS NULL OR COALESCE(v_propiedad.habitaciones, 0) >= GREATEST(v_search.habitaciones - 1, 0))
         AND (v_search.banos IS NULL OR COALESCE(v_propiedad.banos, 0) >= GREATEST(v_search.banos - 1, 0))
         AND (v_search.pisos IS NULL OR v_search.pisos = 0 OR COALESCE(v_propiedad.pisos, 0) >= GREATEST(v_search.pisos - 1, 1))
         AND (v_search.metros_terreno IS NULL OR v_search.metros_terreno = 0 OR COALESCE(v_propiedad.metros_cuadrados_terreno, 0) >= v_search.metros_terreno * 0.85)
         AND (v_search.metros_construccion IS NULL OR v_search.metros_construccion = 0 OR COALESCE(v_propiedad.metros_cuadrados_construccion, 0) >= v_search.metros_construccion * 0.85)
      THEN v_match_type := 'similar'; END IF;
    END IF;

    IF v_match_type IS NOT NULL THEN
      v_detalle_text := CASE WHEN v_match_type = 'coincidencia' THEN 'Cumple con todos tus filtros' ELSE 'Cerca de tus preferencias de precio y espacio' END;
      INSERT INTO public.matches (propiedad_id, busqueda_id, usuario_id, tipo_match, activo, estado, detalle, created_at)
      VALUES (p_propiedad_id, v_search.id, v_search.usuario_id, v_match_type, TRUE, 'pendiente', jsonb_build_object('mensaje', v_detalle_text), NOW())
      ON CONFLICT (propiedad_id, busqueda_id) DO UPDATE SET
        tipo_match = EXCLUDED.tipo_match, activo = TRUE,
        estado = CASE WHEN matches.estado IN ('descartado', 'contactado', 'visto') THEN matches.estado ELSE 'pendiente' END,
        detalle = EXCLUDED.detalle, created_at = matches.created_at;
    ELSE
      UPDATE public.matches SET activo = FALSE
      WHERE propiedad_id = p_propiedad_id AND busqueda_id = v_search.id AND activo = TRUE;
    END IF;

  END LOOP;
END;
$func$;

-- 3. Actualizar handle_property_change_match: agregar campos especializados al trigger
CREATE OR REPLACE FUNCTION public.handle_property_change_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF (TG_OP = 'INSERT')
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.activo IS DISTINCT FROM NEW.activo
     OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
     OR OLD.tipo IS DISTINCT FROM NEW.tipo
     OR OLD.subtipo IS DISTINCT FROM NEW.subtipo
     OR OLD.estado IS DISTINCT FROM NEW.estado
     OR OLD.ciudad IS DISTINCT FROM NEW.ciudad
     OR OLD.municipio IS DISTINCT FROM NEW.municipio
     OR OLD.colonia IS DISTINCT FROM NEW.colonia
     OR OLD.latitud IS DISTINCT FROM NEW.latitud
     OR OLD.longitud IS DISTINCT FROM NEW.longitud
     OR OLD.habitaciones IS DISTINCT FROM NEW.habitaciones
     OR OLD.banos IS DISTINCT FROM NEW.banos
     OR OLD.estacionamientos IS DISTINCT FROM NEW.estacionamientos
     OR OLD.pisos IS DISTINCT FROM NEW.pisos
     OR OLD.metros_cuadrados_construccion IS DISTINCT FROM NEW.metros_cuadrados_construccion
     OR OLD.metros_cuadrados_terreno IS DISTINCT FROM NEW.metros_cuadrados_terreno
     -- Comercial
     OR OLD.tipo_ubicacion_comercial IS DISTINCT FROM NEW.tipo_ubicacion_comercial
     OR OLD.frente_metros IS DISTINCT FROM NEW.frente_metros
     OR OLD.nivel_piso IS DISTINCT FROM NEW.nivel_piso
     OR OLD.sobre_avenida_principal IS DISTINCT FROM NEW.sobre_avenida_principal
     OR OLD.en_esquina IS DISTINCT FROM NEW.en_esquina
     OR OLD.alta_visibilidad IS DISTINCT FROM NEW.alta_visibilidad
     OR OLD.alto_flujo_vehicular IS DISTINCT FROM NEW.alto_flujo_vehicular
     -- Industrial
     OR OLD.ubicacion_industrial IS DISTINCT FROM NEW.ubicacion_industrial
     OR OLD.altura_libre_m IS DISTINCT FROM NEW.altura_libre_m
     OR OLD.tipo_energia_kva IS DISTINCT FROM NEW.tipo_energia_kva
     OR OLD.area_oficinas_m2 IS DISTINCT FROM NEW.area_oficinas_m2
     OR OLD.patio_maniobras_m2 IS DISTINCT FROM NEW.patio_maniobras_m2
     -- Agricola
     OR OLD.tipo_agua IS DISTINCT FROM NEW.tipo_agua
     OR OLD.concesion_agua IS DISTINCT FROM NEW.concesion_agua
     OR OLD.uso_terreno IS DISTINCT FROM NEW.uso_terreno
     OR OLD.tipo_riego IS DISTINCT FROM NEW.tipo_riego
     OR OLD.infra_electricidad IS DISTINCT FROM NEW.infra_electricidad
     OR OLD.infra_camino_acceso IS DISTINCT FROM NEW.infra_camino_acceso
     OR OLD.infra_cercado IS DISTINCT FROM NEW.infra_cercado
     OR OLD.acceso_carretera IS DISTINCT FROM NEW.acceso_carretera
     OR OLD.acceso_camiones IS DISTINCT FROM NEW.acceso_camiones
  THEN
    PERFORM public.evaluate_property_matches(NEW.id);
  END IF;
  RETURN NEW;
END;
$func$;
