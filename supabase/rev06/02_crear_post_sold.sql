-- =====================================================================
-- REV06-04: al cerrar una propiedad (Vendida / Rentada) el trigger creaba un post
-- de cierre en CADA cambio de estado y nunca retiraba el anterior. Resultado:
-- Vendida -> Publicada -> Vendida dejaba 2 posts de cierre; y una propiedad que
-- volvia a Publicada seguia mostrando "Propiedad Vendida" en el feed.
--
-- Nueva regla (misma funcion y mismo trigger, solo cambia el cuerpo):
--   * Si el estado ANTERIOR era Vendida/Rentada y cambia, se retiran (soft delete,
--     deleted_at) los posts 'sold' vigentes de esa propiedad.
--   * Si el estado NUEVO es Vendida/Rentada se crea UN post de cierre (el anterior
--     ya fue retirado, asi que nunca quedan dos vigentes).
--   * Un UPDATE que no cambia el estado no hace nada (igual que antes).
-- SECURITY DEFINER: el UPDATE sobre posts no debe fallar en silencio por RLS cuando
-- quien cambia el estado no es el publicador original. Solo opera sobre la fila NEW.
--
-- Rollback: supabase/rev06/backup/crear_post_sold_original.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.crear_post_sold()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_perfil RECORD;
  v_ubicacion TEXT;
  v_tipo_transaccion TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- 1) El estado dejo de ser Vendida/Rentada (o paso de una a la otra):
    --    el post de cierre anterior ya no es verdad.
    IF OLD.status IN ('Vendida', 'Rentada') THEN
      UPDATE posts
         SET deleted_at = now()
       WHERE propiedad_id = NEW.id
         AND tipo = 'sold'
         AND deleted_at IS NULL;
    END IF;

    -- 2) El estado nuevo es Vendida/Rentada: se crea el post de cierre.
    IF NEW.status IN ('Vendida', 'Rentada') THEN

      SELECT
        foto,
        COALESCE(nombre_completo, nombre || ' ' || COALESCE(apellido_paterno, '') || ' ' || COALESCE(apellido_materno, '')) as nombre_completo,
        estado,
        pais
      INTO v_perfil
      FROM perfiles
      WHERE id = NEW.created_by;

      v_ubicacion := COALESCE(NEW.calle, '') || ' - ' || COALESCE(NEW.municipio, '') || ' - ' || COALESCE(NEW.estado, '');

      v_tipo_transaccion := CASE
        WHEN NEW.status = 'Vendida' THEN 'Vendida'
        WHEN NEW.status = 'Rentada' THEN 'Rentada'
      END;

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
  END IF;

  RETURN NEW;
END;
$function$;
