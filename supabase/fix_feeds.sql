-- Script para generar feed_items faltantes para propiedades existentes
-- Ejecuta este script en el editor SQL de Supabase para corregir los errores de FK en likes y comentarios

INSERT INTO public.feed_items (
    tipo_contenido, 
    contenido_id, 
    publicado_por, 
    visibilidad, 
    estado_moderacion,
    created_at
)
SELECT 
    'propiedad', 
    p.id, 
    p.created_by, 
    'publico', 
    'activo',
    NOW()
FROM public.propiedades p
WHERE p.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.feed_items fi 
    WHERE fi.contenido_id = p.id 
    AND fi.tipo_contenido = 'propiedad'
);

-- Verificar resultados
SELECT count(*) as feed_items_creados FROM public.feed_items WHERE created_at > NOW() - INTERVAL '1 minute';
