-- Función de borrado de cuenta (Apple App Store Guideline 5.1.1(v)).
-- Borra en cascada todos los datos del usuario y finalmente su perfil.
-- La eliminación del registro en auth.users la hace la Edge Function `eliminar-cuenta`
-- (requiere service_role) DESPUÉS de llamar a esta función.
--
-- Orden cuidado por las FK NO ACTION del esquema (no cascadean y bloquearían el
-- borrado del perfil): se nulifican las referencias del usuario sobre datos ajenos,
-- se borra el contenido propio bloqueante y al final el perfil (que cascadea el resto).

create or replace function public.eliminar_cuenta(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func$
begin
  -- 1) Romper referencias del usuario sobre datos de OTROS (NO ACTION): poner a null
  update propiedades set modified_by = null where modified_by = p_user_id;
  update leads set agente_asignado_id = null where agente_asignado_id = p_user_id;
  update reportes_contenido set revisado_por = null where revisado_por = p_user_id;
  update reportes_propiedades set revisado_por = null where revisado_por = p_user_id;
  update agrupaciones_conversaciones set ultimo_mensaje_de = null where ultimo_mensaje_de = p_user_id;

  -- Las agrupaciones de OTROS usuarios que apunten a conversaciones que se borrarán
  -- (del usuario o de sus propiedades) bloquearían el borrado (FK NO ACTION) -> nulificar.
  update agrupaciones_conversaciones set conversacion_mas_reciente_id = null
    where conversacion_mas_reciente_id in (
      select id from conversaciones
      where usuario1_id = p_user_id or usuario2_id = p_user_id
         or propiedad_id in (select id from propiedades where created_by = p_user_id)
    );

  -- 2) Borrar las PROPIEDADES del usuario (primero los guardados que las referencian: NO ACTION)
  delete from propiedades_guardadas where propiedad_id in (select id from propiedades where created_by = p_user_id);
  delete from propiedades where created_by = p_user_id;  -- cascada: citas, conversaciones, matches, posts, amenidades, financiamientos, gravamenes, compartidas, reportes_propiedades, solicitudes_info, operaciones, alertas, cola_matches

  -- 3) Borrar contenido propio con FK NO ACTION hacia perfiles
  delete from propiedades_guardadas where usuario_id = p_user_id;
  delete from busquedas_guardadas where usuario_id = p_user_id;     -- antes que leads (lead_id NO ACTION)
  delete from leads where usuario_id = p_user_id;
  delete from solicitudes_propiedad where usuario_id = p_user_id;
  delete from soporte where usuario_id = p_user_id;
  delete from agrupaciones_conversaciones where usuario1_id = p_user_id or usuario2_id = p_user_id;

  -- 4) Borrar el perfil -> cascada de todo lo demas (posts, reels, comentarios, feed_items,
  --    likes, matches, mensajes, conversaciones, citas, resenas, recomendaciones, etc.)
  delete from perfiles where id = p_user_id;
end;
$func$;

revoke all on function public.eliminar_cuenta(uuid) from public;
grant execute on function public.eliminar_cuenta(uuid) to service_role;
