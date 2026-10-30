#!/usr/bin/env python3
"""
apply_app_rev10_p2.py - parche de la APP, iteracion 10, paquete 2. Se aplica DESPUES de apply_app_legal_2.py.
  R10-04  comision: UNA regla en feed, detalle/fichas del mapa, mapa, buscador, buscador por codigo, Coincidencias y el
          contador (badge) de Coincidencias (otros asesores solo ven propiedades que comparten comision; el creador
          siempre ve las suyas). No borra ni desactiva datos: solo filtra al mostrar.
  R10-04b enlaces/notificaciones: la ficha de una propiedad que dejo de compartir comision sigue abriendo y muestra la
          etiqueta "No disponible" (a quien no es su dueno)
  R10-07  Guardar busqueda: si el prospecto ya fue informado se muestra "Aviso informado el <fecha>" (lo pide el Excel)
  R10-03  el push de una coincidencia abre la busqueda guardada; cada busqueda conserva su propia tarjeta en Coincidencias
          (necesario ahora que el prospecto se reutiliza)
  R10-05  "Villas de la Cantera": Google da el nombre general y la BD lo tiene por secciones -> una sola sugerencia
  R10-01  "Terranza Residence" / "La Soledad": la zona se guarda con el nombre REAL de la BD (necesita 14_comision_zonas.sql)

USO (desde la raiz del repo):
    python3 apply_app_rev10_p2.py src --dry-run
    python3 apply_app_rev10_p2.py src

Reglas: ancla exacta (debe aparecer 1 vez, si no ABORTA sin escribir nada), respeta CRLF/LF, idempotente, solo ASCII.
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
('R10-04', 'services/feedService.ts',
r"""function applyPropertiesVisibility(query: any, currentUserId?: string, blockedUserIds: string[] = []): any {
  // Temporalmente sin filtro de comparte_comision para probar
  log.info(`[applyPropertiesVisibility] currentUserId=${currentUserId}, blockedUserIds=${blockedUserIds.length} - SIN FILTRO DE COMISION`);
  return query.eq("activo", true);
}""",
r"""function applyPropertiesVisibility(query: any, currentUserId?: string, blockedUserIds: string[] = [], permitirNoCompartida = false): any {
  // REV10-04: abrir UNA propiedad por enlace o notificacion (permitirNoCompartida) sigue funcionando aunque ya no comparta
  // comision: la ficha la muestra con la etiqueta "No disponible". Los listados siempre usan la regla.
  if (permitirNoCompartida) return query.eq("activo", true);
  // REV10-04: misma regla que el perfil, el mapa y el buscador. Otros asesores solo ven la propiedad si comparte
  // comision (y no es "sin comision"); su creador siempre la ve. Un solo .or() agrupa las dos ramas.
  let q = query.eq("activo", true);
  if (currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId)) {
    q = q.or(
      `and(comparte_comision.eq.true,or(sin_comision.is.null,sin_comision.eq.false)),created_by.eq.${currentUserId}`,
    );
  } else {
    q = q.eq("comparte_comision", true).or("sin_comision.is.null,sin_comision.eq.false");
  }
  return q;
}"""),
('R10-04', 'hooks/useMapProperties.ts',
r"""  // Las propiedades sin comisi@@u00f3@@n se guardan con activo=false y quedan ocultas a
  // todos. Excepci@@u00f3@@n: su creador S@@u00cd@@ debe verlas en el mapa y el buscador.
  if (currentUserId) {
    query = query.or(
      `activo.eq.true,and(sin_comision.eq.true,created_by.eq.${currentUserId})`,
    );
  } else {
    query = query.eq("activo", true);
  }
""",
r"""  // Las propiedades sin comisi@@u00f3@@n se guardan con activo=false y quedan ocultas a
  // todos. Excepci@@u00f3@@n: su creador S@@u00cd@@ debe verlas en el mapa y el buscador.
  // REV10-04: ademas, otros asesores solo ven las que comparten comision (misma regla que el perfil y el feed).
  if (currentUserId) {
    query = query.or(
      `and(activo.eq.true,comparte_comision.eq.true,or(sin_comision.is.null,sin_comision.eq.false)),and(created_by.eq.${currentUserId},or(activo.eq.true,sin_comision.eq.true))`,
    );
  } else {
    query = query.eq("activo", true).eq("comparte_comision", true).or("sin_comision.is.null,sin_comision.eq.false");
  }
"""),
('R10-04', 'hooks/useSearch.ts',
r"""  if (currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId)) {
    query = query.or(`activo.eq.true,created_by.eq.${currentUserId}`);
  } else {
    query = query.eq("activo", true);
  }
""",
r"""  // REV10-04: ademas, de otros asesores solo las que comparten comision (el creador ve siempre las suyas).
  if (currentUserId && /^[0-9a-f-]{36}$/i.test(currentUserId)) {
    query = query.or(`and(activo.eq.true,comparte_comision.eq.true,or(sin_comision.is.null,sin_comision.eq.false)),created_by.eq.${currentUserId}`);
  } else {
    query = query.eq("activo", true).eq("comparte_comision", true).or("sin_comision.is.null,sin_comision.eq.false");
  }
"""),
('R10-04', 'components/LocationSearchBar.tsx',
r"""  const { profile } = useAuth();
""",
r"""  const { profile, user: authUser } = useAuth();
"""),
('R10-04', 'components/LocationSearchBar.tsx',
r"""      const { data, error } = await supabase
        .from("propiedades")
        .select("id, codigo_propiedad, subtipo, municipio, fotos")
        .ilike("codigo_propiedad", `%${query}%`)
        .limit(3);
""",
r"""      // REV10-04: misma regla que el resto de vistas (antes aqui no se filtraba nada: salian propiedades
      // eliminadas, inactivas o que no comparten comision).
      let codeQuery = supabase
        .from("propiedades")
        .select("id, codigo_propiedad, subtipo, municipio, fotos")
        .ilike("codigo_propiedad", `%${query}%`)
        .is("deleted_at", null)
        .limit(3);
      const uid = authUser?.id;
      if (uid && /^[0-9a-f-]{36}$/i.test(uid)) {
        codeQuery = codeQuery.or(`and(activo.eq.true,comparte_comision.eq.true,or(sin_comision.is.null,sin_comision.eq.false)),created_by.eq.${uid}`);
      } else {
        codeQuery = codeQuery.eq("activo", true).eq("comparte_comision", true).or("sin_comision.is.null,sin_comision.eq.false");
      }
      const { data, error } = await codeQuery;
"""),
('R10-04', 'components/LocationSearchBar.tsx',
r"""    const timer = setTimeout(fetchPropertyByCode, 400);
    return () => clearTimeout(timer);
  }, [query]);""",
r"""    const timer = setTimeout(fetchPropertyByCode, 400);
    return () => clearTimeout(timer);
  }, [query, authUser?.id]);"""),
('R10-04', 'components/Matches.tsx',
r"""      if (error) throw error;

      // Si tenemos datos, obtener perfiles por separado""",
r"""      if (error) throw error;

      // REV10-04: una coincidencia de una propiedad que no comparte comision (o es "sin comision") no se muestra.
      // La BD ya no las genera ni las deja activas; esto cubre cualquier resto o cambio reciente.
      if (data) {
        data = data.filter((m: any) => {
          const p = m.propiedad;
          if (!p || p.created_by === user.id) return true;
          return p.comparte_comision === true && !p.sin_comision;
        });
      }

      // Si tenemos datos, obtener perfiles por separado"""),
('R10-03', 'components/Matches.tsx',
r"""import React, { useCallback, useEffect, useState } from "react";""",
r"""import React, { useCallback, useEffect, useRef, useState } from "react";"""),
('R10-03', 'components/Matches.tsx',
r"""import { router } from "expo-router";""",
r"""import { router, useLocalSearchParams } from "expo-router";"""),
('R10-03', 'components/Matches.tsx',
r"""  const { data: feedItemsRecord = {} } = usePropertyFeedItems(propertyIds);
""",
r"""  const { data: feedItemsRecord = {} } = usePropertyFeedItems(propertyIds);

  // REV10-03: el push de una coincidencia trae busquedaId. Se abre directamente esa busqueda guardada (la misma
  // ventana que al tocar su tarjeta). Una sola vez por busqueda, para no reabrirla despues de cerrarla.
  const { busquedaId: busquedaParam } = useLocalSearchParams<{ busquedaId?: string }>();
  const busquedaAbierta = useRef<string | null>(null);
  useEffect(() => {
    if (!busquedaParam || loading) return;
    if (busquedaAbierta.current === busquedaParam) return;
    if (savedSearches.some((s: any) => s.id === busquedaParam)) {
      busquedaAbierta.current = busquedaParam;
      setSelectedLeadId(busquedaParam);
    }
  }, [busquedaParam, loading, savedSearches]);
"""),
('R10-03', 'app/_layout.tsx',
r"""    case "matches":
    case "MatchDetail":
      return () => router.push("/(stack)/matches");""",
r"""    case "matches":
    case "MatchDetail":
      // REV10-03: si el aviso trae la busqueda, la pantalla abre esa busqueda guardada.
      return () =>
        router.push({
          pathname: "/(stack)/matches",
          params: data.busqueda_id ? { busquedaId: String(data.busqueda_id) } : {},
        });"""),
('R10-03', 'components/Matches.tsx',
r"""        grouped.set(lead.id, {
          leadId: lead.id,""",
r"""        // REV10-07: el prospecto se reutiliza; la tarjeta es de la BUSQUEDA (si no, dos busquedas del mismo
        // prospecto se fundirian en una y una desapareceria).
        grouped.set(search.id, {
          leadId: lead.id,"""),
('R10-03', 'components/Matches.tsx',
r"""      if (!leadId) return;

      // Si el lead no estaba en las b@@u00fa@@squedas (raro pero posible), lo agregamos
      if (!grouped.has(leadId)) {
        grouped.set(leadId, {
          leadId,""",
r"""      if (!leadId) return;
      const groupKey = match.busqueda_id ?? leadId;

      // Si la busqueda no estaba en la lista (raro pero posible), la agregamos
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          leadId,"""),
('R10-03', 'components/Matches.tsx',
r"""      const group = grouped.get(leadId)!;""",
r"""      const group = grouped.get(groupKey)!;"""),
('R10-03', 'components/Matches.tsx',
r"""    leadGroups.find((l) => l.leadId === selectedLeadId) || null;""",
r"""    leadGroups.find((l) => l.busquedaId === selectedLeadId) || null;"""),
('R10-03', 'components/Matches.tsx',
r"""        onPress={() => setSelectedLeadId(item.leadId)}""",
r"""        onPress={() => setSelectedLeadId(item.busquedaId)}"""),
('R10-03', 'components/Matches.tsx',
r"""        keyExtractor={(item) => item.leadId}""",
r"""        keyExtractor={(item) => item.busquedaId}"""),
('R10-05', 'store/locationSearchStore.ts',
r"""function namesRelated(a: string, b: string): boolean {
  const x = coreName(a);
  const y = coreName(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
}
""",
'function namesRelated(a: string, b: string): boolean {\n  const x = coreName(a);\n  const y = coreName(b);\n  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));\n}\n\n// REV10-05: Google da el nombre general ("Villas de la Cantera") y la BD lo tiene por secciones\n// ("Villas de La Cantera 1a Seccion"). Solo cuenta como seccion lo que sobra si es un numero / ordinal / romano y\n// las palabras seccion, etapa, fase o sector: asi "La Perla" NO se funde con "La Perla Sur".\nconst SECCION_NUM = /^(\\d+(a|ra|da|era|ta|va|o|er)?|primera|segunda|tercera|cuarta|quinta|sexta|septima|octava|novena|decima|[ivx]+)$/;\nconst SECCION_PALABRA = /^(seccion|sec|etapa|fase|sector)$/;\n\nexport function isSectionOf(dbName: string, googleName: string): boolean {\n  const g = coreName(googleName);\n  const d = coreName(dbName);\n  if (!g || !d || d === g || !d.startsWith(g + " ")) return false;\n  const resto = d.slice(g.length + 1).split(" ").filter(Boolean);\n  return resto.length > 0 && resto.every((w) => SECCION_NUM.test(w) || SECCION_PALABRA.test(w));\n}\n'),
('R10-05', 'store/locationSearchStore.ts',
r"""    const idxs = dbItems
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => coreName(d.name) === gCore && est(d.estado_nombre) === est(g.estado_nombre));
    if (idxs.length === 0) { out.push(g); continue; }""",
r"""    // Las candidatas "prop-canon-" (nombre real de la BD, REV10-01) solo sirven para colonias; nunca para un municipio.
    const usable = (d: LocationSuggestionWithCount) =>
      !(d.placeId.startsWith("prop-canon-") && g.type === "municipio" && !isLocalityInsideMunicipio(g));
    let idxs = dbItems
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => usable(d) && coreName(d.name) === gCore && est(d.estado_nombre) === est(g.estado_nombre));
    if (idxs.length === 0) {
      // REV10-05: la BD la tiene por secciones. Con una sola se fusiona; con varias se muestran las de la BD
      // (cada una con sus propiedades) y se omite el nombre general, que daria 0.
      const secciones = dbItems
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => usable(d) && isSectionOf(d.name, g.name) && est(d.estado_nombre) === est(g.estado_nombre));
      if (secciones.length === 1) idxs = secciones;
      else if (secciones.length > 1) continue;
    }
    if (idxs.length === 0) { out.push(g); continue; }"""),
('R10-01', 'store/locationSearchStore.ts',
r"""/** "Municipios" de Google que comparten nombre con una colonia de la BD y que la BD no prueba como municipio real:""",
r"""/**
 * REV10-01: colonias de Google que la consulta principal no pudo relacionar con la BD (Google las nombra distinto del
 * texto escrito, p. ej. "Terranza Residence" vs "Terranza", o la colonia no tiene propiedades visibles hoy, p. ej.
 * "La Soledad" vs "Fraccionamiento La Soledad"). Se consulta el nombre REAL de la colonia con el nucleo del nombre
 * de Google. Son candidatas para fusionar: las que no se usen se descartan (nunca se agregan como sugerencia propia).
 * Si la funcion SQL aun no existe, devuelve [] y todo sigue como antes.
 */
async function fetchCanonicalZones(
  google: LocationSuggestionWithCount[],
  propSuggestions: LocationSuggestionWithCount[],
  country: CountryCode,
  estadoUsuario?: string,
): Promise<LocationSuggestionWithCount[]> {
  const est = (s?: string | null) => normalizeForMatch(s ?? "");
  const sinRelacion = google
    .filter((g) => {
      if (g.placeId?.startsWith("prop-")) return false;
      if (!(g.type === "colonia" || isLocalityInsideMunicipio(g))) return false;
      const gCore = coreName(g.name);
      return !propSuggestions.some(
        (d) => est(d.estado_nombre) === est(g.estado_nombre) && (coreName(d.name) === gCore || isSectionOf(d.name, g.name)),
      );
    })
    .slice(0, 4);
  if (sinRelacion.length === 0) return [];

  const respuestas = await Promise.all(
    sinRelacion.map(async (g) => {
      try {
        const { data, error } = await supabase.rpc("buscar_zonas_canonicas", {
          q: coreName(g.name),
          p_estado_usuario: g.estado_nombre ?? estadoUsuario ?? null,
          lim: 6,
          p_pais: country ?? null,
        });
        return !error && Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }),
  );

  const key = (n?: string | null, m?: string | null, e?: string | null) => `${coreName(n ?? "")}|${est(m)}|${est(e)}`;
  const vistos = new Set(propSuggestions.map((d) => key(d.name, d.municipio_nombre, d.estado_nombre)));
  const out: LocationSuggestionWithCount[] = [];
  for (const p of respuestas.flat() as any[]) {
    const k = key(p.nombre, p.municipio, p.estado);
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push({
      placeId: `prop-canon-${p.nombre}-${p.municipio}-${p.estado}`,
      name: p.nombre ?? "",
      secondaryText: [p.municipio, p.estado].filter(Boolean).join(", "),
      fullDescription: [p.nombre, p.municipio, p.estado].filter(Boolean).join(", "),
      type: "colonia",
      types: ["colonia"],
      municipio_nombre: p.municipio ?? undefined,
      estado_nombre: p.estado ?? undefined,
      propertyCount: Number(p.total_visibles) || 0,
      centroide:
        p.lat_centroide != null && p.lng_centroide != null
          ? { lat: Number(p.lat_centroide), lng: Number(p.lng_centroide) }
          : undefined,
    });
  }
  return out;
}

/** "Municipios" de Google que comparten nombre con una colonia de la BD y que la BD no prueba como municipio real:"""),
('R10-01', 'store/locationSearchStore.ts',
r"""            combined = mergeGoogleWithDb(combined, propSuggestions, dbRows, realMunis);""",
r"""            // REV10-01: nombre real de las colonias que arriba no se pudieron relacionar (ver fetchCanonicalZones).
            const canonItems = await fetchCanonicalZones(combined, propSuggestions, country, effectiveEstado);
            if (requestId !== get().latestSearchRequestId) return;
            combined = mergeGoogleWithDb(combined, [...propSuggestions, ...canonItems], dbRows, realMunis).filter(
              (s) => !s.placeId.startsWith("prop-canon-"),
            );"""),
('R10-01', 'store/locationSearchStore.ts',
r"""            combined = [...combined, ...propSuggestions];
          }
        }
      }
""",
r"""            combined = [...combined, ...propSuggestions];
          }
        } else if (dbMerge) {
          // REV10-01: la consulta de arriba no devolvio nada (p. ej. se escribio "Terranza Residence" y la BD solo
          // tiene "Terranza"). Igual se busca el nombre real de las colonias de Google (ver fetchCanonicalZones).
          const canonItems = await fetchCanonicalZones(combined, [], country, effectiveEstado);
          if (requestId !== get().latestSearchRequestId) return;
          if (canonItems.length > 0) {
            combined = mergeGoogleWithDb(combined, canonItems, [], new Set<string>()).filter(
              (s) => !s.placeId.startsWith("prop-canon-"),
            );
          }
        }
      }
"""),
('R10-07', 'services/legalService.ts',
r"""  /** Reporta un usuario, publicacion, reel, propiedad o chat. */""",
r"""  /** Fecha en que el asesor declaro haber informado a ese prospecto (version vigente del Acuerdo), o null. */
  async declaracionFecha(leadId: string, version: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("legal_consentimientos")
      .select("creado_en")
      .eq("tipo", "asesor_informo_prospecto")
      .eq("lead_id", String(leadId))
      .eq("accion", "aceptado")
      .eq("documento_version", version)
      .order("creado_en", { ascending: false })
      .limit(1);
    if (error) throw error;
    return data && data.length > 0 ? String(data[0].creado_en) : null;
  },

  /** Reporta un usuario, publicacion, reel, propiedad o chat. */"""),
('R10-07', 'components/map/filters/useSaveSearch.ts',
r"""  const createLeadRecord = async () => {""",
r"""  /** Fecha en que ya se declaro haber informado a este prospecto (si su telefono / email coincide con uno existente). */
  const declaracionPrevia = async (version: string): Promise<string | null> => {
    try {
      const existente = await buscarProspectoExistente();
      return existente ? await legalService.declaracionFecha(existente, version) : null;
    } catch {
      return null;
    }
  };

  const createLeadRecord = async () => {"""),
('R10-07', 'components/map/filters/useSaveSearch.ts',
r"""    handleSaveSearch,
    updateSearchInDatabase,
  };""",
r"""    handleSaveSearch,
    updateSearchInDatabase,
    declaracionPrevia,
  };"""),
('R10-07', 'components/map/SaveSearchModal.tsx',
r"""    handleSaveSearch,
  } = useSaveSearch(userId);""",
r"""    handleSaveSearch,
    declaracionPrevia,
  } = useSaveSearch(userId);"""),
('R10-07', 'components/map/SaveSearchModal.tsx',
r"""  const getFilterSummary = () => {""",
'  // Si el prospecto ya fue informado (mismo telefono / email), se muestra "Aviso informado el <fecha>" y no se pide de nuevo.\n  const [avisoFecha, setAvisoFecha] = useState<string | null>(null);\n  useEffect(() => {\n    setAvisoFecha(null);\n    if (!visible || !asesor?.requerido) return;\n    if (leadPhone.replace(/\\D/g, "").length < 8 && !leadEmail.includes("@")) return;\n    let activo = true;\n    const t = setTimeout(() => {\n      declaracionPrevia(asesor.version).then((f) => {\n        if (activo) setAvisoFecha(f);\n      });\n    }, 600);\n    return () => {\n      activo = false;\n      clearTimeout(t);\n    };\n  }, [visible, asesor?.requerido, asesor?.version, leadPhone, leadEmail]);\n\n  const getFilterSummary = () => {'),
('R10-07', 'components/map/SaveSearchModal.tsx',
r"""                  <TouchableOpacity
                    style={styles.privacyCheckRow}
                    activeOpacity={0.8}
                    onPress={() => setDeclaraProspecto(!declaraProspecto)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: declaraProspecto }}
                  >
                    <Ionicons
                      name={declaraProspecto ? "checkbox" : "square-outline"}
                      size={22}
                      color={COLORS.primary}
                    />
                    <Text style={styles.privacyCheckText}>{TEXTO_DECLARACION_PROSPECTO} *</Text>
                  </TouchableOpacity>
                  <Text style={styles.privacyText}>
                    Se pide una sola vez por prospecto: si ya la registraste para este prospecto, no hace falta marcarla de nuevo.
                  </Text>
                  {errors.legalDeclaracion && <Text style={styles.errorText}>{errors.legalDeclaracion}</Text>}
""",
r"""                  {avisoFecha ? (
                    <Text style={styles.privacyText}>
                      Aviso informado el {new Date(avisoFecha).toLocaleDateString("es-MX")}. No hace falta declararlo de nuevo
                      para este prospecto.
                    </Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.privacyCheckRow}
                        activeOpacity={0.8}
                        onPress={() => setDeclaraProspecto(!declaraProspecto)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: declaraProspecto }}
                      >
                        <Ionicons
                          name={declaraProspecto ? "checkbox" : "square-outline"}
                          size={22}
                          color={COLORS.primary}
                        />
                        <Text style={styles.privacyCheckText}>{TEXTO_DECLARACION_PROSPECTO} *</Text>
                      </TouchableOpacity>
                      <Text style={styles.privacyText}>
                        Se pide una sola vez por prospecto: si ya la registraste para este prospecto, no hace falta marcarla de nuevo.
                      </Text>
                      {errors.legalDeclaracion && <Text style={styles.errorText}>{errors.legalDeclaracion}</Text>}
                    </>
                  )}
"""),
('R10-04', 'hooks/matches/useUnseenMatchesCount.ts',
r"""  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", userId)
    .eq("activo", true)
    .neq("estado", "descartado")
    .is("visto_en", null);
  if (error) throw error;
  return count ?? 0;""",
r"""  // REV10-04: igual que la pantalla de Matches, no cuentan las coincidencias de propiedades que no comparten comision.
  const { data, error } = await supabase
    .from("matches")
    .select("id, propiedad:propiedades(created_by, comparte_comision, sin_comision)")
    .eq("usuario_id", userId)
    .eq("activo", true)
    .neq("estado", "descartado")
    .is("visto_en", null);
  if (error) throw error;
  return (data ?? []).filter((m: any) => {
    const p = Array.isArray(m.propiedad) ? m.propiedad[0] : m.propiedad;
    if (!p || p.created_by === userId) return true;
    return p.comparte_comision === true && !p.sin_comision;
  }).length;"""),
('R10-04', 'services/feedService.ts',
r"""        currentUserId,
        blockedUserIds,
      ).maybeSingle();
      return data ? mapPropertyToFeedItem(feedData, data, user) : null;""",
r"""        currentUserId,
        blockedUserIds,
        true,
      ).maybeSingle();
      return data ? mapPropertyToFeedItem(feedData, data, user) : null;"""),
('R10-04', 'components/Details/PropertyDetail.tsx',
r"""  const showStatusBadge =
    isClosedProperty || propertyStatus === "Reservada";
""",
r"""  const showStatusBadge =
    isClosedProperty || propertyStatus === "Reservada";
  // REV10-04: la ficha sigue abriendo por enlace o notificacion, pero si el dueno dejo de compartir comision
  // se avisa con una etiqueta. Solo se evalua si el dato llego (los datos en cache pueden no traerlo).
  const showNoDisponible =
    !isPropertyOwner &&
    !isClosedProperty &&
    propertyDetails.comparte_comision !== undefined &&
    (propertyDetails.comparte_comision !== true ||
      propertyDetails.sin_comision === true);
"""),
('R10-04', 'components/Details/PropertyDetail.tsx',
r"""                    {propertyStatus}
                  </Text>
                </View>
              )}
""",
r"""                    {propertyStatus}
                  </Text>
                </View>
              )}
              {showNoDisponible && (
                <View
                  style={[
                    styles.typeTag,
                    { backgroundColor: COLORS.errorLight },
                  ]}
                >
                  <Text
                    style={[styles.typeTagText, { color: COLORS.errorDark }]}
                  >
                    No disponible
                  </Text>
                </View>
              )}
"""),
]

# (id, ruta, hash_del_original_o_None, contenido_nuevo)
FILES = [
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
