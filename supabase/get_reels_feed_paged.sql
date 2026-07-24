-- RPC del visor de Reels: feed lineal y paginado.
-- Reemplaza a get_reels_feed_contextual (que ordenaba "alrededor" del reel por likes
-- y dejaba reels inalcanzables + mostraba reels borrados).
--
-- Devuelve los reels activos en el mismo orden que el feed principal
-- (engagement_score DESC, publicado_en DESC) y filtra reels borrados.
-- El reel abierto se fija en el cliente al inicio (índice 0) y se deduplica por feed_item_id.

CREATE OR REPLACE FUNCTION public.get_reels_feed_paged(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  feed_item_id uuid,
  reel_id uuid,
  video_url text,
  thumbnail_url text,
  descripcion text,
  likes_count integer,
  comentarios_count integer,
  autor_nombre text,
  autor_foto text,
  autor_id uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT fi.id, r.id, r.video_url, r.thumbnail_url, r.descripcion,
         fi.likes_count, fi.comentarios_count, p.nombre, p.foto, p.id
  FROM public.feed_items fi
  JOIN public.reels r    ON fi.contenido_id = r.id
  JOIN public.perfiles p ON r.publicado_por = p.id
  WHERE fi.tipo_contenido = 'reel'
    AND fi.estado_moderacion = 'activo'
    AND fi.deleted_at IS NULL
    AND r.deleted_at IS NULL
  ORDER BY fi.engagement_score DESC, fi.publicado_en DESC, r.id ASC
  LIMIT p_limit OFFSET p_offset;
$$;
