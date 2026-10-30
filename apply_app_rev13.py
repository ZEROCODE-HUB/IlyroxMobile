#!/usr/bin/env python3
"""
apply_app_rev13.py - parche de la APP, iteracion 12. Se aplica DESPUES de apply_app_rev12.py.
  R13-01  Filtros: lo que el tipo/subtipo no muestra (recamaras, banos, estacionamientos, niveles... en un Terreno) ya no
          filtra ni se guarda. "Terreno" deja de dar 0 resultados; el post de busqueda ya no conserva "2 recamaras" ocultas.
  R13-02  Busqueda guardada en pesos se guardaba como USD (moneda por simbolo "$"). Ahora se busca por codigo.
  R13-03  Editar una propiedad sin niveles guardados ya no muestra "1" por defecto.
  R13-04  Sin comision != Suspendida: queda Publicada, oculta para los demas, etiqueta "Sin comision", no se hunde en la
          lista, y al agregar comision y guardar se publica sola.
  R13-05  Open House recien creado: si se sale sin guardar, el borrador se elimina (ya no aparece en Posts).
  R13-06  Open House: el termino ya no se queda atras del inicio (se recorre) y el selector de termino parte de una fecha valida.
  R13-07  Registro: el formulario (sin contrasenas) se recupera si la app se cierra al ir a la camara; tras registrarse se
          vuelve a pedir el perfil final.
  R13-09  Reportes de propiedad: el que reporto puede eliminar su reporte; el dueno ve un aviso amarillo con el motivo;
          (la limpieza al corregir la ubicacion la hace la base de datos: ver SQL 19).
  R13-10  Inicio de sesion: el correo se limpia (espacios/mayusculas), mensaje claro (incluye sin conexion) y traza en
          debug_logs (contexto login_trace, sin correo) para ubicar el cierre de la app que ocurre al fallar el inicio de sesion.
  R13-11  Se oculta "Promociones y novedades"; las estadisticas no cuentan propiedades ocultas; Matches no recarga por cambios
          del objeto usuario y su boton atras tiene salida segura; el post de busqueda editado no conserva campos ocultos.
  R13-08  Perfil inexistente: cierra la sesion local en vez de dejar la pantalla de carga infinita.

USO (desde la raiz del repo):
    python apply_app_rev13.py src --dry-run
    python apply_app_rev13.py src

Reglas: ancla exacta (debe aparecer 1 vez, si no ABORTA sin escribir nada), respeta CRLF/LF y BOM, idempotente, solo ASCII.
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
('R13-01', 'store/propertyFiltersStore.ts',
r"""import type { CountryCode } from "@/lib/location/types";
""",
r"""import type { CountryCode } from "@/lib/location/types";
import { sanitizeFiltersByTipo } from "@/utils/filterVisibility";
"""),
('R13-01', 'store/propertyFiltersStore.ts',
r"""    updateFilter: (key, value) =>
      set((state) => ({
        filters: { ...state.filters, [key]: value },
      })),

    updateFilters: (partial) =>
      set((state) => ({
        filters: { ...state.filters, ...partial },
      })),
""",
r"""    // REV13-01: al cambiar tipo/subtipo se vacian los campos que ya no aplican (ver utils/filterVisibility.ts).
    updateFilter: (key, value) =>
      set((state) => ({
        filters: sanitizeFiltersByTipo({ ...state.filters, [key]: value } as PropertyFilters),
      })),

    updateFilters: (partial) =>
      set((state) => ({
        filters: sanitizeFiltersByTipo({ ...state.filters, ...partial } as PropertyFilters),
      })),
"""),
('R13-01', 'utils/mapServerFilters.ts',
r"""import { MapServerFilters } from "@/hooks/useMapProperties";
""",
r"""import { MapServerFilters } from "@/hooks/useMapProperties";
import { sanitizeFiltersByTipo } from "@/utils/filterVisibility";
"""),
('R13-01', 'utils/mapServerFilters.ts',
r"""export function extractServerFilters(filters: StoreFilters): MapServerFilters {
  const f: MapServerFilters = {};
""",
r"""export function extractServerFilters(rawFilters: StoreFilters): MapServerFilters {
  // REV13-01: lo que el tipo/subtipo no muestra (recamaras en un terreno...) no se manda al servidor.
  const filters = sanitizeFiltersByTipo(rawFilters);
  const f: MapServerFilters = {};
"""),
('R13-01', 'hooks/usePropertyFilters.ts',
r"""import { useMemo, useEffect, useRef } from "react";
""",
r"""import { useMemo, useEffect, useRef } from "react";
import { sanitizeFiltersByTipo } from "@/utils/filterVisibility";
"""),
('R13-01', 'hooks/usePropertyFilters.ts',
r"""  const filters = usePropertyFiltersStore(useShallow((s) => s.filters));
""",
r"""  const rawFilters = usePropertyFiltersStore(useShallow((s) => s.filters));
  // REV13-01: los campos que el tipo/subtipo no muestra no filtran (un terreno no tiene recamaras).
  const filters = useMemo(() => sanitizeFiltersByTipo(rawFilters), [rawFilters]);
"""),
('R13-01', 'components/map/filters/useSaveSearch.ts',
r"""import { buildLocationCriteria } from "@/utils/locationMatch";
""",
r"""import { buildLocationCriteria } from "@/utils/locationMatch";
import { sanitizeFiltersByTipo } from "@/utils/filterVisibility";
"""),
('R13-01', 'components/map/filters/useSaveSearch.ts',
r"""  const buildSearchPostMetadata = (filters: any) => {
""",
r"""  const buildSearchPostMetadata = (filtersRaw: any) => {
    const filters = sanitizeFiltersByTipo(filtersRaw);
"""),
('R13-01', 'components/map/filters/useSaveSearch.ts',
r"""  const saveSearchToDatabase = async (filters: any, leadId: string | null) => {
""",
r"""  const saveSearchToDatabase = async (filtersRaw: any, leadId: string | null) => {
    const filters = sanitizeFiltersByTipo(filtersRaw);
"""),
('R13-01', 'components/map/filters/useSaveSearch.ts',
r"""  const updateSearchInDatabase = async (busquedaId: string, filters: any): Promise<boolean> => {
""",
r"""  const updateSearchInDatabase = async (busquedaId: string, filtersRaw: any): Promise<boolean> => {
    const filters = sanitizeFiltersByTipo(filtersRaw);
"""),
('R13-02', 'components/map/filters/useSaveSearch.ts',
r"""      const { data: monedaData, error: monedaError } = await supabase
        .from("configuracion_monedas")
        .select("codigo")
        .eq("simbolo", filters.moneda === "MXN" ? "$" : "USD")
        .eq("activa", true)
        .single();
""",
r"""      // REV13-02: se busca por CODIGO (MXN/USD). Por simbolo, "$" tambien lo usa el dolar y una busqueda en pesos se
      // guardaba como USD (el matching comparaba 4.5-6.1 M como dolares y casi nada coincidia).
      const { data: monedaData, error: monedaError } = await supabase
        .from("configuracion_monedas")
        .select("codigo")
        .eq("codigo", filters.moneda)
        .eq("activa", true)
        .maybeSingle();
"""),
('R13-02', 'components/map/filters/useSaveSearch.ts',
r"""      const { data: monedaData } = await supabase
        .from("configuracion_monedas")
        .select("codigo")
        .eq("simbolo", filters.moneda === "MXN" ? "$" : "USD")
        .eq("activa", true)
        .single();
""",
r"""      const { data: monedaData } = await supabase
        .from("configuracion_monedas")
        .select("codigo")
        .eq("codigo", filters.moneda)
        .eq("activa", true)
        .maybeSingle();
"""),
('R13-01', 'components/map/PublishSearchPostModal.tsx',
r"""        caracteristicas: {
          ...initialMetadata.filtros?.caracteristicas,
          habitaciones: parseNum(habitaciones) ?? initialMetadata.filtros?.caracteristicas?.habitaciones,
          banos: parseNum(banos) ?? initialMetadata.filtros?.caracteristicas?.banos,
          medios_banos: parseNum(mediosBanos) ?? initialMetadata.filtros?.caracteristicas?.medios_banos,
          estacionamientos: parseNum(estacionamientos) ?? initialMetadata.filtros?.caracteristicas?.estacionamientos,
          niveles: parseNum(niveles) ?? initialMetadata.filtros?.caracteristicas?.niveles,
          antiguedad: antiguedad || initialMetadata.filtros?.caracteristicas?.antiguedad,
        },
        superficies: {
          ...initialMetadata.filtros?.superficies,
          m2_terreno_min: parseNum(m2Terreno) ?? initialMetadata.filtros?.superficies?.m2_terreno_min ?? 0,
          m2_construccion_min: parseNum(m2Construccion) ?? initialMetadata.filtros?.superficies?.m2_construccion_min ?? 0,
""",
r"""        // REV13-01: un campo que este tipo/subtipo no muestra NO conserva el valor de una busqueda anterior
        // (antes un local comercial quedaba con "2 recamaras" que no se podia quitar).
        caracteristicas: {
          ...initialMetadata.filtros?.caracteristicas,
          habitaciones: camposVisibles.recamaras ? (parseNum(habitaciones) ?? initialMetadata.filtros?.caracteristicas?.habitaciones) : undefined,
          banos: camposVisibles.banos ? (parseNum(banos) ?? initialMetadata.filtros?.caracteristicas?.banos) : undefined,
          medios_banos: camposVisibles.mediosBanos ? (parseNum(mediosBanos) ?? initialMetadata.filtros?.caracteristicas?.medios_banos) : undefined,
          estacionamientos: camposVisibles.estacionamientos ? (parseNum(estacionamientos) ?? initialMetadata.filtros?.caracteristicas?.estacionamientos) : undefined,
          niveles: camposVisibles.niveles ? (parseNum(niveles) ?? initialMetadata.filtros?.caracteristicas?.niveles) : undefined,
          antiguedad: camposVisibles.antiguedad ? (antiguedad || initialMetadata.filtros?.caracteristicas?.antiguedad) : undefined,
        },
        superficies: {
          ...initialMetadata.filtros?.superficies,
          m2_terreno_min: camposVisibles.m2Terreno ? (parseNum(m2Terreno) ?? initialMetadata.filtros?.superficies?.m2_terreno_min ?? 0) : 0,
          m2_construccion_min: camposVisibles.m2Construccion ? (parseNum(m2Construccion) ?? initialMetadata.filtros?.superficies?.m2_construccion_min ?? 0) : 0,
"""),
('R13-03', 'components/CreateContent/CreateProperty/usePropertyForm.ts',
r"""      payload.niveles = data.pisos?.toString() || "1";
""",
r"""      // REV13-03: si la propiedad no tiene niveles guardados, el campo se muestra vacio (antes mostraba "1" aunque la BD
      // no tuviera nada).
      payload.niveles = data.pisos?.toString() || "";
"""),
('R13-04', 'components/CreateContent/CreateProperty/usePropertyForm.ts',
r"""      payload.status = data.status || "Publicada";
      payload.sinComision = data.sin_comision ?? false;
      payload.originalStatus = data.status || "Publicada";
""",
r"""      // REV13-04: una propiedad sin comision ya no se "suspende": queda Publicada y oculta para los demas
      // (activo = false) hasta que se configure la comision. Las que quedaron Suspendidas automaticamente por ese
      // motivo (importadas de EasyBroker) se muestran como Publicada al editar; al guardar con comision se publican.
      // Las que Tokko dejo de mandar (tienen tokkobroker_id) conservan su estado.
      const suspendidaPorComision =
        data.sin_comision === true && data.status === "Suspendida" && !data.tokkobroker_id;
      payload.status = suspendidaPorComision ? "Publicada" : (data.status || "Publicada");
      payload.sinComision = data.sin_comision ?? false;
      payload.originalStatus = data.status || "Publicada";
"""),
('R13-04', 'components/CreateContent/CreateProperty/usePropertyForm.ts',
r"""    return PROPERTY_STATUS.filter((option) => {
      if (state.sinComision && option === "Publicada") return false;
      if (state.tipoOperacion === "venta") return option !== "Rentada";
      if (state.tipoOperacion === "renta") return option !== "Vendida";
      return true;
    });
  }, [state.tipoOperacion, state.sinComision]);
""",
r"""    return PROPERTY_STATUS.filter((option) => {
      if (state.tipoOperacion === "venta") return option !== "Rentada";
      if (state.tipoOperacion === "renta") return option !== "Vendida";
      return true;
    });
  }, [state.tipoOperacion]);
"""),
('R13-04', 'components/CreateContent/CreateProperty/usePublishProperty.ts',
r"""          status: sinComision ? "Suspendida" : form.status,
""",
r"""          // REV13-04: sin comision NO suspende: queda Publicada pero oculta (activo = false) hasta que haya comision.
          status: form.status,
"""),
('R13-04', 'components/CreateContent/CreateProperty/index.tsx',
r"""Esta propiedad est@@u00e1@@ Suspendida porque no tiene comisi@@u00f3@@n configurada en EasyBroker. Completa la secci@@u00f3@@n de Comisi@@u00f3@@n para publicarla.""",
r"""Esta propiedad no tiene comisi@@u00f3@@n configurada, por eso solo t@@u00fa@@ la ves. Completa la secci@@u00f3@@n de Comisi@@u00f3@@n y gu@@u00e1@@rdala: se publicar@@u00e1@@ autom@@u00e1@@ticamente."""),
('R13-04', 'components/Profile/ProfilePropertyItem.tsx',
r"""        ) : item.status === "Suspendida" ? (
""",
r"""        ) : item.status === "Suspendida" && !item.sin_comision ? (
"""),
('R13-04', 'components/Profile/Profile.tsx',
r"""      const INACTIVE_STATUSES = ["Vendida", "Suspendida", "Reservada", "Rentada"];
      const active = properties.filter(
        (p) => !INACTIVE_STATUSES.includes(p.status),
      );
      const inactive = properties.filter((p) =>
        INACTIVE_STATUSES.includes(p.status),
      );
""",
r"""      const INACTIVE_STATUSES = ["Vendida", "Suspendida", "Reservada", "Rentada"];
      // REV13-04: una propiedad sin comision no se hunde al final de la lista (no esta suspendida).
      const esInactiva = (p: Property) =>
        INACTIVE_STATUSES.includes(p.status) &&
        !(p.status === "Suspendida" && p.sin_comision);
      const active = properties.filter((p) => !esInactiva(p));
      const inactive = properties.filter((p) => esInactiva(p));
"""),
('R13-05', 'components/Profile/Profile.tsx',
r"""  const [openHousePost, setOpenHousePost] = useState<Post | null>(null);
""",
r"""  const [openHousePost, setOpenHousePost] = useState<Post | null>(null);
  // REV13-05: borrador de Open House que ESTA sesion creo al abrir el editor; si se sale sin guardar se elimina.
  const openHouseBorradorRef = useRef<{ postId: string; propertyId: string } | null>(null);
"""),
('R13-05', 'components/Profile/Profile.tsx',
r"""        setOpenHousePost(newPost as Post);
        // Marcar esta propiedad como que ya tiene Open House para reflejar en el men@@u00fa@@
""",
r"""        setOpenHousePost(newPost as Post);
        openHouseBorradorRef.current = { postId: (newPost as Post).id, propertyId: property.id };
        // Marcar esta propiedad como que ya tiene Open House para reflejar en el men@@u00fa@@
"""),
('R13-05', 'components/Profile/Profile.tsx',
r"""        onCloseOpenHouseModal={() => {
          setShowOpenHouseModal(false);
          setOpenHousePost(null);
          handleRefresh();
        }}
""",
r"""        onOpenHouseSaved={() => {
          // Se guardo: el borrador ya es un Open House real.
          openHouseBorradorRef.current = null;
        }}
        onCloseOpenHouseModal={() => {
          setShowOpenHouseModal(false);
          setOpenHousePost(null);
          const borrador = openHouseBorradorRef.current;
          openHouseBorradorRef.current = null;
          if (!borrador || !authUser?.id) {
            handleRefresh();
            return;
          }
          // REV13-05: se salio sin guardar un Open House recien creado: el borrador no debe aparecer en Posts.
          void (async () => {
            const { error } = await supabase
              .from("posts")
              .update({ deleted_at: new Date().toISOString() })
              .eq("id", borrador.postId)
              .eq("publicado_por", authUser.id)
              .eq("status", "oculto");
            if (!error) {
              setOpenHousePropertyIds((prev) => {
                const next = new Set(prev);
                next.delete(borrador.propertyId);
                return next;
              });
            }
            handleRefresh();
          })();
        }}
"""),
('R13-05', 'components/Profile/ProfileEditModals.tsx',
r"""  onCloseOpenHouseModal: () => void;
""",
r"""  onCloseOpenHouseModal: () => void;
  /** Se dispara al GUARDAR el Open House (no al cancelar). */
  onOpenHouseSaved?: () => void;
"""),
('R13-05', 'components/Profile/ProfileEditModals.tsx',
r"""  onCloseOpenHouseModal,
  onFeedContentUpdated,
}) => {""",
r"""  onCloseOpenHouseModal,
  onOpenHouseSaved,
  onFeedContentUpdated,
}) => {"""),
('R13-05', 'components/Profile/ProfileEditModals.tsx',
r"""          <CreatePost
            post={openHousePost}
            onBack={onCloseOpenHouseModal}
          />""",
r"""          <CreatePost
            post={openHousePost}
            onBack={onCloseOpenHouseModal}
            onUpdated={() => onOpenHouseSaved?.()}
          />"""),
('R13-06', 'components/CreateContent/CreatePost/OpenHousePost.tsx',
r"""            selectedDate.getDate(),
          );
          setFechaHora(newDate);
        }}
""",
r"""            selectedDate.getDate(),
          );
          setFechaHora(newDate);
          // REV13-06: si el nuevo inicio alcanza o pasa al termino, el termino se recorre conservando la duracion.
          if (fechaFinalizacion && fechaFinalizacion.getTime() <= newDate.getTime()) {
            setFechaFinalizacion(
              new Date(newDate.getTime() + Math.max(fechaFinalizacion.getTime() - fechaHora.getTime(), 3600000)),
            );
          }
        }}
"""),
('R13-06', 'components/CreateContent/CreatePost/OpenHousePost.tsx',
r"""          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setFechaHora(newDate);
""",
r"""          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setFechaHora(newDate);
          if (fechaFinalizacion && fechaFinalizacion.getTime() <= newDate.getTime()) {
            setFechaFinalizacion(
              new Date(newDate.getTime() + Math.max(fechaFinalizacion.getTime() - fechaHora.getTime(), 3600000)),
            );
          }
"""),
('R13-06', 'components/CreateContent/CreatePost/OpenHousePost.tsx',
r"""        value={fechaFinalizacion || new Date()}
        mode="date"
        minimumDate={fechaHora}
""",
r"""        value={
          fechaFinalizacion && fechaFinalizacion.getTime() > fechaHora.getTime()
            ? fechaFinalizacion
            : new Date(fechaHora.getTime() + 3600000)
        }
        mode="date"
        minimumDate={fechaHora}
"""),
('R13-06', 'components/CreateContent/CreatePost/OpenHousePost.tsx',
r"""          const baseDate = fechaFinalizacion || new Date();
          const newDate = new Date(baseDate);
          newDate.setFullYear(
""",
r"""          const baseDate =
            fechaFinalizacion && fechaFinalizacion.getTime() > fechaHora.getTime()
              ? fechaFinalizacion
              : new Date(fechaHora.getTime() + 3600000);
          const newDate = new Date(baseDate);
          newDate.setFullYear(
"""),
('R13-06', 'components/CreateContent/CreatePost/OpenHousePost.tsx',
r"""        value={fechaFinalizacion || new Date()}
        mode="time"
""",
r"""        value={
          fechaFinalizacion && fechaFinalizacion.getTime() > fechaHora.getTime()
            ? fechaFinalizacion
            : new Date(fechaHora.getTime() + 3600000)
        }
        mode="time"
"""),
('R13-06', 'components/CreateContent/CreatePost/OpenHousePost.tsx',
r"""          const baseDate = fechaFinalizacion || new Date();
          const newDate = new Date(baseDate);
          newDate.setHours(""",
r"""          const baseDate =
            fechaFinalizacion && fechaFinalizacion.getTime() > fechaHora.getTime()
              ? fechaFinalizacion
              : new Date(fechaHora.getTime() + 3600000);
          const newDate = new Date(baseDate);
          newDate.setHours("""),
('R13-07', 'screens/auth/hooks/useAuthForm.ts',
r"""import { useState, useCallback } from "react";
""",
r"""import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
"""),
('R13-07', 'screens/auth/hooks/useAuthForm.ts',
r"""const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
""",
r"""// REV13-07: borrador del registro. Si el usuario sale a la camara/galeria y el sistema cierra o reinicia la app, el
// formulario se recupera (SIN contrasenas: esas nunca se guardan). Caduca a la hora.
const DRAFT_KEY = "ilyrox:registro_borrador:v1";
const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
"""),
('R13-07', 'screens/auth/hooks/useAuthForm.ts',
r"""  const { uploadImage } = useImageUpload();
""",
r"""  const { uploadImage } = useImageUpload();

  // Referencia al refreshProfile MAS RECIENTE (handleRegister se creo cuando aun no habia usuario).
  const { refreshProfile } = useAuth();
  const refreshProfileRef = useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;
"""),
('R13-07', 'screens/auth/hooks/useAuthForm.ts',
r"""  // Resetear formulario
  const resetForm = useCallback(() => {""",
r"""  // Guardar borrador del registro (con debounce) mientras se llena el formulario.
  useEffect(() => {
    if (mode !== "register") return;
    const { password: _p, confirmPassword: _c, ...resto } = formState;
    const { password: _p0, confirmPassword: _c0, ...restoInicial } = initialFormState;
    if (JSON.stringify(resto) === JSON.stringify(restoInicial)) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ form: resto, ts: Date.now() })).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [formState, mode]);

  // Recuperar el borrador (si existe y no caduco). Devuelve true si habia uno.
  const restoreDraft = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d?.form || !d?.ts || Date.now() - d.ts > DRAFT_MAX_AGE_MS) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        return false;
      }
      setFormState({ ...initialFormState, ...d.form, password: "", confirmPassword: "" });
      setStep(1);
      setMode("register");
      return true;
    } catch {
      return false;
    }
  }, []);

  // Resetear formulario
  const resetForm = useCallback(() => {"""),
('R13-07', 'screens/auth/hooks/useAuthForm.ts',
r"""        log.info("handleRegister: Registro completado exitosamente", { userId: data.user.id });
      }

      return true;""",
r"""        log.info("handleRegister: Registro completado exitosamente", { userId: data.user.id });
        AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        // REV13-07: el perfil se cargo al iniciar sesion, ANTES de guardar foto/ocupacion/aprobaciones. Se vuelve a
        // pedir el perfil final para que la app no se quede en la pantalla de carga con un perfil viejo o vacio.
        try {
          await refreshProfileRef.current?.();
        } catch (e) {
          log.warn("handleRegister: no se pudo refrescar el perfil", e);
        }
      }

      return true;"""),
('R13-07', 'screens/auth/hooks/useAuthForm.ts',
r"""    resetForm,
""",
r"""    resetForm,
    restoreDraft,
"""),
('R13-07', 'screens/auth/AuthScreen.tsx',
r"""  const externalAuth = useExternalAuth();
""",
r"""  const externalAuth = useExternalAuth();

  // REV13-07: si la app se cerro o reinicio mientras se llenaba el registro (p. ej. al ir a la camara), al volver se
  // reabre el formulario con lo que ya estaba escrito (sin contrasenas).
  useEffect(() => {
    let vivo = true;
    authForm.restoreDraft().then((hay) => {
      if (vivo && hay) {
        setAuthMethod("none");
        setModalVisible(true);
      }
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
"""),
('R13-07', 'screens/auth/AuthScreen.tsx',
r"""      authForm.resetForm();
      setAuthMethod("none");
      setModalVisible(true);
    },
    [authForm],
  );""",
r"""      authForm.resetForm();
      setAuthMethod("none");
      setModalVisible(true);
      if (mode === "register") void authForm.restoreDraft();
    },
    [authForm],
  );"""),
('R13-08', 'app/_layout.tsx',
r"""          logger.warn("[auth] el perfil no existe; se detiene el reintento", e);
          return;""",
r"""          logger.warn("[auth] el perfil no existe; se detiene el reintento", e);
          // REV13-08: sin perfil no hay nada que cargar: se cierra la sesion local para volver al inicio de sesion en
          // lugar de quedarse en la pantalla de carga.
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
          return;"""),
('R13-09', 'services/reportService.ts',
r"""    if (error) throw error;
  },
};""",
r"""    if (error) throw error;
  },

  // REV13-09: quien reporto puede quitar SU reporte.
  async deleteMyReport(propiedad_id: string, reportado_por: string) {
    const { error } = await supabase
      .from("reportes_propiedades")
      .delete()
      .eq("propiedad_id", propiedad_id)
      .eq("reportado_por", reportado_por);
    if (error) throw error;
  },

  // REV13-09: reportes recibidos por las propiedades de un dueno (para el aviso amarillo en su perfil).
  async getReportsForOwner(propietario_id: string) {
    const { data, error } = await supabase
      .from("reportes_propiedades")
      .select("propiedad_id, motivo, clasificacion, descripcion")
      .eq("propietario_id", propietario_id);
    if (error) throw error;
    return data ?? [];
  },
};"""),
('R13-09', 'hooks/useReportProperty.ts',
r"""  return {
    loading,
    getCounterReportsProperty,""",
r"""  const deleteMyReport = async (property_id: string, user_id: string) => {
    try {
      setLoading(true);
      await reportService.deleteMyReport(property_id, user_id);
      Burnt.toast({ title: "Reporte eliminado", preset: "done", duration: 2 });
      return true;
    } catch (error) {
      log.error("Error deleting report:", error);
      Burnt.toast({ title: "No se pudo eliminar el reporte", preset: "error", duration: 2 });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    deleteMyReport,
    getCounterReportsProperty,"""),
('R13-09', 'components/modals/ReportPropertyModal.tsx',
r"""  const { reportProperty, getReportsByProperty, loading } = useReportProperty();
""",
r"""  const { reportProperty, getReportsByProperty, deleteMyReport, loading } = useReportProperty();
"""),
('R13-09', 'components/modals/ReportPropertyModal.tsx',
r"""  const hasUserReported = reports.some(
""",
r"""  // REV13-09: quitar mi propio reporte.
  const handleDeleteMyReport = async () => {
    const ok = await deleteMyReport(propiedadId, reportadoPorId);
    if (ok) {
      await loadReports();
      if (onSuccess) onSuccess();
    }
  };

  const hasUserReported = reports.some(
"""),
('R13-09', 'components/modals/ReportPropertyModal.tsx',
r"""        {hasUserReported ? (
          <View style={styles.alreadyReportedBanner}>
""",
r"""        {hasUserReported ? (
          <>
          <View style={styles.alreadyReportedBanner}>
"""),
('R13-09', 'components/modals/ReportPropertyModal.tsx',
r"""            <Text style={styles.alreadyReportedText}>
              Ya enviaste un reporte para esta propiedad
            </Text>
          </View>
        ) : (""",
r"""            <Text style={styles.alreadyReportedText}>
              Ya enviaste un reporte para esta propiedad
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleDeleteMyReport}
            disabled={loading}
            activeOpacity={0.7}
            style={{ marginTop: 10, alignItems: "center", paddingVertical: 10 }}
          >
            <Text style={{ color: COLORS.error, fontWeight: "600" }}>Eliminar mi reporte</Text>
          </TouchableOpacity>
          </>
        ) : ("""),
('R13-09', 'components/Profile/Profile.tsx',
r"""  const targetUserId = userId || authUser?.id;
""",
r"""  const targetUserId = userId || authUser?.id;

  // REV13-09: reportes que recibieron MIS propiedades (aviso amarillo con el motivo; desaparece al quitarse el reporte).
  const [reportesPorPropiedad, setReportesPorPropiedad] = useState<
    Record<string, { motivo: string; total: number }>
  >({});
  React.useEffect(() => {
    if (!isMe || !authUser?.id) {
      setReportesPorPropiedad({});
      return;
    }
    let vivo = true;
    reportService
      .getReportsForOwner(authUser.id)
      .then((rows) => {
        if (!vivo) return;
        const mapa: Record<string, { motivo: string; total: number }> = {};
        for (const r of rows as any[]) {
          const previo = mapa[r.propiedad_id];
          mapa[r.propiedad_id] = {
            motivo: previo ? previo.motivo : r.motivo,
            total: (previo?.total ?? 0) + 1,
          };
        }
        setReportesPorPropiedad(mapa);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [isMe, authUser?.id, properties]);
"""),
('R13-09', 'components/Profile/Profile.tsx',
r"""import ProfilePropertyItem from "./ProfilePropertyItem";
""",
r"""import ProfilePropertyItem from "./ProfilePropertyItem";
import { reportService } from "@/services/reportService";
"""),
('R13-09', 'components/Profile/Profile.tsx',
r"""              hasOpenHouse={openHousePropertyIds.has(item.id)}
""",
r"""              hasOpenHouse={openHousePropertyIds.has(item.id)}
              reportInfo={reportesPorPropiedad[item.id]}
"""),
('R13-09', 'components/Profile/Profile.tsx',
r"""      openHousePropertyIds,
      userProfileMapped,
""",
r"""      openHousePropertyIds,
      reportesPorPropiedad,
      userProfileMapped,
"""),
('R13-09', 'components/Profile/ProfilePropertyItem.tsx',
r"""  hasOpenHouse?: boolean;
  isLastInRow?: boolean;
}""",
r"""  hasOpenHouse?: boolean;
  isLastInRow?: boolean;
  /** REV13-09: reportes que recibio esta propiedad (solo se muestra al dueno). */
  reportInfo?: { motivo: string; total: number };
}"""),
('R13-09', 'components/Profile/ProfilePropertyItem.tsx',
r"""  ({ item, onPress, isOwnProfile, onEdit, onDelete, onPublishOpenHouse, hasOpenHouse, isLastInRow }) => {""",
r"""  ({ item, onPress, isOwnProfile, onEdit, onDelete, onPublishOpenHouse, hasOpenHouse, isLastInRow, reportInfo }) => {"""),
('R13-09', 'components/Profile/ProfilePropertyItem.tsx',
r"""        {isOwnProfile && (
          <View style={styles.menuContainer}>""",
r"""        {isOwnProfile && !!reportInfo && (
          <View
            style={{
              position: "absolute",
              top: 30,
              left: 6,
              right: 6,
              backgroundColor: "#F5C518",
              borderRadius: 4,
              paddingHorizontal: 4,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "700", color: "#3b2f00" }} numberOfLines={2}>
              Tu aviso ha sido reportado: {reportInfo.motivo}
            </Text>
          </View>
        )}

        {isOwnProfile && (
          <View style={styles.menuContainer}>"""),
('R13-10', 'screens/auth/hooks/useAuthForm.ts',
r"""import { useAuth } from "@/context/AuthContext";
""",
r"""import { useAuth } from "@/context/AuthContext";
import { Platform } from "react-native";
"""),
('R13-10', 'screens/auth/hooks/useAuthForm.ts',
r"""const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
""",
r"""const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// REV13-10: traza del inicio de sesion en debug_logs (SIN correo ni contrasena). Si la app se cierra al fallar un inicio
// de sesion, el ultimo evento guardado dice si cerro ANTES de la respuesta del servidor o DESPUES (al mostrar el error).
function trazaLogin(evento: string, extra?: Record<string, unknown>) {
  try {
    supabase
      .from("debug_logs")
      .insert({
        contexto: "login_trace",
        payload: { evento, plataforma: Platform.OS, version: String(Platform.Version), ts: new Date().toISOString(), ...(extra ?? {}) },
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // diagnostico: nunca debe afectar al inicio de sesion
  }
}
"""),
('R13-10', 'screens/auth/hooks/useAuthForm.ts',
r"""    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formState.email,
        password: formState.password,
      });

      if (error) throw error;

      if (data?.user) {
        OneSignal.login(data.user.id);
      }
      return true;
    } catch (error: any) {
      showModal({
        title: "Error",
        message: "Credenciales incorrectas",
        confirmText: "OK",
      });
      return false;
    } finally {""",
r"""    setLoading(true);
    try {
      trazaLogin("intento");
      // REV13-10: un espacio al final o una mayuscula del teclado hacian fallar un correo valido.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formState.email.trim().toLowerCase(),
        password: formState.password,
      });

      if (error) throw error;

      trazaLogin("respuesta_ok");
      if (data?.user) {
        OneSignal.login(data.user.id);
      }
      return true;
    } catch (error: any) {
      trazaLogin("respuesta_error", { status: error?.status ?? null, codigo: error?.code ?? null, mensaje: String(error?.message ?? "").slice(0, 120) });
      const sinRed = /network|fetch|timeout|offline/i.test(String(error?.message ?? "")) || error?.status === 0;
      showModal({
        title: "Error",
        message: sinRed
          ? "No se pudo conectar. Revisa tu conexi@@u00f3@@n a internet e intenta de nuevo."
          : "Correo o contrase@@u00f1@@a incorrectos. Si a@@u00fa@@n no tienes cuenta, usa \"Crear cuenta\".",
        confirmText: "OK",
      });
      return false;
    } finally {"""),
('R13-10', 'screens/auth/hooks/useAuthForm.ts',
r"""      const { data, error } = await supabase.auth.signUp({
        email: formState.email,""",
r"""      const { data, error } = await supabase.auth.signUp({
        email: formState.email.trim().toLowerCase(),"""),
('R13-11', 'app/(stack)/SettingsScreen.tsx',
r"""  const [marketingOn, setMarketingOn] = React.useState(false);
""",
r"""  // REV13-11: la fila "Promociones y novedades" queda oculta (cambiar a true para volver a mostrarla).
  const SHOW_PROMOS = false;
  const [marketingOn, setMarketingOn] = React.useState(false);
"""),
('R13-11', 'app/(stack)/SettingsScreen.tsx',
r"""        <View style={styles.section}>
          <View style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="megaphone-outline" size={22} color={COLORS.primary} />""",
r"""        {SHOW_PROMOS && (
        <View style={styles.section}>
          <View style={styles.optionItem}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="megaphone-outline" size={22} color={COLORS.primary} />"""),
('R13-11', 'app/(stack)/SettingsScreen.tsx',
r"""              ios_backgroundColor={COLORS.cardBorder}
            />
          </View>
        </View>

        <View style={styles.section}>
          {settingsOptions.map((option) => (""",
r"""              ios_backgroundColor={COLORS.cardBorder}
            />
          </View>
        </View>
        )}

        <View style={styles.section}>
          {settingsOptions.map((option) => ("""),
('R13-11', 'services/chartService.ts',
r"""                )
            `),
      supabase.from("busquedas_guardadas").select("*"),""",
r"""                )
            `).eq("activo", true),
      supabase.from("busquedas_guardadas").select("*"),"""),
('R13-11', 'components/Matches.tsx',
r"""  useEffect(() => {
    fetchMatches();
  }, [user]);""",
r"""  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);"""),
('R13-11', 'components/Matches.tsx',
r"""      .is("visto_en", null)
      .then(({ error }) => {
        if (error) log.error("No se pudieron marcar los matches como vistos:", error);
      });
  }, [user]);""",
r"""      .is("visto_en", null)
      .then(({ error }) => {
        if (error) log.error("No se pudieron marcar los matches como vistos:", error);
      });
  }, [user?.id]);"""),
('R13-11', 'components/Matches.tsx',
r"""        onBack={() => router.back()}
""",
r"""        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
"""),
('R13-11', 'components/CreateContent/CreatePost/CreatePost.tsx',
r"""import { Post } from "@/types";
""",
r"""import { Post } from "@/types";
import { getCamposVisibles, TipoPrincipal } from "@/constants/propertyData";
"""),
('R13-11', 'components/CreateContent/CreatePost/CreatePost.tsx',
r"""          updatedData.busquedas_json = {
            ...currentJson,""",
r"""          // REV13-11: un campo que el tipo/subtipo no muestra no conserva el valor guardado antes.
          const cv = getCamposVisibles(
            subtipo.length > 0 ? subtipo : (currentFiltros.subtipo ?? []),
            (tipoPropiedad || currentFiltros.tipo_propiedad || undefined) as TipoPrincipal | undefined,
          );
          const verNiveles = cv.niveles && (tipoPropiedad || currentFiltros.tipo_propiedad) !== "industrial";

          updatedData.busquedas_json = {
            ...currentJson,"""),
('R13-11', 'components/CreateContent/CreatePost/CreatePost.tsx',
r"""                habitaciones:
                  habitacionesParsed !== null
                    ? habitacionesParsed
                    : currentCaracteristicas.habitaciones,
                banos:
                  banosParsed !== null
                    ? banosParsed
                    : currentCaracteristicas.banos,
                estacionamientos:
                  estacionamientosParsed !== null
                    ? estacionamientosParsed
                    : currentCaracteristicas.estacionamientos,
                niveles:
                  nivelesParsed !== null
                    ? nivelesParsed
                    : currentCaracteristicas.niveles,
                antiguedad: antiguedad || currentCaracteristicas.antiguedad,
              },""",
r"""                habitaciones: !cv.recamaras
                  ? undefined
                  : habitacionesParsed !== null
                    ? habitacionesParsed
                    : currentCaracteristicas.habitaciones,
                banos: !cv.banos
                  ? undefined
                  : banosParsed !== null
                    ? banosParsed
                    : currentCaracteristicas.banos,
                estacionamientos: !cv.estacionamientos
                  ? undefined
                  : estacionamientosParsed !== null
                    ? estacionamientosParsed
                    : currentCaracteristicas.estacionamientos,
                niveles: !verNiveles
                  ? undefined
                  : nivelesParsed !== null
                    ? nivelesParsed
                    : currentCaracteristicas.niveles,
                antiguedad: !cv.antiguedad
                  ? undefined
                  : antiguedad || currentCaracteristicas.antiguedad,
              },"""),
]

FILES = [
('R13-01', 'utils/filterVisibility.ts', None,
r"""import { getCamposVisibles, TipoPrincipal } from "@/constants/propertyData";

/**
 * REV13-01: campos de filtro que el tipo/subtipo elegido NO muestra (p. ej. recamaras en un terreno) pero que pueden
 * quedar guardados de una busqueda anterior. Esos valores ocultos se seguian aplicando y vaciaban los resultados
 * ("Terreno" daba 0). Esta funcion devuelve los mismos filtros con esos campos vacios; si no hay nada que limpiar
 * devuelve el MISMO objeto (sin renders extra). Sin tipo elegido no toca nada.
 */
type FiltrosConTipo = {
  tipoPropiedad: string;
  subtipo: string[];
  habitaciones: string;
  banos: string;
  mediosBanos: string;
  estacionamientos: string;
  antiguedad: string;
  niveles: string;
  m2ConstruccionMin: string;
  m2TerrenoMin: string;
  amenidades: string[];
};

export function sanitizeFiltersByTipo<T extends FiltrosConTipo>(filters: T): T {
  if (!filters || !filters.tipoPropiedad) return filters;
  const cv = getCamposVisibles(
    filters.subtipo ?? [],
    filters.tipoPropiedad as TipoPrincipal,
  );
  // Mismas reglas que SearchFiltersModal: industrial no usa niveles; amenidades solo en habitacional.
  const verNiveles = cv.niveles && filters.tipoPropiedad !== "industrial";
  const verAmenidades = cv.amenidades && filters.tipoPropiedad === "habitacional";

  const patch: Partial<FiltrosConTipo> = {};
  if (!cv.recamaras && filters.habitaciones) patch.habitaciones = "";
  if (!cv.banos && filters.banos) patch.banos = "";
  if (!cv.mediosBanos && filters.mediosBanos) patch.mediosBanos = "";
  if (!cv.estacionamientos && filters.estacionamientos) patch.estacionamientos = "";
  if (!cv.antiguedad && filters.antiguedad) patch.antiguedad = "";
  if (!verNiveles && filters.niveles) patch.niveles = "";
  if (!cv.m2Construccion && filters.m2ConstruccionMin) patch.m2ConstruccionMin = "";
  if (!cv.m2Terreno && filters.m2TerrenoMin) patch.m2TerrenoMin = "";
  if (!verAmenidades && filters.amenidades && filters.amenidades.length > 0) patch.amenidades = [];

  return Object.keys(patch).length > 0 ? { ...filters, ...patch } : filters;
}
"""),
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
