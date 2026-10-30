#!/usr/bin/env python3
"""
apply_app_legal_2.py - parche de la APP, iteracion 10 (se aplica DESPUES de apply_app_legal.py / commit 4049760).
  LEG-11  REV10-08  scroll del popup de documentos legales desde el primer arrastre; el Acuerdo (doc 08) aparece en la lista
  LEG-12  REV10-06  "Reportar usuario" debajo de Recomendar / No recomendar
  LEG-13  REV10-02  historial: una sola entrada al elegir una zona en el buscador del feed
  LEG-14  REV10-07  Guardar busqueda: el prospecto se reutiliza (no se duplica); el asesor acepta el Acuerdo de Tratamiento
                    de Datos (una vez) y declara que informo a su prospecto (una vez por prospecto); se quitan las casillas
                    anteriores (aviso / compartir con asesores) que grababan "rechazado" sin que nadie lo decidiera.

REQUIERE: 13_legal_asesor.sql ya ejecutado en Supabase (si no, la app NO exige nada nuevo y todo sigue como antes).

USO (desde la raiz del repo):
    python3 apply_app_legal_2.py src --dry-run
    python3 apply_app_legal_2.py src

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
('LEG-11', 'components/legal/LegalDocumentsModal.tsx',
r"""  { codigo: "comunicaciones", titulo: "Autorizaci@@u00f3@@n y Preferencias de Contacto", url: LEGAL_URLS.communications, icon: "mail-outline" },
];""",
r"""  { codigo: "comunicaciones", titulo: "Autorizaci@@u00f3@@n y Preferencias de Contacto", url: LEGAL_URLS.communications, icon: "mail-outline" },
  { codigo: "acuerdo_datos_profesionales", titulo: "Acuerdo de Tratamiento de Datos", url: LEGAL_URLS.professionalDataAgreement, icon: "briefcase-outline" },
];"""),
('LEG-11', 'components/legal/LegalDocumentsModal.tsx',
r"""      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={true}>
""",
r"""      {/* REV10-08: la tarjeta del Modal es un Pressable que captura el toque; esta vista reclama el gesto
          primero para que el ScrollView arranque desde el primer arrastre. Las filas tocables siguen funcionando. */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.scrollInner} onStartShouldSetResponder={() => true}>
"""),
('LEG-11', 'components/legal/LegalDocumentsModal.tsx',
r"""        )}
      </ScrollView>
    </Modal>""",
r"""        )}
        </View>
      </ScrollView>
    </Modal>"""),
('LEG-11', 'components/legal/LegalDocumentsModal.tsx',
r"""  content: { paddingHorizontal: 4, paddingBottom: 16, gap: 10 },
""",
r"""  content: { paddingHorizontal: 4, paddingBottom: 16, gap: 10 },
  scrollInner: { gap: 10 },
"""),
('LEG-11', 'constants/legal.ts',
r"""  privacySimplified: "https://www.ilyrox.com/privacy-simplified",
""",
r"""  privacySimplified: "https://www.ilyrox.com/privacy-simplified",
  professionalDataAgreement: "https://www.ilyrox.com/legal/acuerdo-tratamiento-datos",
"""),
('LEG-12', 'components/Profile/ProfileInfoHeader.tsx',
r"""            {!!onReport && (
              <SafePressable
                style={styles.reportLink}
                onPress={onReport}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Reportar usuario"
              >
                <Ionicons name="flag-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.reportLinkText}>Reportar usuario</Text>
              </SafePressable>
            )}
            {isBlocked && (
              <Text style={styles.blockedHint}>
                Dejaste de ver las propiedades de este usuario.
              </Text>
            )}
            {onRecommend && !isBlocked && (
              <View style={styles.recommendRow}>
                <SafePressable
                  style={[
                    styles.recommendBtn,
                    isRecommended === true && styles.recommendBtnActive,
                  ]}
                  onPress={() => onRecommend(true)}
                  disabled={submittingRecommendation}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      isRecommended === true ? "thumbs-up" : "thumbs-up-outline"
                    }
                    size={16}
                    color={isRecommended === true ? COLORS.white : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.recommendBtnText,
                      isRecommended === true && styles.recommendBtnTextActive,
                    ]}
                  >
                    {isRecommended === true ? "Recomendado" : "Recomendar"}
                  </Text>
                </SafePressable>
                <SafePressable
                  style={[
                    styles.recommendBtn,
                    styles.notRecommendBtn,
                    isRecommended === false && styles.notRecommendBtnActive,
                  ]}
                  onPress={() => onRecommend(false)}
                  disabled={submittingRecommendation}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      isRecommended === false
                        ? "thumbs-down"
                        : "thumbs-down-outline"
                    }
                    size={16}
                    color={isRecommended === false ? COLORS.white : COLORS.error}
                  />
                  <Text
                    style={[
                      styles.recommendBtnText,
                      styles.notRecommendBtnText,
                      isRecommended === false && styles.recommendBtnTextActive,
                    ]}
                  >
                    {isRecommended === false ? "No recomendado" : "No recomendar"}
                  </Text>
                </SafePressable>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.ratingSection}>""",
r"""            {isBlocked && (
              <Text style={styles.blockedHint}>
                Dejaste de ver las propiedades de este usuario.
              </Text>
            )}
            {onRecommend && !isBlocked && (
              <View style={styles.recommendRow}>
                <SafePressable
                  style={[
                    styles.recommendBtn,
                    isRecommended === true && styles.recommendBtnActive,
                  ]}
                  onPress={() => onRecommend(true)}
                  disabled={submittingRecommendation}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      isRecommended === true ? "thumbs-up" : "thumbs-up-outline"
                    }
                    size={16}
                    color={isRecommended === true ? COLORS.white : COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.recommendBtnText,
                      isRecommended === true && styles.recommendBtnTextActive,
                    ]}
                  >
                    {isRecommended === true ? "Recomendado" : "Recomendar"}
                  </Text>
                </SafePressable>
                <SafePressable
                  style={[
                    styles.recommendBtn,
                    styles.notRecommendBtn,
                    isRecommended === false && styles.notRecommendBtnActive,
                  ]}
                  onPress={() => onRecommend(false)}
                  disabled={submittingRecommendation}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      isRecommended === false
                        ? "thumbs-down"
                        : "thumbs-down-outline"
                    }
                    size={16}
                    color={isRecommended === false ? COLORS.white : COLORS.error}
                  />
                  <Text
                    style={[
                      styles.recommendBtnText,
                      styles.notRecommendBtnText,
                      isRecommended === false && styles.recommendBtnTextActive,
                    ]}
                  >
                    {isRecommended === false ? "No recomendado" : "No recomendar"}
                  </Text>
                </SafePressable>
              </View>
            )}
            {!!onReport && (
              <SafePressable
                style={styles.reportLink}
                onPress={onReport}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Reportar usuario"
              >
                <Ionicons name="flag-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.reportLinkText}>Reportar usuario</Text>
              </SafePressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.ratingSection}>"""),
('LEG-13', 'store/searchStore.ts',
r"""    const municipio = resultData.municipio || '';
    const colonia = resultData.type === 'colonia' ? (resultData.name || '') : '';
    const placeName = resultData.name || '';
    const now = new Date().toISOString();
    const tempId = `temp_result_${Date.now()}`;""",
r"""    // REV10-02: una sugerencia de tipo municipio trae el nombre en `name`, no en `municipio`.
    const municipio = resultData.municipio || (resultData.type === 'municipio' ? (resultData.name || '') : '');
    const colonia = resultData.type === 'colonia' ? (resultData.name || '') : '';
    const placeName = resultData.name || '';
    const now = new Date().toISOString();
    const tempId = `temp_result_${Date.now()}`;"""),
('LEG-13', 'store/searchStore.ts',
r"""    queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });

    set({ isUpdating: false });
  },

  updateSearchWithFilters:""",
r"""    queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });

    // REV10-02: para una zona, esta fila ES la entrada del historial. Se deja como busqueda actual para que el mapa
    // la complete con el chip (actualizacion de filtros) en lugar de insertar una segunda fila.
    if (resultData.tipo === TIPO_BUSQUEDA.UBICACION) {
      set({ currentSearchId: data.id });
    }

    set({ isUpdating: false });
  },

  updateSearchWithFilters:"""),
('LEG-14', 'services/legalService.ts',
r"""  | "seguridad_infantil"
  | "comunicaciones";
""",
r"""  | "seguridad_infantil"
  | "comunicaciones"
  | "acuerdo_datos_profesionales";
"""),
('LEG-14', 'services/legalService.ts',
r"""  | "prospecto_aviso"
  | "prospecto_compartir_asesores";
""",
r"""  | "prospecto_aviso"
  | "prospecto_compartir_asesores"
  | "acuerdo_datos_profesionales"
  | "asesor_informo_prospecto";
"""),
('LEG-14', 'services/legalService.ts',
r"""const cacheDocs = new Map<string, LegalDocumento>();""",
r"""/** Textos de la casilla del asesor en "Guardar busqueda" (tambien se guardan en la evidencia). */
export const TEXTO_ACEPTA_ACUERDO = "Acepto el Acuerdo de Tratamiento de Datos para Profesionales e Instructores";
export const TEXTO_DECLARACION_PROSPECTO =
  "Declaro que ya inform@@u00e9@@ a mi prospecto sobre el tratamiento de sus datos personales y su aviso de privacidad, y entiendo que soy responsable de ello conforme al Acuerdo de Tratamiento de Datos.";

export interface EstadoAsesor {
  /** false si la BD aun no tiene el Acuerdo publicado (SQL 13): entonces no se exige nada. */
  requerido: boolean;
  version: string;
  aceptado: boolean;
  fecha: string | null;
}

const cacheDocs = new Map<string, LegalDocumento>();"""),
('LEG-14', 'services/legalService.ts',
r"""  /** Reporta un usuario, publicacion, reel, propiedad o chat. */""",
r"""  /** Estado del Acuerdo de Tratamiento de Datos (doc 08) para el asesor autenticado. */
  async estadoAsesor(): Promise<EstadoAsesor> {
    const lista = await legalService.listarDocumentos();
    const ac = lista.find((d) => d.codigo === "acuerdo_datos_profesionales");
    if (!ac) return { requerido: false, version: "", aceptado: false, fecha: null };
    const estado = await legalService.estadoUsuario();
    const e = estado["acuerdo_datos_profesionales"];
    return {
      requerido: true,
      version: ac.version,
      aceptado: !!e && e.accion === "aceptado" && e.version === ac.version,
      fecha: e?.fecha ?? null,
    };
  },

  /** true si el asesor ya declaro haber informado a ese prospecto (version vigente del Acuerdo). */
  async declaracionRegistrada(leadId: string, version: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("legal_consentimientos")
      .select("id")
      .eq("tipo", "asesor_informo_prospecto")
      .eq("lead_id", String(leadId))
      .eq("accion", "aceptado")
      .eq("documento_version", version)
      .limit(1);
    if (error) throw error;
    return !!data && data.length > 0;
  },

  /** Reporta un usuario, publicacion, reel, propiedad o chat. */"""),
('LEG-14', 'components/map/filters/useSaveSearch.ts',
r"""import { legalService } from "../../../services/legalService";""",
r"""import { legalService, ConsentItem, TEXTO_DECLARACION_PROSPECTO } from "../../../services/legalService";"""),
('LEG-14', 'components/map/filters/useSaveSearch.ts',
r"""  const createLeadRecord = async () => {
""",
'  // REV10-07: el mismo prospecto del mismo asesor (por telefono o email) se reutiliza; no se duplica en cada guardado.\n  const buscarProspectoExistente = async (): Promise<string | null> => {\n    if (!userId) return null;\n    const telefonos = Array.from(new Set([leadPhone.trim(), leadPhone.replace(/\\D/g, "")].filter(Boolean)));\n    if (telefonos.length > 0) {\n      const { data, error } = await supabase\n        .from("leads")\n        .select("id")\n        .eq("usuario_id", userId)\n        .eq("activo", true)\n        .in("telefono", telefonos)\n        .limit(1);\n      if (error) throw error;\n      if (data && data.length > 0) return String(data[0].id);\n    }\n    if (leadEmail.trim()) {\n      const { data, error } = await supabase\n        .from("leads")\n        .select("id")\n        .eq("usuario_id", userId)\n        .eq("activo", true)\n        .eq("email", leadEmail.trim())\n        .limit(1);\n      if (error) throw error;\n      if (data && data.length > 0) return String(data[0].id);\n    }\n    return null;\n  };\n\n  const createLeadRecord = async () => {\n'),
('LEG-14', 'components/map/filters/useSaveSearch.ts',
r"""    legal?: { avisoConfirmado: boolean; compartirAsesores: boolean },
""",
r"""    legal?: { aceptaAcuerdo: boolean; declaraProspecto: boolean },
"""),
('LEG-14', 'components/map/filters/useSaveSearch.ts',
r"""      if (createLead) {
        leadId = await createLeadRecord();
        if (leadId) {
          // Evidencia: aviso de privacidad mostrado/confirmado y elecci@@u00f3@@n de compartir con asesores.
          // Si falla no se bloquea el guardado de la b@@u00fa@@squeda.
          try {
            await legalService.registrarConsentimientos(
              [
                {
                  tipo: "prospecto_aviso",
                  lead_id: String(leadId),
                  accion: legal?.avisoConfirmado ? "aceptado" : "rechazado",
                },
                {
                  tipo: "prospecto_compartir_asesores",
                  lead_id: String(leadId),
                  accion: legal?.compartirAsesores ? "aceptado" : "rechazado",
                },
              ],
              "formulario_lead",
              { formulario: "busqueda_guardada" },
            );
          } catch {
            // silencioso a prop@@u00f3@@sito
          }
        }
      }
""",
r"""      if (createLead) {
        // REV10-07: el prospecto lo carga el asesor, que es el responsable de esos datos (Acuerdo de Tratamiento de
        // Datos, doc 08). Se exige UNA vez la aceptacion del Acuerdo y UNA vez por prospecto la declaracion de que lo
        // informo; ambas quedan como evidencia. Si la BD aun no tiene el Acuerdo publicado, no se exige nada.
        const asesor = await legalService.estadoAsesor();
        const existente = await buscarProspectoExistente();
        const acuerdoPendiente = asesor.requerido && !asesor.aceptado;
        const declaracionPendiente =
          asesor.requerido && !(existente && (await legalService.declaracionRegistrada(existente, asesor.version)));

        const legalErrors: { [key: string]: string } = {};
        if (acuerdoPendiente && !legal?.aceptaAcuerdo) {
          legalErrors.legalAcuerdo = "Debes aceptar el Acuerdo de Tratamiento de Datos para guardar un prospecto";
        }
        if (declaracionPendiente && !legal?.declaraProspecto) {
          legalErrors.legalDeclaracion = "Debes confirmar que informaste a tu prospecto";
        }
        if (Object.keys(legalErrors).length > 0) {
          setErrors((prev: { [key: string]: string }) => ({ ...prev, ...legalErrors }));
          return { success: false };
        }

        leadId = existente ?? (await createLeadRecord());

        if (leadId && asesor.requerido) {
          const items: ConsentItem[] = [];
          if (acuerdoPendiente) items.push({ tipo: "acuerdo_datos_profesionales" });
          if (declaracionPendiente) {
            items.push({
              tipo: "asesor_informo_prospecto",
              lead_id: String(leadId),
              contexto: { texto_declaracion: TEXTO_DECLARACION_PROSPECTO, prospecto_reutilizado: !!existente },
            });
          }
          if (items.length > 0) {
            try {
              await legalService.registrarConsentimientos(items, "guardar_busqueda", { formulario: "busqueda_guardada" });
            } catch {
              showToast("No pudimos registrar tu declaraci@@u00f3@@n. Revisa tu conexi@@u00f3@@n e int@@u00e9@@ntalo de nuevo.", "error");
              return { success: false };
            }
          }
        }
      }
"""),
('LEG-14', 'components/map/SaveSearchModal.tsx',
r"""import { LegalDocumentsModal } from "@/components/legal/LegalDocumentsModal";
""",
r"""import { LegalDocumentsModal } from "@/components/legal/LegalDocumentsModal";
import {
  legalService,
  LegalCodigo,
  EstadoAsesor,
  TEXTO_ACEPTA_ACUERDO,
  TEXTO_DECLARACION_PROSPECTO,
} from "@/services/legalService";
"""),
('LEG-14', 'components/map/SaveSearchModal.tsx',
r"""  // Aviso de privacidad del prospecto: se muestra ANTES de guardar sus datos.
  // Las dos casillas son opcionales, NO vienen marcadas y NO bloquean el guardado (solo dejan evidencia).
  const [avisoConfirmado, setAvisoConfirmado] = useState(false);
  const [compartirAsesores, setCompartirAsesores] = useState(false);
  const [showAviso, setShowAviso] = useState(false);
  useEffect(() => {
    if (!visible) {
      setAvisoConfirmado(false);
      setCompartirAsesores(false);
    }
  }, [visible]);
""",
r"""  // REV10-07: el prospecto lo carga el asesor (responsable de esos datos). Se pide UNA vez el Acuerdo de Tratamiento de
  // Datos y, por prospecto, la declaracion de que lo informo. Las casillas NO vienen marcadas.
  const [aceptaAcuerdo, setAceptaAcuerdo] = useState(false);
  const [declaraProspecto, setDeclaraProspecto] = useState(false);
  const [asesor, setAsesor] = useState<EstadoAsesor | null>(null);
  const [asesorFallo, setAsesorFallo] = useState(false);
  const [docVisible, setDocVisible] = useState<LegalCodigo | null>(null);
  const cargarAsesor = React.useCallback(() => {
    setAsesorFallo(false);
    legalService
      .estadoAsesor()
      .then((e) => setAsesor(e))
      .catch(() => {
        setAsesor(null);
        setAsesorFallo(true);
      });
  }, []);
  useEffect(() => {
    if (!visible) {
      setAceptaAcuerdo(false);
      setDeclaraProspecto(false);
      return;
    }
    cargarAsesor();
  }, [visible, cargarAsesor]);
"""),
('LEG-14', 'components/map/SaveSearchModal.tsx',
r"""    const result = await handleSaveSearch(filters, onClose, { avisoConfirmado, compartirAsesores });""",
r"""    const result = await handleSaveSearch(filters, onClose, { aceptaAcuerdo, declaraProspecto });"""),
('LEG-14', 'components/map/SaveSearchModal.tsx',
r"""            <View style={styles.privacyBox}>
              <Text style={styles.privacyTitle}>Aviso de privacidad del prospecto</Text>
              <Text style={styles.privacyText}>
                Los datos del prospecto (nombre, tel@@u00e9@@fono y email) se usan para dar seguimiento a esta
                b@@u00fa@@squeda dentro de ILYROX. Antes de guardarlos, inf@@u00f3@@rmale c@@u00f3@@mo se tratan sus datos. No se
                le agregar@@u00e1@@ a campa@@u00f1@@as ni listas de promociones sin su autorizaci@@u00f3@@n espec@@u00ed@@fica.
              </Text>
              <Text style={styles.privacyLink} onPress={() => setShowAviso(true)}>
                Ver Pol@@u00ed@@tica de Privacidad
              </Text>
              <TouchableOpacity
                style={styles.privacyCheckRow}
                activeOpacity={0.8}
                onPress={() => setAvisoConfirmado(!avisoConfirmado)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: avisoConfirmado }}
              >
                <Ionicons
                  name={avisoConfirmado ? "checkbox" : "square-outline"}
                  size={22}
                  color={COLORS.primary}
                />
                <Text style={styles.privacyCheckText}>
                  (Opcional) Inform@@u00e9@@ al prospecto del aviso de privacidad
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.privacyCheckRow}
                activeOpacity={0.8}
                onPress={() => setCompartirAsesores(!compartirAsesores)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: compartirAsesores }}
              >
                <Ionicons
                  name={compartirAsesores ? "checkbox" : "square-outline"}
                  size={22}
                  color={COLORS.primary}
                />
                <Text style={styles.privacyCheckText}>
                  (Opcional) El prospecto autoriza que sus datos se compartan con uno o m@@u00e1@@s asesores
                </Text>
              </TouchableOpacity>
            </View>

            <LegalDocumentsModal
              visible={showAviso}
              initialCodigo="privacidad"
              onClose={() => setShowAviso(false)}
            />

""",
r"""            <View style={styles.privacyBox}>
              <Text style={styles.privacyTitle}>Datos del prospecto</Text>
              <Text style={styles.privacyText}>
                Cuando un Profesional utilice el CRM para administrar datos de sus propios clientes, deber@@u00e1@@ haber
                cumplido sus obligaciones de informaci@@u00f3@@n y contar con base jur@@u00ed@@dica suficiente.
              </Text>
              <Text style={styles.privacyLink} onPress={() => setDocVisible("privacidad")}>
                Ver Pol@@u00ed@@tica de Privacidad
              </Text>

              {asesorFallo && (
                <Text style={styles.privacyLink} onPress={cargarAsesor}>
                  No pudimos verificar tu Acuerdo de Tratamiento de Datos. Toca para reintentar.
                </Text>
              )}

              {asesor?.requerido && (
                <>
                  {asesor.aceptado ? (
                    <Text style={styles.privacyText}>
                      Acuerdo de Tratamiento de Datos aceptado (v{asesor.version}).{" "}
                      <Text style={styles.privacyLink} onPress={() => setDocVisible("acuerdo_datos_profesionales")}>
                        Ver Acuerdo
                      </Text>
                    </Text>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.privacyCheckRow}
                        activeOpacity={0.8}
                        onPress={() => setAceptaAcuerdo(!aceptaAcuerdo)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: aceptaAcuerdo }}
                      >
                        <Ionicons
                          name={aceptaAcuerdo ? "checkbox" : "square-outline"}
                          size={22}
                          color={COLORS.primary}
                        />
                        <Text style={styles.privacyCheckText}>{TEXTO_ACEPTA_ACUERDO} *</Text>
                      </TouchableOpacity>
                      <Text style={styles.privacyLink} onPress={() => setDocVisible("acuerdo_datos_profesionales")}>
                        Ver Acuerdo de Tratamiento de Datos
                      </Text>
                      {errors.legalAcuerdo && <Text style={styles.errorText}>{errors.legalAcuerdo}</Text>}
                    </>
                  )}

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
            </View>

            <LegalDocumentsModal
              visible={docVisible !== null}
              initialCodigo={docVisible}
              onClose={() => setDocVisible(null)}
            />

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
