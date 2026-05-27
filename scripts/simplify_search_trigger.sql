CREATE OR REPLACE FUNCTION public.handle_search_change_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF (NEW.activa = FALSE OR NEW.deleted_at IS NOT NULL) THEN
    UPDATE public.matches
       SET activo = FALSE
     WHERE busqueda_id = NEW.id
       AND activo = TRUE;
  END IF;
  RETURN NEW;
END;
$func$;
