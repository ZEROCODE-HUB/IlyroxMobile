# supabase/rev06 - cambios de base de datos de la iteracion 06

Estos archivos NO se ejecutan solos ni desde la app: los corre una persona con acceso
(Supabase -> proyecto ilyrox -> SQL Editor -> New query -> pegar -> Run).

| Orden | Archivo | Que hace | Issue |
|---|---|---|---|
| 1 | `01_normalizar_ubicacion.sql` | La normalizacion de ubicaciones ignora puntuacion ("ST. ANGELO" = "St Angelo"). Cambia 3 funciones. | REV05-06 / REV05-03 |
| 2 | `02_crear_post_sold.sql` | El post de cierre (Vendida/Rentada) se retira al reabrir la propiedad y nunca quedan dos vigentes. | REV06-04 |
| 3 | `03_limpiar_posts_cierre.sql` | Limpieza unica de posts de cierre ya duplicados o vencidos (paso 1 = solo mirar). Despues del 2. | REV06-04 |
| 4 | `04_datos_unicos.sql` | Restaura 4 codigos postales y corrige CHO6716768. Por bloques. | REV05-30 / REV05-06 |

**Orden del archivo 4:** el bloque A (codigos postales) se puede ejecutar cuando quieras. El bloque B (CHO6716768) se ejecuta DESPUES de que QA termine la re-prueba de REV05-03 (editar CHO6716768 desde la app y comprobar que el municipio queda en Jesus Maria); si se corrige antes por SQL, esa prueba no demuestra nada.

Hacer ANTES de ejecutar cualquier cosa: confirmar que existen los respaldos de
`supabase/backups/2026-10-19-prod/` (normalizar_ubicacion, buscar_ubicaciones_desde_propiedades)
y `backup/crear_post_sold_original.sql` (esta carpeta). Para volver atras se pega el respaldo y se ejecuta.

La funcion nueva `normalizar_texto_ubicacion` (archivo 1) no tiene respaldo porque no existia: para revertir el
archivo 1 basta con restaurar las otras dos funciones.

## Comprobaciones despues de ejecutar

```sql
-- Despues del archivo 1 (todas deben dar lo indicado)
select normalizar_ubicacion('ST. ANGELO RESIDENCE') = normalizar_ubicacion(E'St \u00c1ngelo Residence') as igual_debe_ser_true;
select normalizar_ubicacion(E'Ciudad de M\u00e9xico (CDMX)') as debe_ser_cdmx;
select normalizar_ubicacion(E'M\u00e9xico') as debe_ser_estado_de_mexico;
select count(*) from buscar_ubicaciones_desde_propiedades('st.');        -- debe encontrar St Angelo (antes solo la variante con punto)
select count(*) from buscar_ubicaciones_desde_propiedades('.');          -- debe ser 0

-- Despues del archivo 2: ver que la funcion quedo instalada
select pg_get_functiondef('public.crear_post_sold'::regproc) like '%deleted_at = now()%' as instalada_debe_ser_true;
-- Y que el trigger de feed reacciona al soft delete (debe mostrar AFTER UPDATE OF status, deleted_at):
select pg_get_triggerdef(t.oid) from pg_trigger t join pg_class c on c.oid=t.tgrelid
where c.relname='posts' and t.tgname='tr_sync_post_to_feed';
```

Despues del archivo 1 conviene recalcular los matches de busquedas guardadas
(`supabase/recalcular_matches_busqueda.sql`), porque los matches ya guardados se calcularon con la regla anterior.
