-- ============================================================================
-- Visibilidad por comisión compartida
-- ----------------------------------------------------------------------------
-- Regla de negocio: una propiedad solo es visible públicamente (feed, mapa y
-- perfil de OTROS usuarios) si al menos una de sus operaciones comparte
-- comisión. Su creador siempre la ve, comparta o no.
--
-- `comparte_comision` vive por operación en `operaciones_propiedad`. Para poder
-- filtrar barato a nivel propiedad (igual que ya se hace con `sin_comision` y
-- `activo`), denormalizamos un flag en `propiedades` mantenido por trigger.
-- ============================================================================

-- 1. Columna denormalizada
ALTER TABLE public.propiedades
  ADD COLUMN IF NOT EXISTS comparte_comision boolean NOT NULL DEFAULT false;

-- 2. Recalcula el flag para una propiedad: true si ALGUNA operación comparte.
CREATE OR REPLACE FUNCTION public.recalc_propiedad_comparte_comision(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
  UPDATE public.propiedades p
  SET comparte_comision = EXISTS (
    SELECT 1 FROM public.operaciones_propiedad o
    WHERE o.propiedad_id = p_id AND o.comparte_comision IS TRUE
  )
  WHERE p.id = p_id;
$func$;

-- 3. Trigger function: sincroniza el flag ante cualquier cambio de operaciones.
CREATE OR REPLACE FUNCTION public.trg_sync_comparte_comision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recalc_propiedad_comparte_comision(OLD.propiedad_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalc_propiedad_comparte_comision(NEW.propiedad_id);
  IF (TG_OP = 'UPDATE' AND NEW.propiedad_id IS DISTINCT FROM OLD.propiedad_id) THEN
    PERFORM public.recalc_propiedad_comparte_comision(OLD.propiedad_id);
  END IF;
  RETURN NEW;
END;
$func$;

-- 4. Trigger AFTER INSERT/UPDATE/DELETE (cubre app, ediciones y sync EasyBroker)
DROP TRIGGER IF EXISTS sync_comparte_comision ON public.operaciones_propiedad;
CREATE TRIGGER sync_comparte_comision
AFTER INSERT OR UPDATE OR DELETE ON public.operaciones_propiedad
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_comparte_comision();

-- 5. Backfill de datos existentes
UPDATE public.propiedades p
SET comparte_comision = EXISTS (
  SELECT 1 FROM public.operaciones_propiedad o
  WHERE o.propiedad_id = p.id AND o.comparte_comision IS TRUE
);
