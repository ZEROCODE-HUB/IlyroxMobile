-- =====================================================================
-- REV06-06 + REV07-03 (parte BD). Se ejecuta completo, en el SQL Editor.
--
-- PARTE A (REV06-06): las propiedades importadas desde Tokko no tienen fila en
--   feed_items, por eso Like y comentarios fallan. Aqui se crea la fila que falta
--   (mismo patron que supabase/fix_feeds.sql y que propertyService.createProperty:
--   estado 'activo' siempre: la tabla no acepta 'inactivo'; la visibilidad la controla propiedades.activo).
-- PARTE B (REV07-03): el historial de busquedas guarda el id del feed_items del post/reel
--   (no el del post). Al retirar un post, sync_post_to_feed borra su feed_items y el historial
--   queda apuntando a algo que ya no existe ("No se encontro la publicacion").
--   B1 limpia esas entradas; B2 crea un trigger para que no vuelva a pasar.
--
-- Es seguro repetirlo: solo inserta lo que falta y solo marca lo no marcado.
-- Rollback: DELETE FROM feed_items WHERE id IN (<ids del paso 1>);  y
--           DROP TRIGGER trg_feed_items_limpiar_historial ON feed_items;  DROP INDEX idx_historial_busquedas_resultado_texto;
-- =====================================================================

-- ---- Paso 0: VISTA PREVIA (no cambia nada). Anota los numeros. ----
SELECT
  (SELECT count(*) FROM propiedades p
     WHERE p.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM feed_items fi
                       WHERE fi.contenido_id = p.id AND fi.tipo_contenido = 'propiedad')) AS propiedades_sin_feed,
  (SELECT count(*) FROM historial_busquedas h
     WHERE h.tipo_busqueda IN ('post', 'reel') AND h.deleted_at IS NULL
       AND h.resultado_tipo_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM feed_items fi
                       WHERE fi.id::text = h.resultado_tipo_id::text)) AS historial_apunta_a_nada;

-- ---- PARTE A: crear los feed_items que faltan ----
INSERT INTO public.feed_items (tipo_contenido, contenido_id, publicado_por, visibilidad, estado_moderacion)
SELECT 'propiedad', p.id, p.created_by, 'publico',
       'activo'
FROM public.propiedades p
WHERE p.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.feed_items fi
                  WHERE fi.contenido_id = p.id AND fi.tipo_contenido = 'propiedad');

-- ---- PARTE B1: limpiar historial existente (entradas de post/reel cuyo feed_items ya no existe) ----
UPDATE public.historial_busquedas h
   SET deleted_at = now()
 WHERE h.tipo_busqueda IN ('post', 'reel')
   AND h.deleted_at IS NULL
   AND h.resultado_tipo_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.feed_items fi
                   WHERE fi.id::text = h.resultado_tipo_id::text);

-- Indice para que el trigger de abajo no recorra toda la tabla en cada feed_items borrado
-- (p. ej. al eliminar una cuenta con muchas publicaciones).
CREATE INDEX IF NOT EXISTS idx_historial_busquedas_resultado_texto
  ON public.historial_busquedas ((resultado_tipo_id::text));

-- ---- PARTE B2: que no vuelva a ocurrir (al borrarse un feed_items se limpia su historial) ----
CREATE OR REPLACE FUNCTION public.limpiar_historial_feed_item_borrado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.tipo_contenido IN ('post', 'reel') THEN
    UPDATE historial_busquedas
       SET deleted_at = now()
     WHERE tipo_busqueda = OLD.tipo_contenido
       AND deleted_at IS NULL
       AND resultado_tipo_id::text = OLD.id::text;
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_feed_items_limpiar_historial ON public.feed_items;
CREATE TRIGGER trg_feed_items_limpiar_historial
  AFTER DELETE ON public.feed_items
  FOR EACH ROW EXECUTE FUNCTION public.limpiar_historial_feed_item_borrado();

-- ---- Verificacion (los dos deben dar 0 y el trigger existir) ----
SELECT
  (SELECT count(*) FROM propiedades p WHERE p.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM feed_items fi WHERE fi.contenido_id = p.id AND fi.tipo_contenido = 'propiedad')) AS propiedades_sin_feed,
  (SELECT count(*) FROM historial_busquedas h WHERE h.tipo_busqueda IN ('post', 'reel') AND h.deleted_at IS NULL
     AND h.resultado_tipo_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM feed_items fi WHERE fi.id::text = h.resultado_tipo_id::text)) AS historial_apunta_a_nada,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_feed_items_limpiar_historial' AND NOT tgisinternal) AS trigger_ok;
