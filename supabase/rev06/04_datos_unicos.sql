-- =====================================================================
-- Correcciones de DATOS de una sola vez (no son parte del codigo de la app).
-- Cada bloque se ejecuta por separado en el SQL Editor. Todo ASCII (los acentos
-- van como escapes \uXXXX dentro de E'...').
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Codigos postales que borro el formulario de edicion (bug REV05-30, ya
--    corregido en la app). Solo toca filas donde el codigo esta vacio (null).
--    Valores = los que mando Tokko antes de que se borraran (ver auditoria).
-- ---------------------------------------------------------------------
-- Vista previa:
select codigo_propiedad, codigo_postal
from propiedades
where codigo_propiedad in ('CAP7027981','CCH7031298','CHO6716768','CHO7575903');

-- Aplicar:
update propiedades p
set codigo_postal = v.cp
from (values
  ('CAP7027981','20239'),
  ('CCH7031298','20330'),
  ('CHO6716768','20328'),
  ('CHO7575903','20118')
) as v(codigo, cp)
where p.codigo_propiedad = v.codigo
  and p.codigo_postal is null;

-- ---------------------------------------------------------------------
-- B) CHO6716768: Tokko mando municipio = 'Pocitos' (es una localidad, no un
--    municipio) y la colonia en mayusculas con punto. Se corrige a mano para que
--    entre en las zonas 'Jesus Maria' y 'St Angelo Residence'.
--    ORDEN: NO ejecutar este bloque hasta que QA termine la re-prueba de REV05-03
--    (C edita CHO6716768 desde la app, elige la ubicacion y guarda; se espera
--    municipio 'Jesus Maria'). Si el dato se corrige antes aqui, esa prueba ya no
--    demuestra que la correccion de la app funciona.
--    OJO: la proxima sincronizacion de Tokko que reprocese esta propiedad lo
--    vuelve a pisar mientras no se despliegue la proteccion de campos editados
--    (sincronizacion Tokko v15, pendiente). Si pasa, repetir este bloque.
-- ---------------------------------------------------------------------
-- Vista previa:
select codigo_propiedad, colonia, municipio, ciudad, estado
from propiedades
where codigo_propiedad = 'CHO6716768';

-- Aplicar:
update propiedades
set colonia   = E'St \u00c1ngelo Residence',
    municipio = E'Jes\u00fas Mar\u00eda'
where codigo_propiedad = 'CHO6716768';
