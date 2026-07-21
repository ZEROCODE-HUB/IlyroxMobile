CREATE OR REPLACE FUNCTION public.insertar_propiedad_easybroker(p_usuario_id uuid, p_easybroker_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_propiedad_id UUID;
  v_existe BOOLEAN;
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
  v_operation_type TEXT;
  v_operation_amount NUMERIC;
  v_operation_currency TEXT;
  v_commission_type TEXT;
  v_commission_value NUMERIC;
  v_comision_porcentaje NUMERIC;
  v_comision_meses NUMERIC;
  v_comision_monto NUMERIC;
  v_shared_commission_pct NUMERIC;
  v_share_commission BOOLEAN;
  v_sin_comision BOOLEAN;
  v_descripcion TEXT;
  v_status TEXT;
BEGIN
  SELECT ARRAY_AGG(img->>'url')
  INTO v_fotos
  FROM jsonb_array_elements(p_easybroker_data->'property_images') AS img;

  SELECT ARRAY_AGG(value::TEXT)
  INTO v_videos
  FROM jsonb_array_elements_text(p_easybroker_data->'videos') AS value;

  SELECT ARRAY_AGG(feat->>'name')
  INTO v_features_array
  FROM jsonb_array_elements(p_easybroker_data->'features') AS feat;

  v_property_type := p_easybroker_data->>'property_type';
  v_subtipo := v_property_type;

  v_tipo := CASE
    WHEN v_property_type IN ('Casa', 'Casa en condominio', 'Departamento', 'Condominio', 'Townhouse', 'Villa', 'Penthouse', 'Estudio', 'Loft', 'Duplex', 'Casa de campo', 'Cabaña', 'Cuarto', 'Cuarto de servicio') THEN 'habitacional'
    WHEN v_property_type IN ('Local comercial', 'Oficina', 'Edificio comercial', 'Consultorio', 'Hotel', 'Restaurante', 'Plaza comercial', 'Nave industrial', 'Bodega', 'Edificio industrial') THEN 'comercial'
    WHEN v_property_type IN ('Terreno', 'Rancho', 'Granja', 'Huerta', 'Finca') THEN 'agricola'
    ELSE 'habitacional'
  END;

  v_metros_terreno := (p_easybroker_data->>'lot_size')::NUMERIC;
  v_metros_construccion := (p_easybroker_data->>'construction_size')::NUMERIC;

  v_pisos := COALESCE(safe_int(p_easybroker_data->>'floors'), safe_int(p_easybroker_data->>'floor'));

  -- Baños: separados. `bathrooms` = completos; `half_bathrooms` = medios.
  -- safe_int tolera valores decimales/strings raros ("2.0", "2.5") sin romper.
  v_banos := safe_int(p_easybroker_data->>'bathrooms');
  v_medios_banos := safe_int(p_easybroker_data->>'half_bathrooms');

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

  v_operation_type := p_easybroker_data->'operations'->0->>'type';
  v_operation_amount := (p_easybroker_data->'operations'->0->>'amount')::NUMERIC;
  v_operation_currency := COALESCE(p_easybroker_data->'operations'->0->>'currency', 'MXN');
  v_share_commission := COALESCE((p_easybroker_data->>'share_commission')::BOOLEAN, false);
  v_commission_type := p_easybroker_data->'operations'->0->'commission'->>'type';
  v_commission_value := NULLIF(TRIM(COALESCE(p_easybroker_data->'operations'->0->'commission'->>'value', '')), '')::NUMERIC;
  v_shared_commission_pct := NULLIF(TRIM(COALESCE(p_easybroker_data->>'shared_commission_percentage', '')), '')::NUMERIC;
  v_descripcion := COALESCE(p_easybroker_data->>'description', p_easybroker_data->>'title');

  -- Enrutar el valor de comisión a su columna según el TIPO que manda EasyBroker.
  -- CASO ESPECIAL DE RENTA: EasyBroker captura la comisión de renta como
  -- PORCENTAJE DE UN MES, así que "50%" en renta = medio mes. Se convierte a
  -- meses (valor/100) para que se lea "0.5 meses" y no "50% comisión" (confuso
  -- y alarmante). En VENTA el % sí es del precio, se deja como porcentaje.
  IF LOWER(COALESCE(v_commission_type,'')) IN ('percentage','porcentaje','percent') THEN
    IF v_operation_type IN ('rental', 'rent', 'temporary_rental') THEN
      v_comision_meses      := v_commission_value / 100.0;
      v_comision_porcentaje := NULL;
    ELSE
      v_comision_porcentaje := v_commission_value;
      v_comision_meses      := NULL;
    END IF;
    v_comision_monto := NULL;
  ELSIF LOWER(COALESCE(v_commission_type,'')) IN ('months','month','meses','mes') THEN
    v_comision_meses      := v_commission_value;
    v_comision_porcentaje := NULL;
    v_comision_monto      := NULL;
  ELSIF LOWER(COALESCE(v_commission_type,'')) IN ('amount','net_amount','gross_amount','fixed','monto','monto_fijo') THEN
    v_comision_monto      := v_commission_value;
    v_comision_porcentaje := NULL;
    v_comision_meses      := NULL;
  ELSE
    v_comision_porcentaje := NULL;
    v_comision_meses      := NULL;
    v_comision_monto      := NULL;
  END IF;

  -- sin_comision: true si no hay comisión definida de ningún tipo.
  v_sin_comision := (v_commission_value IS NULL OR v_commission_value = 0);
  v_status := CASE WHEN NOT v_sin_comision THEN 'Publicada' ELSE 'Suspendida' END;

  SELECT id INTO v_propiedad_id
  FROM public.propiedades
  WHERE created_by = p_usuario_id
    AND easybroker_id = p_easybroker_data->>'public_id'
    AND deleted_at IS NULL;

  v_existe := FOUND;

  IF v_existe THEN
    v_operacion := 'update';

    UPDATE public.propiedades SET
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
      status = v_status
    WHERE id = v_propiedad_id;

    INSERT INTO public.operaciones_propiedad (propiedad_id, tipo_operacion, precio, moneda, comparte_comision, comision_tipo, comision_porcentaje, comision_meses, comision_monto_fijo, porcentaje_comision_compartida, activa)
    VALUES (
      v_propiedad_id,
      CASE
        WHEN v_operation_type = 'sale' THEN 'venta'
        WHEN v_operation_type IN ('rental', 'rent', 'temporary_rental') THEN 'renta'
        ELSE 'venta'
      END,
      COALESCE(v_operation_amount, 0),
      v_operation_currency,
      v_share_commission,
      v_commission_type,
      v_comision_porcentaje,
      v_comision_meses,
      v_comision_monto,
      v_shared_commission_pct,
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
      calle, colonia, easybroker_updated_at, activo, sin_comision, status
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
      v_status
    ) RETURNING id INTO v_propiedad_id;

    INSERT INTO public.operaciones_propiedad (propiedad_id, tipo_operacion, precio, moneda, comparte_comision, comision_tipo, comision_porcentaje, comision_meses, comision_monto_fijo, porcentaje_comision_compartida, activa)
    VALUES (
      v_propiedad_id,
      CASE
        WHEN v_operation_type = 'sale' THEN 'venta'
        WHEN v_operation_type IN ('rental', 'rent', 'temporary_rental') THEN 'renta'
        ELSE 'venta'
      END,
      COALESCE(v_operation_amount, 0),
      v_operation_currency,
      v_share_commission,
      v_commission_type,
      v_comision_porcentaje,
      v_comision_meses,
      v_comision_monto,
      v_shared_commission_pct,
      TRUE
    );

    INSERT INTO public.feed_items (publicado_por, tipo_contenido, contenido_id)
    VALUES (p_usuario_id, 'propiedad', v_propiedad_id);
  END IF;

  RETURN json_build_object('success', TRUE, 'propiedad_id', v_propiedad_id, 'operacion', v_operacion, 'easybroker_id', p_easybroker_data->>'public_id');

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', FALSE, 'message', 'Error: ' || SQLERRM, 'easybroker_id', p_easybroker_data->>'public_id', 'detail', SQLSTATE);
END;
$function$

