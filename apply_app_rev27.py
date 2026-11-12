#!/usr/bin/env python3
"""
apply_app_rev27.py - parche de la APP (tanda 4). Se aplica DESPUES de rev26.
  R27-01..03  Bloqueos en AMBOS sentidos: quien bloquea y quien es bloqueado dejan de verse (feed, mapa, buscador,
              recomendaciones, reels, perfil). El bloqueado no se entera; quien bloqueo ve solo el nombre en el buscador para desbloquear.
              Requiere el SQL 29_bloqueos_bidireccional.sql (si no esta, la app sigue como antes).
  R27-04      Triangulo de reporte: uno solo en la grilla del perfil, abajo a la derecha (ya no se duplica ni queda tras la etiqueta de comision).
  R27-05      Publicar ficha: sin doble aviso de error (evita la pantalla congelada en iPhone) y el error real queda en debug_logs.
  R27-06      Crear/editar ficha: la ubicacion usa el MISMO buscador que el buscador general (mismo orden de opciones).
USO:  python apply_app_rev27.py src --dry-run   y luego   python apply_app_rev27.py src
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
('R27-01', 'services/blockService.ts',
'interface CacheEntry {\n  ids: string[];\n  expires: number;\n}\n\nconst blockedUsersCache = new Map<string, CacheEntry>();\nconst CACHE_TTL_MS = 5 * 60 * 1000;\n\nfunction invalidateBlockedUsersCache(blockerId: string) {\n  blockedUsersCache.delete(blockerId);\n}\n\n',
'interface CacheEntry {\n  todos: string[];\n  yoBloquee: string[];\n  expires: number;\n}\n\nconst blockedUsersCache = new Map<string, CacheEntry>();\n// REV27: TTL corto; si OTRO usuario te bloquea, el cambio debe verse pronto.\nconst CACHE_TTL_MS = 60 * 1000;\n\nfunction invalidateBlockedUsersCache(blockerId: string) {\n  blockedUsersCache.delete(blockerId);\n}\n\n/**\n * REV27: bloqueos en AMBOS sentidos.\n *  - todos:     ids con los que hay un bloqueo (yo los bloquee O ellos me bloquearon). Se usa para ocultar contenido.\n *  - yoBloquee: solo los que yo bloquee (para mostrar su nombre en el buscador y poder desbloquear).\n * Usa la funcion SQL mis_bloqueos() (ve ambos sentidos aunque la RLS solo deje leer los propios). Si no existe,\n * cae a la lectura directa de la tabla.\n */\nasync function cargarBloqueos(userId: string): Promise<{ todos: string[]; yoBloquee: string[] }> {\n  const cached = blockedUsersCache.get(userId);\n  if (cached && cached.expires > Date.now()) {\n    return { todos: cached.todos, yoBloquee: cached.yoBloquee };\n  }\n\n  let yo: string[] = [];\n  let otros: string[] = [];\n\n  const { data, error } = await supabase.rpc("mis_bloqueos");\n  if (!error && Array.isArray(data)) {\n    for (const r of data as any[]) {\n      if (!r?.otro_id) continue;\n      if (r.yo_bloquee) yo.push(r.otro_id);\n      else otros.push(r.otro_id);\n    }\n  } else {\n    const q1 = await supabase.from("bloqueos_usuarios").select("bloqueado_id").eq("bloqueador_id", userId);\n    if (q1.error) {\n      log.warn("cargarBloqueos failed", q1.error);\n      return { todos: [], yoBloquee: [] };\n    }\n    yo = (q1.data ?? []).map((r: any) => r.bloqueado_id).filter(Boolean);\n    const q2 = await supabase.from("bloqueos_usuarios").select("bloqueador_id").eq("bloqueado_id", userId);\n    if (!q2.error) otros = (q2.data ?? []).map((r: any) => r.bloqueador_id).filter(Boolean);\n  }\n\n  const todos = Array.from(new Set([...yo, ...otros]));\n  const yoBloquee = Array.from(new Set(yo));\n  blockedUsersCache.set(userId, { todos, yoBloquee, expires: Date.now() + CACHE_TTL_MS });\n  return { todos, yoBloquee };\n}\n\n'),
('R27-01', 'services/blockService.ts',
'  async getBlockedUserIds(blockerId?: string | null): Promise<string[]> {\n    if (!blockerId) return [];\n\n    const cached = blockedUsersCache.get(blockerId);\n    if (cached && cached.expires > Date.now()) {\n      return cached.ids;\n    }\n\n    const { data, error } = await supabase\n      .from("bloqueos_usuarios")\n      .select("bloqueado_id")\n      .eq("bloqueador_id", blockerId);\n\n    if (error) {\n      log.warn("getBlockedUserIds failed", error);\n      return [];\n    }\n\n    const ids = (data ?? [])\n      .map((row: any) => row.bloqueado_id)\n      .filter(Boolean) as string[];\n\n    blockedUsersCache.set(blockerId, {\n      ids,\n      expires: Date.now() + CACHE_TTL_MS,\n    });\n\n    return ids;\n  },\n\n',
'  // REV27: ids ocultos en ambos sentidos (yo los bloquee o me bloquearon).\n  async getBlockedUserIds(blockerId?: string | null): Promise<string[]> {\n    if (!blockerId) return [];\n    return (await cargarBloqueos(blockerId)).todos;\n  },\n\n  // REV27: solo los que YO bloquee.\n  async getBlockedByMeIds(blockerId?: string | null): Promise<string[]> {\n    if (!blockerId) return [];\n    return (await cargarBloqueos(blockerId)).yoBloquee;\n  },\n\n  async getBlockSets(blockerId?: string | null): Promise<{ todos: string[]; yoBloquee: string[] }> {\n    if (!blockerId) return { todos: [], yoBloquee: [] };\n    return cargarBloqueos(blockerId);\n  },\n\n'),
('R27-02', 'hooks/useSearch.ts',
'async function fetchUsers(\n  q: string,\n  blockedUserIds: string[],\n): Promise<SearchUser[]> {',
'async function fetchUsers(\n  q: string,\n  blockedUserIds: string[],\n  yoBloquee: string[] = blockedUserIds,\n): Promise<SearchUser[]> {'),
('R27-02', 'hooks/useSearch.ts',
'  return ((data as any[]) ?? [])\n    .map((p) => ({\n      id: p.id,\n      name: p.nombre_completo || [p.nombre, p.apellido_paterno].filter(Boolean).join(" ") || "Usuario",\n      avatar: p.foto || undefined,\n      ocupacion: p.ocupacion || undefined,\n      rating: p.calificacion_promedio ? parseFloat(p.calificacion_promedio) : undefined,\n      is_blocked: blockedUserIds.includes(p.id),\n    }));',
'  // REV27: quien me bloqueo NO aparece (no debe enterarse); a quien yo bloquee solo se le ve el nombre para desbloquear.\n  return ((data as any[]) ?? [])\n    .filter((p) => !blockedUserIds.includes(p.id) || yoBloquee.includes(p.id))\n    .map((p) => ({\n      id: p.id,\n      name: p.nombre_completo || [p.nombre, p.apellido_paterno].filter(Boolean).join(" ") || "Usuario",\n      avatar: p.foto || undefined,\n      ocupacion: p.ocupacion || undefined,\n      rating: p.calificacion_promedio ? parseFloat(p.calificacion_promedio) : undefined,\n      is_blocked: yoBloquee.includes(p.id),\n    }));'),
('R27-02', 'hooks/useSearch.ts',
'        const blockedUserIds = await blockService.getBlockedUserIds(user?.id);\n        const [users, posts, reels, properties] = await Promise.all([\n          fetchUsers(trimmed, blockedUserIds),',
'        const blockedUserIds = await blockService.getBlockedUserIds(user?.id);\n        const yoBloquee = await blockService.getBlockedByMeIds(user?.id);\n        const [users, posts, reels, properties] = await Promise.all([\n          fetchUsers(trimmed, blockedUserIds, yoBloquee),'),
('R27-03', 'hooks/useUserBlock.ts',
'  const [isBlocked, setIsBlocked] = useState(false);\n  const [loading, setLoading] = useState(false);\n',
'  const [isBlocked, setIsBlocked] = useState(false);\n  // REV27: el otro usuario me bloqueo a mi (no debo ver su perfil ni su contenido, y no debo enterarme).\n  const [blockedByOther, setBlockedByOther] = useState(false);\n  const [loading, setLoading] = useState(false);\n'),
('R27-03', 'hooks/useUserBlock.ts',
'    if (!blockerId || !blockedId || blockerId === blockedId) {\n      setIsBlocked(false);\n      return false;\n    }\n\n    const next = await blockService.isBlocked(blockerId, blockedId);\n    setIsBlocked(next);\n    return next;',
'    if (!blockerId || !blockedId || blockerId === blockedId) {\n      setIsBlocked(false);\n      setBlockedByOther(false);\n      return false;\n    }\n\n    const next = await blockService.isBlocked(blockerId, blockedId);\n    setIsBlocked(next);\n    try {\n      const sets = await blockService.getBlockSets(blockerId);\n      setBlockedByOther(!next && sets.todos.includes(blockedId));\n    } catch {\n      setBlockedByOther(false);\n    }\n    return next;'),
('R27-03', 'hooks/useUserBlock.ts',
'  return {\n    isBlocked,\n    loading,',
'  return {\n    isBlocked,\n    blockedByOther,\n    loading,'),
('R27-03', 'components/Profile/Profile.tsx',
'  const {\n    isBlocked,\n    loading: blockingUser,',
'  const {\n    isBlocked,\n    blockedByOther,\n    loading: blockingUser,'),
('R27-03', 'components/Profile/Profile.tsx',
'  if (loading && !refreshing && !profile) {\n    return <ProfileSkeleton />;\n  }\n',
'  if (loading && !refreshing && !profile) {\n    return <ProfileSkeleton />;\n  }\n\n  // REV27: si ese usuario me bloqueo, su perfil y su contenido no existen para mi (sin decir que fue un bloqueo).\n  if (!isMe && blockedByOther) {\n    return (\n      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: COLORS.white }}>\n        <Ionicons name="person-remove-outline" size={48} color={COLORS.textSecondary} />\n        <Text style={{ marginTop: 12, fontSize: 16, color: COLORS.textSecondary, textAlign: "center" }}>\n          Este perfil no est@@u00e1@@ disponible\n        </Text>\n        <Text\n          onPress={() => (onBack ? onBack() : router.back())}\n          style={{ marginTop: 20, fontSize: 15, fontWeight: "700", color: COLORS.primary }}\n        >\n          Volver\n        </Text>\n      </View>\n    );\n  }\n'),
('R27-04', 'components/Profile/ProfilePropertyItem.tsx',
'        <View style={{ position: "absolute", top: 4, right: 4 }}>\n          <ReportBadge propertyId={item.id} />\n        </View>',
'        {/* REV27: un solo triangulo, abajo a la derecha de la imagen (no tapa la etiqueta de comision ni el menu) */}\n        <View style={{ position: "absolute", top: ITEM_SIZE - 34, right: 6, zIndex: 20 }}>\n          <ReportBadge propertyId={item.id} />\n        </View>'),
('R27-04', 'components/Profile/ProfilePropertyItem.tsx',
'        {isOwnProfile && !!reportInfo && (',
'        {/* REV27: el circulo antiguo del dueno se retira: ReportBadge ya lo muestra para todos (evita verlo dos veces) */}\n        {circuloAntiguoActivo() && isOwnProfile && !!reportInfo && ('),
('R27-04', 'components/Profile/ProfilePropertyItem.tsx',
'const ITEM_SIZE = (width - 24 - GAP * 2) / 3;\n',
'const ITEM_SIZE = (width - 24 - GAP * 2) / 3;\n// REV27: interruptor del circulo de reporte antiguo (apagado: lo reemplaza ReportBadge).\nconst circuloAntiguoActivo = (): boolean => false;\n'),
('R27-05', 'components/CreateContent/CreateProperty/usePublishProperty.ts',
'        log.error("Error publishing property:", error);\n',
'        log.error("Error publishing property:", error);\n        // REV27: se guarda el error real para poder diagnosticar (tabla debug_logs, contexto publicar_propiedad).\n        try {\n          void supabase.from("debug_logs").insert({\n            contexto: "publicar_propiedad",\n            payload: {\n              user: user?.id,\n              editando: !!propertyId,\n              name: error?.name,\n              code: error?.code,\n              message: error?.message,\n              details: error?.details,\n              hint: error?.hint,\n            },\n          });\n        } catch {\n          /* sin efecto */\n        }\n'),
('R27-05', 'components/CreateContent/CreateProperty/usePublishProperty.ts',
'        setPublishState({\n          uploading: false,\n          uploadProgress: 0,\n          uploadStage: "",\n          error: errorMessage,\n          canCancel: true,\n        });\n\n        showModal({\n          title: "Error al publicar",\n          message: errorMessage,\n          confirmText: "Reintentar",\n          cancelText: "Cerrar",\n          confirmVariant: "primary",\n          onConfirm: () => void doUpload(resolvedContractData),\n          onCancel: () => {},\n        });',
'        // REV27: antes se abrian DOS avisos a la vez (el de progreso con "Cerrar" y el de "Error al publicar").\n        // En iPhone eso dejaba la pantalla congelada al cerrar. Ahora se cierra el de progreso y, ya cerrado, se muestra uno solo.\n        setPublishState({\n          uploading: false,\n          uploadProgress: 0,\n          uploadStage: "",\n          error: null,\n          canCancel: true,\n        });\n\n        setTimeout(() => {\n          showModal({\n            title: "Error al publicar",\n            message: errorMessage,\n            confirmText: "Reintentar",\n            cancelText: "Cerrar",\n            confirmVariant: "primary",\n            onConfirm: () => void doUpload(resolvedContractData),\n            onCancel: () => {},\n          });\n        }, 450);'),
('R27-05', 'components/CreateContent/CreateProperty/usePublishProperty.ts',
'import { warmOgCache } from "@/utils/ogWarmup";\n',
'import { warmOgCache } from "@/utils/ogWarmup";\nimport { supabase } from "@/lib/supabase";\n'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'import { priorizarEstado } from "../../lib/location/estadoFirst";\n',
'import { priorizarEstado } from "../../lib/location/estadoFirst";\nimport { useLocationSearchStore } from "../../store/locationSearchStore";\nimport { useAuth } from "../../context/AuthContext";\n'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'  // Sugerencias de Places Autocomplete\n  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);\n  const [isLoading, setIsLoading] = useState(false);',
'  // Sugerencias de Places Autocomplete\n  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);\n  const [isLoading, setIsLoading] = useState(false);\n  // REV27 (#2): se usa el MISMO buscador de ubicaciones que el buscador general (mismo orden: estado primero,\n  // zonas con propiedades, nombres canonicos, ruido filtrado).\n  const { profile: perfilUsuario } = useAuth();\n  const storeSugs = useLocationSearchStore((s) => s.suggestions);\n  const buscarEnStore = useLocationSearchStore((s) => s.searchLocations);\n  const limpiarStore = useLocationSearchStore((s) => s.clearSuggestions);\n  const escribiendoRef = useRef(false);\n  const origenRef = useRef<Map<string, any>>(new Map());'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'  // Debounce para el autocompletado\n  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);',
'  // REV27 (#2): al abrir/cerrar, no arrastrar sugerencias de otra pantalla (buscador general o del mapa).\n  useEffect(() => {\n    limpiarStore();\n    return () => limpiarStore();\n  }, [limpiarStore]);\n\n  // REV27 (#2): lo que devuelve el buscador general se muestra tal cual, en su mismo orden.\n  useEffect(() => {\n    if (!escribiendoRef.current || storeSugs.length === 0) return;\n    const mapa = new Map<string, any>();\n    const lista: PlaceSuggestion[] = storeSugs.map((s: any) => {\n      mapa.set(s.placeId, s);\n      return {\n        placeId: s.placeId,\n        description: s.fullDescription || [s.name, s.secondaryText].filter(Boolean).join(", "),\n        mainText: s.name,\n        secondaryText: s.secondaryText ?? "",\n        types:\n          s.types && s.types.length > 0\n            ? s.types\n            : [s.type === "estado" ? "administrative_area_level_1" : s.type === "municipio" ? "locality" : "sublocality"],\n      };\n    });\n    origenRef.current = mapa;\n    setSuggestions(lista.slice(0, 8));\n    setIsLoading(false);\n  }, [storeSugs]);\n\n  // Debounce para el autocompletado\n  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'    if (text.trim().length < 2) {\n      setSuggestions([]);\n      return;\n    }\n\n    debounceRef.current = setTimeout(async () => {\n      setIsLoading(true);\n      try {\n        const miBusqueda = busquedaRef.current;\n        const results = await searchPlaces(text, sessionTokenRef.current);\n        // REV24: estado primero, igual que el buscador general.\n        const ordenados = await priorizarEstado(text, results, sessionTokenRef.current);\n        if (miBusqueda !== busquedaRef.current) return;\n        setSuggestions(ordenados.slice(0, 8));\n      } catch {\n        setSuggestions([]);\n      } finally {\n        setIsLoading(false);\n      }\n    }, 300);\n  }, []);',
'    if (text.trim().length < 2) {\n      escribiendoRef.current = false;\n      setSuggestions([]);\n      return;\n    }\n\n    debounceRef.current = setTimeout(async () => {\n      setIsLoading(true);\n      const miBusqueda = busquedaRef.current;\n      try {\n        escribiendoRef.current = true;\n        // Mismos parametros que usa el buscador general (useSearch).\n        await buscarEnStore(text, undefined, {\n          restrictToRegions: false,\n          withCounts: false,\n          estado: perfilUsuario?.estado,\n        });\n        if (miBusqueda !== busquedaRef.current) return;\n        // Respaldo: si el buscador general no devolvio nada, se usa la busqueda directa de antes.\n        if (useLocationSearchStore.getState().suggestions.length === 0) {\n          const results = await searchPlaces(text, sessionTokenRef.current);\n          const ordenados = await priorizarEstado(text, results, sessionTokenRef.current);\n          if (miBusqueda !== busquedaRef.current) return;\n          origenRef.current = new Map();\n          setSuggestions(ordenados.slice(0, 8));\n        }\n      } catch {\n        if (miBusqueda === busquedaRef.current) setSuggestions([]);\n      } finally {\n        if (miBusqueda === busquedaRef.current) setIsLoading(false);\n      }\n    }, 300);\n  }, [buscarEnStore, perfilUsuario?.estado]);'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'    async (suggestion: PlaceSuggestion) => {\n      setSuggestions([]);\n      setIsLoading(true);\n      setQuery(suggestion.description);\n\n      try {',
'    async (suggestion: PlaceSuggestion) => {\n      setSuggestions([]);\n      setIsLoading(true);\n      setQuery(suggestion.description);\n      escribiendoRef.current = false;\n\n      try {\n        // REV27 (#2): zonas que vienen de las propiedades de la BD (id "prop-...") no existen en Google Places:\n        // se usa su nombre y su centroide directamente.\n        const origen = origenRef.current.get(suggestion.placeId);\n        if (suggestion.placeId.startsWith("prop-") && origen) {\n          const tipoZona = origen.type as "estado" | "municipio" | "colonia";\n          const datos: LocationData = {\n            estado: tipoZona === "estado" ? origen.name : (origen.estado_nombre ?? ""),\n            ciudad: tipoZona === "estado" ? "" : (origen.municipio_nombre ?? (tipoZona === "municipio" ? origen.name : "")),\n            municipio: tipoZona === "estado" ? "" : (tipoZona === "municipio" ? origen.name : (origen.municipio_nombre ?? "")),\n            colonia: tipoZona === "colonia" ? origen.name : "",\n            colonias: tipoZona === "colonia" ? [origen.name] : [],\n            pais: DEFAULT_COUNTRY,\n            latitud: origen.centroide?.lat,\n            longitud: origen.centroide?.lng,\n            placeType: tipoZona,\n          };\n          sessionTokenRef.current = generateToken();\n          limpiarStore();\n          setCurrentData(datos);\n          setIsSelected(true);\n          onChange(datos);\n          return;\n        }\n'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'        setCurrentData(newData);\n        setIsSelected(true);\n        onChange(newData);\n      } catch (e) {\n        console.warn("[CascadeLocationSelector] handleSelectSuggestion error:", e);',
'        limpiarStore();\n        setCurrentData(newData);\n        setIsSelected(true);\n        onChange(newData);\n      } catch (e) {\n        console.warn("[CascadeLocationSelector] handleSelectSuggestion error:", e);'),
('R27-06', 'components/common/CascadeLocationSelector.tsx',
'    [onChange],\n  );\n\n  const handleClear = useCallback(() => {\n    setQuery("");',
'    [onChange, limpiarStore],\n  );\n\n  const handleClear = useCallback(() => {\n    escribiendoRef.current = false;\n    limpiarStore();\n    setQuery("");'),
]

FILES = []


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
