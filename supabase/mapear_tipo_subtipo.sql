-- ============================================================================
-- mapear_tipo_subtipo: traduce el tipo de propiedad de un portal (Tokko,
-- EasyBroker) al catálogo de la app (src/constants/propertyData.ts →
-- PROPERTY_TYPES). El matching compara el subtipo por igualdad, así que un
-- subtipo fuera del catálogo nunca coincide con una búsqueda.
--
--   p_nombre      nombre del tipo en el portal ("Casa", "Galpón", "Casa en condominio"...)
--   p_codigo      código de Tokko (type.code: HO, AP, LA, CH, CO, GL, OF...). NULL en EasyBroker.
--   p_colonia     colonia, para distinguir condominio / rural
--   p_m2_terreno  superficie del terreno, para distinguir terreno rural
--
-- Si cambia el catálogo de la app, hay que cambiar esto también.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mapear_tipo_subtipo(
  p_nombre text,
  p_codigo text,
  p_colonia text,
  p_m2_terreno numeric
)
RETURNS TABLE(tipo text, subtipo text)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  n text := lower(unaccent(btrim(coalesce(p_nombre, ''))));
  c text := upper(btrim(coalesce(p_codigo, '')));
  col text := lower(unaccent(coalesce(p_colonia, '')));
  es_condominio boolean;
  es_rural boolean;
BEGIN
  -- Por la colonia solo se deduce "condominio" con palabras inequívocas
  -- ("Residencial X" suele ser un fraccionamiento abierto).
  es_condominio := n ~ 'condominio' OR col ~ '(condominio|privada|residence|coto)';
  es_rural := col ~ '(ejido|rancheria)' OR coalesce(p_m2_terreno, 0) >= 10000;

  -- Habitacional ------------------------------------------------------------
  IF n ~ '(casa con local|uso comercial)' THEN
    RETURN QUERY SELECT 'comercial', 'Casa con local/casa con uso comercial';
  ELSIF n ~ '(casa de campo|descanso|cabana)' THEN
    RETURN QUERY SELECT 'habitacional', 'Casa de campo/descanso/cabaña';
  ELSIF c = 'HO' OR n ~ '^casa' OR n IN ('house', 'villa', 'townhouse', 'duplex', 'residencia') THEN
    -- EasyBroker ya distingue "Casa" de "Casa en condominio": se respeta. Tokko
    -- solo dice "Casa" (HO), así que ahí se deduce por la colonia.
    RETURN QUERY SELECT 'habitacional',
      CASE WHEN n ~ 'condominio' OR (c = 'HO' AND es_condominio)
           THEN 'Casa en Condominio' ELSE 'Casa (Fracc. Abierto)' END;
  ELSIF n ~ 'penthouse' THEN
    RETURN QUERY SELECT 'habitacional', 'Penthouse';
  ELSIF n ~ '(loft|estudio)' THEN
    RETURN QUERY SELECT 'habitacional', 'Loft';
  ELSIF c = 'AP' OR n ~ '(departamento|apartment|depto)' THEN
    RETURN QUERY SELECT 'habitacional', 'Departamento';

  -- Terrenos ----------------------------------------------------------------
  ELSIF n ~ 'terreno comercial' THEN
    RETURN QUERY SELECT 'comercial', 'Terreno Comercial';
  ELSIF n ~ '(terreno industrial|terreno para nave|terreno para bodega)' THEN
    RETURN QUERY SELECT 'industrial', 'Terreno para nave o bodega';
  ELSIF c = 'LA' OR n ~ '(terreno|lote|land)' THEN
    IF es_rural OR n ~ '(rural|agricola)' THEN
      RETURN QUERY SELECT 'agricola', 'Terreno Rural';
    ELSIF es_condominio THEN
      RETURN QUERY SELECT 'habitacional', 'Terreno en Condominio';
    ELSE
      RETURN QUERY SELECT 'habitacional', 'Terreno (Fracc. abierto)';
    END IF;

  -- Agrícola ----------------------------------------------------------------
  ELSIF c = 'CH' OR n ~ '(chacra|rancho|finca|quinta|granja|huerta|ranch|farm)' THEN
    RETURN QUERY SELECT 'agricola', 'Rancho / Finca';

  -- Industrial --------------------------------------------------------------
  ELSIF n ~ 'nave' THEN
    RETURN QUERY SELECT 'industrial', 'Nave';
  ELSIF c = 'GL' OR n ~ '(galpon|bodega industrial|warehouse)' THEN
    RETURN QUERY SELECT 'industrial', 'Bodega';

  -- Comercial ---------------------------------------------------------------
  ELSIF n ~ 'bodega' THEN
    RETURN QUERY SELECT 'comercial', 'Bodega';
  ELSIF c = 'CO' OR n ~ 'edificio' THEN
    RETURN QUERY SELECT 'comercial', 'Edificio';
  ELSIF c = 'BU' OR n ~ 'local' THEN
    RETURN QUERY SELECT 'comercial', 'Local';
  ELSIF c = 'OF' OR n ~ '(oficina|consultorio|office)' THEN
    RETURN QUERY SELECT 'comercial', 'Oficina';
  ELSIF n ~ 'plaza' THEN
    RETURN QUERY SELECT 'comercial', 'Plaza';

  -- Sin coincidencia: se conserva el nombre original para revisarlo a mano.
  ELSE
    RETURN QUERY SELECT 'habitacional', nullif(btrim(p_nombre), '');
  END IF;
END;
$function$;
