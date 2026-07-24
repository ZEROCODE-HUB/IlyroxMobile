CREATE OR REPLACE FUNCTION public.evaluar_par_match(p_prop_id uuid, p_busq_id uuid)
 RETURNS TABLE(es_match boolean, tipo_match character varying, detalle jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_prop RECORD;
  v_busq RECORD;
  v_op RECORD;
  v_tipo_op text;
  v_precio numeric;
  v_comision_porcentaje numeric;
  v_comision_meses numeric;
  v_tiene_area boolean := FALSE;
  v_texto_match boolean := FALSE;
  v_match_type text := NULL;
  v_pmin numeric;
  v_pmax numeric;
  v_cf jsonb; v_inf jsonb; v_ag jsonb;
BEGIN
  -- Propiedad válida (publicada/activa)
  SELECT * INTO v_prop FROM public.propiedades
  WHERE id = p_prop_id AND deleted_at IS NULL
    AND COALESCE(activo, FALSE) = TRUE
    AND LOWER(TRIM(COALESCE(status, ''))) = 'publicada';
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','propiedad_no_valida'); RETURN;
  END IF;

  -- Búsqueda válida
  SELECT * INTO v_busq FROM public.busquedas_guardadas
  WHERE id = p_busq_id AND activa = TRUE AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','busqueda_no_valida'); RETURN;
  END IF;

  -- No auto-match (la búsqueda no debe matchear las propiedades de su propio dueño)
  IF v_busq.usuario_id IS NOT DISTINCT FROM v_prop.created_by THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','misma_persona'); RETURN;
  END IF;

  -- País
  IF v_prop.pais IS DISTINCT FROM v_busq.pais THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','pais_no_coincide'); RETURN;
  END IF;

  -- ¿La búsqueda define un área geográfica?
  v_tiene_area := (v_busq.bounds IS NOT NULL AND jsonb_typeof(v_busq.bounds) = 'object')
    OR (v_busq.polygon_coords IS NOT NULL AND jsonb_typeof(v_busq.polygon_coords) = 'array'
        AND jsonb_array_length(v_busq.polygon_coords) > 0);

  -- Guard: búsqueda sin ningún criterio real
  IF (v_busq.tipo_propiedad IS NULL OR TRIM(v_busq.tipo_propiedad) = '')
     AND (v_busq.subtipo IS NULL OR array_length(v_busq.subtipo, 1) IS NULL)
     AND (v_busq.estado IS NULL OR array_length(v_busq.estado, 1) IS NULL)
     AND (v_busq.ciudad IS NULL OR TRIM(v_busq.ciudad) = '')
     AND (v_busq.municipio IS NULL OR array_length(v_busq.municipio, 1) IS NULL)
     AND (v_busq.colonias IS NULL OR array_length(v_busq.colonias, 1) IS NULL)
     AND NOT v_tiene_area
     AND COALESCE(v_busq.precio_min, 0) = 0 AND COALESCE(v_busq.precio_max, 0) = 0
     AND v_busq.habitaciones IS NULL AND v_busq.banos IS NULL AND v_busq.estacionamientos IS NULL
     AND COALESCE(v_busq.metros_terreno, 0) = 0 AND COALESCE(v_busq.metros_construccion, 0) = 0
  THEN RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','busqueda_vacia'); RETURN; END IF;

  -- Tipo de propiedad
  IF v_busq.tipo_propiedad IS NOT NULL AND TRIM(v_busq.tipo_propiedad) <> ''
     AND LOWER(TRIM(v_busq.tipo_propiedad)) <> LOWER(TRIM(COALESCE(v_prop.tipo, ''))) THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','tipo_no_coincide'); RETURN;
  END IF;

  -- Subtipo
  IF v_busq.subtipo IS NOT NULL AND array_length(v_busq.subtipo, 1) > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM unnest(v_busq.subtipo) s
                   WHERE LOWER(TRIM(s)) = LOWER(TRIM(COALESCE(v_prop.subtipo, '')))) THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','subtipo_no_coincide'); RETURN;
    END IF;
  END IF;

  -- Ubicación: coincide por ÁREA geográfica O por TEXTO (colonia/municipio/
  -- estado/ciudad). El texto recupera propiedades con la ubicación CORRECTA
  -- aunque su pin caiga fuera del área: las coordenadas de EasyBroker suelen
  -- ser imprecisas (a veces el centro de la ciudad), y sin esto una propiedad
  -- de la colonia buscada se perdía del match.

  -- ¿Coincide por texto? Solo si la búsqueda tiene ALGÚN criterio de texto de
  -- ubicación Y todos los presentes coinciden con la propiedad.
  v_texto_match := (
    (v_busq.estado IS NOT NULL AND array_length(v_busq.estado, 1) > 0)
    OR (v_busq.municipio IS NOT NULL AND array_length(v_busq.municipio, 1) > 0)
    OR (v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0)
    OR (v_busq.ciudad IS NOT NULL AND TRIM(v_busq.ciudad) <> '')
  )
  AND (v_busq.estado IS NULL OR array_length(v_busq.estado, 1) IS NULL
       OR EXISTS (SELECT 1 FROM unnest(v_busq.estado) e
                  WHERE normalizar_ubicacion(e) = normalizar_ubicacion(v_prop.estado)))
  AND (v_busq.ciudad IS NULL OR TRIM(v_busq.ciudad) = ''
       OR normalizar_ubicacion(v_prop.ciudad) = normalizar_ubicacion(v_busq.ciudad))
  AND (v_busq.municipio IS NULL OR array_length(v_busq.municipio, 1) IS NULL
       OR EXISTS (SELECT 1 FROM unnest(v_busq.municipio) m
                  WHERE normalizar_ubicacion(m) = normalizar_ubicacion(v_prop.municipio)))
  AND (v_busq.colonias IS NULL OR array_length(v_busq.colonias, 1) IS NULL
       OR EXISTS (SELECT 1 FROM unnest(v_busq.colonias) c
                  WHERE normalizar_ubicacion(c) = normalizar_ubicacion(v_prop.colonia::text)));

  IF v_tiene_area THEN
    -- Con área: pasa si el pin cae DENTRO, O si coincide por texto (colonia/
    -- municipio). Una búsqueda de zona DIBUJADA (sin texto) mantiene el rechazo.
    IF NOT punto_en_area_busqueda(v_prop.latitud, v_prop.longitud, v_busq.bounds, v_busq.polygon_coords)
       AND NOT v_texto_match THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','fuera_de_area'); RETURN;
    END IF;
  ELSE
    IF v_busq.estado IS NOT NULL AND array_length(v_busq.estado, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_busq.estado) e
                     WHERE normalizar_ubicacion(e) = normalizar_ubicacion(v_prop.estado)) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','estado_no_coincide'); RETURN;
      END IF;
    END IF;
    IF v_busq.ciudad IS NOT NULL AND TRIM(v_busq.ciudad) <> '' THEN
      IF normalizar_ubicacion(v_prop.ciudad) <> normalizar_ubicacion(v_busq.ciudad) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','ciudad_no_coincide'); RETURN;
      END IF;
    END IF;
    IF v_busq.municipio IS NOT NULL AND array_length(v_busq.municipio, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_busq.municipio) m
                     WHERE normalizar_ubicacion(m) = normalizar_ubicacion(v_prop.municipio)) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','municipio_no_coincide'); RETURN;
      END IF;
    END IF;
    IF v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_busq.colonias) c
                     WHERE normalizar_ubicacion(c) = normalizar_ubicacion(v_prop.colonia::text)) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','colonia_no_coincide'); RETURN;
      END IF;
    END IF;
  END IF;

  -- Operación relevante (precio + comisión) según el tipo de operación de la búsqueda
  IF v_busq.tipo_operacion IS NOT NULL THEN
    SELECT tipo_operacion, precio, comision_porcentaje, comision_meses INTO v_op
    FROM public.operaciones_propiedad
    WHERE propiedad_id = p_prop_id AND COALESCE(activa, TRUE) = TRUE
      AND LOWER(TRIM(tipo_operacion)) = LOWER(TRIM(v_busq.tipo_operacion::text))
    ORDER BY created_at ASC LIMIT 1;
  ELSE
    SELECT tipo_operacion, precio, comision_porcentaje, comision_meses INTO v_op
    FROM public.operaciones_propiedad
    WHERE propiedad_id = p_prop_id AND COALESCE(activa, TRUE) = TRUE
    ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','operacion_no_disponible'); RETURN;
  END IF;
  v_tipo_op := v_op.tipo_operacion;
  v_precio  := v_op.precio;
  v_comision_porcentaje := COALESCE(v_op.comision_porcentaje, 0);
  v_comision_meses      := COALESCE(v_op.comision_meses, 0);

  -- Filtros especializados - Comercial
  IF LOWER(TRIM(COALESCE(v_prop.tipo, ''))) = 'comercial' THEN
    v_cf := v_busq.criterios_busqueda -> 'comercial';
    IF v_cf IS NOT NULL THEN
      IF (v_cf ->> 'tipoUbicacion') IS NOT NULL AND TRIM(v_cf ->> 'tipoUbicacion') <> '' THEN
        IF LOWER(TRIM(v_cf ->> 'tipoUbicacion')) <> LOWER(TRIM(COALESCE(v_prop.tipo_ubicacion_comercial, ''))) THEN
          RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comercial_tipoubicacion'); RETURN; END IF;
      END IF;
      IF (v_cf ->> 'frenteMin') IS NOT NULL AND TRIM(v_cf ->> 'frenteMin') <> '' THEN
        IF COALESCE(v_prop.frente_metros, 0) < (v_cf ->> 'frenteMin')::numeric THEN
          RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comercial_frente'); RETURN; END IF;
      END IF;
      IF COALESCE((v_cf ->> 'sobreAvenidaPrincipal')::boolean, FALSE) AND NOT COALESCE(v_prop.sobre_avenida_principal, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comercial_avenida'); RETURN; END IF;
      IF COALESCE((v_cf ->> 'enEsquina')::boolean, FALSE) AND NOT COALESCE(v_prop.en_esquina, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comercial_esquina'); RETURN; END IF;
      IF COALESCE((v_cf ->> 'altaVisibilidad')::boolean, FALSE) AND NOT COALESCE(v_prop.alta_visibilidad, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comercial_visibilidad'); RETURN; END IF;
      IF COALESCE((v_cf ->> 'altoFlujoVehicular')::boolean, FALSE) AND NOT COALESCE(v_prop.alto_flujo_vehicular, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comercial_flujo'); RETURN; END IF;
    END IF;
  END IF;

  -- Filtros especializados - Industrial
  IF LOWER(TRIM(COALESCE(v_prop.tipo, ''))) = 'industrial' THEN
    v_inf := v_busq.criterios_busqueda -> 'industrial';
    IF v_inf IS NOT NULL THEN
      IF (v_inf ->> 'ubicacion') IS NOT NULL AND TRIM(v_inf ->> 'ubicacion') <> '' THEN
        IF LOWER(TRIM(v_inf ->> 'ubicacion')) <> LOWER(TRIM(COALESCE(v_prop.ubicacion_industrial, ''))) THEN
          RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','industrial_ubicacion'); RETURN; END IF;
      END IF;
      IF (v_inf ->> 'alturaLibre') IS NOT NULL AND TRIM(v_inf ->> 'alturaLibre') <> '' THEN
        IF LOWER(TRIM(v_inf ->> 'alturaLibre')) <> LOWER(TRIM(COALESCE(v_prop.altura_libre_m, ''))) THEN
          RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','industrial_altura'); RETURN; END IF;
      END IF;
      IF jsonb_typeof(v_inf -> 'energiaKva') = 'array' AND jsonb_array_length(v_inf -> 'energiaKva') > 0 THEN
        IF v_prop.tipo_energia_kva IS NULL OR NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_inf -> 'energiaKva') req_e WHERE req_e = ANY(v_prop.tipo_energia_kva)
        ) THEN RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','industrial_energia'); RETURN; END IF;
      END IF;
      IF (v_inf ->> 'areaOficinasMin') IS NOT NULL AND TRIM(v_inf ->> 'areaOficinasMin') <> '' THEN
        IF COALESCE(v_prop.area_oficinas_m2, 0) < (v_inf ->> 'areaOficinasMin')::numeric THEN
          RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','industrial_oficinas'); RETURN; END IF;
      END IF;
      IF (v_inf ->> 'patioManiobrasMin') IS NOT NULL AND TRIM(v_inf ->> 'patioManiobrasMin') <> '' THEN
        IF COALESCE(v_prop.patio_maniobras_m2, 0) < (v_inf ->> 'patioManiobrasMin')::numeric THEN
          RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','industrial_patio'); RETURN; END IF;
      END IF;
    END IF;
  END IF;

  -- Filtros especializados - Agricola
  IF LOWER(TRIM(COALESCE(v_prop.tipo, ''))) = 'agricola' THEN
    v_ag := v_busq.criterios_busqueda -> 'agricola';
    IF v_ag IS NOT NULL THEN
      IF jsonb_typeof(v_ag -> 'tiposAgua') = 'array' AND jsonb_array_length(v_ag -> 'tiposAgua') > 0 THEN
        IF v_prop.tipo_agua IS NULL OR NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(v_ag -> 'tiposAgua') req_a WHERE req_a = ANY(v_prop.tipo_agua)
        ) THEN RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_agua'); RETURN; END IF;
      END IF;
      IF COALESCE((v_ag ->> 'concesionAgua')::boolean, FALSE) AND NOT COALESCE(v_prop.concesion_agua, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_concesion'); RETURN; END IF;
      IF (v_ag ->> 'usoTerreno') IS NOT NULL AND TRIM(v_ag ->> 'usoTerreno') <> '' THEN
        IF v_prop.uso_terreno IS NULL OR NOT EXISTS (
          SELECT 1 FROM unnest(v_prop.uso_terreno) u
          WHERE LOWER(TRIM(u)) = LOWER(TRIM(v_ag ->> 'usoTerreno'))
        ) THEN RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_uso'); RETURN; END IF;
      END IF;
      IF (v_ag ->> 'tipoRiego') IS NOT NULL AND TRIM(v_ag ->> 'tipoRiego') <> '' THEN
        IF v_prop.tipo_riego IS NULL OR NOT EXISTS (
          SELECT 1 FROM unnest(v_prop.tipo_riego) r
          WHERE LOWER(TRIM(r)) = LOWER(TRIM(v_ag ->> 'tipoRiego'))
        ) THEN RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_riego'); RETURN; END IF;
      END IF;
      IF COALESCE((v_ag ->> 'electricidad')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_electricidad, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_electricidad'); RETURN; END IF;
      IF COALESCE((v_ag ->> 'caminoAcceso')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_camino_acceso, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_camino'); RETURN; END IF;
      IF COALESCE((v_ag ->> 'cercado')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_cercado, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_cercado'); RETURN; END IF;
      IF COALESCE((v_ag ->> 'pieCarretera')::boolean, FALSE) AND NOT COALESCE(v_prop.acceso_carretera, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_carretera'); RETURN; END IF;
      IF COALESCE((v_ag ->> 'accesCamiones')::boolean, FALSE) AND NOT COALESCE(v_prop.acceso_camiones, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_camiones'); RETURN; END IF;
    END IF;
  END IF;

  -- Dimensiones del terreno (frente/fondo, mínimos) — desde criterios_busqueda JSON.
  -- Aplica a cualquier terreno (habitacional/comercial/agrícola), por eso va fuera
  -- de los bloques por tipo. Se comparan contra las columnas ancho_terreno/largo_terreno.
  IF (v_busq.criterios_busqueda ->> 'ancho_terreno_min') IS NOT NULL
     AND TRIM(v_busq.criterios_busqueda ->> 'ancho_terreno_min') <> '' THEN
    IF COALESCE(v_prop.ancho_terreno, 0) < (v_busq.criterios_busqueda ->> 'ancho_terreno_min')::numeric THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','ancho_terreno'); RETURN; END IF;
  END IF;
  IF (v_busq.criterios_busqueda ->> 'largo_terreno_min') IS NOT NULL
     AND TRIM(v_busq.criterios_busqueda ->> 'largo_terreno_min') <> '' THEN
    IF COALESCE(v_prop.largo_terreno, 0) < (v_busq.criterios_busqueda ->> 'largo_terreno_min')::numeric THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','largo_terreno'); RETURN; END IF;
  END IF;

  -- Comisión mínima de venta
  IF v_busq.comision_venta_min IS NOT NULL AND v_busq.comision_venta_min > 0
     AND LOWER(TRIM(COALESCE(v_tipo_op, ''))) = 'venta' THEN
    IF v_comision_porcentaje < v_busq.comision_venta_min THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comision_venta'); RETURN; END IF;
  END IF;
  -- Comisión mínima de renta (meses)
  IF v_busq.comision_renta_min IS NOT NULL AND v_busq.comision_renta_min > 0
     AND LOWER(TRIM(COALESCE(v_tipo_op, ''))) = 'renta' THEN
    IF v_comision_meses < v_busq.comision_renta_min THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comision_renta'); RETURN; END IF;
  END IF;

  -- Coincidencia exacta
  IF (
    (v_busq.precio_min IS NULL OR v_busq.precio_min = 0 OR v_precio >= v_busq.precio_min)
    AND (v_busq.precio_max IS NULL OR v_busq.precio_max = 0 OR v_precio <= v_busq.precio_max)
    AND (v_busq.habitaciones IS NULL OR COALESCE(v_prop.habitaciones, 0) >= v_busq.habitaciones)
    AND (v_busq.banos IS NULL OR COALESCE(v_prop.banos, 0) >= v_busq.banos)
    AND (v_busq.estacionamientos IS NULL OR COALESCE(v_prop.estacionamientos, 0) >= v_busq.estacionamientos)
    AND (v_busq.pisos IS NULL OR v_busq.pisos = 0 OR COALESCE(v_prop.pisos, 0) >= v_busq.pisos)
    AND (v_busq.metros_terreno IS NULL OR v_busq.metros_terreno = 0 OR COALESCE(v_prop.metros_cuadrados_terreno, 0) >= v_busq.metros_terreno)
    AND (v_busq.metros_terreno_max IS NULL OR v_busq.metros_terreno_max = 0 OR COALESCE(v_prop.metros_cuadrados_terreno, 0) <= v_busq.metros_terreno_max)
    AND (v_busq.metros_construccion IS NULL OR v_busq.metros_construccion = 0 OR COALESCE(v_prop.metros_cuadrados_construccion, 0) >= v_busq.metros_construccion)
    AND (v_busq.metros_construccion_max IS NULL OR v_busq.metros_construccion_max = 0 OR COALESCE(v_prop.metros_cuadrados_construccion, 0) <= v_busq.metros_construccion_max)
  ) THEN v_match_type := 'coincidencia'; END IF;

  -- Similar (precio ±15%, m² ≥85%, características -1)
  IF v_match_type IS NULL THEN
    v_pmin := COALESCE(NULLIF(v_busq.precio_min, 0) * 0.85, 0);
    v_pmax := COALESCE(NULLIF(v_busq.precio_max, 0) * 1.15, 999999999999);
    IF v_precio BETWEEN v_pmin AND v_pmax
       AND (v_busq.habitaciones IS NULL OR COALESCE(v_prop.habitaciones, 0) >= GREATEST(v_busq.habitaciones - 1, 0))
       AND (v_busq.banos IS NULL OR COALESCE(v_prop.banos, 0) >= GREATEST(v_busq.banos - 1, 0))
       AND (v_busq.pisos IS NULL OR v_busq.pisos = 0 OR COALESCE(v_prop.pisos, 0) >= GREATEST(v_busq.pisos - 1, 1))
       AND (v_busq.metros_terreno IS NULL OR v_busq.metros_terreno = 0 OR COALESCE(v_prop.metros_cuadrados_terreno, 0) >= v_busq.metros_terreno * 0.85)
       AND (v_busq.metros_construccion IS NULL OR v_busq.metros_construccion = 0 OR COALESCE(v_prop.metros_cuadrados_construccion, 0) >= v_busq.metros_construccion * 0.85)
    THEN v_match_type := 'similar'; END IF;
  END IF;

  IF v_match_type IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_match_type::varchar(20), jsonb_build_object(
      'tipo_operacion', v_tipo_op,
      'precio', v_precio,
      'match_ubicacion', CASE WHEN v_tiene_area THEN 'geografico' ELSE 'texto' END,
      'mensaje', CASE WHEN v_match_type = 'coincidencia'
                      THEN 'Cumple con todos tus filtros'
                      ELSE 'Cerca de tus preferencias de precio y espacio' END
    );
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','no_cumple_precio_caracteristicas');
END;
$function$

