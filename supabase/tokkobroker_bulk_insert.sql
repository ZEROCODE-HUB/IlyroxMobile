-- ============================================================================
-- Importación de Tokko Broker (v14, 19/10/2026).
-- Versión anterior (v13) respaldada en supabase/backups/2026-10-19-prod/.
-- Cambios v14:
--  - Operación por operation_id (1 venta, 2 renta, 3 renta temporal): la API
--    se pide en español y operation_type llega traducido ("Alquiler").
--  - Ubicación desde location.full_location (estado, municipio, colonia).
--  - Recámaras desde suite_amount; superficies "0.00" -> NULL.
--  - Descripción completa (description) en lugar del título.
--  - Tipo/subtipo traducidos al catálogo con mapear_tipo_subtipo.
--  - Altas ocultas (activo=false, sin_comision=true) hasta capturar comisión.
--  - Al actualizar también reescribe tipo, subtipo, estado, colonia y código.
-- Requiere: supabase/mapear_tipo_subtipo.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tokko_tipo_operacion(p_op jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_op->>'operation_id' = '1' THEN 'venta'
    WHEN p_op->>'operation_id' IN ('2', '3') THEN 'renta'
    WHEN LOWER(COALESCE(p_op->>'operation_type', '')) IN
         ('rent', 'temporary_rent', 'temporary rent', 'alquiler', 'alquiler temporario', 'renta') THEN 'renta'
    ELSE 'venta'
  END
$function$;

CREATE OR REPLACE FUNCTION public.bulk_insertar_propiedades_tokkobroker_full(p_usuario_id uuid, p_propiedades jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_propiedades JSONB;
    v_count INTEGER := 0;
    v_count_nuevas INTEGER := 0;
    v_count_actualizadas INTEGER := 0;
    v_count_sin_cambios INTEGER := 0;
    v_tokko_ids TEXT[];
    v_total_api INTEGER := 0;
BEGIN
    IF p_propiedades IS NULL THEN
        v_propiedades := NULL;
    ELSIF jsonb_typeof(p_propiedades) = 'array' THEN
        v_propiedades := p_propiedades;
    ELSE
        v_propiedades := p_propiedades::jsonb;
    END IF;

    IF v_propiedades IS NULL OR jsonb_array_length(v_propiedades) = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'count', 0,
            'nuevas', 0,
            'actualizadas', 0,
            'sin_cambios', 0,
            'total_api', 0
        );
    END IF;

    v_total_api := jsonb_array_length(v_propiedades);

    -- Extract all tokkobroker_ids from API response
    SELECT ARRAY_AGG(elem->>'id')
    INTO v_tokko_ids
    FROM jsonb_array_elements(v_propiedades) elem
    WHERE elem->>'id' IS NOT NULL AND elem->>'id' != '';

    -- Get existing properties with their local tokkobroker_updated_at AND deleted_at
    WITH existing_props AS (
        SELECT tokkobroker_id, tokkobroker_updated_at, deleted_at
        FROM propiedades
        WHERE created_by = p_usuario_id
          AND tokkobroker_id = ANY(v_tokko_ids)
    ),
    -- Parse all data from JSON once
    base_data AS (
        SELECT
            (elem->>'id') as tokkobroker_id,
            elem,
            -- v13 FIX: comparacion case-insensitive (LOWER). check_tipo_operacion
            --          solo permite 'venta'/'renta' en minusculas.
            public.tokko_tipo_operacion(elem->'operations'->0) as operacion_tokko,
            COALESCE(
                NULLIF(elem->'operations'->0->'prices'->0->>'price', '')::NUMERIC,
                (elem->'operations'->0->'prices'->0->>'price')::NUMERIC,
                0
            ) as precio_contrato,
            COALESCE(
                NULLIF(elem->'operations'->0->'prices'->0->>'currency', ''),
                'MXN'
            ) as moneda_contrato,
            COALESCE(NULLIF(BTRIM(elem->>'description'), ''), NULLIF(elem->>'publication_title', ''), 'Sin título') as descripcion,
            COALESCE(NULLIF(elem->>'address', ''), '') as calle,
            COALESCE(NULLIF(elem->>'reference_code', ''), (elem->>'id')) as codigo_propiedad,
            NULLIF(elem->>'geo_lat', '')::NUMERIC(10,8) as geo_lat,
            NULLIF(elem->>'geo_long', '')::NUMERIC(11,8) as geo_long,
            COALESCE(NULLIF(elem->'type'->>'name', ''), 'Casa') as tipo_nombre,
            elem->'type'->>'code' as tipo_codigo,
            -- Tokko: suite_amount = recámaras (bedrooms no existe en la API).
            COALESCE(NULLIF(elem->>'suite_amount', '')::INTEGER, NULLIF(elem->>'bedrooms', '')::INTEGER, 0) as habitaciones,
            COALESCE((elem->>'bathroom_amount')::INTEGER, 0) as banos,
            COALESCE((elem->>'parking_lot_amount')::INTEGER, 0) as estacionamientos,
            -- Tokko manda "0.00" cuando no tiene el dato.
            NULLIF(NULLIF(elem->>'surface', '')::NUMERIC(10,2), 0) as metros_terreno,
            COALESCE(
                NULLIF(NULLIF(elem->>'roofed_surface', '')::NUMERIC(10,2), 0),
                NULLIF(NULLIF(elem->>'total_surface', '')::NUMERIC(10,2), 0)
            ) as metros_construccion,
            elem->>'age' as antiguedad,
            COALESCE((elem->>'toilet_amount')::INTEGER, 0) as medios_banos,
            COALESCE((elem->>'floors_amount')::INTEGER, 0) as pisos,
            COALESCE(NULLIF(elem->'location'->>'zip_code', ''), (elem->>'zip_code')) as codigo_postal,
            (
                SELECT array_agg(
                    COALESCE(
                        NULLIF(v->>'url', ''),
                        NULLIF(v->>'image', ''),
                        NULLIF(v->>'link', '')
                    )
                )
                FROM jsonb_array_elements(
                    CASE
                        WHEN jsonb_typeof(elem->'videos') = 'array' THEN elem->'videos'
                        ELSE '[]'::jsonb
                    END
                ) v
                WHERE COALESCE(
                    NULLIF(v->>'url', ''),
                    NULLIF(v->>'image', ''),
                    NULLIF(v->>'link', '')
                ) IS NOT NULL
            ) as videos_array,
            (
                SELECT array_agg(img->>'image')
                FROM jsonb_array_elements(
                    CASE
                        WHEN jsonb_typeof(elem->'photos') = 'array' THEN elem->'photos'
                        ELSE '[]'::jsonb
                    END
                ) img
                WHERE img->>'image' IS NOT NULL
            ) as fotos_array,
            (
                SELECT array_agg(tag->>'name')
                FROM jsonb_array_elements(
                    CASE
                        WHEN jsonb_typeof(elem->'tags') = 'array' THEN elem->'tags'
                        ELSE '[]'::jsonb
                    END
                ) tag
                WHERE tag->>'name' IS NOT NULL
            ) as tags_array,
            -- Ubicación desde full_location: "México | Estado | Municipio | Colonia".
            -- (location.name es la colonia, o el municipio si no hay colonia.)
            NULLIF(TRIM(SPLIT_PART(COALESCE(NULLIF(elem->'location'->>'full_location', ''), elem->'location'->>'short_location', ''), '|', 2)), '') as estado,
            NULLIF(TRIM(SPLIT_PART(COALESCE(NULLIF(elem->'location'->>'full_location', ''), elem->'location'->>'short_location', ''), '|', 3)), '') as municipio,
            NULLIF(TRIM(SPLIT_PART(COALESCE(NULLIF(elem->'location'->>'full_location', ''), elem->'location'->>'short_location', ''), '|', 3)), '') as ciudad,
            NULLIF(TRIM(SPLIT_PART(COALESCE(NULLIF(elem->'location'->>'full_location', ''), elem->'location'->>'short_location', ''), '|', 4)), '') as colonia,
            elem->>'created_at' as created_at,
            elem->>'updated_at' as updated_at,
            NULLIF(elem->>'updated_at', '')::TIMESTAMPTZ as tokko_updated_at,
            ep.tokkobroker_updated_at as local_updated_at,
            ep.deleted_at as local_deleted_at,
            ep.tokkobroker_id IS NOT NULL as exists_locally
        FROM jsonb_array_elements(v_propiedades) elem
        LEFT JOIN existing_props ep ON ep.tokkobroker_id = (elem->>'id')
        WHERE elem->>'id' IS NOT NULL AND elem->>'id' != ''
    ),
    -- Count sin_cambios: only if NOT deleted and timestamps match
    sin_cambios_calc AS (
        SELECT COUNT(*) as cnt
        FROM base_data
        WHERE exists_locally
          AND local_deleted_at IS NULL
          AND tokko_updated_at IS NOT NULL
          AND local_updated_at IS NOT NULL
          AND tokko_updated_at <= local_updated_at
    ),
    -- Properties that need processing (new, deleted, or updated)
    properties_to_process AS (
        SELECT *
        FROM base_data
        WHERE NOT exists_locally
           OR (local_deleted_at IS NOT NULL)
           OR (tokko_updated_at > local_updated_at)
    ),
    -- Insert/update propiedades and get counts
    inserted AS (
        INSERT INTO propiedades (
            created_by, tokkobroker_id, es_tokkobroker, tokkobroker_updated_at,
            descripcion, calle, codigo_propiedad,
            latitud, longitud, tipo, subtipo,
            tipo_contrato, precio_contrato, moneda_contrato,
            habitaciones, banos, estacionamientos,
            metros_cuadrados_terreno, metros_cuadrados_construccion,
            antiguedad, fotos, caracteristicas_especificas,
            status, activo, sin_comision, amueblado, pet_friendly,
            medios_banos, pisos, codigo_postal, videos,
            municipio, ciudad, estado, colonia
        )
        SELECT
            p_usuario_id,
            tokkobroker_id,
            TRUE,
            COALESCE(tokko_updated_at, NULLIF(created_at, '')::TIMESTAMPTZ, NOW()),
            descripcion,
            calle,
            codigo_propiedad,
            geo_lat,
            geo_long,
            mts.tipo,
            COALESCE(mts.subtipo, tipo_nombre),
            operacion_tokko,
            precio_contrato::TEXT,
            moneda_contrato,
            habitaciones,
            banos,
            estacionamientos,
            metros_terreno,
            metros_construccion,
            antiguedad,
            fotos_array,
            tags_array,
            'Publicada',
            -- Tokko no manda comisión: entran ocultas hasta que el asesor la capture
            -- (regla "activo = Publicada y con comisión").
            FALSE,
            TRUE,
            'No',
            'No',
            medios_banos,
            pisos,
            codigo_postal,
            videos_array,
            municipio,
            ciudad,
            estado,
            colonia
        FROM properties_to_process
        CROSS JOIN LATERAL public.mapear_tipo_subtipo(tipo_nombre, tipo_codigo, colonia, metros_terreno) mts
        ON CONFLICT (created_by, tokkobroker_id) DO UPDATE SET
            descripcion = EXCLUDED.descripcion,
            calle = EXCLUDED.calle,
            latitud = EXCLUDED.latitud,
            longitud = EXCLUDED.longitud,
            tipo_contrato = EXCLUDED.tipo_contrato,
            precio_contrato = EXCLUDED.precio_contrato,
            moneda_contrato = EXCLUDED.moneda_contrato,
            habitaciones = EXCLUDED.habitaciones,
            banos = EXCLUDED.banos,
            estacionamientos = EXCLUDED.estacionamientos,
            medios_banos = EXCLUDED.medios_banos,
            pisos = EXCLUDED.pisos,
            codigo_postal = EXCLUDED.codigo_postal,
            videos = EXCLUDED.videos,
            metros_cuadrados_terreno = EXCLUDED.metros_cuadrados_terreno,
            metros_cuadrados_construccion = EXCLUDED.metros_cuadrados_construccion,
            fotos = EXCLUDED.fotos,
            caracteristicas_especificas = EXCLUDED.caracteristicas_especificas,
            tokkobroker_updated_at = EXCLUDED.tokkobroker_updated_at,
            deleted_at = NULL,
            updated_at = NOW(),
            municipio = EXCLUDED.municipio,
            ciudad = EXCLUDED.ciudad,
            estado = EXCLUDED.estado,
            colonia = EXCLUDED.colonia,
            tipo = EXCLUDED.tipo,
            subtipo = EXCLUDED.subtipo,
            codigo_propiedad = EXCLUDED.codigo_propiedad
            -- activo y sin_comision NO se tocan: los controla el asesor.
        RETURNING id, tokkobroker_id, created_at = updated_at as is_new
    ),
    -- Count inserts
    insert_counts AS (
        SELECT
            COUNT(*) as total_count,
            COUNT(*) FILTER (WHERE is_new) as nuevas_count,
            COUNT(*) FILTER (WHERE NOT is_new) as actualizadas_count
        FROM inserted
    )
    -- Get all counts
    SELECT
        COALESCE(ic.total_count, 0),
        COALESCE(ic.nuevas_count, 0),
        COALESCE(ic.actualizadas_count, 0),
        COALESCE(sc.cnt, 0)
    INTO v_count, v_count_nuevas, v_count_actualizadas, v_count_sin_cambios
    FROM insert_counts ic, sin_cambios_calc sc;

    -- v11: Sync ALL operations from the operations[] array into operaciones_propiedad
    IF v_total_api > 0 AND v_tokko_ids IS NOT NULL AND array_length(v_tokko_ids, 1) > 0 THEN

        -- 1) Desactivar operaciones existentes de estas propiedades para limpiar
        --    operaciones que ya no existen en Tokko y evitar duplicados activos.
        UPDATE operaciones_propiedad op
        SET activa = FALSE, updated_at = NOW()
        WHERE op.propiedad_id IN (
            SELECT prop.id
            FROM propiedades prop
            WHERE prop.created_by = p_usuario_id
              AND prop.tokkobroker_id = ANY(v_tokko_ids)
              AND prop.deleted_at IS NULL
        );

        -- 2) Insertar/reactivar TODAS las operaciones (no solo operations[0]).
        --    v13 FIX: LOWER() para tolerar cualquier casing en operation_type.
        WITH ops_to_insert AS (
            SELECT DISTINCT ON (prop.id, public.tokko_tipo_operacion(op))
                prop.id AS propiedad_id,
                public.tokko_tipo_operacion(op) AS tipo_operacion,
                COALESCE(
                    NULLIF(op->'prices'->0->>'price', '')::NUMERIC,
                    (op->'prices'->0->>'price')::NUMERIC,
                    0
                ) AS precio,
                COALESCE(
                    NULLIF(op->'prices'->0->>'currency', ''),
                    'MXN'
                ) AS moneda
            FROM jsonb_array_elements(v_propiedades) elem
            JOIN propiedades prop ON prop.tokkobroker_id = (elem->>'id') AND prop.created_by = p_usuario_id
            CROSS JOIN LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(elem->'operations') = 'array' THEN elem->'operations'
                    ELSE '[]'::jsonb
                END
            ) AS op
            WHERE elem->>'id' IS NOT NULL AND elem->>'id' != ''
              AND prop.deleted_at IS NULL
        )
        INSERT INTO operaciones_propiedad (
            propiedad_id, tipo_operacion, precio, moneda,
            comparte_comision, comision_tipo, comision_porcentaje,
            comision_meses, comision_monto_fijo,
            porcentaje_comision_compartida, activa
        )
        SELECT
            propiedad_id, tipo_operacion, precio, moneda,
            FALSE, NULL, NULL, NULL, NULL, NULL, TRUE
        FROM ops_to_insert
        ON CONFLICT (propiedad_id, tipo_operacion) DO UPDATE SET
            precio = EXCLUDED.precio,
            moneda = EXCLUDED.moneda,
            activa = TRUE,
            updated_at = NOW();

    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'count', v_count,
        'nuevas', v_count_nuevas,
        'actualizadas', v_count_actualizadas,
        'sin_cambios', v_count_sin_cambios,
        'total_api', v_total_api
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in bulk_insertar_propiedades_tokkobroker_full: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;
