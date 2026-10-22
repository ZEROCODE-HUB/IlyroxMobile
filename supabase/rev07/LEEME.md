# supabase/rev07 - cambios de base de datos de la iteracion 07

Estos archivos NO se ejecutan solos ni desde la app: los corre una persona con acceso
(Supabase -> proyecto ilyrox -> SQL Editor -> New query -> pegar -> Run). La funcion de
Tokko se despliega aparte (ver abajo).

| Orden | Archivo | Que hace | Issue |
|---|---|---|---|
| 1 | `05_feed_items_y_historial.sql` | Crea el feed_items que falta en las propiedades existentes; oculta del historial las entradas de post/reel cuyo feed_items ya no existe y crea un trigger para que no vuelva a pasar. Tiene vista previa y verificacion. | REV06-06 / REV07-03 |
| 2 | `06_tokko_v15_bulk.sql` | Sincronizacion de Tokko v15, sobre la v14 vigente (se detiene sola si no esta): detecta cambios por huella del contenido, no pisa la ubicacion ya guardada, toca operaciones solo de lo que cambio y crea el feed_items de cada propiedad de Tokko. Agrega 2 columnas. | REV07-01 / REV06-06 / REV05-33 |
| 3 | `07_evaluar_par_match_zonas.sql` | evaluar_par_match: con colonia no se exige el municipio de Google; las zonas guardadas (`criterios_busqueda.location_chips`) se evaluan una por una (O). | REV05-24 / REV06-03 |

Funcion de Tokko: `supabase/functions/sincronizar-tokkobroker/index.ts` (cambiada en este paquete).
Desplegar DESPUES del archivo 2: `supabase functions deploy sincronizar-tokkobroker`.

Para volver atras: archivo 2 -> pegar `supabase/tokkobroker_bulk_insert.sql` (la v14); archivo 3 -> pegar
`supabase/backups/2026-10-19-prod/evaluar_par_match.sql`; archivo 1 -> `DROP TRIGGER trg_feed_items_limpiar_historial ON feed_items;`
y `DROP INDEX idx_historial_busquedas_resultado_texto;`. Las 2 columnas nuevas pueden quedarse.
Los archivos 2 y 3 empiezan con una comprobacion: si produccion no tiene la version esperada, se detienen con un error
(`DETENIDO: ...`) sin cambiar nada; en ese caso mandar el mensaje al equipo.

## Que esperar

- **Primera sincronizacion despues del archivo 2:** reprocesa TODAS las propiedades de Tokko una vez (todavia no tienen huella).
  Reescribe lo que Tokko manda (descripcion, direccion, precio, fotos, tipo, etc.), incluso si se edito en la app. No toca
  activo, sin_comision, status, comisiones, ni estado/municipio/ciudad/colonia ya guardados. Las siguientes sincronizaciones solo reprocesan lo que cambio en Tokko.
- Despues de esa primera corrida, `propiedades.tokkobroker_status` guarda el codigo de estado crudo de Tokko.
  Para aprender los codigos (REV05-31): C marca una propiedad como Reservada y otra como Vendida en Tokko, sincroniza,
  y se consulta `select tokkobroker_id, tokkobroker_status from propiedades where es_tokkobroker`.
- La primera sincronizacion actualiza todas las propiedades de Tokko, y los triggers de `propiedades`
  (por ejemplo `on_property_change_match`) se disparan una vez por cada una: se vuelven a evaluar sus matches.
  Conviene correrla en un momento tranquilo y revisar que no lleguen notificaciones de matches repetidos.
- Si el listado de Tokko llega incompleto (error en una pagina), la funcion ya NO marca propiedades como eliminadas.

## Comprobaciones despues de ejecutar

```sql
-- Antes del archivo 1, mirar la vista previa que imprime: propiedades_sin_feed deberia ser parecido al numero de propiedades
-- de Tokko (18) mas las que no tengan feed; si es MUCHO mayor, parar y revisar antes de continuar.
-- Despues del archivo 1: debe dar 0, 0 y trigger_ok = true; luego probar en la app abrir un post retirado desde el historial (lo imprime el propio archivo)
-- Despues del archivo 2:
select count(*) filter (where tokkobroker_hash is not null) as con_huella, count(*) as total
from propiedades where es_tokkobroker;                 -- tras la 1a sincronizacion, con_huella = total
select count(*) from propiedades p where p.es_tokkobroker and p.deleted_at is null
  and not exists (select 1 from feed_items f where f.contenido_id = p.id and f.tipo_contenido = 'propiedad');  -- debe ser 0
-- Despues del archivo 3: el SQL Editor debe decir "Success". Luego, en la app, probar ZN-01 y ZN-15.
```

Despues del archivo 3 conviene recalcular los matches de busquedas guardadas
(`supabase/recalcular_matches_busqueda.sql`), porque los matches ya guardados se calcularon con la regla anterior.
