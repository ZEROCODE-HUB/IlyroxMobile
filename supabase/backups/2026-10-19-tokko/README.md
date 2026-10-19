# Respaldo: corrección de la importación de Tokko y subtipos (19/10/2026)

## Qué se cambió en producción

**Funciones (19/10, ~16:30, hora de México)**

| Función | Archivo con la versión nueva | Versión anterior (para revertir) |
|---|---|---|
| `mapear_tipo_subtipo` (nueva) | `supabase/mapear_tipo_subtipo.sql` | no existía |
| `tokko_tipo_operacion` (nueva) | `supabase/tokkobroker_bulk_insert.sql` | no existía |
| `bulk_insertar_propiedades_tokkobroker_full` | `supabase/tokkobroker_bulk_insert.sql` | `../2026-10-19-prod/bulk_insertar_propiedades_tokkobroker_full.sql` |
| `insertar_propiedad_easybroker` | `supabase/insertar_propiedad_easybroker.sql` | `../2026-10-19-prod/insertar_propiedad_easybroker.sql` |

**Datos**
- EasyBroker (71 propiedades): se tradujeron `tipo` y `subtipo` al catálogo de la app. El estado anterior está en `easybroker_tipo_subtipo.json`.
- Tokko (18 propiedades):
  - Se pusieron `activo = false` y `sin_comision = true`.
  - Se puso `tokkobroker_updated_at = '2000-01-01'` para que la próxima sincronización las reimporte completas.
  - El estado anterior completo está en `tokko_propiedades.json`, y sus operaciones en `tokko_operaciones.json`.
- Matches de esas propiedades (2): se pusieron `activo = false`. El estado anterior está en `tokko_matches.json`.

No se borró ninguna fila.

## Cómo volver a como estaba

Todo se hace en Supabase → proyecto **ilyrox** → **SQL Editor**.

### 1. Funciones

Pegar y ejecutar (Run), uno por uno, el contenido de:
1. `../2026-10-19-prod/bulk_insertar_propiedades_tokkobroker_full.sql`
2. `../2026-10-19-prod/insertar_propiedad_easybroker.sql`

Después, opcionalmente, borrar las funciones nuevas (ya nada las usa):
```sql
DROP FUNCTION IF EXISTS public.tokko_tipo_operacion(jsonb);
DROP FUNCTION IF EXISTS public.mapear_tipo_subtipo(text, text, text, numeric);
```

### 2. Tipo y subtipo de EasyBroker

Copiar todo el contenido de `easybroker_tipo_subtipo.json` y pegarlo en lugar de `<JSON>`:
```sql
UPDATE propiedades p
SET tipo = x.tipo, subtipo = x.subtipo
FROM jsonb_to_recordset('<JSON>'::jsonb) AS x(id uuid, tipo text, subtipo text)
WHERE p.id = x.id;
```

### 3. Propiedades de Tokko

Con el contenido de `tokko_propiedades.json` en lugar de `<JSON>`:
```sql
UPDATE propiedades p
SET activo = x.activo, sin_comision = x.sin_comision,
    tokkobroker_updated_at = x.tokkobroker_updated_at,
    tipo = x.tipo, subtipo = x.subtipo, estado = x.estado, municipio = x.municipio,
    ciudad = x.ciudad, colonia = x.colonia, habitaciones = x.habitaciones,
    descripcion = x.descripcion, tipo_contrato = x.tipo_contrato
FROM jsonb_to_recordset('<JSON>'::jsonb) AS x(
  id uuid, activo boolean, sin_comision boolean, tokkobroker_updated_at timestamptz,
  tipo text, subtipo text, estado text, municipio text, ciudad text, colonia text,
  habitaciones int, descripcion text, tipo_contrato text)
WHERE p.id = x.id;
```

Para sus operaciones, con `tokko_operaciones.json`:
```sql
UPDATE operaciones_propiedad o
SET tipo_operacion = x.tipo_operacion, precio = x.precio, moneda = x.moneda, activa = x.activa
FROM jsonb_to_recordset('<JSON>'::jsonb) AS x(id uuid, tipo_operacion text, precio numeric, moneda text, activa boolean)
WHERE o.id = x.id;
```
Si la reimportación creó operaciones nuevas (por ejemplo, una de renta), desactivarlas con:
`UPDATE operaciones_propiedad SET activa = false WHERE id NOT IN (<ids del JSON>) AND propiedad_id IN (<ids de las 18>);`

### 4. Matches

```sql
UPDATE matches SET activo = true
WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements('<JSON de tokko_matches.json>'::jsonb) x);
```

### Comprobar

```sql
SELECT md5(pg_get_functiondef('public.bulk_insertar_propiedades_tokkobroker_full'::regproc));
-- versión anterior (v13): 45b7c243d527ff81d0281fe49e99abe2
```
