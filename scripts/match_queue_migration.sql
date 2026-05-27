-- ================================================================
-- MIGRACIÓN: Sistema de matches escalable con cola de jobs
-- Reemplaza triggers síncronos O(P×S) por arquitectura asíncrona
-- ================================================================


-- ----------------------------------------------------------------
-- PASO 1: Tabla match_jobs (cola de trabajo)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_jobs (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo         text        NOT NULL CHECK (tipo IN ('propiedad_changed', 'busqueda_changed')),
  entity_id    uuid        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_msg    text,
  created_at   timestamptz DEFAULT NOW(),
  processed_at timestamptz
);

-- 1 job pendiente máximo por (tipo, entidad) — evita trabajo duplicado
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_jobs_pending_dedup
  ON public.match_jobs (tipo, entity_id)
  WHERE status = 'pending';

-- Para el procesador: primero los más antiguos
CREATE INDEX IF NOT EXISTS idx_match_jobs_pending_queue
  ON public.match_jobs (created_at ASC)
  WHERE status = 'pending';


-- ----------------------------------------------------------------
-- PASO 2: evaluate_search_matches (búsqueda → propiedades)
-- Función inversa a evaluate_property_matches.
-- Pre-filtra propiedades con SQL (índices) antes del loop fino.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_search_matches(p_busqueda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_search      RECORD;
  v_prop        RECORD;
  v_match_type  text;
  v_detalle_text text;
  v_punto       geometry;
  v_in_polygon  boolean;
  v_polygon     jsonb;
  v_ring_geom   geometry;
  v_pmin        numeric;
  v_pmax        numeric;
  v_cf          jsonb;
  v_inf         jsonb;
  v_ag          jsonb;
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

  -- Guard: búsqueda vacía sin criterios reales
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
  THEN RETURN; END IF;

  -- Iterar propiedades con pre-filtrado SQL (aprovecha índices)
  -- Reduce el espacio de candidatos antes del loop PL/pgSQL fino
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
      -- Pre-filtro: tipo de propiedad
      AND (
        v_search.tipo_propiedad IS NULL OR TRIM(v_search.tipo_propiedad) = ''
        OR LOWER(TRIM(p.tipo)) = LOWER(TRIM(v_search.tipo_propiedad))
      )
      -- Pre-filtro: estado
      AND (
        v_search.estado IS NULL OR array_length(v_search.estado, 1) IS NULL
        OR LOWER(TRIM(p.estado)) = ANY(
          SELECT LOWER(TRIM(e)) FROM unnest(v_search.estado) AS e
        )
      )
      -- Pre-filtro: ciudad
      AND (
        v_search.ciudad IS NULL OR TRIM(v_search.ciudad) = ''
        OR LOWER(TRIM(p.ciudad)) = LOWER(TRIM(v_search.ciudad))
      )
      -- Pre-filtro: municipio
      AND (
        v_search.municipio IS NULL OR array_length(v_search.municipio, 1) IS NULL
        OR LOWER(TRIM(p.municipio)) = ANY(
          SELECT LOWER(TRIM(m)) FROM unnest(v_search.municipio) AS m
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

    -- Subtipo (fine-grained, no se puede pre-filtrar eficientemente con array)
    IF v_search.subtipo IS NOT NULL AND array_length(v_search.subtipo, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.subtipo) AS s
        WHERE LOWER(TRIM(s)) = LOWER(TRIM(COALESCE(v_prop.subtipo, '')))
      ) THEN CONTINUE; END IF;
    END IF;

    -- Colonias
    IF v_search.colonias IS NOT NULL AND array_length(v_search.colonias, 1) > 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM unnest(v_search.colonias) AS c
        WHERE LOWER(TRIM(c)) = LOWER(TRIM(COALESCE(v_prop.colonia::text, '')))
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

    -- Polígonos (point-in-polygon PostGIS)
    IF v_search.polygon_coords IS NOT NULL
       AND jsonb_typeof(v_search.polygon_coords) = 'array'
       AND jsonb_array_length(v_search.polygon_coords) > 0
       AND v_prop.latitud IS NOT NULL AND v_prop.longitud IS NOT NULL
    THEN
      v_punto := ST_SetSRID(ST_MakePoint(v_prop.longitud::float, v_prop.latitud::float), 4326);
      v_in_polygon := FALSE;

      FOR v_polygon IN SELECT value FROM jsonb_array_elements(v_search.polygon_coords) LOOP
        IF jsonb_typeof(v_polygon) = 'array' AND jsonb_array_length(v_polygon) >= 3 THEN
          BEGIN
            SELECT ST_SetSRID(ST_MakePolygon(ST_MakeLine(pts.geom ORDER BY pts.ord)), 4326)
            INTO v_ring_geom
            FROM (
              SELECT ST_MakePoint((coord.value->>'longitude')::float, (coord.value->>'latitude')::float) AS geom,
                     coord.ord AS ord
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
$func$;


-- ----------------------------------------------------------------
-- PASO 3: process_match_jobs (procesador de la cola, llamado por pg_cron)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_match_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_job    RECORD;
  v_count  int := 0;
  v_errors int := 0;
BEGIN
  FOR v_job IN
    SELECT * FROM public.match_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.match_jobs SET status = 'processing' WHERE id = v_job.id;

    BEGIN
      IF v_job.tipo = 'propiedad_changed' THEN
        PERFORM public.evaluate_property_matches(v_job.entity_id);
      ELSIF v_job.tipo = 'busqueda_changed' THEN
        PERFORM public.evaluate_search_matches(v_job.entity_id);
      END IF;

      UPDATE public.match_jobs
      SET status = 'done', processed_at = NOW()
      WHERE id = v_job.id;

      v_count := v_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.match_jobs
      SET status = 'error', error_msg = SQLERRM, processed_at = NOW()
      WHERE id = v_job.id;
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', v_count, 'errors', v_errors);
END;
$func$;


-- ----------------------------------------------------------------
-- PASO 4: Triggers ligeros O(1) — solo encolan, no procesan
-- ----------------------------------------------------------------

-- Trigger de propiedades (reemplaza el que llamaba evaluate_property_matches directamente)
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
     OR OLD.tipo_ubicacion_comercial IS DISTINCT FROM NEW.tipo_ubicacion_comercial
     OR OLD.frente_metros IS DISTINCT FROM NEW.frente_metros
     OR OLD.sobre_avenida_principal IS DISTINCT FROM NEW.sobre_avenida_principal
     OR OLD.en_esquina IS DISTINCT FROM NEW.en_esquina
     OR OLD.alta_visibilidad IS DISTINCT FROM NEW.alta_visibilidad
     OR OLD.alto_flujo_vehicular IS DISTINCT FROM NEW.alto_flujo_vehicular
     OR OLD.ubicacion_industrial IS DISTINCT FROM NEW.ubicacion_industrial
     OR OLD.altura_libre_m IS DISTINCT FROM NEW.altura_libre_m
     OR OLD.tipo_energia_kva IS DISTINCT FROM NEW.tipo_energia_kva
     OR OLD.area_oficinas_m2 IS DISTINCT FROM NEW.area_oficinas_m2
     OR OLD.patio_maniobras_m2 IS DISTINCT FROM NEW.patio_maniobras_m2
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
    INSERT INTO public.match_jobs (tipo, entity_id)
    VALUES ('propiedad_changed', NEW.id)
    ON CONFLICT (tipo, entity_id) WHERE status = 'pending' DO NOTHING;
  END IF;
  RETURN NEW;
END;
$func$;

-- Trigger de operaciones_propiedad (reemplaza handle_new_property_match)
CREATE OR REPLACE FUNCTION public.handle_new_property_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  INSERT INTO public.match_jobs (tipo, entity_id)
  VALUES ('propiedad_changed', NEW.propiedad_id)
  ON CONFLICT (tipo, entity_id) WHERE status = 'pending' DO NOTHING;
  RETURN NEW;
END;
$func$;

-- Trigger de búsquedas guardadas
CREATE OR REPLACE FUNCTION public.handle_search_change_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  -- Desactivación inmediata (operación rápida, no hay que diferir)
  IF (NEW.activa = FALSE OR NEW.deleted_at IS NOT NULL) THEN
    UPDATE public.matches
       SET activo = FALSE
     WHERE busqueda_id = NEW.id AND activo = TRUE;
    RETURN NEW;
  END IF;

  -- Activación / edición: encolar para procesamiento asíncrono
  INSERT INTO public.match_jobs (tipo, entity_id)
  VALUES ('busqueda_changed', NEW.id)
  ON CONFLICT (tipo, entity_id) WHERE status = 'pending' DO NOTHING;

  RETURN NEW;
END;
$func$;


-- ----------------------------------------------------------------
-- PASO 5: pg_cron — procesar jobs cada 1 minuto
-- ----------------------------------------------------------------

-- Eliminar schedules anteriores si existen
SELECT cron.unschedule('process-match-jobs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-match-jobs'
);

SELECT cron.schedule(
  'process-match-jobs',
  '* * * * *',
  $$SELECT public.process_match_jobs()$$
);

-- Limpiar jobs procesados hace más de 7 días (diario a las 3am)
SELECT cron.unschedule('cleanup-match-jobs')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-match-jobs'
);

SELECT cron.schedule(
  'cleanup-match-jobs',
  '0 3 * * *',
  $$DELETE FROM public.match_jobs WHERE status IN ('done', 'error') AND processed_at < NOW() - INTERVAL '7 days'$$
);
