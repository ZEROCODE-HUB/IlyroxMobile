# Análisis de Escalabilidad — IlyroxMobile

## Problemas Detectados

---

## Críticos

### 1. OneSignal: Llamadas HTTP individuales en vez de envíos por lote

**Archivos:**
- `supabase/functions/notify-matches/index.ts:188-202`
- `supabase/functions/recordar-filtros/index.ts:124-141`

**Problema:** Cada usuario que coincide recibe su propio `POST` a OneSignal. Para 50+ coincidencias, se hacen 50+ conexiones HTTP separadas. OneSignal tiene un límite de tasa de ~20 req/s en la mayoría de los planes, por lo que esto producirá errores 429 silenciosamente.

**Solución:** OneSignal acepta `include_external_user_ids` como un arreglo. Enviar todos los IDs de usuarios en una sola llamada por contenido de notificación único.

```typescript
// En vez de:
for (const user of users) {
  await sendPushNotification(user.id, heading, content, data);
}

// Hacer:
const body = {
  app_id: ONESIGNAL_APP_ID,
  include_external_user_ids: users.map(u => u.id),
  headings: { es: heading, en: heading },
  contents: { es: content, en: content },
  data,
};
await fetch("https://onesignal.com/api/v1/notifications", { ... });
```

---

### 2. `sendPushNotification` descarta la respuesta completamente

**Archivos:**
- `supabase/functions/notify-matches/index.ts:105-112`
- `supabase/functions/recordar-filtros/index.ts:80-87`

**Problema:** La respuesta de `fetch` nunca se revisa. Si OneSignal devuelve 429 (límite de tasa), 401 (auth inválida) o 5xx, el error se traga silenciosamente. Las notificaciones fallan sin que nadie lo sepa.

**Solución:** Validar el `response.status` y `response.ok`, implementar reintentos con backoff exponencial en 429, y registrar errores.

---

### 3. Edge Function de EasyBroker agotará timeout en importaciones grandes

**Archivo:** `supabase/functions/sincronizar-easybroker/index.ts:191-279`

**Problema:** Procesa propiedades en lotes de 5 con 200ms de retraso + 2 llamadas HTTP por propiedad (detalle de EasyBroker + RPC de Supabase). Para 100+ propiedades: `100/5 * ~700ms ≈ 14s`. Para 300+ propiedades: ≈42s. **El timeout por defecto de Supabase Edge Functions es 60s** — cualquier sincronización grande lo excederá y dejará la sincronización en un estado `en_progreso` inconsistente.

**Solución:**
- Procesar en lotes más grandes (10-15) si EasyBroker lo permite
- Guardar progreso periódicamente para permitir reanudación
- Aumentar el timeout configurable de la Edge Function si es posible
- Implementar paginación en el procesamiento para evitar el límite de tiempo

---

### 4. Race condition: La suscripción Realtime puede perder la finalización de la sincronización

**Archivo:** `src/hooks/useEasyBroker.ts:230-240`

**Problema:** El usuario establece `syncing=true`, luego `useEffect` llama a `setupSyncSubscription()`. Si la Edge Function se completa antes de que el canal Realtime esté completamente establecido, el evento `completada` **nunca se recibe** y el frontend se queda atascado en "Sincronizando..." indefinidamente.

**Solución:** Implementar un mecanismo de polling como respaldo. Si no se recibe un evento Realtime después de N segundos, consultar el estado de la sincronización directamente vía RPC.

---

## Alto

### 5. Todas las propiedades de EasyBroker se cargan en memoria a la vez

**Archivo:** `supabase/functions/sincronizar-easybroker/index.ts:118`

**Problema:** `todasLasPropiedades: any[]` contiene cada propiedad antes de procesar. Con 1000+ propiedades incluyendo metadatos completos, esto puede agotar la memoria de la Edge Function (limitada a ~128MB-256MB).

**Solución:** Procesar en streaming página por página en vez de acumular todo en un arreglo. Procesar cada página a medida que se recibe.

---

### 6. Solo un candado de sincronización — sin protección contra sincronizaciones concurrentes

**Archivo:** `supabase/functions/sincronizar-easybroker/index.ts:105-108`

**Problema:** La bandera `sincronizacion_en_progreso` evita que un usuario lance dos sincronizaciones, pero si la función **agota el timeout** (problema #3), la bandera queda `true` permanentemente. La detección huérfana de 15 minutos del cliente (`useEasyBroker.ts:82-84`) es una curita, no una solución real.

**Solución:** Usar un lock con TTL en la base de datos (ej: la bandera expira automáticamente después de N minutos) o usar `pg_advisory_lock`.

---

### 7. Feed enterrado para propiedades importadas en lote

**Archivo:** `src/services/feedService.ts:336-338`

**Problema:** Los ítems del feed se ordenan por `engagement_score DESC`. Las propiedades nuevas de EasyBroker comienzan con `engagement_score=0`, por lo que 50 propiedades importadas caen al **fondo** del feed. Los usuarios deben desplazarse más allá de todo lo demás para verlas. No hay un mecanismo para impulsar temporalmente las propiedades importadas nuevas.

**Solución:** Asignar un `engagement_score` inicial más alto o un "boost" temporal (ej: basado en `publicado_en`) para propiedades recién importadas, que se degrade con el tiempo.

---

## Medio

### 8. Consultas N+1 en relaciones de propiedades

**Archivo:** `src/services/propertyService.ts:291-347`

**Problema:** Para cada amenidad, tipo de financiamiento y gravamen, se hace un `SELECT` separado seguido de un `INSERT`. Una propiedad con 15 amenidades = 30+ consultas. El RPC `insertar_propiedad_easybroker` probablemente tiene el mismo problema — esto se multiplica por cada propiedad importada.

**Solución:** Usar operaciones por lote. Pasar arreglos a una sola llamada a la función RPC o usar `supabase.from('tabla').insert([...])` con un arreglo de registros.

---

### 9. Edge Function `enviar_notificacion_push` falta en el repositorio

**Archivo:** `supabase/functions/sincronizar-easybroker/index.ts:339`

**Problema:** Se referencia `supabaseClient.functions.invoke("enviar_notificacion_push", ...)` pero no existe un archivo en `supabase/functions/enviar-notificacion-push/`. Si no está desplegada por separado, las notificaciones push de sincronización fallan silenciosamente.

**Solución:** Crear e implementar la función faltante, o reemplazar la invocación con una llamada directa a la API de OneSignal similar a `notify-matches` y `recordar-filtros`.

---

### 10. Clave de caché inmutable en `usePropertyFeedItems`

**Archivo:** `src/hooks/usePropertyFeedItems.ts:19`

**Problema:** `propertyIds.sort().join(",")` como clave de consulta crea un nuevo arreglo en cada render, lo que potencialmente causa re-fetch innecesarios cuando los arreglos de propiedades son grandes.

**Solución:** Usar un cache key estable basado en el contenido o memoizar la entrada.

---

### 11. `addPropertyRelations` siempre elimina y re-inserta

**Archivo:** `src/services/propertyService.ts:245-263`

**Problema:** En cada actualización, hace `DELETE` y luego `INSERT` de todas las relaciones. Para un escenario donde muchas propiedades se actualizan (como una sincronización de EasyBroker), esto crea una carga de escritura excesiva y posible rotación de claves foráneas.

**Solución:** Hacer upsert condicional: comparar relaciones existentes con las nuevas y solo insertar/eliminar las que cambiaron, o usar ON CONFLICT en la base de datos si es posible.
