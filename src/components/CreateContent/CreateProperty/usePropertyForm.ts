// ============================================
// usePropertyForm - Custom hook para el estado del formulario
// Mantiene TODA la API pública del hook anterior. Internamente usa
// un único useReducer en lugar de 50+ useState para reducir renders
// y centralizar la lógica de mutación.
// ============================================

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useModal } from "@/context/ModalContext";
import { supabase } from "../../../lib/supabase";
import { COORDENADAS_ESTADO } from "../../../constants/MexLocations/estados";
import {
  PROPERTY_TYPES,
  TipoPrincipal,
  esTerreno,
  getCamposVisibles,
} from "../../../constants/propertyData";
import { logger } from "@/utils/logger";
import { formatThousands } from "../../../utils/numberFormatter";

import type {
  AmuebladoType,
  PropertyFormState,
  SiNo,
} from "./types";

const log = logger.scoped("usePropertyForm");

// ============================================
// Tipos auxiliares
// ============================================

/** Permite asignaciones dinámicas sobre un Partial<PropertyFormState> */
type MutablePayload = Record<string, string | number | boolean | null | undefined>;

// ============================================
// Estado inicial
// ============================================

const INITIAL_STATE: PropertyFormState = {
  // Imágenes
  images: [],

  // Información básica
  descripcion: "",
  tipoOperacion: "venta",
  precioVenta: "",
  precioRenta: "",
  moneda: "MXN",
  tipoPrincipal: "habitacional",
  subtipo: "",
  status: "Publicada",
  originalStatus: "Publicada",

  // Ubicación
  pais: "México",
  ubicacionData: {
    estado: "",
    ciudad: "",
    municipio: "",
    colonia: "",
  },
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  codigoPostal: "",
  location: { latitude: 0, longitude: 0 },
  mapCenter: null,

  // Características físicas
  recamaras: "0",
  banosCompletos: "0",
  mediosBanos: "0",
  estacionamientos: "0",
  m2Construccion: "",
  m2Terreno: "",
  niveles: "1",
  antiguedad: "",
  amueblado: "No",
  petFriendly: "No",

  // Amenidades
  amenidadesSeleccionadas: [],

  // Comisión Venta
  comparteComision: "No",
  comisionTipo: "porcentaje",
  comisionValor: "",
  comisionCompartidaTipo: "porcentaje",
  comisionCompartidaValor: "50",  // % de mi comisión que comparto (0-100)
  condicionesComision: "",

  // Comisión Renta
  comparteComisionRenta: "No",
  comisionTipoRenta: "porcentaje",
  comisionValorRenta: "1",        // default 1 mes
  comisionCompartidaTipoRenta: "porcentaje",
  comisionCompartidaValorRenta: "50",  // % de mi comisión que comparto (0-100)
  condicionesComisionRenta: "",

  // Gravamen
  tieneGravamen: "No",
  institucionGravamen: "",
  montoGravamen: "",

  // Financiamiento
  aceptaFinanciamiento: "No",
  tiposFinanciamientoSeleccionados: [],

  // Propietario
  nombreCompletoPropietario: "",
  emailPropietario: "",
  telefonoPropietario: "",

  // Contrato
  contractData: null,

  // EasyBroker
  sinComision: false,

  // Campos especializados — Agrícola
  tiposAgua: [],
  concesionAgua: false,
  usoTerreno: '',
  tipoRiego: '',
  infraElectricidad: false,
  infraCaminoAcceso: false,
  infraCercado: false,
  accesoCarretera: false,
  accesoCamiones: false,

  // Campos especializados — Comercial
  tipoUbicacionComercial: '',
  frenteMetros: '',
  nivelPiso: '',
  sobreAvenidaPrincipal: false,
  enEsquina: false,
  altaVisibilidad: false,
  altoFlujoVehicular: false,

  // Campos especializados — Industrial
  ubicacionIndustrial: '',
  alturaLibreM: '',
  tipoEnergiaKva: [],
  areaOficinas: '',
  patioManiobras: '',

  // Errores
  errors: {},
};

// ============================================
// Acciones tipadas
// ============================================

type SetFieldAction = {
  [K in keyof PropertyFormState]: {
    type: "SET_FIELD";
    field: K;
    value: PropertyFormState[K];
  };
}[keyof PropertyFormState];

type UpdateFieldAction = {
  [K in keyof PropertyFormState]: {
    type: "UPDATE_FIELD";
    field: K;
    updater: (prev: PropertyFormState[K]) => PropertyFormState[K];
  };
}[keyof PropertyFormState];

type PropertyFormAction =
  | SetFieldAction
  | UpdateFieldAction
  | { type: "LOAD"; payload: Partial<PropertyFormState> }
  | { type: "CLEAR_ERROR"; key: string }
  | { type: "TOGGLE_AMENIDAD"; amenidad: string }
  | { type: "TOGGLE_FINANCIAMIENTO"; tipo: string };

function reducer(
  state: PropertyFormState,
  action: PropertyFormAction,
): PropertyFormState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "UPDATE_FIELD": {
      const updater = action.updater as (v: unknown) => unknown;
      return {
        ...state,
        [action.field]: updater(state[action.field]),
      };
    }
    case "LOAD":
      return { ...state, ...action.payload };
    case "CLEAR_ERROR": {
      if (!state.errors[action.key]) return state;
      const { [action.key]: _removed, ...rest } = state.errors;
      return { ...state, errors: rest };
    }
    case "TOGGLE_AMENIDAD": {
      const list = state.amenidadesSeleccionadas;
      return {
        ...state,
        amenidadesSeleccionadas: list.includes(action.amenidad)
          ? list.filter((a) => a !== action.amenidad)
          : [...list, action.amenidad],
      };
    }
    case "TOGGLE_FINANCIAMIENTO": {
      const list = state.tiposFinanciamientoSeleccionados;
      return {
        ...state,
        tiposFinanciamientoSeleccionados: list.includes(action.tipo)
          ? list.filter((t) => t !== action.tipo)
          : [...list, action.tipo],
      };
    }
    default:
      return state;
  }
}

// ============================================
// Helpers de tipado para setters
// ============================================

type Updater<T> = T | ((prev: T) => T);

// ============================================
// Hook
// ============================================

export function usePropertyForm(
  propertyId?: string,
  onBack?: (shouldRefresh?: boolean) => void,
) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const { showModal } = useModal();

  // Loading state — es estado de transacción (no de formulario), se queda como useState
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ============================================
  // Setter factory — una por campo, memoizado con useCallback
  // ============================================

  const makeSetter = <K extends keyof PropertyFormState>(field: K) =>
    useCallback(
      (value: Updater<PropertyFormState[K]>) => {
        if (typeof value === "function") {
          dispatch({
            type: "UPDATE_FIELD",
            field,
            updater: value as (p: PropertyFormState[K]) => PropertyFormState[K],
          } as unknown as PropertyFormAction);
        } else {
          dispatch({
            type: "SET_FIELD",
            field,
            value,
          } as unknown as PropertyFormAction);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

  const setImages = makeSetter("images");
  const setDescripcion = makeSetter("descripcion");
  const setTipoOperacion = makeSetter("tipoOperacion");
  const setPrecioVenta = makeSetter("precioVenta");
  const setPrecioRenta = makeSetter("precioRenta");
  const setMoneda = makeSetter("moneda");
  const setTipoPrincipal = makeSetter("tipoPrincipal");
  const setSubtipo = makeSetter("subtipo");
  const setStatus = makeSetter("status");
  const setUbicacionData = makeSetter("ubicacionData");
  const setCalle = makeSetter("calle");
  const setNumeroExterior = makeSetter("numeroExterior");
  const setNumeroInterior = makeSetter("numeroInterior");
  const setCodigoPostal = makeSetter("codigoPostal");
  const setLocation = makeSetter("location");
  const setMapCenter = makeSetter("mapCenter");
  const setRecamaras = makeSetter("recamaras");
  const setBanosCompletos = makeSetter("banosCompletos");
  const setMediosBanos = makeSetter("mediosBanos");
  const setEstacionamientos = makeSetter("estacionamientos");
  const setM2Construccion = makeSetter("m2Construccion");
  const setM2Terreno = makeSetter("m2Terreno");
  const setNiveles = makeSetter("niveles");
  const setAntiguedad = makeSetter("antiguedad");
  const setAmueblado = makeSetter("amueblado");
  const setPetFriendly = makeSetter("petFriendly");
  const setComparteComision = makeSetter("comparteComision");
  const setComisionTipo = makeSetter("comisionTipo");
  const setComisionValor = makeSetter("comisionValor");
  const setComisionCompartidaTipo = makeSetter("comisionCompartidaTipo");
  const setComisionCompartidaValor = makeSetter("comisionCompartidaValor");
  const setCondicionesComision = makeSetter("condicionesComision");
  const setComparteComisionRenta = makeSetter("comparteComisionRenta");
  const setComisionTipoRenta = makeSetter("comisionTipoRenta");
  const setComisionValorRenta = makeSetter("comisionValorRenta");
  const setComisionCompartidaTipoRenta = makeSetter("comisionCompartidaTipoRenta");
  const setComisionCompartidaValorRenta = makeSetter("comisionCompartidaValorRenta");
  const setCondicionesComisionRenta = makeSetter("condicionesComisionRenta");
  const setTieneGravamen = makeSetter("tieneGravamen");
  const setInstitucionGravamen = makeSetter("institucionGravamen");
  const setMontoGravamen = makeSetter("montoGravamen");
  const setAceptaFinanciamiento = makeSetter("aceptaFinanciamiento");
  const setNombreCompletoPropietario = makeSetter("nombreCompletoPropietario");
  const setEmailPropietario = makeSetter("emailPropietario");
  const setTelefonoPropietario = makeSetter("telefonoPropietario");
  const setContractData = makeSetter("contractData");
  const setErrors = makeSetter("errors");

  // Setters especializados — Agrícola
  const setConcesionAgua = makeSetter("concesionAgua");
  const setUsoTerreno = makeSetter("usoTerreno");
  const setTipoRiego = makeSetter("tipoRiego");
  const setInfraElectricidad = makeSetter("infraElectricidad");
  const setInfraCaminoAcceso = makeSetter("infraCaminoAcceso");
  const setInfraCercado = makeSetter("infraCercado");
  const setAccesoCarretera = makeSetter("accesoCarretera");
  const setAccesoCamiones = makeSetter("accesoCamiones");

  // Setters especializados — Comercial
  const setTipoUbicacionComercial = makeSetter("tipoUbicacionComercial");
  const setFrenteMetros = makeSetter("frenteMetros");
  const setNivelPiso = makeSetter("nivelPiso");
  const setSobreAvenidaPrincipal = makeSetter("sobreAvenidaPrincipal");
  const setEnEsquina = makeSetter("enEsquina");
  const setAltaVisibilidad = makeSetter("altaVisibilidad");
  const setAltoFlujoVehicular = makeSetter("altoFlujoVehicular");

  // Setters especializados — Industrial
  const setUbicacionIndustrial = makeSetter("ubicacionIndustrial");
  const setAlturaLibreM = makeSetter("alturaLibreM");
  const setAreaOficinas = makeSetter("areaOficinas");
  const setPatioManiobras = makeSetter("patioManiobras");

  const toggleTipoAgua = useCallback((tipo: string) => {
    dispatch({
      type: "UPDATE_FIELD",
      field: "tiposAgua",
      updater: (prev: string[]) =>
        prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    } as unknown as PropertyFormAction);
  }, []);

  const toggleTipoEnergiaKva = useCallback((tipo: string) => {
    dispatch({
      type: "UPDATE_FIELD",
      field: "tipoEnergiaKva",
      updater: (prev: string[]) =>
        prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    } as unknown as PropertyFormAction);
  }, []);

  // ============================================
  // Helpers derivados
  // ============================================

  const clearError = useCallback((key: string) => {
    dispatch({ type: "CLEAR_ERROR", key });
  }, []);

  const toggleAmenidad = useCallback((amenidad: string) => {
    dispatch({ type: "TOGGLE_AMENIDAD", amenidad });
  }, []);

  const toggleFinanciamiento = useCallback((tipo: string) => {
    dispatch({ type: "TOGGLE_FINANCIAMIENTO", tipo });
  }, []);

  const handleCurrencyChange = useCallback(
    (text: string, setter: (val: string) => void) => {
      const rawValue = text.replace(/,/g, "");
      if (/^\d*\.?\d*$/.test(rawValue)) {
        const parts = rawValue.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        setter(parts.join("."));
      }
    },
    [],
  );

  // ============================================
  // COMPUTED
  // ============================================

  const camposVisibles = useMemo(
    () => getCamposVisibles(state.subtipo, state.tipoPrincipal as TipoPrincipal),
    [state.subtipo, state.tipoPrincipal],
  );

  const PROPERTY_STATUS = [
    "Publicada",
    "Suspendida",
    "Rentada",
    "Reservada",
    "Vendida",
  ] as const;

  const filteredStatusOptions = useMemo(() => {
    return PROPERTY_STATUS.filter((option) => {
      if (state.sinComision && option === "Publicada") return false;
      if (state.tipoOperacion === "venta") return option !== "Rentada";
      if (state.tipoOperacion === "renta") return option !== "Vendida";
      return true;
    });
  }, [state.tipoOperacion, state.sinComision]);

  const isColoniaMode = useMemo(() => {
    return (
      !!state.ubicacionData.colonia &&
      !!state.ubicacionData.latitud &&
      !!state.ubicacionData.longitud
    );
  }, [
    state.ubicacionData.colonia,
    state.ubicacionData.latitud,
    state.ubicacionData.longitud,
  ]);

  // ============================================
  // EFFECTS: auto-limpieza de errores cuando el campo se llena
  // ============================================

  useEffect(() => {
    if (state.ubicacionData.estado) clearError("estado");
    if (state.ubicacionData.municipio) clearError("municipio");
  }, [state.ubicacionData, clearError]);

  useEffect(() => {
    if (state.images.length > 0) clearError("images");
  }, [state.images, clearError]);

  useEffect(() => {
    if (state.descripcion.trim()) clearError("descripcion");
  }, [state.descripcion, clearError]);

  useEffect(() => {
    if (state.subtipo) clearError("subtipo");
  }, [state.subtipo, clearError]);

  useEffect(() => {
    if (state.precioVenta.trim()) clearError("precioVenta");
  }, [state.precioVenta, clearError]);

  useEffect(() => {
    if (state.precioRenta.trim()) clearError("precioRenta");
  }, [state.precioRenta, clearError]);

  useEffect(() => {
    if (state.location.latitude !== 0 && state.location.longitude !== 0) {
      clearError("location");
    }
  }, [state.location, clearError]);

  // ============================================
  // MAP CENTER BASED ON STATE OR GEO COORDS
  // ============================================

  useEffect(() => {
    const { latitud, longitud, estado } = state.ubicacionData;
    if (latitud && longitud) {
      dispatch({
        type: "SET_FIELD",
        field: "mapCenter",
        value: { lat: latitud, lng: longitud },
      });
    } else if (estado && COORDENADAS_ESTADO[estado]) {
      dispatch({
        type: "SET_FIELD",
        field: "mapCenter",
        value: COORDENADAS_ESTADO[estado],
      });
    }
  }, [state.ubicacionData]);

  // ============================================
  // LOAD DATA FOR EDITING
  // ============================================

  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const fetchPropertyDetails = useCallback(async () => {
    if (!propertyId) return;
    try {
      setIsLoadingProperty(true);
      setLoadError(null);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Tiempo de espera agotado al cargar la propiedad"),
            ),
          30000,
        ),
      );

      const fetchPromise = supabase
        .from("propiedades")
        .select(
          `
          *,
          operaciones_propiedad (*),
          propiedad_amenidades (
            catalogo_amenidades (nombre)
          ),
          propiedad_financiamientos (
            catalogo_tipos_financiamiento (nombre)
          ),
          propiedad_gravamenes (
            monto,
            catalogo_instituciones_financieras (nombre)
          )
        `,
        )
        .eq("id", propertyId)
        .single();

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise,
      ]);

      if (error) throw error;
      if (data) loadPropertyData(data);
    } catch (e: unknown) {
      log.error("Error fetching property:", e);
      const errorMsg =
        e instanceof Error ? e.message : "No se pudo cargar la información de la propiedad";
      setLoadError(errorMsg);
      showModal({
        title: "Error al cargar",
        message: errorMsg,
        confirmText: "Reintentar",
        cancelText: "Volver",
        onConfirm: () => fetchPropertyDetails(),
        onCancel: () => onBackRef.current?.(),
      });
    } finally {
      setIsLoadingProperty(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId, fetchPropertyDetails]);

  const loadPropertyData = (data: any) => {
    try {
      const payload: Partial<PropertyFormState> = {};

      // 1. Imágenes
      if (data.fotos && Array.isArray(data.fotos)) {
        payload.images = data.fotos;
      }

      // 2. Info Básica
      payload.descripcion = data.descripcion || "";
      payload.status = data.status || "Publicada";
      payload.sinComision = data.sin_comision ?? false;
      payload.originalStatus = data.status || "Publicada";

      const rawTipo = (data.tipo || "habitacional").toLowerCase();
      const isValidTipo = Object.keys(PROPERTY_TYPES).includes(rawTipo);
      payload.tipoPrincipal = isValidTipo
        ? (rawTipo as TipoPrincipal)
        : "habitacional";
      payload.subtipo = data.subtipo || "";

      // 3. Ubicación
      payload.ubicacionData = {
        estado: data.estado || "",
        ciudad: data.ciudad || "",
        municipio: data.municipio || data.ciudad || "",
        colonia: data.colonia || "",
      };
      payload.calle = data.calle || "";
      payload.numeroExterior = data.numero_exterior || "";
      payload.numeroInterior = data.numero_interior || "";
      payload.codigoPostal = "";
      payload.location = {
        latitude: data.latitud || 0,
        longitude: data.longitud || 0,
      };

      // 4. Características Físicas
      payload.recamaras = data.habitaciones?.toString() || "0";
      payload.banosCompletos = data.banos?.toString() || "0";
      payload.mediosBanos = "";
      payload.estacionamientos = data.estacionamientos?.toString() || "0";
      payload.m2Construccion = data.metros_cuadrados_construccion
        ? formatThousands(data.metros_cuadrados_construccion.toString())
        : "";
      payload.m2Terreno = data.metros_cuadrados_terreno
        ? formatThousands(data.metros_cuadrados_terreno.toString())
        : "";
      payload.niveles = data.pisos?.toString() || "1";
      payload.antiguedad = data.antiguedad || "";
      payload.amueblado = (data.amueblado || "No") as AmuebladoType;
      payload.petFriendly = (data.pet_friendly || "No") as SiNo;
      payload.nombreCompletoPropietario = data.nombre_propietario || "";
      payload.emailPropietario = data.email_propietario || "";
      payload.telefonoPropietario = data.telefono_propietario || "";

      // 5. Operaciones
      const ops = data.operaciones_propiedad || [];
      const ventaOp = ops.find((o: any) => o.tipo_operacion === "venta");
      const rentaOp = ops.find((o: any) => o.tipo_operacion === "renta");

      if (ventaOp && rentaOp) {
        payload.tipoOperacion = "ambas";
      } else if (ventaOp) {
        payload.tipoOperacion = "venta";
      } else if (rentaOp) {
        payload.tipoOperacion = "renta";
      }

      if (data.latitud && data.longitud) {
        payload.mapCenter = { lat: data.latitud, lng: data.longitud };
      }

      // Configurar campos de VENTA
      if (ventaOp) {
        payload.precioVenta = ventaOp.precio?.toString() || "";
        payload.moneda = ventaOp.moneda || "MXN";
        payload.comparteComision = ventaOp.comparte_comision ? "Sí" : "No";

        // Porcentaje propio (siempre, no solo cuando comparte)
        if (ventaOp.comision_porcentaje) {
          payload.comisionValor = ventaOp.comision_porcentaje.toString();
        }

        if (ventaOp.comparte_comision) {
          if (ventaOp.porcentaje_comision_compartida) {
            const myPct = ventaOp.comision_porcentaje || 0;
            const sharePct = myPct > 0
              ? Math.round(ventaOp.porcentaje_comision_compartida / myPct * 100)
              : 50;
            payload.comisionCompartidaValor = String(Math.min(100, Math.max(0, sharePct)));
          }
          payload.condicionesComision =
            ventaOp.condiciones_comision_compartida || "";
        }
      }

      // Configurar campos de RENTA
      if (rentaOp) {
        payload.precioRenta = rentaOp.precio?.toString() || "";
        if (!ventaOp) payload.moneda = rentaOp.moneda || "MXN";

        const isAmbas = !!ventaOp;
        const valorPropKey = isAmbas ? "comisionValorRenta" : "comisionValor";
        const compartePropKey = isAmbas ? "comparteComisionRenta" : "comparteComision";
        const compartidaValorPropKey = isAmbas
          ? "comisionCompartidaValorRenta"
          : "comisionCompartidaValor";
        const condicionesPropKey = isAmbas
          ? "condicionesComisionRenta"
          : "condicionesComision";

        const mutablePayload = payload as unknown as MutablePayload;

        // Comisión en meses (nuevo sistema)
        if (rentaOp.comision_meses) {
          mutablePayload[valorPropKey] = rentaOp.comision_meses.toString();
        }

        mutablePayload[compartePropKey] = rentaOp.comparte_comision ? "Sí" : "No";

        if (rentaOp.comparte_comision) {
          // porcentaje_comision_compartida almacena los meses compartidos para renta
          if (rentaOp.porcentaje_comision_compartida) {
            const myMeses = rentaOp.comision_meses || 0;
            const sharePct = myMeses > 0
              ? Math.round(rentaOp.porcentaje_comision_compartida / myMeses * 100)
              : 50;
            mutablePayload[compartidaValorPropKey] = String(Math.min(100, Math.max(0, sharePct)));
          }
          mutablePayload[condicionesPropKey] =
            rentaOp.condiciones_comision_compartida || "";
        }
      }

      // 6. Amenidades
      if (data.propiedad_amenidades) {
        payload.amenidadesSeleccionadas = data.propiedad_amenidades
          .map((pa: any) => pa.catalogo_amenidades?.nombre)
          .filter(Boolean);
      }

      // 7. Financiamiento
      if (
        data.propiedad_financiamientos &&
        data.propiedad_financiamientos.length > 0
      ) {
        payload.aceptaFinanciamiento = "Sí";
        payload.tiposFinanciamientoSeleccionados =
          data.propiedad_financiamientos
            .map((pf: any) => pf.catalogo_tipos_financiamiento?.nombre)
            .filter(Boolean);
      } else {
        payload.aceptaFinanciamiento = "No";
      }

      // 8. Gravamen
      if (data.propiedad_gravamenes && data.propiedad_gravamenes.length > 0) {
        payload.tieneGravamen = "Sí";
        const grav = data.propiedad_gravamenes[0];
        payload.institucionGravamen =
          grav.catalogo_instituciones_financieras?.nombre || "";
        payload.montoGravamen = grav.monto?.toString() || "";
      } else {
        payload.tieneGravamen = "No";
      }

      // 9. Campos especializados
      payload.tiposAgua = data.tipo_agua ?? [];
      payload.concesionAgua = data.concesion_agua ?? false;
      payload.usoTerreno = data.uso_terreno ?? '';
      payload.tipoRiego = data.tipo_riego ?? '';
      payload.infraElectricidad = data.infra_electricidad ?? false;
      payload.infraCaminoAcceso = data.infra_camino_acceso ?? false;
      payload.infraCercado = data.infra_cercado ?? false;
      payload.accesoCarretera = data.acceso_carretera ?? false;
      payload.accesoCamiones = data.acceso_camiones ?? false;
      payload.tipoUbicacionComercial = data.tipo_ubicacion_comercial ?? '';
      payload.frenteMetros = data.frente_metros?.toString() ?? '';
      payload.nivelPiso = data.nivel_piso?.toString() ?? '';
      payload.sobreAvenidaPrincipal = data.sobre_avenida_principal ?? false;
      payload.enEsquina = data.en_esquina ?? false;
      payload.altaVisibilidad = data.alta_visibilidad ?? false;
      payload.altoFlujoVehicular = data.alto_flujo_vehicular ?? false;
      payload.ubicacionIndustrial = data.ubicacion_industrial ?? '';
      payload.alturaLibreM = data.altura_libre_m ?? '';
      payload.tipoEnergiaKva = data.tipo_energia_kva ?? [];
      payload.areaOficinas = data.area_oficinas_m2?.toString() ?? '';
      payload.patioManiobras = data.patio_maniobras_m2?.toString() ?? '';

      dispatch({ type: "LOAD", payload });
    } catch (e: unknown) {
      log.error("Error loading property data:", e);
      setLoadError("Error al procesar los datos de la propiedad");
    }
  };

  // ============================================
  // VALIDACIÓN
  // ============================================

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (state.images.length === 0) {
      newErrors.images = "Debes agregar al menos 1 imagen";
    }
    if (!state.descripcion.trim()) {
      newErrors.descripcion = "La descripción es requerida";
    }
    if (!state.subtipo) {
      newErrors.subtipo = "Debes seleccionar un subtipo de propiedad";
    }

    if (state.tipoOperacion === "venta" && !state.precioVenta.trim()) {
      newErrors.precioVenta = "El precio de venta es requerido";
    }
    if (state.tipoOperacion === "renta" && !state.precioRenta.trim()) {
      newErrors.precioRenta = "El precio de renta es requerido";
    }
    if (state.tipoOperacion === "ambas") {
      if (!state.precioVenta.trim())
        newErrors.precioVenta = "El precio de venta es requerido";
      if (!state.precioRenta.trim())
        newErrors.precioRenta = "El precio de renta es requerido";
    }

    if (!state.ubicacionData.estado)
      newErrors.estado = "El estado es requerido";
    if (!state.ubicacionData.municipio)
      newErrors.municipio = "El municipio es requerido";

    if (esTerreno(state.subtipo)) {
      if (!state.m2Terreno.trim()) {
        newErrors.m2Terreno =
          "Los m² de terreno son obligatorios para terrenos";
      }
    } else {
      if (!state.m2Construccion.trim() && !state.m2Terreno.trim()) {
        newErrors.m2 =
          "Debes especificar al menos m² de construcción o terreno";
      }
    }

    if (state.location.latitude === 0 && state.location.longitude === 0) {
      newErrors.location = "Debes seleccionar la ubicación en el mapa";
    }

    dispatch({ type: "SET_FIELD", field: "errors", value: newErrors });
    return Object.keys(newErrors).length === 0;
  }, [state]);

  // ============================================
  // Return — API pública idéntica al hook anterior
  // ============================================

  return {
    // Loading
    isLoadingProperty,
    loadError,
    retryLoad: fetchPropertyDetails,

    // Status
    status: state.status,
    setStatus,
    originalStatus: state.originalStatus,
    filteredStatusOptions,

    // Contract
    contractData: state.contractData,
    setContractData,

    // Images
    images: state.images,
    setImages,

    // Información Básica
    descripcion: state.descripcion,
    setDescripcion,
    tipoOperacion: state.tipoOperacion,
    setTipoOperacion,
    precioVenta: state.precioVenta,
    setPrecioVenta,
    precioRenta: state.precioRenta,
    setPrecioRenta,
    moneda: state.moneda,
    setMoneda,
    tipoPrincipal: state.tipoPrincipal as TipoPrincipal,
    setTipoPrincipal,
    subtipo: state.subtipo,
    setSubtipo,

    // Ubicación
    pais: state.pais,
    ubicacionData: state.ubicacionData,
    setUbicacionData,
    calle: state.calle,
    setCalle,
    numeroExterior: state.numeroExterior,
    setNumeroExterior,
    numeroInterior: state.numeroInterior,
    setNumeroInterior,
    codigoPostal: state.codigoPostal,
    setCodigoPostal,
    location: state.location,
    setLocation,
    mapCenter: state.mapCenter,
    setMapCenter,
    isColoniaMode,

    // Características Físicas
    recamaras: state.recamaras,
    setRecamaras,
    banosCompletos: state.banosCompletos,
    setBanosCompletos,
    mediosBanos: state.mediosBanos,
    setMediosBanos,
    estacionamientos: state.estacionamientos,
    setEstacionamientos,
    m2Construccion: state.m2Construccion,
    setM2Construccion,
    m2Terreno: state.m2Terreno,
    setM2Terreno,
    niveles: state.niveles,
    setNiveles,
    antiguedad: state.antiguedad,
    setAntiguedad,
    amueblado: state.amueblado,
    setAmueblado,
    petFriendly: state.petFriendly,
    setPetFriendly,
    camposVisibles,

    // Amenidades
    amenidadesSeleccionadas: state.amenidadesSeleccionadas,
    toggleAmenidad,

    // Comisión Venta
    comparteComision: state.comparteComision,
    setComparteComision,
    comisionTipo: state.comisionTipo,
    setComisionTipo,
    comisionValor: state.comisionValor,
    setComisionValor,
    comisionCompartidaTipo: state.comisionCompartidaTipo,
    setComisionCompartidaTipo,
    comisionCompartidaValor: state.comisionCompartidaValor,
    setComisionCompartidaValor,
    condicionesComision: state.condicionesComision,
    setCondicionesComision,

    // Comisión Renta
    comparteComisionRenta: state.comparteComisionRenta,
    setComparteComisionRenta,
    comisionTipoRenta: state.comisionTipoRenta,
    setComisionTipoRenta,
    comisionValorRenta: state.comisionValorRenta,
    setComisionValorRenta,
    comisionCompartidaTipoRenta: state.comisionCompartidaTipoRenta,
    setComisionCompartidaTipoRenta,
    comisionCompartidaValorRenta: state.comisionCompartidaValorRenta,
    setComisionCompartidaValorRenta,
    condicionesComisionRenta: state.condicionesComisionRenta,
    setCondicionesComisionRenta,

    // Gravamen
    tieneGravamen: state.tieneGravamen,
    setTieneGravamen,
    institucionGravamen: state.institucionGravamen,
    setInstitucionGravamen,
    montoGravamen: state.montoGravamen,
    setMontoGravamen,

    // Financiamiento
    aceptaFinanciamiento: state.aceptaFinanciamiento,
    setAceptaFinanciamiento,
    tiposFinanciamientoSeleccionados: state.tiposFinanciamientoSeleccionados,
    toggleFinanciamiento,

    // Propietario
    nombreCompletoPropietario: state.nombreCompletoPropietario,
    setNombreCompletoPropietario,
    emailPropietario: state.emailPropietario,
    setEmailPropietario,
    telefonoPropietario: state.telefonoPropietario,
    setTelefonoPropietario,

    // EasyBroker
    sinComision: state.sinComision,

    // Campos especializados — Agrícola
    tiposAgua: state.tiposAgua,
    toggleTipoAgua,
    concesionAgua: state.concesionAgua,
    setConcesionAgua,
    usoTerreno: state.usoTerreno,
    setUsoTerreno,
    tipoRiego: state.tipoRiego,
    setTipoRiego,
    infraElectricidad: state.infraElectricidad,
    setInfraElectricidad,
    infraCaminoAcceso: state.infraCaminoAcceso,
    setInfraCaminoAcceso,
    infraCercado: state.infraCercado,
    setInfraCercado,
    accesoCarretera: state.accesoCarretera,
    setAccesoCarretera,
    accesoCamiones: state.accesoCamiones,
    setAccesoCamiones,

    // Campos especializados — Comercial
    tipoUbicacionComercial: state.tipoUbicacionComercial,
    setTipoUbicacionComercial,
    frenteMetros: state.frenteMetros,
    setFrenteMetros,
    nivelPiso: state.nivelPiso,
    setNivelPiso,
    sobreAvenidaPrincipal: state.sobreAvenidaPrincipal,
    setSobreAvenidaPrincipal,
    enEsquina: state.enEsquina,
    setEnEsquina,
    altaVisibilidad: state.altaVisibilidad,
    setAltaVisibilidad,
    altoFlujoVehicular: state.altoFlujoVehicular,
    setAltoFlujoVehicular,

    // Campos especializados — Industrial
    ubicacionIndustrial: state.ubicacionIndustrial,
    setUbicacionIndustrial,
    alturaLibreM: state.alturaLibreM,
    setAlturaLibreM,
    tipoEnergiaKva: state.tipoEnergiaKva,
    toggleTipoEnergiaKva,
    areaOficinas: state.areaOficinas,
    setAreaOficinas,
    patioManiobras: state.patioManiobras,
    setPatioManiobras,

    // Errors
    errors: state.errors,
    setErrors,
    clearError,

    // Validation
    validate,

    // Helpers
    handleCurrencyChange,
  };
}
