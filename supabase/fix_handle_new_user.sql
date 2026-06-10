-- ============================================================================
-- Fix: trigger handle_new_user() — desbloquea el registro de usuarios
-- ----------------------------------------------------------------------------
-- Causa del error "Database error saving new user":
--   handle_new_user() insertaba en public.perfiles la columna `anos_experiencia`,
--   que ya no existe. El INSERT fallaba, la transacción de auth.users se revertía
--   y gotrue devolvía el error genérico, bloqueando todo registro.
--
-- Solución robusta:
--   * Insertar SOLO el id; rol y pais toman sus defaults ('cliente', 'México').
--     El frontend completa el resto del perfil con upsert tras el signUp.
--   * ON CONFLICT (id) DO NOTHING — idempotente.
--   * EXCEPTION handler — un fallo del trigger jamás vuelve a bloquear el alta.
--   * SET search_path = public — práctica recomendada en SECURITY DEFINER.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.perfiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user() error para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;
