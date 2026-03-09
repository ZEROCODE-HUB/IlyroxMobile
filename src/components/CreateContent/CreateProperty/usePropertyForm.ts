// ============================================
// usePropertyForm - Custom hook para el estado del formulario
// Maneja TODOS los estados y la carga de datos para edición
// ============================================

import { useState, useCallback, useMemo, useEffect } from "react";
import { Alert } from "react-native";
import { supabase } from "../../../lib/supabase";
import { COORDENADAS_ESTADO } from "../../../constants/MexLocations/estados";
import {
  PROPERTY_TYPES,
  TipoPrincipal,
  esTerreno,
  getCamposVisibles,
} from "../../../constants/propertyData";

import type {
  TipoOperacion,
  MonedaType,
  SiNo,
  AmuebladoType,
  ComisionTipo,
  ContractData,
  UbicacionData,
  LocationCoords,
  MapCenter,
} from "./types";

export function usePropertyForm(
  propertyId?: string,
  onBack?: (shouldRefresh?: boolean) => void,
) {
  // ============================================
  // LOADING STATE
  // ============================================
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ============================================
  // STATUS
  // ============================================
  const [status, setStatus] = useState<string>("Publicada");
  const [originalStatus, setOriginalStatus] = useState<string>("Publicada");

  // Contract data modal
  const [contractData, setContractData] = useState<ContractData | null>(null);

  // ============================================
  // 1. GALERÍA DE IMÁGENES
  // ============================================
  const [images, setImages] = useState<string[]>([]);

  // ============================================
  // 2. INFORMACIÓN BÁSICA
  // ============================================
  const [descripcion, setDescripcion] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState<TipoOperacion>("venta");
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioRenta, setPrecioRenta] = useState("");
  const [moneda, setMoneda] = useState<MonedaType>("MXN");
  const [tipoPrincipal, setTipoPrincipal] =
    useState<TipoPrincipal>("habitacional");
  const [subtipo, setSubtipo] = useState("");

  // ============================================
  // 3. UBICACIÓN
  // ============================================
  const [pais] = useState("México");
  const [ubicacionData, setUbicacionData] = useState<UbicacionData>({
    estado: "",
    ciudad: "",
    municipio: "",
    colonia: "",
  });
  const [calle, setCalle] = useState("");
  const [numeroExterior, setNumeroExterior] = useState("");
  const [numeroInterior, setNumeroInterior] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [location, setLocation] = useState<LocationCoords>({
    latitude: 0,
    longitude: 0,
  });
  const [mapCenter, setMapCenter] = useState<MapCenter | null>(null);

  // ============================================
  // 4. CARACTERÍSTICAS FÍSICAS
  // ============================================
  const [recamaras, setRecamaras] = useState("0");
  const [banosCompletos, setBanosCompletos] = useState("0");
  const [mediosBanos, setMediosBanos] = useState("0");
  const [estacionamientos, setEstacionamientos] = useState("0");
  const [m2Construccion, setM2Construccion] = useState("");
  const [m2Terreno, setM2Terreno] = useState("");
  const [niveles, setNiveles] = useState("1");
  const [antiguedad, setAntiguedad] = useState("");
  const [amueblado, setAmueblado] = useState<AmuebladoType>("No");
  const [petFriendly, setPetFriendly] = useState<SiNo>("No");

  // ============================================
  // 5. AMENIDADES
  // ============================================
  const [amenidadesSeleccionadas, setAmenidadesSeleccionadas] = useState<
    string[]
  >([]);

  // ============================================
  // 6. COMISIÓN (Venta)
  // ============================================
  const [comparteComision, setComparteComision] = useState<SiNo>("No");
  const [comisionTipo, setComisionTipo] = useState<ComisionTipo>("porcentaje");
  const [comisionValor, setComisionValor] = useState("");
  const [comisionCompartidaTipo, setComisionCompartidaTipo] =
    useState<ComisionTipo>("porcentaje");
  const [comisionCompartidaValor, setComisionCompartidaValor] = useState("");
  const [condicionesComision, setCondicionesComision] = useState("");

  // Comisión Renta (solo cuando es "ambas")
  const [comparteComisionRenta, setComparteComisionRenta] =
    useState<SiNo>("No");
  const [comisionTipoRenta, setComisionTipoRenta] =
    useState<ComisionTipo>("porcentaje");
  const [comisionValorRenta, setComisionValorRenta] = useState("");
  const [comisionCompartidaTipoRenta, setComisionCompartidaTipoRenta] =
    useState<ComisionTipo>("porcentaje");
  const [comisionCompartidaValorRenta, setComisionCompartidaValorRenta] =
    useState("");
  const [condicionesComisionRenta, setCondicionesComisionRenta] = useState("");

  // ============================================
  // 7. GRAVAMEN
  // ============================================
  const [tieneGravamen, setTieneGravamen] = useState<SiNo>("No");
  const [institucionGravamen, setInstitucionGravamen] = useState("");
  const [montoGravamen, setMontoGravamen] = useState("");

  // ============================================
  // 8. FINANCIAMIENTO
  // ============================================
  const [aceptaFinanciamiento, setAceptaFinanciamiento] = useState<SiNo>("No");
  const [
    tiposFinanciamientoSeleccionados,
    setTiposFinanciamientoSeleccionados,
  ] = useState<string[]>([]);

  // ============================================
  // PROPIETARIO
  // ============================================
  const [nombreCompletoPropietario, setNombreCompletoPropietario] =
    useState("");
  const [emailPropietario, setEmailPropietario] = useState("");
  const [telefonoPropietario, setTelefonoPropietario] = useState("");

  // ============================================
  // ERRORES
  // ============================================
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = useCallback(
    (key: string) => {
      if (errors[key]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    },
    [errors],
  );

  // ============================================
  // COMPUTED
  // ============================================
  const camposVisibles = useMemo(() => getCamposVisibles(subtipo), [subtipo]);

  const PROPERTY_STATUS = [
    "Publicada",
    "Suspendida",
    "Rentada",
    "Reservada",
    "Vendida",
  ] as const;

  const filteredStatusOptions = useMemo(() => {
    return PROPERTY_STATUS.filter((option) => {
      if (tipoOperacion === "venta") return option !== "Rentada";
      if (tipoOperacion === "renta") return option !== "Vendida";
      return true;
    });
  }, [tipoOperacion]);

  // ============================================
  // ERROR CLEARING EFFECTS
  // ============================================
  useEffect(() => {
    if (ubicacionData.estado) clearError("estado");
    if (ubicacionData.municipio) clearError("municipio");
  }, [ubicacionData]);

  useEffect(() => {
    if (images.length > 0) clearError("images");
  }, [images]);

  useEffect(() => {
    if (descripcion.trim()) clearError("descripcion");
  }, [descripcion]);

  useEffect(() => {
    if (subtipo) clearError("subtipo");
  }, [subtipo]);

  useEffect(() => {
    if (precioVenta.trim()) clearError("precioVenta");
  }, [precioVenta]);

  useEffect(() => {
    if (precioRenta.trim()) clearError("precioRenta");
  }, [precioRenta]);

  useEffect(() => {
    if (location.latitude !== 0 && location.longitude !== 0)
      clearError("location");
  }, [location]);

  // ============================================
  // MAP CENTER BASED ON STATE
  // ============================================
  useEffect(() => {
    if (ubicacionData.estado && COORDENADAS_ESTADO[ubicacionData.estado]) {
      const coords = COORDENADAS_ESTADO[ubicacionData.estado];
      setMapCenter(coords);
    }
  }, [ubicacionData.estado]);

  // ============================================
  // LOAD DATA FOR EDITING
  // ============================================
  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      setIsLoadingProperty(true);
      setLoadError(null);

      // Timeout de 30 segundos para la carga
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
    } catch (e: any) {
      console.error("Error fetching property:", e);
      const errorMsg =
        e?.message || "No se pudo cargar la información de la propiedad";
      setLoadError(errorMsg);
      Alert.alert("Error", errorMsg, [
        {
          text: "Reintentar",
          onPress: () => fetchPropertyDetails(),
        },
        {
          text: "Volver",
          onPress: () => onBack?.(),
          style: "cancel",
        },
      ]);
    } finally {
      setIsLoadingProperty(false);
    }
  };

  const loadPropertyData = (data: any) => {
    try {
      // 1. Imágenes
      if (data.fotos && Array.isArray(data.fotos)) {
        setImages(data.fotos);
      }

      // 2. Info Básica
      setDescripcion(data.descripcion || "");
      setStatus(data.status || "Publicada");
      setOriginalStatus(data.status || "Publicada");

      const rawTipo = (data.tipo || "habitacional").toLowerCase();
      const isValidTipo = Object.keys(PROPERTY_TYPES).includes(rawTipo);
      const safeTipo = isValidTipo
        ? (rawTipo as TipoPrincipal)
        : "habitacional";
      setTipoPrincipal(safeTipo);
      setSubtipo(data.subtipo || "");

      // 3. Ubicación
      setUbicacionData({
        estado: data.estado || "",
        ciudad: data.ciudad || "",
        municipio: data.municipio || data.ciudad || "",
        colonia: data.colonia || "",
      });
      setCalle(data.calle || "");
      setNumeroExterior(data.numero_exterior || "");
      setNumeroInterior(data.numero_interior || "");
      setCodigoPostal("");
      setLocation({
        latitude: data.latitud || 0,
        longitude: data.longitud || 0,
      });

      // 4. Características Físicas
      setRecamaras(data.habitaciones?.toString() || "0");
      setBanosCompletos(data.banos?.toString() || "0");
      setMediosBanos("");
      setEstacionamientos(data.estacionamientos?.toString() || "0");
      setM2Construccion(data.metros_cuadrados_construccion?.toString() || "");
      setM2Terreno(data.metros_cuadrados_terreno?.toString() || "");
      setNiveles(data.pisos?.toString() || "1");
      setAntiguedad(data.antiguedad || "");
      setAmueblado(data.amueblado || "No");
      setPetFriendly(data.pet_friendly || "No");
      setNombreCompletoPropietario(data.nombre_propietario || "");
      setEmailPropietario(data.email_propietario || "");
      setTelefonoPropietario(data.telefono_propietario || "");

      // 5. Operaciones
      const ops = data.operaciones_propiedad || [];
      const ventaOp = ops.find((o: any) => o.tipo_operacion === "venta");
      const rentaOp = ops.find((o: any) => o.tipo_operacion === "renta");

      if (ventaOp && rentaOp) {
        setTipoOperacion("ambas");
      } else if (ventaOp) {
        setTipoOperacion("venta");
      } else if (rentaOp) {
        setTipoOperacion("renta");
      }

      if (data.latitud && data.longitud) {
        setMapCenter({ lat: data.latitud, lng: data.longitud });
      }

      // Configurar campos de VENTA
      if (ventaOp) {
        setPrecioVenta(ventaOp.precio?.toString() || "");
        setMoneda(ventaOp.moneda || "MXN");
        setComparteComision(ventaOp.comparte_comision ? "Sí" : "No");

        if (ventaOp.comparte_comision) {
          setComisionTipo(
            ventaOp.comision_tipo === "monto_fijo" ? "monto" : "porcentaje",
          );
          const valor =
            ventaOp.comision_tipo === "monto_fijo"
              ? ventaOp.comision_monto_fijo
              : ventaOp.comision_porcentaje;
          setComisionValor(valor?.toString() || "");

          if (ventaOp.porcentaje_comision_compartida) {
            setComisionCompartidaTipo("porcentaje");
            setComisionCompartidaValor(
              ventaOp.porcentaje_comision_compartida.toString(),
            );
          } else if (ventaOp.monto_comision_compartida) {
            setComisionCompartidaTipo("monto");
            setComisionCompartidaValor(
              ventaOp.monto_comision_compartida.toString(),
            );
          }
          setCondicionesComision(ventaOp.condiciones_comision_compartida || "");
        }
      }

      // Configurar campos de RENTA
      if (rentaOp) {
        setPrecioRenta(rentaOp.precio?.toString() || "");
        if (!ventaOp) setMoneda(rentaOp.moneda || "MXN");

        const isAmbas = !!ventaOp;
        const setComparte = isAmbas
          ? setComparteComisionRenta
          : setComparteComision;
        const setTipo = isAmbas ? setComisionTipoRenta : setComisionTipo;
        const setValor = isAmbas ? setComisionValorRenta : setComisionValor;
        const setCompartidaTipo = isAmbas
          ? setComisionCompartidaTipoRenta
          : setComisionCompartidaTipo;
        const setCompartidaValor = isAmbas
          ? setComisionCompartidaValorRenta
          : setComisionCompartidaValor;
        const setCondiciones = isAmbas
          ? setCondicionesComisionRenta
          : setCondicionesComision;

        setComparte(rentaOp.comparte_comision ? "Sí" : "No");

        if (rentaOp.comparte_comision) {
          setTipo(
            rentaOp.comision_tipo === "monto_fijo" ? "monto" : "porcentaje",
          );
          const valor =
            rentaOp.comision_tipo === "monto_fijo"
              ? rentaOp.comision_monto_fijo
              : rentaOp.comision_porcentaje;
          setValor(valor?.toString() || "");

          if (rentaOp.porcentaje_comision_compartida) {
            setCompartidaTipo("porcentaje");
            setCompartidaValor(
              rentaOp.porcentaje_comision_compartida.toString(),
            );
          } else if (rentaOp.monto_comision_compartida) {
            setCompartidaTipo("monto");
            setCompartidaValor(rentaOp.monto_comision_compartida.toString());
          }
          setCondiciones(rentaOp.condiciones_comision_compartida || "");
        }
      }

      // 6. Amenidades
      if (data.propiedad_amenidades) {
        const names = data.propiedad_amenidades
          .map((pa: any) => pa.catalogo_amenidades?.nombre)
          .filter(Boolean);
        setAmenidadesSeleccionadas(names);
      }

      // 7. Financiamiento
      if (
        data.propiedad_financiamientos &&
        data.propiedad_financiamientos.length > 0
      ) {
        setAceptaFinanciamiento("Sí");
        const names = data.propiedad_financiamientos
          .map((pf: any) => pf.catalogo_tipos_financiamiento?.nombre)
          .filter(Boolean);
        setTiposFinanciamientoSeleccionados(names);
      } else {
        setAceptaFinanciamiento("No");
      }

      // 8. Gravamen
      if (data.propiedad_gravamenes && data.propiedad_gravamenes.length > 0) {
        setTieneGravamen("Sí");
        const grav = data.propiedad_gravamenes[0];
        setInstitucionGravamen(
          grav.catalogo_instituciones_financieras?.nombre || "",
        );
        setMontoGravamen(grav.monto?.toString() || "");
      } else {
        setTieneGravamen("No");
      }
    } catch (e: any) {
      console.error("Error loading property data:", e);
      setLoadError("Error al procesar los datos de la propiedad");
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const toggleAmenidad = useCallback((amenidad: string) => {
    setAmenidadesSeleccionadas((prev) =>
      prev.includes(amenidad)
        ? prev.filter((a) => a !== amenidad)
        : [...prev, amenidad],
    );
  }, []);

  const toggleFinanciamiento = useCallback((tipo: string) => {
    setTiposFinanciamientoSeleccionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
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
  // VALIDACIÓN
  // ============================================
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (images.length === 0) {
      newErrors.images = "Debes agregar al menos 1 imagen";
    }
    if (!descripcion.trim()) {
      newErrors.descripcion = "La descripción es requerida";
    }
    if (!subtipo) {
      newErrors.subtipo = "Debes seleccionar un subtipo de propiedad";
    }

    if (tipoOperacion === "venta" && !precioVenta.trim()) {
      newErrors.precioVenta = "El precio de venta es requerido";
    }
    if (tipoOperacion === "renta" && !precioRenta.trim()) {
      newErrors.precioRenta = "El precio de renta es requerido";
    }
    if (tipoOperacion === "ambas") {
      if (!precioVenta.trim())
        newErrors.precioVenta = "El precio de venta es requerido";
      if (!precioRenta.trim())
        newErrors.precioRenta = "El precio de renta es requerido";
    }

    if (!ubicacionData.estado) newErrors.estado = "El estado es requerido";
    if (!ubicacionData.municipio)
      newErrors.municipio = "El municipio es requerido";

    if (esTerreno(subtipo)) {
      if (!m2Terreno.trim()) {
        newErrors.m2Terreno =
          "Los m² de terreno son obligatorios para terrenos";
      }
    } else {
      if (!m2Construccion.trim() && !m2Terreno.trim()) {
        newErrors.m2 =
          "Debes especificar al menos m² de construcción o terreno";
      }
    }

    if (location.latitude === 0 && location.longitude === 0) {
      newErrors.location = "Debes seleccionar la ubicación en el mapa";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    images,
    descripcion,
    subtipo,
    tipoOperacion,
    precioVenta,
    precioRenta,
    ubicacionData,
    m2Terreno,
    m2Construccion,
    location,
  ]);

  return {
    // Loading
    isLoadingProperty,
    loadError,
    retryLoad: fetchPropertyDetails,

    // Status
    status,
    setStatus,
    originalStatus,
    filteredStatusOptions,

    // Contract
    contractData,
    setContractData,

    // Images
    images,
    setImages,

    // Información Básica
    descripcion,
    setDescripcion,
    tipoOperacion,
    setTipoOperacion,
    precioVenta,
    setPrecioVenta,
    precioRenta,
    setPrecioRenta,
    moneda,
    setMoneda,
    tipoPrincipal,
    setTipoPrincipal,
    subtipo,
    setSubtipo,

    // Ubicación
    pais,
    ubicacionData,
    setUbicacionData,
    calle,
    setCalle,
    numeroExterior,
    setNumeroExterior,
    numeroInterior,
    setNumeroInterior,
    codigoPostal,
    setCodigoPostal,
    location,
    setLocation,
    mapCenter,
    setMapCenter,

    // Características Físicas
    recamaras,
    setRecamaras,
    banosCompletos,
    setBanosCompletos,
    mediosBanos,
    setMediosBanos,
    estacionamientos,
    setEstacionamientos,
    m2Construccion,
    setM2Construccion,
    m2Terreno,
    setM2Terreno,
    niveles,
    setNiveles,
    antiguedad,
    setAntiguedad,
    amueblado,
    setAmueblado,
    petFriendly,
    setPetFriendly,
    camposVisibles,

    // Amenidades
    amenidadesSeleccionadas,
    toggleAmenidad,

    // Comisión Venta
    comparteComision,
    setComparteComision,
    comisionTipo,
    setComisionTipo,
    comisionValor,
    setComisionValor,
    comisionCompartidaTipo,
    setComisionCompartidaTipo,
    comisionCompartidaValor,
    setComisionCompartidaValor,
    condicionesComision,
    setCondicionesComision,

    // Comisión Renta
    comparteComisionRenta,
    setComparteComisionRenta,
    comisionTipoRenta,
    setComisionTipoRenta,
    comisionValorRenta,
    setComisionValorRenta,
    comisionCompartidaTipoRenta,
    setComisionCompartidaTipoRenta,
    comisionCompartidaValorRenta,
    setComisionCompartidaValorRenta,
    condicionesComisionRenta,
    setCondicionesComisionRenta,

    // Gravamen
    tieneGravamen,
    setTieneGravamen,
    institucionGravamen,
    setInstitucionGravamen,
    montoGravamen,
    setMontoGravamen,

    // Financiamiento
    aceptaFinanciamiento,
    setAceptaFinanciamiento,
    tiposFinanciamientoSeleccionados,
    toggleFinanciamiento,

    // Propietario
    nombreCompletoPropietario,
    setNombreCompletoPropietario,
    emailPropietario,
    setEmailPropietario,
    telefonoPropietario,
    setTelefonoPropietario,

    // Errors
    errors,
    setErrors,
    clearError,

    // Validation
    validate,

    // Helpers
    handleCurrencyChange,
  };
}
