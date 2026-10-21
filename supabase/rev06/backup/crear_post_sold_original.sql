-- Respaldo de crear_post_sold() tal como estaba en produccion el 21/10/2026 (antes de REV06-04).
-- Equivalente a la original: los acentos de los comentarios van sin tilde y el signo de apertura de
-- exclamacion se escribe chr(161) para que el archivo sea 100% ASCII. Pegar y ejecutar para volver atras.
CREATE OR REPLACE FUNCTION public.crear_post_sold()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_perfil RECORD;
  v_ubicacion TEXT;
  v_tipo_transaccion TEXT;
BEGIN
  -- Verificar si el status cambio a Vendida o Rentada
  IF (OLD.status IS DISTINCT FROM NEW.status) AND 
     (NEW.status IN ('Vendida', 'Rentada')) THEN
    
    -- Obtener datos del perfil del creador
    SELECT 
      foto,
      COALESCE(nombre_completo, nombre || ' ' || COALESCE(apellido_paterno, '') || ' ' || COALESCE(apellido_materno, '')) as nombre_completo,
      estado,
      pais
    INTO v_perfil
    FROM perfiles
    WHERE id = NEW.created_by;

    -- Construir ubicacion
    v_ubicacion := COALESCE(NEW.calle, '') || ' - ' || COALESCE(NEW.municipio, '') || ' - ' || COALESCE(NEW.estado, '');
    
    -- Determinar tipo de transaccion
    v_tipo_transaccion := CASE 
      WHEN NEW.status = 'Vendida' THEN 'Vendida'
      WHEN NEW.status = 'Rentada' THEN 'Rentada'
    END;
    
    -- Crear el post
    INSERT INTO posts (
      publicado_por,
      tipo,
      status,
      foto_perfil_usuario,
      fecha_hora,
      nombre_asesor,
      ubicacion,
      foto_propiedad,
      contenido,
      propiedad_id
    ) VALUES (
      NEW.created_by,
      'sold',
      NEW.status,
      v_perfil.foto,
      CURRENT_TIMESTAMP,
      v_perfil.nombre_completo,
      v_ubicacion,
      CASE WHEN NEW.fotos IS NOT NULL AND array_length(NEW.fotos, 1) > 0 
           THEN NEW.fotos[1] 
           ELSE NULL 
      END,
      chr(161) || 'Propiedad ' || v_tipo_transaccion || '! ' || NEW.codigo_propiedad,
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$function$;
