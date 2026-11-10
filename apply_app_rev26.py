#!/usr/bin/env python3
"""
apply_app_rev26.py - parche FINAL de la APP (tanda 3). Se aplica DESPUES de rev22, rev23 y rev24 (reemplaza al rev25 anterior).
  R25-01..04  #8  Audio: el video se pausa y silencia al salir de la pantalla o enviar la app a segundo plano.
  R25-05      #10 Bloqueos: el visor de reels no muestra reels de usuarios bloqueados.
  R25-06      #11 Subtipos de la BD fuera de la lista se agrupan (alias) o van a "Otros": suma de subtipos = total.
  R25-07      #12 Pantalla de aprobacion pendiente: foto de perfil y pasos.
  R26-01      #4/#6 Video: subida por partes REANUDABLE (el progreso nunca vuelve a 0), el servidor procesa aparte; calidad alta.
  R26-02      #5  Publicar reel en SEGUNDO PLANO: sigues navegando, barra de avance y aviso al terminar.
  R26-03      #3  Android: el teclado ya no tapa el campo de precio en los filtros del mapa.
  R26-04      #1  Triangulo de reportes tambien en la grilla de propiedades del perfil.
  R26-05      #9  Filtro comercial "Sin clasificar" + aviso "pendiente de clasificar" en la ficha.
USO:  python apply_app_rev26.py src --dry-run   y luego   python apply_app_rev26.py src
"""
import sys, os, re, argparse, hashlib


def dec(s):
    return re.sub(r"@@u([0-9a-f]{4})@@", lambda m: chr(int(m.group(1), 16)), s)


def rx(s):
    """Regex que acepta CRLF o LF en cada salto de linea (para archivos con finales de linea mezclados)."""
    return re.compile(r"\r?\n".join(re.escape(p) for p in s.split("\n")))


def norm_hash(txt):
    t = txt.replace("\r\n", "\n")
    if t.endswith("\n"):
        t = t.rstrip("\n") + "\n"
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


PATCHES = [
('R25-02', 'components/Reel/ReelDetail.tsx',
'import SafePressable from "@/design-system/components/SafePressable";\n',
'import SafePressable from "@/design-system/components/SafePressable";\nimport { usePauseWhenAway } from "@/hooks/usePauseWhenAway";\n'),
('R25-02', 'components/Reel/ReelDetail.tsx',
'    p.muted = false;\n    p.play();\n  });\n',
'    p.muted = false;\n    p.play();\n  });\n  usePauseWhenAway(player);\n'),
('R25-03', 'hooks/useVideoPlayer.ts',
'import { useVideoPlayer as useExpoVideoPlayer } from "expo-video";\n',
'import { useVideoPlayer as useExpoVideoPlayer } from "expo-video";\nimport { usePauseWhenAway } from "@/hooks/usePauseWhenAway";\n'),
('R25-03', 'hooks/useVideoPlayer.ts',
'  const togglePlayPause = useCallback(() => {',
'  usePauseWhenAway(player);\n\n  const togglePlayPause = useCallback(() => {'),
('R25-04', 'components/Reel/ReelListItem.tsx',
'import SafePressable from "@/design-system/components/SafePressable";\n',
'import SafePressable from "@/design-system/components/SafePressable";\nimport { usePauseWhenAway } from "@/hooks/usePauseWhenAway";\n'),
('R25-04', 'components/Reel/ReelListItem.tsx',
'    if (isActive) p.play();\n  });\n',
'    if (isActive) p.play();\n  });\n  usePauseWhenAway(player);\n'),
('R25-05', 'components/Reel/useReelFeed.ts',
'import { useAuth } from "@/context/AuthContext";\n',
'import { useAuth } from "@/context/AuthContext";\nimport { blockService } from "@/services/blockService";\n'),
('R25-05', 'components/Reel/useReelFeed.ts',
'    const fresh = rows\n      .filter((r) => !seenIdsRef.current.has(r.feed_item_id))',
'    // REV25 (#10): no mostrar reels de usuarios bloqueados.\n    const bloqueados = await blockService.getBlockedUserIds(user?.id);\n    const fresh = rows\n      .filter((r) => !bloqueados.includes(r.autor_id))\n      .filter((r) => !seenIdsRef.current.has(r.feed_item_id))'),
('R25-06', 'constants/propertyData.ts',
'export type TipoPrincipal = keyof typeof PROPERTY_TYPES;\n',
'export type TipoPrincipal = keyof typeof PROPERTY_TYPES;\n\n// REV25 (#11): la BD (importaciones) trae subtipos que no estan en PROPERTY_TYPES ("Local comercial", "Casa",\n// "Terreno", "Nave industrial"...). Para que la suma de subtipos = total del tipo, cada subtipo de la BD se asigna a\n// uno de la lista (alias) o a "Otros". Solo se usa en FILTROS; al publicar se sigue usando PROPERTY_TYPES.\nexport const SUBTIPO_OTROS = "Otros";\nconst SUBTIPO_ALIAS: Record<string, Record<string, string>> = {\n  comercial: { "local comercial": "Local", "nave industrial": "Bodega", "nave": "Bodega" },\n  habitacional: { "casa": "Casa (Fracc. Abierto)", "casa en condominio": "Casa en Condominio" },\n  agricola: { "terreno": "Terreno Rural" },\n};\nexport function subtipoCanonico(tipo?: string | null, subtipo?: string | null): string {\n  const t = (tipo || "").toString().toLowerCase();\n  const s = (subtipo || "").toString().trim().toLowerCase();\n  const lista = ((PROPERTY_TYPES as Record<string, readonly string[]>)[t] || []) as readonly string[];\n  const directo = lista.find((x) => x.toLowerCase() === s);\n  if (directo) return directo;\n  const alias = SUBTIPO_ALIAS[t]?.[s];\n  if (alias) return alias;\n  return SUBTIPO_OTROS;\n}\nexport function subtiposParaFiltro(tipo?: string | null): string[] {\n  const lista = (PROPERTY_TYPES as Record<string, readonly string[]>)[(tipo || "").toLowerCase()] || [];\n  return [...lista, SUBTIPO_OTROS];\n}\n'),
('R25-06', 'components/map/PropertyTypeSelector.tsx',
'import { PROPERTY_TYPES, TipoPrincipal } from "../../constants/propertyData";\n',
'import { subtiposParaFiltro } from "../../constants/propertyData";\n'),
('R25-06', 'components/map/PropertyTypeSelector.tsx',
'            options={[\n              ...(PROPERTY_TYPES[tipoPropiedad as TipoPrincipal] || []),\n            ]}',
'            options={subtiposParaFiltro(tipoPropiedad)}'),
('R25-06', 'hooks/usePropertyFilters.ts',
'import { pickOperacion } from "@/utils/operaciones";\n',
'import { pickOperacion } from "@/utils/operaciones";\nimport { subtipoCanonico } from "@/constants/propertyData";\n'),
('R25-06', 'hooks/usePropertyFilters.ts',
'        const propSubtipo = p.subtipo?.toString().toLowerCase();\n        if (!filters.subtipo.some((s) => s.toLowerCase() === propSubtipo)) return false;',
'        const propSubtipo = subtipoCanonico(p.type?.toString(), p.subtipo?.toString()).toLowerCase();\n        if (!filters.subtipo.some((s) => s.toLowerCase() === propSubtipo)) return false;'),
('R25-07', 'screens/PendingApprovalScreen.tsx',
"import { Ionicons } from '@expo/vector-icons';\n",
"import { Ionicons } from '@expo/vector-icons';\nimport { Image } from 'expo-image';\n"),
('R25-07', 'screens/PendingApprovalScreen.tsx',
'        <View style={styles.iconContainer}>\n          <Ionicons name="hourglass-outline" size={60} color={COLORS.primary} />\n        </View>\n',
'        <View style={styles.iconContainer}>\n          {profile?.foto ? (\n            <Image\n              source={{ uri: profile.foto }}\n              style={{ width: 120, height: 120, borderRadius: 60 }}\n              contentFit="cover"\n              cachePolicy="none"\n            />\n          ) : (\n            <Ionicons name="hourglass-outline" size={60} color={COLORS.primary} />\n          )}\n        </View>\n'),
('R25-07', 'screens/PendingApprovalScreen.tsx',
'        <View style={styles.statsContainer}>',
"        <View style={{ alignSelf: 'stretch', marginBottom: theme.spacing.xl }}>\n          <Text style={styles.description}>1. Pide a 3 miembros de la comunidad que aprueben tu cuenta.</Text>\n          <Text style={styles.description}>2. Cada aprobaci@@u00f3@@n se suma aqu@@u00ed@@ autom@@u00e1@@ticamente.</Text>\n          <Text style={styles.description}>3. Con las 3 aprobaciones se activa tu acceso completo a la app.</Text>\n        </View>\n\n        <View style={styles.statsContainer}>"),
('R26-01', 'services/uploadService.ts',
'export async function uploadVideo(\n  uri: string,\n  onProgress?: (progress: number) => void,\n): Promise<{ videoUrl: string; thumbnailUrl?: string }> {\n  try {\n    const formData = new FormData();\n',
'async function uploadVideoClasico(\n  uri: string,\n  onProgress?: (progress: number) => void,\n): Promise<{ videoUrl: string; thumbnailUrl?: string }> {\n  try {\n    const formData = new FormData();\n'),
('R26-01', 'services/uploadService.ts',
'    formData.append("quality", "low"); // Changed to low for faster processing',
'    formData.append("quality", "high"); // REV26: antes "low" (CRF 32, 800 kbps) => video pixelado'),
('R26-01', 'services/uploadService.ts',
'    log.error("Error uploading video to R2:", error);\n    throw error;\n  }\n}',
'    log.error("Error uploading video to R2:", error);\n    throw error;\n  }\n}\n\n// ---------------------------------------------------------------------------------------------------------------\n// REV26: subida por partes REANUDABLE. El video se manda en trozos de 4 MB; si la red se corta, solo se repite el trozo\n// (el progreso NUNCA vuelve a 0). Despues el servidor procesa en segundo plano y la app consulta el avance.\n// Si el servidor es antiguo (sin /uploads) o este metodo no puede arrancar, se usa el metodo clasico de siempre.\n// ---------------------------------------------------------------------------------------------------------------\nclass SubidaNoSoportada extends Error {}\nclass SubidaReiniciar extends Error {}\nconst sleepMs = (ms: number) => new Promise((r) => setTimeout(r, ms));\n\nasync function jsonFetch(url: string, init: any, timeoutMs = 20000): Promise<{ status: number; body: any }> {\n  const ctrl = new AbortController();\n  const t = setTimeout(() => ctrl.abort(), timeoutMs);\n  try {\n    const r = await fetch(url, { ...init, signal: ctrl.signal });\n    let body: any = null;\n    try {\n      body = await r.json();\n    } catch {\n      /* sin cuerpo */\n    }\n    return { status: r.status, body };\n  } finally {\n    clearTimeout(t);\n  }\n}\n\nfunction putParte(url: string, parte: any, onLoaded: (n: number) => void): Promise<{ status: number; body: any }> {\n  return new Promise((resolve, reject) => {\n    const xhr = new XMLHttpRequest();\n    xhr.upload.addEventListener("progress", (e) => {\n      if (e.lengthComputable) onLoaded(e.loaded);\n    });\n    xhr.addEventListener("load", () => {\n      let body: any = null;\n      try {\n        body = JSON.parse(xhr.responseText);\n      } catch {\n        /* sin cuerpo */\n      }\n      resolve({ status: xhr.status, body });\n    });\n    xhr.addEventListener("error", () => reject(new Error("red")));\n    xhr.addEventListener("timeout", () => reject(new Error("timeout")));\n    xhr.open("PUT", url);\n    xhr.timeout = 90000;\n    xhr.setRequestHeader("Content-Type", "application/octet-stream");\n    xhr.send(parte);\n  });\n}\n\nasync function conReintentos<T>(fn: () => Promise<T>, veces = 4): Promise<T> {\n  let ultimo: any;\n  for (let i = 0; i < veces; i++) {\n    try {\n      return await fn();\n    } catch (e) {\n      ultimo = e;\n      await sleepMs(Math.min(8000, 1000 * 2 ** i));\n    }\n  }\n  throw ultimo;\n}\n\nasync function uploadVideoPorPartes(\n  uri: string,\n  onProgress: ((p: number) => void) | undefined,\n  estado: { bytesOk: number },\n): Promise<{ videoUrl: string; thumbnailUrl?: string }> {\n  let maxPct = 0;\n  const reportar = (p: number) => {\n    if (p > maxPct) {\n      maxPct = p;\n      onProgress?.(p);\n    }\n  };\n\n  let blob: any;\n  try {\n    blob = await (await fetch(uri)).blob();\n  } catch {\n    throw new SubidaNoSoportada("blob");\n  }\n  const total: number = blob?.size || 0;\n  if (!total || typeof blob.slice !== "function") throw new SubidaNoSoportada("sin_blob");\n\n  const init = await conReintentos(() =>\n    jsonFetch(`${VIDEO_API_URL}/uploads`, {\n      method: "POST",\n      headers: { "Content-Type": "application/json" },\n      body: JSON.stringify({ size: total, name: `reel-${Date.now()}.mp4` }),\n    }),\n  );\n  if (init.status === 404 || init.status === 405) throw new SubidaNoSoportada(`init ${init.status}`);\n  if (init.status !== 200 || !init.body?.uploadId) throw new Error(`init ${init.status}`);\n\n  const uploadId: string = init.body.uploadId;\n  const parte: number = Number(init.body.chunkSize) || 4 * 1024 * 1024;\n  let offset: number = Number(init.body.received) || 0;\n\n  let vueltasMax = Math.ceil(total / parte) * 4 + 20; // tope de seguridad contra ciclos\n  while (offset < total) {\n    if (vueltasMax-- <= 0) throw new Error("demasiados_reintentos");\n    const fin = Math.min(offset + parte, total);\n    const trozo = blob.slice(offset, fin);\n    const desde = offset;\n    let avanzo = false;\n    for (let intento = 0; intento < 6 && !avanzo; intento++) {\n      try {\n        const r = await putParte(`${VIDEO_API_URL}/uploads/${uploadId}?offset=${desde}`, trozo, (l) =>\n          reportar(((desde + l) / total) * 90),\n        );\n        if (r.status === 200) {\n          const recibido = Number(r.body?.received ?? fin);\n          if (!(recibido > desde)) throw new Error("sin_avance"); // la parte llego vacia o el servidor no avanzo\n          offset = recibido;\n          avanzo = true;\n        } else if (r.status === 409) {\n          offset = Number(r.body?.received ?? desde); // el servidor dice desde donde seguir\n          avanzo = true;\n        } else if (r.status === 404) {\n          throw new SubidaReiniciar("perdida");\n        } else {\n          throw new Error(`HTTP ${r.status}`);\n        }\n      } catch (e) {\n        if (e instanceof SubidaReiniciar) throw e;\n        await sleepMs(Math.min(8000, 1000 * 2 ** intento));\n        try {\n          const st = await jsonFetch(`${VIDEO_API_URL}/uploads/${uploadId}`, { method: "GET" }, 10000);\n          if (st.status === 404) throw new SubidaReiniciar("perdida");\n          if (st.status === 200 && typeof st.body?.received === "number" && st.body.received !== desde) {\n            offset = st.body.received; // el trozo si llego: seguimos sin repetirlo\n            avanzo = true;\n          }\n        } catch (e2) {\n          if (e2 instanceof SubidaReiniciar) throw e2;\n        }\n      }\n    }\n    if (!avanzo) throw new Error("sin_red");\n    estado.bytesOk = Math.max(estado.bytesOk, offset);\n    reportar((offset / total) * 90);\n  }\n\n  const proc = await conReintentos(() =>\n    jsonFetch(\n      `${VIDEO_API_URL}/uploads/${uploadId}/process`,\n      {\n        method: "POST",\n        headers: { "Content-Type": "application/json" },\n        body: JSON.stringify({ quality: "high", maxWidth: "720", type: "reels" }),\n      },\n      30000,\n    ),\n  );\n  if (proc.status === 404) throw new SubidaReiniciar("perdida");\n  if (proc.status !== 202 || !proc.body?.jobId) throw new Error(`process ${proc.status}`);\n  const jobId: string = proc.body.jobId;\n\n  // El servidor comprime/guarda sin tener la conexion abierta; aqui solo se consulta (tolera cortes de red).\n  const limite = Date.now() + 15 * 60 * 1000;\n  let fallosSeguidos = 0;\n  let vueltas = 0;\n  while (Date.now() < limite) {\n    await sleepMs(2000);\n    vueltas++;\n    reportar(Math.min(98, 90 + vueltas * 0.5));\n    try {\n      const j = await jsonFetch(`${VIDEO_API_URL}/jobs/${jobId}`, { method: "GET" }, 10000);\n      fallosSeguidos = 0;\n      if (j.status === 404) throw new SubidaReiniciar("trabajo_perdido");\n      if (j.body?.status === "done") {\n        const url = j.body.video_url || j.body.url;\n        if (!url) throw new Error("sin_url");\n        return { videoUrl: url, thumbnailUrl: j.body.thumbnailUrl || undefined };\n      }\n      if (j.body?.status === "error") throw new Error(`proceso: ${String(j.body.error).slice(0, 100)}`);\n    } catch (e) {\n      if (e instanceof SubidaReiniciar) throw e;\n      if (String((e as any)?.message || "").startsWith("proceso") || (e as any)?.message === "sin_url") throw e;\n      fallosSeguidos++;\n      if (fallosSeguidos > 25) throw e;\n    }\n  }\n  throw new Error("timeout_proceso");\n}\n\nexport async function uploadVideo(\n  uri: string,\n  onProgress?: (progress: number) => void,\n): Promise<{ videoUrl: string; thumbnailUrl?: string }> {\n  const estado = { bytesOk: 0 };\n  let ultimoError: any = null;\n  for (let ronda = 0; ronda < 2; ronda++) {\n    try {\n      return await uploadVideoPorPartes(uri, onProgress, estado);\n    } catch (e: any) {\n      ultimoError = e;\n      if (e instanceof SubidaReiniciar) continue; // el servidor perdio la subida: se arranca una vez mas\n      break;\n    }\n  }\n  // Metodo clasico (servidor antiguo, o el metodo por partes no pudo ni arrancar): siempre como red de seguridad.\n  if (ultimoError instanceof SubidaNoSoportada || estado.bytesOk === 0) {\n    return uploadVideoClasico(uri, onProgress);\n  }\n  registrarFalloVideo(uri, ultimoError, { fase: "partes", bytes: estado.bytesOk });\n  throw new MediaUnavailableError(ultimoError);\n}'),
('R26-01', 'hooks/useVideoUpload.ts',
'        setUploadProgress(0);\n\n        const result = await uploadVideoService',
'        // REV26: en un reintento NO se vuelve a 0% (la subida por partes retoma donde iba).\n        if (attempt === 1) setUploadProgress(0);\n\n        const result = await uploadVideoService'),
('R26-01', 'hooks/useVideoUpload.ts',
'          setUploadProgress(Math.min(Math.round(progress), 99));',
'          setUploadProgress((prev) => Math.max(prev, Math.min(Math.round(progress), 99)));'),
('R26-02', 'app/_layout.tsx',
'import { logger } from "@/utils/logger";\n',
'import { logger } from "@/utils/logger";\nimport BackgroundPublisher from "@/components/CreateContent/BackgroundPublisher";\nimport PublishProgressBanner from "@/components/shared/PublishProgressBanner";\n'),
('R26-02', 'app/_layout.tsx',
'    <View style={{ flex: 1 }}>\n      <NotificationProvider userId={profile?.id || null}>',
'    <View style={{ flex: 1 }}>\n      <BackgroundPublisher />\n      <PublishProgressBanner />\n      <NotificationProvider userId={profile?.id || null}>'),
('R26-02', 'components/CreateContent/CreateReel.tsx',
'    try {\n      // 1. Subir video al servicio (ahora nos devuelve videoUrl y thumbnailUrl)',
'    // REV26 (#5): un reel NUEVO con video local se sube y publica en segundo plano; el usuario sigue navegando.\n    if (!isEditing && videoUri && !videoUri.startsWith("http")) {\n      const enCurso = usePublishQueueStore.getState().status;\n      if (enCurso === "preparando" || enCurso === "subiendo" || enCurso === "publicando") {\n        showToast("Ya hay un reel public@@u00e1@@ndose. Espera a que termine para subir otro.", "info", 4000);\n        return;\n      }\n      usePublishQueueStore.getState().enqueue({ videoUri, thumbnailUri, description });\n      showToast("Tu reel se est@@u00e1@@ publicando. Puedes seguir usando la app.", "info", 4000);\n      setDescription("");\n      setVideoUri("");\n      setThumbnailUri("");\n      router.replace({ pathname: "/(tabs)", params: { refresh: String(Date.now()) } });\n      return;\n    }\n\n    try {\n      // 1. Subir video al servicio (ahora nos devuelve videoUrl y thumbnailUrl)'),
('R26-02', 'components/CreateContent/CreateReel.tsx',
'import { useToast } from "@/context/ToastContext";\n',
'import { useToast } from "@/context/ToastContext";\nimport { usePublishQueueStore } from "@/store/publishQueueStore";\n'),
('R26-03', 'components/map/SearchFiltersModal.tsx',
'  ActivityIndicator,\n} from "react-native";\nimport {\n  KeyboardAwareScrollView,\n} from "react-native-keyboard-controller";',
'  ActivityIndicator,\n  ScrollView,\n} from "react-native";\nimport {\n  KeyboardAwareScrollView,\n} from "react-native-keyboard-controller";'),
('R26-03', 'components/map/SearchFiltersModal.tsx',
'  const [kb, setKb] = useState(0);\n  React.useEffect(() => {\n    const evShow = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";\n    const evHide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";\n    const s = Keyboard.addListener(evShow as any, (e: any) => setKb(e?.endCoordinates?.height ?? 0));\n    const h = Keyboard.addListener(evHide as any, () => setKb(0));\n    return () => {\n      s.remove();\n      h.remove();\n    };\n  }, []);\n  const sheetKb =\n    kb > 0\n      ? { height: Math.min(height * 0.85, height - kb - 40), marginBottom: Platform.OS === "ios" ? kb : 0 }\n      : null;',
'  const [kb, setKb] = useState(0);\n  // REV26 (#3): en Android (pantalla completa sin redimensionar) el teclado tapaba el campo de precio en telefonos\n  // chicos. Se mide cuanto se solapa la hoja con el teclado y se sube justo esa cantidad.\n  const [subirAndroid, setSubirAndroid] = useState(0);\n  const hojaRef = React.useRef<View>(null);\n  React.useEffect(() => {\n    const evShow = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";\n    const evHide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";\n    let t: any;\n    const s = Keyboard.addListener(evShow as any, (e: any) => {\n      const alto = e?.endCoordinates?.height ?? 0;\n      setKb(alto);\n      if (Platform.OS === "android" && alto > 0) {\n        clearTimeout(t);\n        t = setTimeout(() => {\n          try {\n            hojaRef.current?.measureInWindow((_x, y, _w, h) => {\n              const tecladoArriba = Dimensions.get("screen").height - alto;\n              // +28: margen por la barra de estado (la ventana del modal puede empezar mas abajo que la pantalla)\n              const solape = y + h - tecladoArriba + 28;\n              setSubirAndroid(solape > 0 ? Math.ceil(solape) : 0);\n            });\n          } catch {\n            /* sin medida: se queda como estaba */\n          }\n        }, 120);\n      }\n    });\n    const h = Keyboard.addListener(evHide as any, () => {\n      clearTimeout(t);\n      setKb(0);\n      setSubirAndroid(0);\n    });\n    return () => {\n      clearTimeout(t);\n      s.remove();\n      h.remove();\n    };\n  }, []);\n  const sheetKb =\n    kb > 0\n      ? {\n          height: Math.min(height * 0.85, height - kb - 40),\n          marginBottom: Platform.OS === "ios" ? kb : subirAndroid,\n        }\n      : null;\n  const ScrollComp: any = Platform.OS === "android" ? ScrollView : KeyboardAwareScrollView;'),
('R26-03', 'components/map/SearchFiltersModal.tsx',
'      <View style={[styles.modalContent, sheetKb]}>',
'      <View ref={hojaRef} collapsable={false} style={[styles.modalContent, sheetKb]}>'),
('R26-03', 'components/map/SearchFiltersModal.tsx',
'        <KeyboardAwareScrollView\n          showsVerticalScrollIndicator={false}\n          style={styles.modalScroll}',
'        <ScrollComp\n          showsVerticalScrollIndicator={false}\n          style={styles.modalScroll}'),
('R26-03', 'components/map/SearchFiltersModal.tsx',
'          </KeyboardAwareScrollView>',
'          </ScrollComp>'),
('R26-04', 'components/Profile/ProfilePropertyItem.tsx',
'import { SafePressable } from "@/design-system";\n',
'import { SafePressable } from "@/design-system";\nimport { ReportBadge } from "../shared/ReportBadge";\n'),
('R26-04', 'components/Profile/ProfilePropertyItem.tsx',
'        {item.status === "Vendida" ? (\n          <View style={[styles.statusBadge, styles.vendidaBadge]}>',
'        {/* REV26 (#1): aviso de reportes tambien en la grilla del perfil */}\n        <View style={{ position: "absolute", top: 4, right: 4 }}>\n          <ReportBadge propertyId={item.id} />\n        </View>\n\n        {item.status === "Vendida" ? (\n          <View style={[styles.statusBadge, styles.vendidaBadge]}>'),
('R26-05', 'constants/propertyData.ts',
'export const TIPOS_UBICACION_INDUSTRIAL =',
"// REV26 (#9): propiedades importadas/antiguas sin dentro/fuera de plaza. Se pueden filtrar y se avisa en la ficha.\nexport const TIPO_UBICACION_SIN_CLASIFICAR = 'Sin clasificar';\nexport const TIPOS_UBICACION_INDUSTRIAL ="),
('R26-05', 'components/map/filters/ComercialFiltersSection.tsx',
'import { TIPOS_UBICACION_COMERCIAL } from "@/constants/propertyData";',
'import { TIPOS_UBICACION_COMERCIAL, TIPO_UBICACION_SIN_CLASIFICAR } from "@/constants/propertyData";'),
('R26-05', 'components/map/filters/ComercialFiltersSection.tsx',
'        {TIPOS_UBICACION_COMERCIAL.map((op) => {',
'        {[...TIPOS_UBICACION_COMERCIAL, TIPO_UBICACION_SIN_CLASIFICAR].map((op) => {'),
('R26-05', 'hooks/usePropertyFilters.ts',
'        if (cf.tipoUbicacion.length === 1 && rawP.tipo_ubicacion_comercial !== cf.tipoUbicacion[0]) return false;',
'        // REV26 (#9): "Sin clasificar" = propiedad sin dentro/fuera de plaza. Dentro+Fuera juntos (sin la tercera) = sin filtro, como antes.\n        const selUbic = cf.tipoUbicacion as string[];\n        const soloDentroFuera = selUbic.length === 2 && !selUbic.includes(\'Sin clasificar\');\n        if (selUbic.length > 0 && !soloDentroFuera) {\n          const valorUbic = rawP.tipo_ubicacion_comercial || \'Sin clasificar\';\n          if (!selUbic.includes(valorUbic)) return false;\n        }'),
('R26-05', 'components/Details/PropertyTypeDetails.tsx',
'    if (property.tipo_ubicacion_comercial)\n      stats.push({\n        icon: "storefront-outline",\n        label: "Ubicaci@@u00f3@@n",\n        value: property.tipo_ubicacion_comercial,\n      });',
'    if (property.tipo_ubicacion_comercial)\n      stats.push({\n        icon: "storefront-outline",\n        label: "Ubicaci@@u00f3@@n",\n        value: property.tipo_ubicacion_comercial,\n      });\n    else if (/local|terreno/i.test(String((property as any).subtipo ?? "")))\n      stats.push({\n        icon: "storefront-outline",\n        label: "Ubicaci@@u00f3@@n",\n        value: "Pendiente de clasificar (dentro / fuera de plaza)",\n      });'),
]

FILES = [
('R25-01', 'hooks/usePauseWhenAway.ts', None,
'/**\n * REV25 (#8): pausa y silencia un player de expo-video cuando la pantalla pierde el foco (el usuario navega a otra\n * pestana/pantalla) o la app pasa a segundo plano. Al volver restaura el silencio que tenia y, SOLO si estaba\n * reproduciendo antes, lo reanuda. Un video que ya estaba pausado o mudo por su propia logica queda como estaba.\n */\nimport { useEffect, useRef, useState } from "react";\nimport { AppState } from "react-native";\nimport { useIsFocused } from "@react-navigation/native";\n\nexport function usePauseWhenAway(player: any, enabled: boolean = true) {\n  const focused = useIsFocused();\n  const [appActive, setAppActive] = useState(AppState.currentState === "active");\n  const away = !focused || !appActive;\n  const previo = useRef<{ playing: boolean; muted: boolean } | null>(null);\n\n  useEffect(() => {\n    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));\n    return () => sub.remove();\n  }, []);\n\n  useEffect(() => {\n    if (!player || !enabled) return;\n    try {\n      if (away) {\n        if (!previo.current) previo.current = { playing: !!player.playing, muted: !!player.muted };\n        player.pause();\n        player.muted = true;\n      } else if (previo.current) {\n        const p = previo.current;\n        previo.current = null;\n        player.muted = p.muted;\n        if (p.playing) player.play();\n      }\n    } catch {\n      /* player liberado */\n    }\n  }, [away, player, enabled]);\n}\n'),
('R26-02', 'store/publishQueueStore.ts', None,
'import { create } from "zustand";\n\n/**\n * REV26 (#5): cola global de publicacion de reels. La pantalla "Crear reel" solo deja el trabajo aqui y se cierra;\n * <BackgroundPublisher/> (montado en el layout raiz) lo sube y publica mientras el usuario navega por la app.\n */\nexport type PublishStatus = "preparando" | "subiendo" | "publicando" | "listo" | "error";\n\nexport interface PublishPayload {\n  videoUri: string;\n  thumbnailUri: string;\n  description: string;\n}\n\ninterface PublishQueueState {\n  payload: PublishPayload | null;\n  status: PublishStatus | null;\n  progress: number;\n  runId: number;\n  enqueue: (p: PublishPayload) => void;\n  setStatus: (s: PublishStatus | null) => void;\n  setProgress: (n: number) => void;\n  retry: () => void;\n  clear: () => void;\n}\n\nexport const usePublishQueueStore = create<PublishQueueState>((set) => ({\n  payload: null,\n  status: null,\n  progress: 0,\n  runId: 0,\n  enqueue: (payload) => set((s) => ({ payload, status: "preparando", progress: 0, runId: s.runId + 1 })),\n  setStatus: (status) => set({ status }),\n  setProgress: (n) => set((s) => ({ progress: Math.max(s.progress, n) })),\n  retry: () => set((s) => (s.payload ? { status: "preparando", progress: 0, runId: s.runId + 1 } : s)),\n  clear: () => set({ payload: null, status: null, progress: 0 }),\n}));\n'),
('R26-02', 'components/CreateContent/BackgroundPublisher.tsx', None,
'import { useEffect, useRef } from "react";\nimport { AppState, Platform } from "react-native";\nimport { supabase } from "@/lib/supabase";\nimport { useAuth } from "@/context/AuthContext";\nimport { useToast } from "@/context/ToastContext";\nimport { useCreateContent } from "@/hooks/useCreateContent";\nimport { uploadVideo, uploadImage } from "@/services/uploadService";\nimport { usePublishQueueStore } from "@/store/publishQueueStore";\nimport { logger } from "@/utils/logger";\n\nconst log = logger.scoped("BackgroundPublisher");\n\n/** Push al propio usuario (via OneSignal, como las demas) solo si la app esta en segundo plano. Si la funcion SQL no existe, se ignora. */\nasync function avisoPush(exito: boolean) {\n  try {\n    if (AppState.currentState === "active") return;\n    await supabase.rpc("notificar_reel_publicado", { p_exito: exito });\n  } catch {\n    /* sin aviso del sistema: queda el aviso dentro de la app */\n  }\n}\n\n/**\n * REV26 (#5): sube y publica el reel SIN bloquear la pantalla. Se monta una sola vez en el layout raiz.\n */\nexport default function BackgroundPublisher() {\n  const { user } = useAuth();\n  const { showToast } = useToast();\n  const { createReel } = useCreateContent(user?.id);\n  const runId = usePublishQueueStore((s) => s.runId);\n  const corriendo = useRef(false);\n  const ultimoRun = useRef(0); // evita publicar dos veces el mismo trabajo si el efecto se vuelve a ejecutar\n  const createReelRef = useRef(createReel);\n  createReelRef.current = createReel;\n\n  useEffect(() => {\n    const st = usePublishQueueStore.getState();\n    if (!user?.id || !st.payload || !runId || corriendo.current || ultimoRun.current === runId) return;\n    corriendo.current = true;\n    ultimoRun.current = runId;\n    const { videoUri, thumbnailUri, description } = st.payload;\n\n    (async () => {\n      try {\n        let uriParaSubir = videoUri;\n        // Android: se comprime en el telefono antes de subir (menos peso = sube mas rapido). iPhone ya lo convierte al elegir.\n        if (Platform.OS === "android" && !videoUri.startsWith("http")) {\n          st.setStatus("preparando");\n          try {\n            const { Video } = require("react-native-compressor");\n            const comprimido = await Video.compress(\n              videoUri,\n              { compressionMethod: "manual", maxSize: 1280, bitrate: 2500000, minimumFileSizeForCompress: 5 },\n              (p: number) => usePublishQueueStore.getState().setProgress(Math.round(p * 10)),\n            );\n            if (comprimido) uriParaSubir = comprimido;\n          } catch (e) {\n            log.warn("No se pudo comprimir, se sube el original:", e);\n          }\n        }\n\n        usePublishQueueStore.getState().setStatus("subiendo");\n        const res = await uploadVideo(uriParaSubir, (p) =>\n          usePublishQueueStore.getState().setProgress(10 + Math.round(p * 0.9)),\n        );\n\n        let thumb: string | null = res.thumbnailUrl || null;\n        if (!thumb && thumbnailUri && !thumbnailUri.startsWith("http")) {\n          try {\n            thumb = (await uploadImage(thumbnailUri, "reels")) || null;\n          } catch (e) {\n            log.warn("Miniatura manual fallo:", e);\n          }\n        }\n\n        usePublishQueueStore.getState().setStatus("publicando");\n        const ok = await createReelRef.current(description, res.videoUrl, thumb);\n        if (ok) {\n          usePublishQueueStore.getState().setStatus("listo");\n          showToast("Tu reel ya est@@u00e1@@ publicado", "success", 4000);\n          avisoPush(true);\n          setTimeout(() => {\n            if (usePublishQueueStore.getState().status === "listo") usePublishQueueStore.getState().clear();\n          }, 4000);\n        } else {\n          usePublishQueueStore.getState().setStatus("error");\n          avisoPush(false);\n        }\n      } catch (e) {\n        log.error("Publicacion en segundo plano fallo:", e);\n        usePublishQueueStore.getState().setStatus("error");\n        showToast("No se pudo publicar tu reel. Toca Reintentar.", "error", 5000);\n        avisoPush(false);\n      } finally {\n        corriendo.current = false;\n      }\n    })();\n  }, [runId, showToast, user?.id]);\n\n  return null;\n}\n'),
('R26-02', 'components/shared/PublishProgressBanner.tsx', None,
'import React from "react";\nimport { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";\nimport { useSafeAreaInsets } from "react-native-safe-area-context";\nimport { Ionicons } from "@expo/vector-icons";\nimport { usePublishQueueStore } from "@/store/publishQueueStore";\nimport { COLORS } from "@/constants/colors";\n\n/** REV26 (#5): barra flotante con el avance de la publicacion en segundo plano. */\nexport default function PublishProgressBanner() {\n  const insets = useSafeAreaInsets();\n  const status = usePublishQueueStore((s) => s.status);\n  const progress = usePublishQueueStore((s) => s.progress);\n  const retry = usePublishQueueStore((s) => s.retry);\n  const clear = usePublishQueueStore((s) => s.clear);\n  if (!status) return null;\n\n  const texto =\n    status === "preparando"\n      ? "Preparando tu video@@u2026@@"\n      : status === "subiendo"\n        ? `Subiendo tu reel@@u2026@@ ${Math.min(progress, 99)}%`\n        : status === "publicando"\n          ? "Publicando@@u2026@@"\n          : status === "listo"\n            ? "Tu reel ya est@@u00e1@@ publicado"\n            : "No se pudo publicar tu reel";\n\n  return (\n    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>\n      <View pointerEvents={status === "error" ? "auto" : "none"} style={[styles.card, status === "error" && styles.cardError]}>\n        <View style={styles.row}>\n          {status === "listo" ? (\n            <Ionicons name="checkmark-circle" size={20} color="#16a34a" />\n          ) : status === "error" ? (\n            <Ionicons name="alert-circle" size={20} color="#dc2626" />\n          ) : (\n            <ActivityIndicator size="small" color={COLORS.primary} />\n          )}\n          <Text style={styles.text} numberOfLines={1}>\n            {texto}\n          </Text>\n          {status === "error" && (\n            <>\n              <TouchableOpacity onPress={retry} hitSlop={8}>\n                <Text style={styles.action}>Reintentar</Text>\n              </TouchableOpacity>\n              <TouchableOpacity onPress={clear} hitSlop={8}>\n                <Text style={styles.actionMuted}>Descartar</Text>\n              </TouchableOpacity>\n            </>\n          )}\n        </View>\n        {(status === "subiendo" || status === "preparando") && (\n          <View style={styles.bar}>\n            <View style={[styles.fill, { width: `${Math.min(progress, 100)}%` }]} />\n          </View>\n        )}\n      </View>\n    </View>\n  );\n}\n\nconst styles = StyleSheet.create({\n  wrap: { position: "absolute", left: 12, right: 12, zIndex: 9999, elevation: 20 },\n  card: {\n    backgroundColor: "#ffffff",\n    borderRadius: 12,\n    paddingVertical: 10,\n    paddingHorizontal: 12,\n    shadowColor: "#000",\n    shadowOpacity: 0.18,\n    shadowRadius: 8,\n    shadowOffset: { width: 0, height: 3 },\n    borderWidth: StyleSheet.hairlineWidth,\n    borderColor: "#d4d4d8",\n  },\n  cardError: { borderColor: "#dc2626" },\n  row: { flexDirection: "row", alignItems: "center", gap: 10 },\n  text: { flex: 1, fontSize: 14, color: "#18181b", fontWeight: "600" },\n  action: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },\n  actionMuted: { fontSize: 13, color: "#71717a", fontWeight: "600" },\n  bar: { height: 4, backgroundColor: "#e4e4e7", borderRadius: 2, marginTop: 8, overflow: "hidden" },\n  fill: { height: 4, backgroundColor: COLORS.primary, borderRadius: 2 },\n});\n'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", help="carpeta src/ del proyecto")
    ap.add_argument("--only", default="", help="IDs separados por coma, p. ej. LEG-03,LEG-04")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    only = {s.strip() for s in a.only.split(",") if s.strip()}
    if not os.path.isdir(a.root):
        print("ERROR: no existe la carpeta %r (ejecuta desde la raiz del repo y pasa 'src')" % a.root)
        sys.exit(2)
    known = {p[0] for p in PATCHES} | {f[0] for f in FILES}
    unknown = only - known
    if unknown:
        print("ERROR: id(s) desconocido(s): %s" % ", ".join(sorted(unknown)))
        sys.exit(2)
    cache = {}
    report = []
    errors = []
    writes = []  # (ruta, bytes)

    for issue, rel, old, new in PATCHES:
        if only and issue not in only:
            continue
        old = dec(old)
        new = dec(new)
        path = os.path.join(a.root, rel)
        if rel not in cache:
            if not os.path.isfile(path):
                errors.append("%s: NO EXISTE %s" % (issue, rel))
                continue
            raw = open(path, "rb").read().decode("utf-8")
            crlf = raw.count("\r\n")
            lf = raw.count("\n")
            mixed = crlf not in (0, lf)
            dominant = "\r\n" if crlf * 2 >= lf else "\n"
            cache[rel] = {"eol": dominant, "mixed": mixed, "changed": False,
                          "text": raw if mixed else raw.replace("\r\n", "\n")}
        st = cache[rel]
        text = st["text"]
        if st["mixed"]:
            if (rx(new).search(text) if new else not rx(old).search(text)):
                report.append((issue, rel, "YA APLICADO"))
                continue
            found = list(rx(old).finditer(text))
            if len(found) != 1:
                errors.append("%s: ancla encontrada %d veces (se esperaba 1) en %s -> %r" % (issue, len(found), rel, old[:80]))
                continue
            m = found[0]
            st["text"] = text[:m.start()] + new.replace("\n", st["eol"]) + text[m.end():]
            st["changed"] = True
            report.append((issue, rel, "OK (EOL mixto)"))
            continue
        if (new in text) if new else (old not in text):
            report.append((issue, rel, "YA APLICADO"))
            continue
        n = text.count(old)
        if n != 1:
            errors.append("%s: ancla encontrada %d veces (se esperaba 1) en %s -> %r" % (issue, n, rel, old[:80]))
            continue
        st["text"] = text.replace(old, new, 1)
        st["changed"] = True
        report.append((issue, rel, "OK"))

    for issue, rel, orig_hash, content in FILES:
        if only and issue not in only:
            continue
        content = dec(content)
        path = os.path.join(a.root, rel)
        if not os.path.isfile(path):
            if orig_hash is not None:
                errors.append("%s: NO EXISTE %s (se esperaba el archivo original)" % (issue, rel))
                continue
            writes.append((path, content.replace("\r\n", "\n").encode("utf-8")))
            report.append((issue, rel, "NUEVO"))
            continue
        raw = open(path, "rb").read().decode("utf-8")
        eol = "\r\n" if raw.count("\r\n") else "\n"
        cur = raw.replace("\r\n", "\n")
        if norm_hash(cur) == norm_hash(content):
            report.append((issue, rel, "YA APLICADO"))
            continue
        if orig_hash is None:
            errors.append("%s: %s ya existe y es distinto al esperado; no se sobreescribe" % (issue, rel))
            continue
        if norm_hash(cur) != orig_hash:
            errors.append("%s: %s no coincide con el original esperado (alguien lo cambio); no se sobreescribe" % (issue, rel))
            continue
        writes.append((path, content.replace("\r\n", "\n").replace("\n", eol).encode("utf-8")))
        report.append((issue, rel, "REEMPLAZADO"))

    for r in report:
        print("%-9s %-58s %s" % r)
    n_ok = sum(1 for r in report if r[2].startswith("OK") or r[2] in ("NUEVO", "REEMPLAZADO"))
    n_done = sum(1 for r in report if r[2] == "YA APLICADO")
    print("\nRESUMEN: %d cambios OK, %d YA APLICADO, %d errores" % (n_ok, n_done, len(errors)))

    if errors:
        print("\nERRORES (no se escribio NADA):")
        for e in errors:
            print("  -", e)
        sys.exit(1)

    if a.dry_run:
        print("\nDRY-RUN: anclas verificadas, no se escribio nada.")
        return

    for rel, st in cache.items():
        if not st["changed"]:
            continue
        data = (st["text"] if st["mixed"] else st["text"].replace("\n", st["eol"])).encode("utf-8")
        with open(os.path.join(a.root, rel), "wb") as fh:
            fh.write(data)
        print("escrito:", rel)
    for path, data in writes:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as fh:
            fh.write(data)
        print("escrito:", os.path.relpath(path, a.root))
    print("\nListo.")


if __name__ == "__main__":
    main()
