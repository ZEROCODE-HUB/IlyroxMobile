CREATE OR REPLACE FUNCTION public.handle_new_property_match()
RETURNS TRIGGER AS $$
DECLARE
  v_propiedad RECORD;
  v_search RECORD;
  v_match_type text;
  v_min_price numeric;
  v_max_price numeric;
  v_detalle_text text; -- Variable temporal para construir el texto
BEGIN
  -- 1. Obtener detalles de la propiedad base
  SELECT * INTO v_propiedad FROM public.propiedades WHERE id = NEW.propiedad_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 2. Iterar sobre búsquedas activas
  FOR v_search IN 
    SELECT * FROM public.busquedas_guardadas 
    WHERE activa = TRUE 
    AND deleted_at IS NULL
    AND (tipo_operacion IS NULL OR tipo_operacion = NEW.tipo_operacion)
    AND (ciudad IS NULL OR ciudad = v_propiedad.ciudad)
  LOOP
    v_match_type := NULL;

    -- ============================================================
    -- CRITERIOS DE EXCLUSIÓN
    -- ============================================================
    IF (v_search.tipo_propiedad IS NOT NULL AND v_search.tipo_propiedad != v_propiedad.tipo) THEN
      CONTINUE; 
    END IF;

    IF (v_search.estado IS NOT NULL AND v_search.estado != v_propiedad.estado) THEN
      CONTINUE;
    END IF;

    -- ============================================================
    -- EVALUACIÓN DE COINCIDENCIA (MATCH STRICT)
    -- ============================================================
    IF (
       (v_search.precio_min IS NULL OR NEW.precio >= v_search.precio_min) AND
       (v_search.precio_max IS NULL OR NEW.precio <= v_search.precio_max) AND
       (v_search.habitaciones IS NULL OR v_propiedad.habitaciones >= v_search.habitaciones) AND
       (v_search.banos IS NULL OR v_propiedad.banos >= v_search.banos) AND
       (v_search.estacionamientos IS NULL OR v_propiedad.estacionamientos >= v_search.estacionamientos) AND
       (v_search.colonia IS NULL OR v_search.colonia = v_propiedad.colonia) AND
       (v_search.metros_terreno IS NULL OR v_propiedad.metros_cuadrados_terreno >= v_search.metros_terreno) AND
       (v_search.metros_construccion IS NULL OR v_propiedad.metros_cuadrados_construccion >= v_search.metros_construccion)
    ) THEN
       v_match_type := 'coincidencia';
    END IF;

    -- ============================================================
    -- EVALUACIÓN DE SIMILITUD (SIMILAR)
    -- ============================================================
    IF (v_match_type IS NULL) THEN
        v_min_price := CASE WHEN v_search.precio_min IS NOT NULL THEN v_search.precio_min * 0.8 ELSE 0 END;
        v_max_price := CASE WHEN v_search.precio_max IS NOT NULL THEN v_search.precio_max * 1.2 ELSE 999999999999 END;
        
        IF (NEW.precio BETWEEN v_min_price AND v_max_price) THEN
             IF (
                (v_search.habitaciones IS NULL OR v_propiedad.habitaciones >= (v_search.habitaciones - 1)) AND
                (v_search.banos IS NULL OR v_propiedad.banos >= (v_search.banos - 1)) AND
                (v_search.metros_terreno IS NULL OR v_propiedad.metros_cuadrados_terreno >= (v_search.metros_terreno * 0.9))
             ) THEN
                v_match_type := 'similar';
             END IF;
        END IF;
    END IF;

    -- ============================================================
    -- INSERTAR O ACTUALIZAR MATCH (CORRECCIÓN JSONB)
    -- ============================================================
    IF (v_match_type IS NOT NULL) THEN
       -- Preparamos el texto del detalle
       v_detalle_text := CASE 
         WHEN v_match_type = 'coincidencia' THEN 'Cumple con todos tus filtros' 
         ELSE 'Cerca de tus preferencias de precio y espacio' 
       END;

       INSERT INTO public.matches (
         propiedad_id, 
         busqueda_id, 
         usuario_id, 
         tipo_match, 
         activo, 
         estado, 
         detalle, -- Columna JSONB
         created_at
       )
       VALUES (
         NEW.propiedad_id, 
         v_search.id, 
         v_search.usuario_id, 
         v_match_type, 
         TRUE, 
         'pendiente', 
         jsonb_build_object('mensaje', v_detalle_text), -- Construye un objeto JSON {"mensaje": "..."}
         NOW()
       )
       ON CONFLICT (propiedad_id, busqueda_id) 
       DO UPDATE SET 
         tipo_match = EXCLUDED.tipo_match, 
         activo = TRUE, 
         estado = 'pendiente', 
         detalle = EXCLUDED.detalle, -- Toma el objeto JSONB del bloque VALUES
         created_at = NOW();
    END IF;

  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;