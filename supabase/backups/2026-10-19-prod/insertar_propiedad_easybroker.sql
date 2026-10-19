CREATE OR REPLACE FUNCTION public.insertar_propiedad_easybroker(p_usuario_id uuid, p_easybroker_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_propiedad_id UUID;
  v_existe BOOLEAN;
  v_estaba_borrada BOOLEAN;
  v_operacion TEXT := 'insert';
  v_fotos TEXT[];
  v_videos TEXT[];
  v_features_array TEXT[];
  v_property_type TEXT;
  v_tipo TEXT;
  v_subtipo TEXT;
  v_metros_terreno NUMERIC;
  v_metros_construccion NUMERIC;
  v_pisos INTEGER;
  v_banos INTEGER;
  v_medios_banos INTEGER;
  v_ciudad TEXT;
  v_estado TEXT;
  v_municipio TEXT;
  v_location_name TEXT;
  v_calle TEXT;
  v_colonia TEXT;
  v_share_commission BOOLEAN;
  v_sin_comision BOOLEAN;
  v_any_comision BOOLEAN;
  v_descripcion TEXT;
  v_status TEXT;

  -- Per-operation loop variables
  v_op_type TEXT;
  v_op_amount NUMERIC;
  v_op_currency TEXT;
  v_op_commission_type TEXT;
  v_op_commission_value NUMERIC;
  v_op_comision_porcentaje NUMERIC;
  v_op_comision_meses NUMERIC;
  v_op_comision_monto NUMERIC;
  v_op_has_comision BOOLEAN;
  v_op_tipo_operacion TEXT;
  op_row RECORD;
BEGIN
  -- Photos
  SELECT ARRAY_AGG(img->>'url')
  INTO v_fotos
  FROM jsonb_array_elements(p_easybroker_data->'property_images') AS img;

  -- Videos
  SELECT ARRAY_AGG(value::TEXT)
  INTO v_videos
  FROM jsonb_array_elements_text(p_easybroker_data->'videos') AS value;

  -- Features
  SELECT ARRAY_AGG(feat->>'name')
  INTO v_features_array
  FROM jsonb_array_elements(p_easybroker_data->'features') AS feat;

  -- Property type y subtipo (crudo, se conserva igual)
  v_property_type := p_easybroker_data->>'property_type';
  v_subtipo := v_property_type;

  -- ============================================================
  -- TIPO POR KEYWORDS CASE-INSENSITIVE
  -- Orden: agrícola primero (más específico), luego comercial,
  -- habitacional al final como fallback.
  -- ============================================================
  IF LOWER(v_property_type) LIKE '%terreno%'
      OR LOWER(v_property_type) LIKE '%rancho%'
      OR LOWER(v_property_type) LIKE '%granja%'
      OR LOWER(v_property_type) LIKE '%huerta%'
      OR LOWER(v_property_type) LIKE '%finca%'
      OR LOWER(v_property_type) LIKE '%agricola%'
      OR LOWER(v_property_type) LIKE '%agrícola%' THEN
    v_tipo := 'agricola';
  ELSIF LOWER(v_property_type) LIKE '%local%'
      OR LOWER(v_property_type) LIKE '%oficina%'
      OR LOWER(v_property_type) LIKE '%consultorio%'
      OR LOWER(v_property_type) LIKE '%hotel%'
      OR LOWER(v_property_type) LIKE '%restaurante%'
      OR LOWER(v_property_type) LIKE '%plaza%'
      OR LOWER(v_property_type) LIKE '%nave%'
      OR LOWER(v_property_type) LIKE '%bodega%'
      OR LOWER(v_property_type) LIKE '%industrial%'
      OR LOWER(v_property_type) LIKE '%comercial%'
      OR LOWER(v_property_type) LIKE '%centro%' THEN
    v_tipo := 'comercial';
  ELSIF LOWER(v_property_type) LIKE '%condominio%'
      OR LOWER(v_property_type) LIKE '%casa%'
      OR LOWER(v_property_type) LIKE '%departamento%'
      OR LOWER(v_property_type) LIKE '%townhouse%'
      OR LOWER(v_property_type) LIKE '%villa%'
      OR LOWER(v_property_type) LIKE '%penthouse%'
      OR LOWER(v_property_type) LIKE '%estudio%'
      OR LOWER(v_property_type) LIKE '%loft%'
      OR LOWER(v_property_type) LIKE '%duplex%'
      OR LOWER(v_property_type) LIKE '%cabaña%'
      OR LOWER(v_property_type) LIKE '%cuarto%'
      OR LOWER(v_property_type) LIKE '%habitación%'
      OR LOWER(v_property_type) LIKE '%habitacion%' THEN
    v_tipo := 'habitacional';
  ELSE
    v_tipo := 'habitacional';
  END IF;

  -- Medidas
  v_metros_terreno := (p_easybroker_data->>'lot_size')::NUMERIC;
  v_metros_construccion := (p_easybroker_data->>'construction_size')::NUMERIC;

  v_pisos := COALESCE(safe_int(p_easybroker_data->>'floors'), safe_int(p_easybroker_data->>'floor'));

  -- Baños
  v_banos := safe_int(p_easybroker_data->>'bathrooms');
  v_medios_banos := safe_int(p_easybroker_data->>'half_bathrooms');

  -- Ubicación
  v_location_name := p_easybroker_data->'location'->>'name';

  IF v_location_name IS NOT NULL AND v_location_name != '' THEN
    v_estado := TRIM(split_part(v_location_name, ',', 3));
    IF v_estado = '' OR v_estado IS NULL THEN
      v_estado := TRIM(split_part(v_location_name, ',', 2));
    END IF;
    v_ciudad := TRIM(split_part(v_location_name, ',', 2));
    IF v_ciudad = '' OR v_ciudad IS NULL THEN
      v_ciudad := TRIM(split_part(v_location_name, ',', 1));
    END IF;
    v_colonia := TRIM(split_part(v_location_name, ',', 1));
  END IF;

  v_ciudad := COALESCE(NULLIF(v_ciudad, ''), NULLIF(p_easybroker_data->'location'->>'city', ''));
  v_estado := COALESCE(NULLIF(v_estado, ''), NULLIF(p_easybroker_data->'location'->>'region', ''));
  v_municipio := COALESCE(NULLIF(p_easybroker_data->'location'->>'city_area', ''), v_ciudad);
  v_calle := p_easybroker_data->'location'->>'street';

  -- share_commission nivel propiedad (se lee una sola vez)
  v_share_commission := COALESCE((p_easybroker_data->>'share_commission')::BOOLEAN, false);

  v_descripcion := COALESCE(p_easybroker_data->>'description', p_easybroker_data->>'title');

  -- ============================================================
  -- SIN_COMISION A NIVEL PROPIEDAD:
  -- true solo si NINGUNA operación tiene comisión definida.
  -- (Decisión: "alguna operación tiene comisión = Publicada")
  -- ============================================================
  SELECT
    COALESCE(BOOL_OR(
      NULLIF(TRIM(COALESCE(op->'commission'->>'value', '')), '') != ''
      AND NULLIF(TRIM(COALESCE(op->'commission'->>'value', '')), '')::NUMERIC > 0
    ), false)
  INTO v_any_comision
  FROM jsonb_array_elements(p_easybroker_data->'operations') AS op;

  v_sin_comision := NOT v_any_comision;
  v_status := CASE WHEN NOT v_sin_comision THEN 'Publicada' ELSE 'Suspendida' END;

  -- Buscar propiedad existente (incluyendo borradas para evitar duplicate key)
  SELECT id, (deleted_at IS NOT NULL)
  INTO v_propiedad_id, v_estaba_borrada
  FROM public.propiedades
  WHERE created_by = p_usuario_id
    AND easybroker_id = p_easybroker_data->>'public_id'
  ORDER BY deleted_at NULLS FIRST
  LIMIT 1;

  v_existe := FOUND;

  IF v_existe THEN
    v_operacion := CASE WHEN v_estaba_borrada THEN 'reactivada' ELSE 'update' END;

    UPDATE public.propiedades SET
      deleted_at = NULL,
      tipo = COALESCE(v_tipo, tipo),
      subtipo = COALESCE(v_subtipo, subtipo),
      descripcion = COALESCE(v_descripcion, descripcion),
      metros_cuadrados_terreno = COALESCE(v_metros_terreno, metros_cuadrados_terreno),
      metros_cuadrados_construccion = COALESCE(v_metros_construccion, metros_cuadrados_construccion),
      habitaciones = COALESCE(safe_int(p_easybroker_data->>'bedrooms'), habitaciones),
      banos = COALESCE(v_banos, banos),
      medios_banos = COALESCE(v_medios_banos, medios_banos),
      estacionamientos = COALESCE(safe_int(p_easybroker_data->>'parking_spaces'), estacionamientos),
      antiguedad = COALESCE(NULLIF(p_easybroker_data->>'age', ''), antiguedad),
      pisos = COALESCE(v_pisos, pisos),
      caracteristicas_especificas = COALESCE(v_features_array, caracteristicas_especificas),
      descripcion_planta_baja = COALESCE(NULLIF(p_easybroker_data->>'description', ''), descripcion_planta_baja),
      fotos = COALESCE(v_fotos, fotos),
      videos = COALESCE(v_videos, videos),
      latitud = COALESCE((p_easybroker_data->'location'->>'latitude')::NUMERIC, latitud),
      longitud = COALESCE((p_easybroker_data->'location'->>'longitude')::NUMERIC, longitud),
      ciudad = COALESCE(v_ciudad, ciudad),
      municipio = COALESCE(v_municipio, municipio),
      estado = COALESCE(v_estado, estado),
      calle = COALESCE(v_calle, calle),
      colonia = COALESCE(v_colonia, colonia),
      easybroker_updated_at = (p_easybroker_data->>'updated_at')::TIMESTAMP WITH TIME ZONE,
      modified_by = p_usuario_id,
      updated_at = NOW(),
      activo = NOT v_sin_comision,
      sin_comision = v_sin_comision,
      status = v_status,
      comparte_comision = v_share_commission
    WHERE id = v_propiedad_id;

    INSERT INTO public.feed_items (publicado_por, tipo_contenido, contenido_id)
    SELECT p_usuario_id, 'propiedad', v_propiedad_id
    WHERE NOT EXISTS (SELECT 1 FROM public.feed_items WHERE contenido_id = v_propiedad_id AND tipo_contenido = 'propiedad');

  ELSE
    INSERT INTO public.propiedades (
      created_by, easybroker_id, es_easybroker, tipo, subtipo, descripcion,
      metros_cuadrados_terreno, metros_cuadrados_construccion,
      habitaciones, banos, medios_banos, estacionamientos, amueblado, pet_friendly,
      antiguedad, pisos, caracteristicas_especificas, descripcion_planta_baja,
      fotos, videos, latitud, longitud, ciudad, municipio, estado,
      calle, colonia, easybroker_updated_at, activo, sin_comision, status,
      comparte_comision
    ) VALUES (
      p_usuario_id,
      p_easybroker_data->>'public_id',
      TRUE,
      v_tipo,
      v_subtipo,
      v_descripcion,
      v_metros_terreno,
      v_metros_construccion,
      COALESCE(safe_int(p_easybroker_data->>'bedrooms'), 0),
      COALESCE(v_banos, 0),
      COALESCE(v_medios_banos, 0),
      COALESCE(safe_int(p_easybroker_data->>'parking_spaces'), 0),
      'No',
      'No',
      p_easybroker_data->>'age',
      v_pisos,
      v_features_array,
      p_easybroker_data->>'description',
      v_fotos,
      v_videos,
      (p_easybroker_data->'location'->>'latitude')::NUMERIC,
      (p_easybroker_data->'location'->>'longitude')::NUMERIC,
      v_ciudad,
      v_municipio,
      v_estado,
      v_calle,
      v_colonia,
      (p_easybroker_data->>'updated_at')::TIMESTAMP WITH TIME ZONE,
      NOT v_sin_comision,
      v_sin_comision,
      v_status,
      v_share_commission
    ) RETURNING id INTO v_propiedad_id;

    INSERT INTO public.feed_items (publicado_por, tipo_contenido, contenido_id)
    VALUES (p_usuario_id, 'propiedad', v_propiedad_id);
  END IF;

  -- ============================================================
  -- MULTI-OPERACIÓN: iterar TODAS las operations
  -- Por cada una: computar comisión y hacer upsert en operaciones_propiedad
  -- ============================================================
  FOR op_row IN SELECT value FROM jsonb_array_elements(p_easybroker_data->'operations') AS value
  LOOP
    v_op_type := op_row.value->>'type';
    v_op_amount := (op_row.value->>'amount')::NUMERIC;
    v_op_currency := COALESCE(op_row.value->>'currency', 'MXN');
    v_op_commission_type := op_row.value->'commission'->>'type';
    v_op_commission_value := NULLIF(TRIM(COALESCE(op_row.value->'commission'->>'value', '')), '')::NUMERIC;

    -- Tipo de operación ilrox
    IF LOWER(COALESCE(v_op_type, '')) IN ('sale') THEN
      v_op_tipo_operacion := 'venta';
    ELSIF LOWER(COALESCE(v_op_type, '')) IN ('rental', 'rent', 'temporary_rental') THEN
      v_op_tipo_operacion := 'renta';
    ELSE
      v_op_tipo_operacion := 'venta';
    END IF;

    -- Comisión por operación (lógica idéntica a la original — no se toca)
    IF LOWER(COALESCE(v_op_commission_type,'')) IN ('percentage','porcentaje','percent') THEN
      IF LOWER(COALESCE(v_op_type,'')) IN ('rental','rent','temporary_rental') THEN
        v_op_comision_meses := v_op_commission_value / 100.0;
        v_op_comision_porcentaje := NULL;
      ELSE
        v_op_comision_porcentaje := v_op_commission_value;
        v_op_comision_meses := NULL;
      END IF;
      v_op_comision_monto := NULL;
    ELSIF LOWER(COALESCE(v_op_commission_type,'')) IN ('months','month','meses','mes') THEN
      v_op_comision_meses := v_op_commission_value;
      v_op_comision_porcentaje := NULL;
      v_op_comision_monto := NULL;
    ELSIF LOWER(COALESCE(v_op_commission_type,'')) IN ('amount','net_amount','gross_amount','fixed','monto','monto_fijo') THEN
      v_op_comision_monto := v_op_commission_value;
      v_op_comision_porcentaje := NULL;
      v_op_comision_meses := NULL;
    ELSE
      v_op_comision_porcentaje := NULL;
      v_op_comision_meses := NULL;
      v_op_comision_monto := NULL;
    END IF;

    -- La operación tiene comisión? (para desactivacion de ops ausentes)
    v_op_has_comision := v_op_commission_value IS NOT NULL AND v_op_commission_value != 0;

    -- Upsert por operación
    INSERT INTO public.operaciones_propiedad
      (propiedad_id, tipo_operacion, precio, moneda, comparte_comision,
       comision_tipo, comision_porcentaje, comision_meses, comision_monto_fijo,
       porcentaje_comision_compartida, activa)
    VALUES (
      v_propiedad_id,
      v_op_tipo_operacion,
      COALESCE(v_op_amount, 0),
      v_op_currency,
      v_share_commission,
      v_op_commission_type,
      v_op_comision_porcentaje,
      v_op_comision_meses,
      v_op_comision_monto,
      NULLIF(TRIM(COALESCE(p_easybroker_data->>'shared_commission_percentage', '')), '')::NUMERIC,
      TRUE
    )
    ON CONFLICT (propiedad_id, tipo_operacion)
    DO UPDATE SET
      precio = EXCLUDED.precio,
      moneda = EXCLUDED.moneda,
      comparte_comision = EXCLUDED.comparte_comision,
      comision_tipo = EXCLUDED.comision_tipo,
      comision_porcentaje = EXCLUDED.comision_porcentaje,
      comision_meses = EXCLUDED.comision_meses,
      comision_monto_fijo = EXCLUDED.comision_monto_fijo,
      porcentaje_comision_compartida = EXCLUDED.porcentaje_comision_compartida,
      activa = TRUE,
      updated_at = NOW();
  END LOOP;

  -- Desactivar operaciones que ya no vienen en el payload de EasyBroker
  -- (tipos válidos: venta y renta)
  UPDATE public.operaciones_propiedad
  SET activa = false
  WHERE propiedad_id = v_propiedad_id
    AND tipo_operacion IN ('venta', 'renta')
    AND tipo_operacion NOT IN (
      SELECT
        CASE
          WHEN LOWER(COALESCE(op.value->>'type', '')) IN ('sale') THEN 'venta'
          WHEN LOWER(COALESCE(op.value->>'type', '')) IN ('rental','rent','temporary_rental') THEN 'renta'
          ELSE 'venta'
        END
      FROM jsonb_array_elements(p_easybroker_data->'operations') AS op
    );

  RETURN json_build_object(
    'success', TRUE,
    'propiedad_id', v_propiedad_id,
    'operacion', v_operacion,
    'easybroker_id', p_easybroker_data->>'public_id'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'message', 'Error: ' || SQLERRM,
    'easybroker_id', p_easybroker_data->>'public_id',
    'detail', SQLSTATE
  );
END;
$function$
