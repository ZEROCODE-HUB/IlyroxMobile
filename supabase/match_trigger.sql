-- ============================================================================
-- Sistema de matches: trigger + función central reutilizable
-- ----------------------------------------------------------------------------
-- Reescritura completa del matching propiedad ↔ búsqueda guardada.
-- Corrige:
--   * Comparaciones de arrays (estado/municipio/colonias/subtipo) con ANY
--   * Normalización de texto con LOWER(TRIM(...)) para evitar case mismatch
--   * Filtro estricto: la propiedad debe estar Publicada, activa y no borrada
--   * Soporte a polygon_coords del mapa (point-in-polygon con PostGIS)
--   * Rango de m² con techo (metros_construccion_max / metros_terreno_max)
--   * Evita matchear con tus propias propiedades
--   * Rama "similar" más estricta (±15% precio + 85% m² + −1 hab/baño)
--   * Si una propiedad deja de cumplir, desactiva sus matches en lugar de dejarlos
-- ============================================================================

-- ---- Función central reutilizable ------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_property_matches(
  p_propiedad_id uuid,
  p_tipo_operacion text DEFAULT NULL,
  p_precio numeric DEFAULT NULL
) RETURNS void AS $$
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
BEGIN
  -- 1. Cargar propiedad — sólo si publicada, activa y no borrada
  SELECT * INTO v_propiedad
  FROM public.propiedades
  WHERE id = p_propiedad_id
    AND deleted_at IS NULL
    AND COALESCE(activo, FALSE) = TRUE
    AND LOWER(TRIM(COALESCE(status, ''))) = 'publicada';

  IF NOT FOUND THEN
    -- Si la propiedad no es elegible, desactivar todos sus matches existentes
    UPDATE public.matches
       SET activo = FALSE
     WHERE propiedad_id = p_propiedad_id
       AND activo = TRUE;
    RETURN;
  END IF;

  -- 2. Resolver tipo_operacion y precio: usar los pasados o, si no, la primera operación activa
  IF p_tipo_operacion IS NOT NULL AND p_precio IS NOT NULL THEN
    v_tipo_op := p_tipo_operacion;
    v_precio  := p_precio;
  ELSE
    SELECT tipo_operacion, precio INTO v_op
    FROM public.operaciones_propiedad
    WHERE propiedad_id = p_propiedad_id
      AND COALESCE(activa, TRUE) = TRUE
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN;
    END IF;
    v_tipo_op := v_op.tipo_operacion;
    v_precio  := v_op.precio;
  END IF;

  -- 3. Iterar búsquedas guardadas activas
  FOR v_search IN
    SELECT bg.*
    FROM public.busquedas_guardadas bg
    WHERE bg.activa = TRUE
      AND bg.deleted_at IS NULL
      AND bg.usuario_id IS DISTINCT FROM v_propiedad.created_by
      AND (
        bg.tipo_operacion IS NULL
        OR LOWER(TRIM(bg.tipo_operacion::text)) = LOWER(TRIM(COALESCE(v_tipo_op, '')))
      )
  LOOP
    v_match_type := NULL;

    -- ----------------------------------------------------------------
    -- GUARD: ignorar búsquedas totalmente vacías
    -- (sin ningún criterio restrictivo además de tipo_operacion)
    -- ----------------------------------------------------------------
    IF (v_search.tipo_propiedad IS NULL OR TRIM(v_search.tipo_propiedad) = '')
       AND (v_search.subtipo IS NULL OR array_length(v_search.subtipo, 1) IS NULL)
       AND (v_search.estado IS NULL OR array_length(v_search.estado, 1) IS NULL)
       AND (v_search.ciudad IS NULL OR TRIM(v_search.ciudad) = '')
       AND (v_search.municipio IS NULL OR array_length(v_search.municipio, 1) IS NULL)
       AND (v_search.colonias IS NULL OR array_length(v_search.colonias, 1) IS NULL)
       AND (v_search.polygon_coords IS NULL
            OR jsonb_typeof(v_search.polygon_coords) <> 'array'
            OR jsonb_array_length(v_search.polygon_coords) = 0)
       AND COALESCE(v_search.precio_min, 0) = 0
       AND COALESCE(v_search.precio_max, 0) = 0
       AND v_search.habitaciones IS NULL
       AND v_search.banos IS NULL
       AND v_search.estacionamientos IS NULL
       AND COALESCE(v_search.metros_terreno, 0) = 0
       AND COALESCE(v_search.metros_construccion, 0) = 0
    THEN
      CONTINUE;
    END IF;

    -- ----------------------------------------------------------------
    -- FILTROS DUROS (CONTINUE si no cumple)
    -- ----------------------------------------------------------------

    -- tipo de propiedad (habitacional/comercial/industrial/agricola)
    IF v_search.tipo_propiedad IS NOT NULL
       AND TRIM(v_search.tipo_propiedad) <> ''
       AND LOWER(TRIM(v_search.tipo_propiedad)) <> LOWER(TRIM(COALESCE(v_propiedad.tipo, ''))) THEN
      CONTINUE;
    END IF;

    -- subtipo (array en búsqueda, single en propiedad)
    IF v_search.subtipo IS NOT NULL AND array_length(v_search.subtipo, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.subtipo) AS s
        WHERE LOWER(TRIM(s)) = LOWER(TRIM(COALESCE(v_propiedad.subtipo, '')))
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- estado (array vs single)
    IF v_search.estado IS NOT NULL AND array_length(v_search.estado, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.estado) AS e
        WHERE LOWER(TRIM(e)) = LOWER(TRIM(COALESCE(v_propiedad.estado, '')))
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- ciudad (single text)
    IF v_search.ciudad IS NOT NULL AND TRIM(v_search.ciudad) <> '' THEN
      IF LOWER(TRIM(v_search.ciudad)) <> LOWER(TRIM(COALESCE(v_propiedad.ciudad, ''))) THEN
        CONTINUE;
      END IF;
    END IF;

    -- municipio (array vs single)
    IF v_search.municipio IS NOT NULL AND array_length(v_search.municipio, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.municipio) AS m
        WHERE LOWER(TRIM(m)) = LOWER(TRIM(COALESCE(v_propiedad.municipio, '')))
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- colonias (array vs single — la columna se llama colonias, no colonia)
    IF v_search.colonias IS NOT NULL AND array_length(v_search.colonias, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.colonias) AS c
        WHERE LOWER(TRIM(c)) = LOWER(TRIM(COALESCE(v_propiedad.colonia::text, '')))
      ) THEN
        CONTINUE;
      END IF;
    END IF;

    -- Polígonos del mapa (point-in-polygon con PostGIS)
    IF v_search.polygon_coords IS NOT NULL
       AND jsonb_typeof(v_search.polygon_coords) = 'array'
       AND jsonb_array_length(v_search.polygon_coords) > 0
       AND v_propiedad.latitud IS NOT NULL
       AND v_propiedad.longitud IS NOT NULL THEN

      v_punto := ST_SetSRID(
        ST_MakePoint(v_propiedad.longitud::float, v_propiedad.latitud::float),
        4326
      );
      v_in_polygon := FALSE;

      FOR v_polygon IN
        SELECT value FROM jsonb_array_elements(v_search.polygon_coords)
      LOOP
        IF jsonb_typeof(v_polygon) = 'array' AND jsonb_array_length(v_polygon) >= 3 THEN
          BEGIN
            -- Construir polígono cerrado: puntos + repetir el primero al final
            SELECT ST_SetSRID(
              ST_MakePolygon(
                ST_MakeLine(pts.geom ORDER BY pts.ord)
              ),
              4326
            )
            INTO v_ring_geom
            FROM (
              SELECT ST_MakePoint(
                       (coord.value->>'longitude')::float,
                       (coord.value->>'latitude')::float
                     ) AS geom,
                     coord.ord AS ord
              FROM jsonb_array_elements(v_polygon) WITH ORDINALITY AS coord(value, ord)
              UNION ALL
              SELECT ST_MakePoint(
                       (v_polygon->0->>'longitude')::float,
                       (v_polygon->0->>'latitude')::float
                     ),
                     999999
            ) pts;

            IF v_ring_geom IS NOT NULL AND ST_Contains(v_ring_geom, v_punto) THEN
              v_in_polygon := TRUE;
              EXIT;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            -- Polígono malformado, ignorar
            NULL;
          END;
        END IF;
      END LOOP;

      IF NOT v_in_polygon THEN
        CONTINUE;
      END IF;
    END IF;

    -- ----------------------------------------------------------------
    -- COINCIDENCIA EXACTA
    -- ----------------------------------------------------------------
    IF (
       (v_search.precio_min IS NULL OR v_search.precio_min = 0 OR v_precio >= v_search.precio_min)
       AND (v_search.precio_max IS NULL OR v_search.precio_max = 0 OR v_precio <= v_search.precio_max)
       AND (v_search.habitaciones IS NULL OR COALESCE(v_propiedad.habitaciones, 0) >= v_search.habitaciones)
       AND (v_search.banos IS NULL OR COALESCE(v_propiedad.banos, 0) >= v_search.banos)
       AND (v_search.estacionamientos IS NULL OR COALESCE(v_propiedad.estacionamientos, 0) >= v_search.estacionamientos)
       AND (v_search.metros_terreno IS NULL OR v_search.metros_terreno = 0 OR COALESCE(v_propiedad.metros_cuadrados_terreno, 0) >= v_search.metros_terreno)
       AND (v_search.metros_terreno_max IS NULL OR v_search.metros_terreno_max = 0 OR COALESCE(v_propiedad.metros_cuadrados_terreno, 0) <= v_search.metros_terreno_max)
       AND (v_search.metros_construccion IS NULL OR v_search.metros_construccion = 0 OR COALESCE(v_propiedad.metros_cuadrados_construccion, 0) >= v_search.metros_construccion)
       AND (v_search.metros_construccion_max IS NULL OR v_search.metros_construccion_max = 0 OR COALESCE(v_propiedad.metros_cuadrados_construccion, 0) <= v_search.metros_construccion_max)
    ) THEN
       v_match_type := 'coincidencia';
    END IF;

    -- ----------------------------------------------------------------
    -- SIMILAR (precio ±15%, m² ≥85%, recámaras/baños tolerancia 1)
    -- ----------------------------------------------------------------
    IF v_match_type IS NULL THEN
      v_pmin := COALESCE(NULLIF(v_search.precio_min, 0) * 0.85, 0);
      v_pmax := COALESCE(NULLIF(v_search.precio_max, 0) * 1.15, 999999999999);

      IF v_precio BETWEEN v_pmin AND v_pmax
         AND (v_search.habitaciones IS NULL OR COALESCE(v_propiedad.habitaciones, 0) >= GREATEST(v_search.habitaciones - 1, 0))
         AND (v_search.banos IS NULL OR COALESCE(v_propiedad.banos, 0) >= GREATEST(v_search.banos - 1, 0))
         AND (v_search.metros_terreno IS NULL OR v_search.metros_terreno = 0
              OR COALESCE(v_propiedad.metros_cuadrados_terreno, 0) >= v_search.metros_terreno * 0.85)
         AND (v_search.metros_construccion IS NULL OR v_search.metros_construccion = 0
              OR COALESCE(v_propiedad.metros_cuadrados_construccion, 0) >= v_search.metros_construccion * 0.85)
      THEN
         v_match_type := 'similar';
      END IF;
    END IF;

    -- ----------------------------------------------------------------
    -- INSERT / UPDATE del match
    -- ----------------------------------------------------------------
    IF v_match_type IS NOT NULL THEN
       v_detalle_text := CASE
         WHEN v_match_type = 'coincidencia' THEN 'Cumple con todos tus filtros'
         ELSE 'Cerca de tus preferencias de precio y espacio'
       END;

       INSERT INTO public.matches (
         propiedad_id, busqueda_id, usuario_id, tipo_match, activo, estado, detalle, created_at
       )
       VALUES (
         p_propiedad_id, v_search.id, v_search.usuario_id, v_match_type, TRUE, 'pendiente',
         jsonb_build_object('mensaje', v_detalle_text), NOW()
       )
       ON CONFLICT (propiedad_id, busqueda_id)
       DO UPDATE SET
         tipo_match = EXCLUDED.tipo_match,
         activo = TRUE,
         -- preservar estados ya tocados por el usuario (visto/contactado/descartado)
         estado = CASE
           WHEN matches.estado IN ('descartado', 'contactado', 'visto')
             THEN matches.estado
           ELSE 'pendiente'
         END,
         detalle = EXCLUDED.detalle,
         created_at = matches.created_at;
    ELSE
       -- La propiedad ya no cumple criterios: desactivar match si existía
       UPDATE public.matches
          SET activo = FALSE
        WHERE propiedad_id = p_propiedad_id
          AND busqueda_id = v_search.id
          AND activo = TRUE;
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---- Trigger: AFTER INSERT/UPDATE en operaciones_propiedad ------------------
CREATE OR REPLACE FUNCTION public.handle_new_property_match()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.evaluate_property_matches(
    NEW.propiedad_id,
    NEW.tipo_operacion::text,
    NEW.precio
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ---- Trigger: AFTER UPDATE en propiedades ----------------------------------
-- Cuando una propiedad cambia status/activo/ubicación/atributos clave,
-- re-evaluar matches (ej. de "Suspendida" → "Publicada", o edita ubicación).
CREATE OR REPLACE FUNCTION public.handle_property_change_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Sólo re-evaluar si cambió algo relevante para matching
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
     OR OLD.metros_cuadrados_construccion IS DISTINCT FROM NEW.metros_cuadrados_construccion
     OR OLD.metros_cuadrados_terreno IS DISTINCT FROM NEW.metros_cuadrados_terreno
     OR OLD.ancho_terreno IS DISTINCT FROM NEW.ancho_terreno
     OR OLD.largo_terreno IS DISTINCT FROM NEW.largo_terreno
  THEN
    PERFORM public.evaluate_property_matches(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_property_change_match ON public.propiedades;
CREATE TRIGGER on_property_change_match
  AFTER INSERT OR UPDATE ON public.propiedades
  FOR EACH ROW EXECUTE FUNCTION public.handle_property_change_match();


-- ---- Trigger: AFTER UPDATE en busquedas_guardadas --------------------------
-- Cuando una búsqueda se modifica/reactiva, re-evaluar contra propiedades
-- existentes para crear los matches que correspondan.
CREATE OR REPLACE FUNCTION public.handle_search_change_match()
RETURNS TRIGGER AS $$
DECLARE
  v_prop RECORD;
BEGIN
  -- Si la búsqueda se desactivó o borró, marcar inactivos sus matches
  IF (NEW.activa = FALSE OR NEW.deleted_at IS NOT NULL) THEN
    UPDATE public.matches
       SET activo = FALSE
     WHERE busqueda_id = NEW.id
       AND activo = TRUE;
    RETURN NEW;
  END IF;

  -- Si la búsqueda está activa: barrer propiedades publicadas (top N recientes)
  -- y evaluar contra esta búsqueda específicamente. Para no hacer un cruce
  -- masivo, reusamos evaluate_property_matches con cada propiedad publicada
  -- creada por OTROS usuarios.
  FOR v_prop IN
    SELECT id FROM public.propiedades
    WHERE deleted_at IS NULL
      AND COALESCE(activo, FALSE) = TRUE
      AND LOWER(TRIM(COALESCE(status, ''))) = 'publicada'
      AND created_by IS DISTINCT FROM NEW.usuario_id
    ORDER BY created_at DESC
    LIMIT 500
  LOOP
    PERFORM public.evaluate_property_matches(v_prop.id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_search_change_match ON public.busquedas_guardadas;
CREATE TRIGGER on_search_change_match
  AFTER INSERT OR UPDATE ON public.busquedas_guardadas
  FOR EACH ROW EXECUTE FUNCTION public.handle_search_change_match();
