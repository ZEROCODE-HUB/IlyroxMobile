-- =====================================================================
-- REV05-24 + REV06-03 (parte BD) - evaluar_par_match
--  * REV05-24: si la zona trae colonia, el municipio de Google ya no se exige
--    (Google ubica 'St Angelo' en Aguascalientes y la BD en Jesus Maria). El estado se sigue exigiendo.
--  * REV06-03: la app ya guarda las zonas una por una en criterios_busqueda.location_chips;
--    aqui cada zona se evalua por separado y se unen con O (como el mapa). Aplica tambien a las
--    busquedas guardadas anteriores que tengan location_chips con texto. Si alguna zona es solo
--    un recuadro (sin texto) o no hay zonas, se usa la regla de siempre.
-- Respaldo: supabase/backups/2026-10-19-prod/evaluar_par_match.sql
-- Se ejecuta completo. Despues, en la app, probar ZN-15 y ZN-01.
-- =====================================================================
DO $guard$
BEGIN
  IF position('v_solo_texto_estado' IN pg_get_functiondef('public.evaluar_par_match(uuid,uuid)'::regprocedure)) = 0
     OR position('REV06-03' IN pg_get_functiondef('public.evaluar_par_match(uuid,uuid)'::regprocedure)) > 0
        AND position('location_chips' IN pg_get_functiondef('public.evaluar_par_match(uuid,uuid)'::regprocedure)) = 0
  THEN
    RAISE EXCEPTION 'DETENIDO: evaluar_par_match en produccion no es la version esperada (respaldo 19/10). Mandar pg_get_functiondef al equipo.';
  END IF;
END
$guard$;

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
  v_tiene_poligono boolean := FALSE;
  v_texto_match boolean := FALSE;
  v_match_type text := NULL;
  v_pmin numeric;
  v_pmax numeric;
  v_cf jsonb; v_inf jsonb; v_ag jsonb;
  v_solo_texto_estado boolean := FALSE;
  v_tiene_texto_especifico boolean := FALSE;
  v_zonas jsonb;
  v_usa_zonas boolean := FALSE;
  v_zonas_ok boolean := FALSE;
BEGIN
  -- Propiedad valida (publicada/activa)
  SELECT * INTO v_prop FROM public.propiedades
  WHERE id = p_prop_id AND deleted_at IS NULL
    AND COALESCE(activo, FALSE) = TRUE
    AND LOWER(TRIM(COALESCE(status, ''))) = 'publicada';
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','propiedad_no_valida'); RETURN;
  END IF;

  -- Busqueda valida
  SELECT * INTO v_busq FROM public.busquedas_guardadas
  WHERE id = p_busq_id AND activa = TRUE AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','busqueda_no_valida'); RETURN;
  END IF;

  -- No auto-match
  IF v_busq.usuario_id IS NOT DISTINCT FROM v_prop.created_by THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','misma_persona'); RETURN;
  END IF;

  -- Pais
  IF v_prop.pais IS DISTINCT FROM v_busq.pais THEN
    RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','pais_no_coincide'); RETURN;
  END IF;

  -- La busqueda tiene poligono dibujado? (area estricta)
  v_tiene_poligono := v_busq.polygon_coords IS NOT NULL
    AND jsonb_typeof(v_busq.polygon_coords) = 'array'
    AND jsonb_array_length(v_busq.polygon_coords) > 0;

  -- La busqueda define un area geografica (bounds o poligono)?
  v_tiene_area := (v_busq.bounds IS NOT NULL AND jsonb_typeof(v_busq.bounds) = 'object')
    OR v_tiene_poligono;

  -- Detectar si la busqueda tiene SOLO filtro de estado (sin municipio,
  -- colonias, ciudad). En ese caso, replicamos la logica del server
  -- query: substring match en `estado` (no bounds).
  v_solo_texto_estado := (v_busq.estado IS NOT NULL AND array_length(v_busq.estado, 1) > 0)
    AND (v_busq.municipio IS NULL OR array_length(v_busq.municipio, 1) IS NULL)
    AND (v_busq.colonias IS NULL OR array_length(v_busq.colonias, 1) IS NULL)
    AND (v_busq.ciudad IS NULL OR TRIM(v_busq.ciudad) = '');

  -- Hay texto especifico de municipio, colonia o ciudad?
  -- Si lo hay, el bounds NO debe rescatar props con texto incorrecto
  -- (e.g., municipio de Jesus Maria dentro del bounds de Aguascalientes).
  v_tiene_texto_especifico :=
       (v_busq.municipio IS NOT NULL AND array_length(v_busq.municipio, 1) > 0)
    OR (v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0)
    OR (v_busq.ciudad IS NOT NULL AND TRIM(v_busq.ciudad) <> '');

  -- Guard: busqueda sin ningun criterio real
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

  -- v_texto_match: coincide por texto? Si si la busqueda tiene al menos un
  -- criterio de texto de ubicacion Y TODOS los criterios presentes coinciden
  -- con la propiedad. AND con parentesis explicitos para que la precedencia
  -- SQL (AND > OR) no rompa la logica.
  v_texto_match := (
    (v_busq.estado IS NOT NULL AND array_length(v_busq.estado, 1) > 0)
    OR (v_busq.municipio IS NOT NULL AND array_length(v_busq.municipio, 1) > 0)
    OR (v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0)
    OR (v_busq.ciudad IS NOT NULL AND TRIM(v_busq.ciudad) <> '')
  )
  AND (
    (v_busq.estado IS NULL OR array_length(v_busq.estado, 1) IS NULL
         OR EXISTS (SELECT 1 FROM unnest(v_busq.estado) e
                    WHERE normalizar_ubicacion(e) = normalizar_ubicacion(v_prop.estado)))
    AND (v_busq.ciudad IS NULL OR TRIM(v_busq.ciudad) = ''
         OR normalizar_ubicacion(v_prop.ciudad) = normalizar_ubicacion(v_busq.ciudad))
    AND (v_busq.municipio IS NULL OR array_length(v_busq.municipio, 1) IS NULL
         -- REV05-24: con colonia, el municipio de Google puede no ser el de la BD: no se exige.
         OR (v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0)
         OR EXISTS (SELECT 1 FROM unnest(v_busq.municipio) m
                    WHERE normalizar_ubicacion(m) = normalizar_ubicacion(v_prop.municipio)))
    AND (v_busq.colonias IS NULL OR array_length(v_busq.colonias, 1) IS NULL
         OR EXISTS (SELECT 1 FROM unnest(v_busq.colonias) c
                    WHERE normalizar_ubicacion(c) = normalizar_ubicacion(v_prop.colonia::text)))
  );

  -- REV06-03: la app ya guarda cada zona elegida en criterios_busqueda.location_chips
  -- (con su locationFilter). Si TODAS las zonas tienen texto (estado, ciudad, municipio
  -- o colonia), cada zona se evalua por separado y se unen con O, igual que el mapa
  -- (utils/locationMatch.ts: matchesLocationCriteria). Si alguna zona es solo un recuadro,
  -- o no hay zonas, se usa la regla de siempre (columnas planas).
  v_zonas := v_busq.criterios_busqueda -> 'location_chips';
  IF jsonb_typeof(v_zonas) = 'array' AND jsonb_array_length(v_zonas) > 0 THEN
    SELECT bool_and(zz.tiene_texto),
           bool_or(zz.tiene_texto
                   AND (zz.estado IS NULL
                        OR position(normalizar_ubicacion(zz.estado) IN normalizar_ubicacion(v_prop.estado)) > 0)
                   AND (zz.ciudad IS NULL
                        OR normalizar_ubicacion(zz.ciudad) = normalizar_ubicacion(v_prop.ciudad))
                   AND (zz.municipio IS NULL
                        OR jsonb_array_length(zz.colonias) > 0   -- REV05-24: con colonia no se exige el municipio
                        OR normalizar_ubicacion(zz.municipio) = normalizar_ubicacion(v_prop.municipio))
                   AND (jsonb_array_length(zz.colonias) = 0
                        OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(zz.colonias) col
                                   WHERE normalizar_ubicacion(col) = normalizar_ubicacion(v_prop.colonia::text))))
      INTO v_usa_zonas, v_zonas_ok
    FROM (
      SELECT NULLIF(btrim(COALESCE(c -> 'locationFilter' ->> 'estado', '')), '') AS estado,
             NULLIF(btrim(COALESCE(c -> 'locationFilter' ->> 'ciudad', '')), '') AS ciudad,
             NULLIF(btrim(COALESCE(c -> 'locationFilter' ->> 'municipio', '')), '') AS municipio,
             (SELECT COALESCE(jsonb_agg(btrim(x)) FILTER (WHERE btrim(x) <> ''), '[]'::jsonb)
                FROM jsonb_array_elements_text(
                       CASE jsonb_typeof(c -> 'locationFilter' -> 'colonia')
                         WHEN 'array'  THEN c -> 'locationFilter' -> 'colonia'
                         WHEN 'string' THEN jsonb_build_array(c -> 'locationFilter' ->> 'colonia')
                         ELSE '[]'::jsonb
                       END) x) AS colonias,
             (COALESCE(btrim(c -> 'locationFilter' ->> 'estado'), '') <> ''
              OR COALESCE(btrim(c -> 'locationFilter' ->> 'ciudad'), '') <> ''
              OR COALESCE(btrim(c -> 'locationFilter' ->> 'municipio'), '') <> ''
              OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(
                       CASE jsonb_typeof(c -> 'locationFilter' -> 'colonia')
                         WHEN 'array'  THEN c -> 'locationFilter' -> 'colonia'
                         WHEN 'string' THEN jsonb_build_array(c -> 'locationFilter' ->> 'colonia')
                         ELSE '[]'::jsonb
                       END) y WHERE btrim(y) <> '')) AS tiene_texto
      FROM jsonb_array_elements(v_zonas) c
    ) zz;
    v_usa_zonas := COALESCE(v_usa_zonas, FALSE);
    v_zonas_ok := COALESCE(v_zonas_ok, FALSE);
  END IF;

  -- ===========================================================
  -- FIX: logica de bounds + texto
  -- ===========================================================
  -- ANTES (bug): bounds OR v_texto_match -> incluia props de OTROS
  -- municipios que caian dentro del bounds del municipio buscado
  -- (e.g., 25 props de Jesus Maria dentro del bounds de
  -- Aguascalientes sumaban al count).
  --
  -- AHORA: cuando hay texto especifico (municipio, colonia o
  -- ciudad), el texto es la verdad. Si texto pasa, aceptar
  -- (rescata props con coords imprecisas). Si texto no pasa,
  -- rechazar (incluso si esta en bounds).
  IF v_tiene_area THEN
    IF v_tiene_poligono THEN
      -- Poligono dibujado: filtro ESTRICTO, sin fallback de texto.
      -- El poligono es un area exacta definida por el usuario.
      IF NOT punto_en_area_busqueda(v_prop.latitud, v_prop.longitud, v_busq.bounds, v_busq.polygon_coords) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','fuera_de_area'); RETURN;
      END IF;
    ELSIF v_usa_zonas THEN
      -- REV06-03: zonas evaluadas por separado (O entre zonas).
      IF NOT v_zonas_ok THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','zona_no_coincide'); RETURN;
      END IF;
    ELSIF v_solo_texto_estado THEN
      -- Caso "solo estado" (chip de estado sin municipio/colonias):
      -- el server query usa substring match (`ilike '%estado%'`), no
      -- bounds. Replicamos eso: match por texto de estado, ignorando
      -- bounds. Esto es coherente con lo que el cliente ve en el mapa.
      IF NOT EXISTS (SELECT 1 FROM unnest(v_busq.estado) e
                     WHERE normalizar_ubicacion(v_prop.estado) LIKE '%' || normalizar_ubicacion(e) || '%') THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','estado_no_coincide'); RETURN;
      END IF;
    ELSIF v_tiene_texto_especifico THEN
      -- NEW: hay texto de municipio/colonia/ciudad. El texto es
      -- necesario y suficiente. El bounds ya NO rescata props
      -- con texto incorrecto.
      IF NOT v_texto_match THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','texto_no_coincide'); RETURN;
      END IF;
      -- v_texto_match pasa. Aceptar (no necesitamos checar bounds:
      -- el texto ya garantiza que es de la zona correcta).
    ELSE
      -- Solo bounds sin texto especifico (caso raro). Aceptar si
      -- esta en bounds.
      IF NOT punto_en_area_busqueda(v_prop.latitud, v_prop.longitud, v_busq.bounds, v_busq.polygon_coords) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','fuera_de_area'); RETURN;
      END IF;
    END IF;
  ELSIF v_usa_zonas THEN
    -- REV06-03: sin bounds ni poligono, zonas evaluadas por separado (O entre zonas).
    IF NOT v_zonas_ok THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','zona_no_coincide'); RETURN;
    END IF;
  ELSE
    -- Sin bounds ni poligono: solo texto
    IF v_busq.estado IS NOT NULL AND array_length(v_busq.estado, 1) > 0 THEN
      IF NOT EXISTS (SELECT 1 FROM unnest(v_busq.estado) e
                     WHERE normalizar_ubicacion(v_prop.estado) LIKE '%' || normalizar_ubicacion(e) || '%') THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','estado_no_coincide'); RETURN;
      END IF;
    END IF;
    IF v_busq.ciudad IS NOT NULL AND TRIM(v_busq.ciudad) <> '' THEN
      IF normalizar_ubicacion(v_prop.ciudad) <> normalizar_ubicacion(v_busq.ciudad) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','ciudad_no_coincide'); RETURN;
      END IF;
    END IF;
    IF v_busq.municipio IS NOT NULL AND array_length(v_busq.municipio, 1) > 0
       AND NOT (v_busq.colonias IS NOT NULL AND array_length(v_busq.colonias, 1) > 0) THEN  -- REV05-24
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

  -- Operacion relevante (precio + comision)
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
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_concesion'); RETURN;
      END IF;
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
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_electricidad'); RETURN;
      END IF;
      IF COALESCE((v_ag ->> 'caminoAcceso')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_camino_acceso, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_camino'); RETURN;
      END IF;
      IF COALESCE((v_ag ->> 'cercado')::boolean, FALSE) AND NOT COALESCE(v_prop.infra_cercado, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_cercado'); RETURN;
      END IF;
      IF COALESCE((v_ag ->> 'pieCarretera')::boolean, FALSE) AND NOT COALESCE(v_prop.acceso_carretera, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_carretera'); RETURN;
      END IF;
      IF COALESCE((v_ag ->> 'accesCamiones')::boolean, FALSE) AND NOT COALESCE(v_prop.acceso_camiones, FALSE) THEN
        RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','agricola_camiones'); RETURN;
      END IF;
    END IF;
  END IF;

  -- Dimensiones del terreno
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

  -- Comision minima de venta
  IF v_busq.comision_venta_min IS NOT NULL AND v_busq.comision_venta_min > 0
     AND LOWER(TRIM(COALESCE(v_tipo_op, ''))) = 'venta' THEN
    IF v_comision_porcentaje < v_busq.comision_venta_min THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comision_venta'); RETURN;
    END IF;
  END IF;
  -- Comision minima de renta (meses)
  IF v_busq.comision_renta_min IS NOT NULL AND v_busq.comision_renta_min > 0
     AND LOWER(TRIM(COALESCE(v_tipo_op, ''))) = 'renta' THEN
    IF v_comision_meses < v_busq.comision_renta_min THEN
      RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','comision_renta'); RETURN;
    END IF;
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

  -- Similar (precio +/-15%, m2 >=85%, caracteristicas -1)
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
      'match_ubicacion', CASE
        WHEN v_tiene_poligono THEN 'geografico'
        WHEN v_tiene_area AND v_solo_texto_estado THEN 'texto'
        WHEN v_tiene_area AND v_texto_match THEN 'texto'
        WHEN v_tiene_area THEN 'geografico'
        ELSE 'texto'
      END,
      'mensaje', CASE WHEN v_match_type = 'coincidencia'
                      THEN 'Cumple con todos tus filtros'
                      ELSE 'Cerca de tus preferencias de precio y espacio' END
    );
    RETURN;
  END IF;

  RETURN QUERY SELECT FALSE, NULL::varchar(20), jsonb_build_object('error','no_cumple_precio_caracteristicas');
END;
$function$
