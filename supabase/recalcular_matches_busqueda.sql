-- ============================================================================
-- recalcular_matches_busqueda — RPC para recalcular las coincidencias de una
-- búsqueda de inmediato (sin esperar al cron process_match_jobs, que corre cada
-- minuto). Se invoca desde el cliente justo después de editar/guardar una
-- búsqueda, para que la pantalla de Coincidencias refleje al instante las
-- propiedades que cumplen los nuevos criterios y oculte las que dejaron de cumplir.
--
-- Valida que la búsqueda pertenezca al usuario autenticado antes de recalcular.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalcular_matches_busqueda(p_busqueda_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.busquedas_guardadas
    WHERE id = p_busqueda_id AND usuario_id = auth.uid()
  ) THEN
    PERFORM public.evaluate_search_matches(p_busqueda_id);
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.recalcular_matches_busqueda(uuid) TO authenticated;
