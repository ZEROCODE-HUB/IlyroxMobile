# Respaldo de funciones de producción — 19/10/2026

Copia exacta (`pg_get_functiondef`) de estas funciones de la base de producción
de Supabase (`kpgmcebtzbeatmznwbfb`), tomada **antes** de cualquier cambio:

| Archivo | Función |
|---|---|
| `punto_en_area_busqueda.sql` | ¿Un punto cae dentro del polígono/bounds de una búsqueda? |
| `evaluar_par_match.sql` | Decide si una propiedad hace match con una búsqueda guardada |
| `normalizar_ubicacion.sql` | Normaliza textos de ubicación (minúsculas, sin acentos, alias de estados) |
| `insertar_propiedad_easybroker.sql` | Sincroniza una propiedad de EasyBroker |
| `bulk_insertar_propiedades_tokkobroker_full.sql` | Sincroniza propiedades de Tokko Broker en lote |
| `buscar_ubicaciones_desde_propiedades.sql` | Sugerencias de ubicación a partir de las propiedades publicadas |

## Cómo volver a como estaba

Si después de un cambio algo falla, se restaura la función con su archivo:

1. Entrar a Supabase → proyecto **ilyrox** → **SQL Editor** → *New query*.
2. Abrir el archivo `.sql` de la función que se quiere restaurar, copiar **todo** su
   contenido y pegarlo.
3. Darle **Run**. Debe responder `Success. No rows returned`.

Cada archivo empieza con `CREATE OR REPLACE FUNCTION`, así que reemplaza la versión
actual por la respaldada sin borrar nada más. Los permisos (GRANT) de la función se
conservan.

Para restaurar todas, repetir el paso 2 y 3 con cada archivo (el orden no importa).

### Comprobar que quedó restaurada

En el SQL Editor:

```sql
select pg_get_functiondef('public.punto_en_area_busqueda'::regproc);
```

El resultado debe ser idéntico al contenido del archivo.

## Notas

- Estos archivos solo cubren **funciones**. Si algún cambio futuro modifica
  **datos** (filas de tablas), se debe exportar antes un respaldo de esas filas en
  esta misma carpeta (o una nueva con su fecha).
- Si una función se cambia de firma (otros parámetros), `CREATE OR REPLACE` no la
  sustituye: hay que hacer `DROP FUNCTION` de la nueva antes de restaurar.
