CREATE OR REPLACE FUNCTION public.normalizar_ubicacion(t text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  n text;
BEGIN
  IF t IS NULL THEN RETURN ''; END IF;
  n := lower(unaccent(btrim(t)));
  -- Alias de divisiones de nivel 1 (estado): largo/oficial ↔ corto/común.
  n := CASE n
    -- Ciudad de México
    WHEN 'ciudad de mexico'        THEN 'cdmx'
    WHEN 'ciudad de mexico (cdmx)' THEN 'cdmx'
    WHEN 'distrito federal'        THEN 'cdmx'
    WHEN 'mexico city'             THEN 'cdmx'
    -- Estado de México
    WHEN 'estado de mexico' THEN 'estado de mexico'
    WHEN 'edomex'           THEN 'estado de mexico'
    WHEN 'mexico'           THEN 'estado de mexico'
    -- Estados con sufijo oficial
    WHEN 'coahuila de zaragoza'            THEN 'coahuila'
    WHEN 'michoacan de ocampo'             THEN 'michoacan'
    WHEN 'veracruz de ignacio de la llave' THEN 'veracruz'
    WHEN 'veracruz llave'                  THEN 'veracruz'
    ELSE n
  END;
  RETURN n;
END;
$function$
