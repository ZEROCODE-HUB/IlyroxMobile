# Ilyrox

App inmobiliaria en **React Native + Expo Router** con **Supabase** como backend y **Zustand** para estado global.

Este README está escrito para **ti (Claude) como colaborador persistente**: es un mapa del repo y de sus convenciones para que cada sesión nueva arranque con contexto completo. Si algo aquí deja de ser cierto, actualízalo — es literal la fuente de verdad del proyecto.

---

## Stack

- **Expo SDK 54** con **Expo Router v6** (routing por archivos en `src/app/`).
- **React Native 0.81** + **React 19**.
- **TypeScript 5.9** (strict via `expo/tsconfig.base`).
- **Supabase JS 2.57** (`@supabase/supabase-js`) — base de datos + auth + storage + realtime.
- **Zustand 5** para estado global.
- **@tanstack/react-query 5** con `QueryClientProvider` en `src/app/_layout.tsx`. Hooks migrados: `useFeed` (infinite), `useFeedItem`, `useConversations` (con invalidación por realtime), `useLikes`, `useComments`, `useCommentCount`. Resto de hooks de fetch siguen con patrón manual (`useState+useEffect`) — pendientes de migración.
- **@shopify/flash-list 2** para listas virtualizadas.
- **@gorhom/bottom-sheet 5** para hojas inferiores.
- **react-native-maps** para mapas (Google en Android, Apple en iOS).
- **expo-image**, **expo-av**, **expo-video** para medios.
- **OneSignal** para push notifications.
- **AWS S3** (`@aws-sdk/client-s3`) y Supabase Storage para uploads.

---

## Estructura del repo

```
.
├── src/
│   ├── app/                  Rutas Expo Router (entry: expo-router/entry)
│   │   ├── (tabs)/           Tab bar: home, matches, profile
│   │   └── (stack)/          Pantallas apiladas: property, reel, post, chat, settings…
│   │
│   ├── screens/              Pantallas "clásicas" no enrutadas por expo-router
│   │   ├── auth/             Login, register, password flows (components/ y hooks/ locales)
│   │   ├── support/
│   │   ├── ScreenWrapper.tsx Wrapper común con SafeArea + header opcional
│   │   └── PendingApprovalScreen.tsx
│   │
│   ├── components/           Componentes de UI de la app
│   │   ├── cards/            PropertyCard, PostCard, ReelCard
│   │   ├── charts/           Chart01…Chart10_*.tsx (stats por barrio, precio, etc.)
│   │   ├── common/           Micro-componentes sin dependencias de negocio
│   │   ├── Details/          PropertyDetail + subcomponentes (Images, Financial, OwnerContact)
│   │   ├── Feed/             Feed principal + cards especiales
│   │   ├── Messaging/        ChatScreen, ConversationsList, HeaderChat, MessageInput, TagsModal
│   │   ├── Profile/          Profile + 4 subcomponentes + formatters + mappers
│   │   ├── Reel/             ReelFeedList, ReelDetail, useReelFeed
│   │   ├── Requests/         Pantallas de solicitudes
│   │   ├── CreateContent/    Formularios de creación (CreateProperty/, CreatePost/, CreateReel)
│   │   ├── Appointments/     Modal de cita + pickers + calendario
│   │   ├── map/              MapSearch + filters/ + SaveSearch + PropertyMap
│   │   ├── modals/           ~20 modales: Confirmation, Selection, Share, NumberInput, etc.
│   │   ├── inputs/           Inputs especializados (CommentInput, etc.)
│   │   ├── shared/           Avatar, ActionButtons, ConfirmDialog, ExpandableText, MapModal, VideoPlayer, MapComponents
│   │   ├── easy-broker/      Integración con EasyBroker (stats + history)
│   │   ├── AppHeader.tsx     Headers top-level
│   │   ├── HomeHeader.tsx
│   │   └── UserHeader.tsx
│   │
│   ├── design-system/        **Primitivos reutilizables — usa estos antes de armar uno nuevo**
│   │   ├── components/
│   │   │   ├── Button.tsx         variant: primary/secondary/ghost/danger/outline, size: sm/md/lg
│   │   │   ├── Card.tsx           variant: flat/elevated/outlined, padding: none/sm/md/lg
│   │   │   ├── Modal.tsx          variant: center/bottom/fullscreen, title, close, backdrop
│   │   │   ├── Badge.tsx          tone: neutral/primary/success/warning/error/info/purple/pink, solid
│   │   │   ├── Chip.tsx           tone: neutral/primary/outline/solid, size sm/md, selectable, icon
│   │   │   ├── Divider.tsx        orientation, spacing, color
│   │   │   ├── SectionHeader.tsx  title/subtitle/right con 3 levels tipográficos
│   │   │   ├── StatItem.tsx       icon + label + value, layout row/column, variant card/plain
│   │   │   ├── EmptyState.tsx     title + description + icon + action
│   │   │   ├── LoadingState.tsx   ActivityIndicator + message + fullscreen
│   │   │   ├── ScreenHeader.tsx   genérico (título/subtitle/onBack/right/left)
│   │   │   ├── AppInput.tsx       TextInput con label, error, icons, counter
│   │   │   ├── AnimatedLike.tsx   Animación de corazón
│   │   │   └── index.ts           barrel — importar siempre desde aquí
│   │   ├── theme/
│   │   │   └── index.ts           spacing, borderRadius, typography + useAppTheme() con dark mode
│   │   └── utils/
│   │
│   ├── hooks/                Hooks personalizados
│   │   ├── messaging/        useConversations, useMessages, useTags, useChatInitiator
│   │   ├── profile/          useProfile, useGridProfile
│   │   ├── statistics/       useStatisticsData
│   │   ├── useFeed.ts        feed principal con paginación y auto-refresh
│   │   ├── usePropertyFilters.ts
│   │   ├── useLikes.ts useComments.ts useShare.ts useViewTracking.ts (interacciones)
│   │   ├── useImageUpload.ts useVideoUpload.ts useImageGallery.ts useVideoPlayer.ts
│   │   ├── usePropertyDetails.ts usePropertyMutation.ts usePropertyFeedItems.ts
│   │   ├── useUserApprovals.ts useUserRecommendations.ts
│   │   ├── useAppointment.ts useAppointments.ts
│   │   ├── useGeoLocation.ts useVersionCheck.ts
│   │   └── index.ts          barrel (re-exporta los más usados)
│   │
│   ├── services/             Capa de acceso a datos — **TODA query a Supabase debería vivir aquí**
│   │   ├── appointmentService.ts
│   │   ├── chartService.ts
│   │   ├── geoService.ts
│   │   ├── pdfService.ts
│   │   ├── postsService.ts
│   │   ├── profileService.ts
│   │   ├── propertyService.ts
│   │   ├── reelService.ts
│   │   ├── reportService.ts
│   │   ├── requestService.ts
│   │   ├── statsService.ts
│   │   ├── uploadService.ts  (S3 + Supabase Storage)
│   │   └── index.ts          barrel
│   │
│   ├── store/                Zustand stores
│   │   ├── chatStore.ts              contador global de mensajes no leídos
│   │   ├── locationSearchStore.ts    ubicación seleccionada para búsquedas
│   │   ├── profileStore.ts           profile del usuario actual
│   │   └── propertyFiltersStore.ts   filtros activos del feed/mapa
│   │
│   ├── context/              React Contexts (auth, app, modal, toast, safe insets)
│   │   ├── AuthContext.tsx
│   │   ├── AppContext.tsx            propiedades, búsquedas guardadas, leads
│   │   ├── ModalContext.tsx
│   │   ├── ToastContext.tsx
│   │   └── SafeInsetsContext.tsx
│   │
│   ├── lib/                  Clientes/helpers de integraciones externas
│   │   ├── supabase.ts               cliente principal
│   │   ├── supabase-geo.ts           cliente para queries geográficas
│   │   ├── catalogHelpers.ts         lookups de catálogos de BD
│   │   ├── locationService.ts
│   │   └── useGoogleAuth.ts
│   │
│   ├── utils/                Utilidades puras (sin side effects UI)
│   │   ├── logger.ts                 **logger centralizado — usa esto, NO console.***
│   │   ├── currencyConverter.ts
│   │   └── firstUpperCase.ts
│   │
│   ├── constants/            Constantes globales
│   │   ├── colors.ts                 paleta COLORS (~60 entradas)
│   │   ├── dimensions.ts             DIMENSIONS (screen size, paddings, avatar sizes)
│   │   ├── config.ts                 PAGINATION, LIMITS, TIMEOUTS, UI (magic numbers)
│   │   ├── locations.ts              lista de estados/municipios
│   │   ├── propertyData.ts           PROPERTY_TYPES, subtypes, camposVisibles
│   │   ├── MexLocations/             coordenadas por estado mexicano
│   │   └── index.ts                  barrel
│   │
│   ├── assets/               Imágenes, fuentes, logos embebidos (incluye stub logoBase64.ts)
│   ├── mocks/                Datos mock para desarrollo (mocks.ts)
│   └── types.ts              **Tipos compartidos de la app** (Post, Reel, Property, FeedItem, User, perfiles…)
│
├── supabase/                 Configuración y migraciones de Supabase
├── scripts/                  Scripts auxiliares (build, util)
├── styles/                   CSS/stylesheets (si se usan en web)
├── secrets/                  **ignorado en git** — certificados iOS, AuthKeys, credentials.json
├── _archive/                 Código viejo conservado fuera del árbol de compilación (excluido en tsconfig)
│   ├── CreateProperty.old.tsx        versión pre-refactor (2221L)
│   └── Messaging.tsx                 monolito muerto (1215L, reemplazado por Messaging/ + MessagingScreen.tsx)
├── app.json                  configuración Expo
├── eas.json                  configuración EAS Build
├── codemagic.yaml            CI/CD
├── metro.config.js babel.config.js
├── tsconfig.json             alias @/* → src/*; excluye node_modules, _archive, .claude/worktrees
├── package.json
└── README.md                 (este archivo)
```

---

## Convenciones que sigo yo (Claude) en este repo

### Imports
- **Siempre** usa el alias `@/...` para rutas dentro de `src/` en archivos nuevos. Ejemplo: `import { Button } from "@/design-system/components"`.
- Los imports relativos largos (`../../../`) existen como deuda; si tocas un archivo, aprovecha para convertirlos a `@/...`.
- Los barrels (`index.ts`) viven en `design-system/components/`, `services/`, `hooks/`, `hooks/messaging/`, `constants/`. Úsalos cuando importas varios símbolos del mismo módulo.

### Design-system
- **Antes de crear un `TouchableOpacity + Text` o un modal nuevo, usa los primitivos**: `Button`, `Card`, `Modal`, `Badge`, `EmptyState`, `LoadingState`, `ScreenHeader`, `AppInput`.
- Cada primitivo ya consume `COLORS` y `theme.spacing/borderRadius/typography`.
- Si un primitivo necesita una variante nueva, AMPLÍA el primitivo en vez de inlinear estilos.

### Colores, spacing, magic numbers
- Nunca literales hex hardcoded en componentes. `import { COLORS } from "@/constants"` y usa la entrada correspondiente.
- Si un color no existe en `COLORS`, AÑÁDELO ahí (con nombre semántico) en vez de inlinarlo.
- Paddings y tamaños usan `DIMENSIONS.*` y `theme.spacing.*`.
- Magic numbers (page size, timeouts, límites) están en `constants/config.ts` bajo `PAGINATION`, `LIMITS`, `TIMEOUTS`, `UI`.

### Logging
- **NUNCA `console.log/warn/error`** en código nuevo.
- Usa el logger scoped:
  ```ts
  import { logger } from "@/utils/logger";
  const log = logger.scoped("MiComponente");
  log.debug("mensaje"); // suprimido en producción
  log.error("mensaje", err); // siempre
  ```

### Data fetching
- **Toda query a Supabase** debe vivir en `src/services/*Service.ts`.
- Los componentes y hooks consumen el service, nunca importan `supabase` directamente salvo para realtime subscriptions (ahí es aceptable en el hook).
- **React Query** es el patrón oficial para nuevos hooks de fetch. Usa `useQuery` para single-resource, `useInfiniteQuery` para listas paginadas (ver `useFeed` como referencia), `useMutation` para escrituras con invalidation.
- Convención de `queryKey`: objeto de fábrica `XKeys = { all: ["x"] as const, list: ... as const, item: (id) => ... as const }` (ver `feedKeys` en `useFeed.ts`).

### Estado
- **Zustand** para estado global (auth derivado, unread count, filtros, ubicación). Ver `src/store/*`.
- **React Context** para auth, toast, modal global, safe insets. Ver `src/context/*`.
- Estado local con `useState` para UI efímera. Si tienes más de ~10 `useState` relacionados, **usa `useReducer`** (ver `usePropertyForm.ts` como ejemplo — discriminated union `SET_FIELD | UPDATE_FIELD | LOAD | CLEAR_ERROR | TOGGLE_*`).

### TypeScript
- Tipos centrales viven en `src/types.ts` (`Post`, `Reel`, `Property`, `FeedItem`, `User`, `perfiles`, `Comment`, `Lead`, etc.).
- Evita `any`. Si no hay más remedio, déjalo con un `// TODO: tipar` y prioriza tiparlo después.
- Para navegación, el tipo `any` en `useNavigation<any>()` es aceptable temporalmente (no hay RouteParams centralizados todavía).

### Seguridad
- **Nunca commitees** archivos en `secrets/` — `.gitignore` los protege. Los archivos `.p8`, `.p12`, `.mobileprovision`, `credentials*.json`, `AuthKey_*` NO van a git.
- Las claves de Supabase están en `.env` (también ignorado).

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` | `expo run:android` (dev build en Android) |
| `npm run ios` | `expo run:ios` (dev build en iOS) |
| `npm run web` | `expo start --web` |
| `npm run build` | `tsc --noEmit && expo export` |
| `npm run typecheck` | `tsc --noEmit` |

**No hay suite de tests configurada todavía** (no hay Jest ni jest.config). Es deuda conocida.

## Builds con EAS

Proyecto EAS: `oscarmpz/ilyrox` (`projectId: 1cff47e7-484f-4918-a037-ec4fa89f7c6e`).

Perfiles de build en `eas.json`:

| Perfil | Uso | Output |
|---|---|---|
| `prodic` | development client con distribución interna | dev client |
| `preview` | APK de prueba interna con env vars completas | `.apk` |
| `production` | APK con credenciales locales y auto-increment de versión | `.apk` |

Comandos típicos:

```bash
# APK de prueba (interna). Queue: EAS Cloud, ~10-20 min.
eas build -p android --profile preview

# No bloquear la terminal mientras compila:
eas build -p android --profile preview --no-wait

# Ver builds en curso/historia
eas build:list

# Descargar el APK tras terminar
eas build:download --platform android
```

**Antes de builds**, confirma:
1. `npm run typecheck` sin errores.
2. `eas.json` del perfil elegido tiene las env vars necesarias (`EXPO_PUBLIC_SUPABASE_*`, `EXPO_PUBLIC_GOOGLE_MAPS_*`, etc.). Las del `.env` local **no** se suben automáticamente al build en nube.
3. Las ApiKey/AuthKey usadas por `submit` apuntan a rutas que sí existan (actualmente `./secrets/AuthKey_7TB389LN84.p8` — esa carpeta está en `.gitignore` pero los archivos físicos deben existir localmente para el submit).

⚠ **Seguridad**: variables con prefijo `EXPO_PUBLIC_*` se empaquetan en el JS del cliente y son accesibles al descompilar el APK. Solo poner ahí **claves públicas/anónimas** (Supabase anon, Maps restringidas por dominio, etc.). NUNCA secret keys de R2/AWS, API keys privadas, tokens de servidor.

---

## Estado del refactor (contexto histórico)

El proyecto pasó por un refactor profundo en abril 2026 que:
- Creó el design-system desde cero (antes solo existían `AnimatedLike` y `AppInput`).
- Consolidó `src/hooks/hooks/` en `src/hooks/` (estructura anidada rara eliminada).
- Movió `data/mocks.ts` a `src/mocks/mocks.ts`.
- Extrajo `usePropertyForm.ts` de 54 `useState` a 1 `useReducer` tipado (API pública intacta).
- Descompuso `Profile.tsx` (1071L → 578L + 4 archivos) y `PropertyDetail.tsx` (1122L → 478L + 3 componentes + stylesheet compartido).
- Archivó en `_archive/` dos monolitos muertos (`CreateProperty.old.tsx` 2221L, `Messaging.tsx` 1215L).
- Creó `appointmentService` y extrajo queries Supabase de `CreateAppointmentModal` y `useReelFeed`.
- Creó logger centralizado (`src/utils/logger.ts`) y migró ~75 `console.*` en hooks/services críticos.
- Aseguró 7 errores pre-existentes de tipos (`typecheck` ahora pasa limpio).

### Deuda pendiente
- ~112 `console.*` restantes en ~39 archivos, mayormente en UI (`src/components/`, `src/screens/`, `src/app/`, `src/context/`). Los de `src/hooks/`, `src/services/`, `src/lib/`, `src/store/`, `src/utils/` ya están migrados al logger.
- React Query: adoptado en `useFeed`/`useFeedItem`/`useConversations` (+ likes/comments/commentCount). Candidatos pendientes: `useMessages`, `usePropertyDetails`, `usePropertyFilters`, `useProfile`.
- Cero tests (falta setup de Jest + `@testing-library/react-native`).
- Hooks y componentes de `statsService.ts` (1058L) y `pdfService.ts` (955L) siguen grandes pero son servicios lineales, menos urgentes que los monolitos de UI.
- Varios componentes aún no consumen el design-system (el patrón `TouchableOpacity + Text` sigue existiendo en cards/modales no migrados). El Button primitivo solo se usa en 13 lugares hoy.
- Hooks aún son 25+ archivos en la raíz de `src/hooks/` — se podrían agrupar por dominio (`property/`, `feed/`, `content/`, etc.) siguiendo el ejemplo de `messaging/`, `profile/`, `statistics/`.

---

## Cuando vengas a este proyecto en una sesión nueva

1. Lee este README.
2. Corre `npm run typecheck` para confirmar baseline verde.
3. Si vas a crear UI nueva, busca en `src/design-system/components/` primero.
4. Si vas a hacer una query, busca/crea en `src/services/` — nunca en el componente.
5. Si metes `console.*` o un hex hardcoded, **para y corrígelo** antes de cerrar el cambio.
6. Al terminar, actualiza la sección **"Deuda pendiente"** de este README si resolviste o agregaste algo.
