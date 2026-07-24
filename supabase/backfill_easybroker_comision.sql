-- ============================================================================
-- Backfill puntual tras el fix de insertar_propiedad_easybroker (2026-07).
--
-- Corrige las propiedades EasyBroker YA sincronizadas. La sync salta las
-- propiedades sin cambios, así que sin esto las existentes seguirían mal.
-- ============================================================================

-- 1) COMISIÓN en MESES mal guardada como porcentaje → moverla a comision_meses.
--    (renta: EasyBroker manda comision.type = 'months', p. ej. 1 mes / 0.5 meses,
--     que se pintaba como "1%"/"0.5%").
UPDATE public.operaciones_propiedad op
SET comision_meses = op.comision_porcentaje,
    comision_porcentaje = NULL,
    updated_at = NOW()
FROM public.propiedades p
WHERE p.id = op.propiedad_id
  AND p.es_easybroker = TRUE
  AND LOWER(COALESCE(op.comision_tipo, '')) IN ('months', 'meses')
  AND op.comision_porcentaje IS NOT NULL;

-- 2) MEDIOS BAÑOS: NO se puede backfillear (no se guardó el desglose original de
--    EasyBroker; `banos` quedó con completos+medios sumados). Para corregir los
--    medios baños de las propiedades existentes hay que forzar un re-sync COMPLETO
--    reseteando la marca de última sincronización, de modo que la Edge Function
--    reprocese TODAS las propiedades con la función ya corregida:
--
--    UPDATE public.easybroker_config
--    SET ultima_sincronizacion = NULL
--    WHERE usuario_id = '<USUARIO>';
--
--    (y luego el usuario/known trigger dispara la sync). Ese re-sync también
--    recalcula la comisión, así que si se hace el re-sync completo, el paso (1)
--    es opcional.
