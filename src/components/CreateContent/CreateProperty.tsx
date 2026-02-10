import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COORDENADAS_ESTADO } from "../../constants/locations";
import { AppInput } from "../../design-system/components/AppInput";
import * as ImagePicker from "expo-image-picker";
import { SelectionModal } from "../modals";
import NumberInputModal from "../modals/NumberInputModal";
import RadioGroupSelector from "../common/RadioGroupSelector";
import CascadeLocationSelector from "../common/CascadeLocationSelector";

import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { uploadImage as uploadImageService } from "../../services/uploadService";
import LocationPicker from "./LocationPicker";
import ReordenableImages from "./ReordenableImages";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { COLORS } from "../../constants/colors";

// Importar helpers de catálogos

// Importar constantes
import {
  PROPERTY_TYPES,
  RECAMARAS,
  BANOS,
  MEDIOS_BANOS,
  ESTACIONAMIENTOS,
  NIVELES,
  AMENIDADES,
  INSTITUCIONES_GRAVAMEN,
  TIPOS_FINANCIAMIENTO,
  MONEDAS,
  OPCIONES_AMUEBLADO,
  OPCIONES_SI_NO,
  TipoPrincipal,
  esTerreno,
  getLabelRecamaras,
  getCamposVisibles,
} from "../../constants/propertyData";
import { useStableSafeInsets } from "../../context/SafeInsetsContext";
import { ScreenWrapper } from "../../screens/ScreenWrapper";
import { ViewImage } from "../modals/ViewImage";
import { usePropertyMutation } from "@/hooks/hooks/usePropertyMutation";
import { AppHeader } from "../AppHeader";

interface CreatePropertyProps {
  onBack: (shouldRefresh?: boolean) => void;
  propertyId?: string;
}

export default function CreateProperty({
  onBack,
  propertyId,
}: CreatePropertyProps) {
  const { top } = useStableSafeInsets();
  const { user } = useAuth();
  const router = useRouter();
  const { saveProperty } = usePropertyMutation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);

  const [status, setStatus] = useState<string>("Publicada");

  // ============================================
  // 1. GALERÍA DE IMÁGENES
  // ============================================
  const [images, setImages] = useState<string[]>([]);

  // ============================================
  // 2. INFORMACIÓN BÁSICA
  // ============================================
  const [descripcion, setDescripcion] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState<
    "venta" | "renta" | "ambas"
  >("venta");
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioRenta, setPrecioRenta] = useState("");
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [tipoPrincipal, setTipoPrincipal] =
    useState<TipoPrincipal>("habitacional");
  const [subtipo, setSubtipo] = useState("");

  // ============================================
  // 3. UBICACIÓN (Usando CascadeLocationSelector)
  // ============================================
  const [pais] = useState("México");
  const [ubicacionData, setUbicacionData] = useState({
    estado: "",
    ciudad: "",
    municipio: "",
    colonia: "",
  });
  const [calle, setCalle] = useState("");
  const [numeroExterior, setNumeroExterior] = useState("");
  const [numeroInterior, setNumeroInterior] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
  });
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

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
  const [amueblado, setAmueblado] = useState<"No" | "Sí" | "Parcial">("No");
  const [petFriendly, setPetFriendly] = useState<"No" | "Sí">("No");

  // ============================================
  // 5. AMENIDADES
  // ============================================
  const [amenidadesSeleccionadas, setAmenidadesSeleccionadas] = useState<
    string[]
  >([]);

  // ============================================
  // 6. COMISIÓN (Sistema completo)
  // ============================================
  const [comparteComision, setComparteComision] = useState<"No" | "Sí">("No");
  const [comisionTipo, setComisionTipo] = useState<"porcentaje" | "monto">(
    "porcentaje",
  );
  const [comisionValor, setComisionValor] = useState("");
  const [comisionCompartidaTipo, setComisionCompartidaTipo] = useState<
    "porcentaje" | "monto"
  >("porcentaje");
  const [comisionCompartidaValor, setComisionCompartidaValor] = useState("");
  const [condicionesComision, setCondicionesComision] = useState("");

  // Variables secundarias para RENTA (Solo cuando es AMBAS)
  const [comparteComisionRenta, setComparteComisionRenta] = useState<
    "No" | "Sí"
  >("No");
  const [comisionTipoRenta, setComisionTipoRenta] = useState<
    "porcentaje" | "monto"
  >("porcentaje");
  const [comisionValorRenta, setComisionValorRenta] = useState("");
  const [comisionCompartidaTipoRenta, setComisionCompartidaTipoRenta] =
    useState<"porcentaje" | "monto">("porcentaje");
  const [comisionCompartidaValorRenta, setComisionCompartidaValorRenta] =
    useState("");
  const [condicionesComisionRenta, setCondicionesComisionRenta] = useState("");

  // ============================================
  // 7. GRAVAMEN
  // ============================================
  const [tieneGravamen, setTieneGravamen] = useState<"No" | "Sí">("No");
  const [institucionGravamen, setInstitucionGravamen] = useState("");
  const [montoGravamen, setMontoGravamen] = useState("");

  // ============================================
  // 8. FINANCIAMIENTO
  // ============================================
  const [aceptaFinanciamiento, setAceptaFinanciamiento] = useState<"No" | "Sí">(
    "No",
  );
  const [
    tiposFinanciamientoSeleccionados,
    setTiposFinanciamientoSeleccionados,
  ] = useState<string[]>([]);

  // ============================================
  // MODAL STATES
  // ============================================
  const [showMonedaModal, setShowMonedaModal] = useState(false);
  const [showTipoPrincipalModal, setShowTipoPrincipalModal] = useState(false);
  const [showSubtipoModal, setShowSubtipoModal] = useState(false);

  // Modals para campos numéricos
  const [showRecamarasModal, setShowRecamarasModal] = useState(false);
  const [showBanosModal, setShowBanosModal] = useState(false);
  const [showMediosBanosModal, setShowMediosBanosModal] = useState(false);
  const [showEstacionamientosModal, setShowEstacionamientosModal] =
    useState(false);
  const [showNivelesModal, setShowNivelesModal] = useState(false);
  const [showAntiguedadModal, setShowAntiguedadModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // NumberInputModal states
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputConfig, setNumberInputConfig] = useState({
    title: "",
    onSave: (val: string) => { },
  });

  // Modals para gravamen/financiamiento
  const [showInstitucionGravamenModal, setShowInstitucionGravamenModal] =
    useState(false);

  // Errores
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Limpieza de errores
  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const PROPERTY_STATUS = [
    "Publicada",
    "Suspendida",
    "Rentada",
    "Reservada",
    "Vendida",
  ] as const;

  React.useEffect(() => {
    if (ubicacionData.estado) clearError("estado");
    if (ubicacionData.ciudad) clearError("ciudad");
    if (ubicacionData.municipio) clearError("municipio");
  }, [ubicacionData]);

  React.useEffect(() => {
    if (images.length > 0) clearError("images");
  }, [images]);

  React.useEffect(() => {
    if (descripcion.trim()) clearError("descripcion");
  }, [descripcion]);

  React.useEffect(() => {
    if (subtipo) clearError("subtipo");
  }, [subtipo]);

  React.useEffect(() => {
    if (precioVenta.trim()) clearError("precioVenta");
  }, [precioVenta]);

  React.useEffect(() => {
    if (precioRenta.trim()) clearError("precioRenta");
  }, [precioRenta]);

  // Se movió la limpieza de errores a los onChangeText para evitar re-renders innecesarios
  // React.useEffect(() => {
  //   if (m2Construccion.trim() || m2Terreno.trim()) {
  //     clearError("m2");
  //     clearError("m2Construccion");
  //     clearError("m2Terreno");
  //   }
  // }, [m2Construccion, m2Terreno]);

  React.useEffect(() => {
    if (location.latitude !== 0 && location.longitude !== 0)
      clearError("location");
  }, [location]);

  // ============================================
  // LOAD DATA FOR EDITING
  // ============================================
  React.useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  useEffect(() => {
    if (ubicacionData.estado && COORDENADAS_ESTADO[ubicacionData.estado]) {
      const coords = COORDENADAS_ESTADO[ubicacionData.estado];
      // Actualizamos el centro visual del mapa
      setMapCenter(coords);
      // YA NO forzamos el pin, solo el foco
    }
  }, [ubicacionData.estado]);

  //

  const fetchPropertyDetails = async () => {
    try {
      setIsLoadingProperty(true);
      // Ajusta la consulta según tus relaciones reales en Supabase
      const { data, error } = await supabase
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

      if (error) throw error;
      if (data) loadPropertyData(data);
    } catch (e) {
      console.error("Error fetching property:", e);
      Alert.alert("Error", "No se pudo cargar la información de la propiedad");
      onBack();
    } finally {
      setIsLoadingProperty(false);
    }
  };

  const loadPropertyData = (data: any) => {
    // 1. Imágenes
    if (data.fotos && Array.isArray(data.fotos)) {
      setImages(data.fotos);
    }

    // 2. Info Básica
    setDescripcion(data.descripcion || "");
    setStatus(data.status || "Publicada");

    // Validar tipo para evitar crash si viene nulo o inválido
    const rawTipo = (data.tipo || "habitacional").toLowerCase();
    const isValidTipo = Object.keys(PROPERTY_TYPES).includes(rawTipo);
    const safeTipo = isValidTipo ? (rawTipo as TipoPrincipal) : "habitacional";

    setTipoPrincipal(safeTipo);
    setSubtipo(data.subtipo || "");

    // 3. Ubicación
    setUbicacionData({
      estado: data.estado || "",
      ciudad: data.ciudad || "",
      municipio: data.municipio || "",
      colonia: data.colonia || "",
    });
    setCalle(data.calle || "");
    setNumeroExterior(data.numero_exterior || "");
    setNumeroInterior(data.numero_interior || "");
    setCodigoPostal(""); // Si lo guardaras en BD, ponlo aquí.
    setLocation({
      latitude: data.latitud || 0,
      longitude: data.longitud || 0,
    });

    // 4. Características Físicas
    setRecamaras(data.habitaciones?.toString() || "0");
    setBanosCompletos(data.banos?.toString() || "0");
    setMediosBanos(""); // Si tienes campo medios_banos, úsalo
    setEstacionamientos(data.estacionamientos?.toString() || "0");
    setM2Construccion(data.metros_cuadrados_construccion?.toString() || "");
    setM2Terreno(data.metros_cuadrados_terreno?.toString() || "");
    setNiveles(data.pisos?.toString() || "1");
    setAntiguedad(data.antiguedad || "");
    setAmueblado(data.amueblado || "No");
    setPetFriendly(data.pet_friendly || "No");

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
      setMapCenter({
        lat: data.latitud,
        lng: data.longitud,
      });
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

        // Compartida
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

      // Si es "ambas", usamos variables secundarias
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
          setCompartidaValor(rentaOp.porcentaje_comision_compartida.toString());
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
  };

  // ============================================
  // HELPERS
  // ============================================
  const camposVisibles = getCamposVisibles(subtipo);

  /**
   * Abrir modal de número personalizado
   */
  const openNumberInput = (title: string, onSave: (val: string) => void) => {
    setNumberInputConfig({ title, onSave });
    setShowNumberInput(true);
  };

  /**
   * Seleccionar imágenes
   */
  const handlePickImages = async () => {
    if (images.length >= 15) {
      Alert.alert("Límite alcanzado", "Puedes subir máximo 15 imágenes");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 15 - images.length,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 15));
    }
  };

  /**
   * Remover imagen
   */
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };



  /**
   * Toggle amenidad
   */
  const toggleAmenidad = (amenidad: string) => {
    setAmenidadesSeleccionadas((prev) =>
      prev.includes(amenidad)
        ? prev.filter((a) => a !== amenidad)
        : [...prev, amenidad],
    );
  };

  /**
   * Toggle tipo de financiamiento
   */
  const toggleFinanciamiento = (tipo: string) => {
    setTiposFinanciamientoSeleccionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  /**
   * Validar formulario - CORREGIDO
   */
  const validate = () => {
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
    if (!ubicacionData.ciudad) newErrors.ciudad = "La ciudad es requerida";
    // if (!ubicacionData.municipio)
    //   newErrors.municipio = "El municipio es requerido";

    // Validación de m²
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

    // Opcional: validar que haya coordenadas en el mapa
    if (location.latitude === 0 && location.longitude === 0) {
      newErrors.location = "Debes seleccionar la ubicación en el mapa";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  /**
   * Publicar propiedad - CORREGIDO
   */
  const handlePublish = async () => {
    if (!validate()) {
      const errorMessages = Object.values(errors).join("\n• ");
      Alert.alert(
        "Faltan datos requeridos",
        errorMessages || "Por favor revisa los campos marcados en rojo",
        [{ text: "OK" }],
      );
      return;
    }

    if (!user) {
      Alert.alert("Error", "Debes iniciar sesión");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. Subir imágenes
      setUploadProgress(10);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        // Verificar si la imagen ya es una URL remota
        if (images[i].startsWith("http")) {
          uploadedUrls.push(images[i]);
          continue;
        }

        const url = await uploadImageService(images[i], "propiedades");
        if (url) {
          uploadedUrls.push(url);
        }
        setUploadProgress(10 + ((i + 1) / images.length) * 30);
      }

      if (uploadedUrls.length === 0) {
        throw new Error("No se pudieron subir las imágenes");
      }

      setUploadProgress(40);

      // 2. Datos de la Propiedad
      const propertyData = {
        tipo: tipoPrincipal,
        subtipo: subtipo || PROPERTY_TYPES[tipoPrincipal][0],
        descripcion: descripcion,
        ciudad: ubicacionData.ciudad,
        municipio: ubicacionData.municipio,
        estado: ubicacionData.estado,
        colonia: ubicacionData.colonia || null,
        calle: calle || null,
        numero_exterior: numeroExterior || null,
        numero_interior: numeroInterior || null,
        latitud: location.latitude,
        longitud: location.longitude,
        fotos: uploadedUrls,
        habitaciones: camposVisibles.recamaras ? parseInt(recamaras) || 0 : 0,
        banos: camposVisibles.banos ? parseInt(banosCompletos) || 0 : 0,
        estacionamientos: camposVisibles.estacionamientos
          ? parseInt(estacionamientos) || 0
          : 0,
        metros_cuadrados_construccion: camposVisibles.m2Construccion
          ? parseFloat(m2Construccion) || null
          : null,
        metros_cuadrados_terreno: camposVisibles.m2Terreno
          ? parseFloat(m2Terreno) || null
          : null,
        pisos: camposVisibles.niveles ? parseInt(niveles) || 1 : null,
        amueblado: camposVisibles.amueblado ? amueblado : null,
        pet_friendly: camposVisibles.petFriendly ? petFriendly : "No",
        antiguedad: camposVisibles.antiguedad ? antiguedad : null,
        status: status,
        activo: status === "Publicada",
        created_by: user.id,
      };

      // 3. Preparar Operaciones
      const operaciones = [];

      if (tipoOperacion === "venta" || tipoOperacion === "ambas") {
        operaciones.push({
          tipo_operacion: "venta",
          precio: parseFloat(precioVenta.replace(/,/g, "")),
          moneda: moneda,
          comparte_comision: comparteComision === "Sí",
          comision_tipo:
            comparteComision === "Sí"
              ? comisionTipo === "monto"
                ? "monto_fijo"
                : comisionTipo
              : null,
          comision_porcentaje:
            comparteComision === "Sí" && comisionTipo === "porcentaje"
              ? parseFloat(comisionValor.replace(/,/g, ""))
              : null,
          comision_monto_fijo:
            comparteComision === "Sí" && comisionTipo === "monto"
              ? parseFloat(comisionValor.replace(/,/g, ""))
              : null,
          porcentaje_comision_compartida:
            comparteComision === "Sí" && comisionCompartidaTipo === "porcentaje"
              ? parseFloat(comisionCompartidaValor.replace(/,/g, ""))
              : null,
          monto_comision_compartida:
            comparteComision === "Sí" && comisionCompartidaTipo === "monto"
              ? parseFloat(comisionCompartidaValor.replace(/,/g, ""))
              : null,
          condiciones_comision_compartida:
            comparteComision === "Sí" && condicionesComision
              ? condicionesComision
              : null,
        });
      }

      if (tipoOperacion === "renta" || tipoOperacion === "ambas") {
        const isAmbas = tipoOperacion === "ambas";
        const comparte = isAmbas ? comparteComisionRenta : comparteComision;
        const tipo = isAmbas ? comisionTipoRenta : comisionTipo;
        const valor = isAmbas ? comisionValorRenta : comisionValor;
        const compartidaTipo = isAmbas
          ? comisionCompartidaTipoRenta
          : comisionCompartidaTipo;
        const compartidaValor = isAmbas
          ? comisionCompartidaValorRenta
          : comisionCompartidaValor;
        const condiciones = isAmbas
          ? condicionesComisionRenta
          : condicionesComision;

        operaciones.push({
          tipo_operacion: "renta",
          precio: parseFloat(precioRenta.replace(/,/g, "")),
          moneda: moneda,
          comparte_comision: comparte === "Sí",
          comision_tipo:
            comparte === "Sí" ? (tipo === "monto" ? "monto_fijo" : tipo) : null,
          comision_porcentaje:
            comparte === "Sí" && tipo === "porcentaje"
              ? parseFloat(valor.replace(/,/g, ""))
              : null,
          comision_monto_fijo:
            comparte === "Sí" && tipo === "monto"
              ? parseFloat(valor.replace(/,/g, ""))
              : null,
          porcentaje_comision_compartida:
            comparte === "Sí" && compartidaTipo === "porcentaje"
              ? parseFloat(compartidaValor.replace(/,/g, ""))
              : null,
          monto_comision_compartida:
            comparte === "Sí" && compartidaTipo === "monto"
              ? parseFloat(compartidaValor.replace(/,/g, ""))
              : null,
          condiciones_comision_compartida:
            comparte === "Sí" && condiciones ? condiciones : null,
        });
      }

      setUploadProgress(60);

      // 4. Preparar Datos Relacionados
      const relatedData = {
        operaciones,
        amenidades: amenidadesSeleccionadas,
        financiamientos:
          aceptaFinanciamiento === "Sí" ? tiposFinanciamientoSeleccionados : [],
        gravamenes:
          tieneGravamen === "Sí" && institucionGravamen
            ? [
              {
                institucion: institucionGravamen,
                monto: montoGravamen ? parseFloat(montoGravamen) : null,
              },
            ]
            : [],
      };

      setUploadProgress(80);

      // 5. Guardar Propiedad
      await saveProperty(propertyId, propertyData, relatedData);

      setUploadProgress(100);

      Alert.alert(
        "¡Éxito!",
        propertyId
          ? "Propiedad actualizada correctamente"
          : "Propiedad publicada correctamente",
        [
          {
            text: "OK",
            onPress: () => {
              if (!propertyId) {
                router.replace({
                  pathname: "/(tabs)",
                  params: { refresh: String(Date.now()) },
                });
              } else {
                if (onBack) onBack(true);
              }
            },
          },
        ],
      );
    } catch (error: any) {
      console.error("Error publishing property:", error);
      Alert.alert("Error", error.message || "No se pudo publicar la propiedad");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Formatear input de moneda con comas
   */
  const handleCurrencyChange = (
    text: string,
    setter: (val: string) => void,
  ) => {
    // Eliminar comas para obtener el valor numérico crudo
    const rawValue = text.replace(/,/g, "");

    // Validar formato numérico (acepta decimales)
    if (/^\d*\.?\d*$/.test(rawValue)) {
      const parts = rawValue.split(".");
      // Formatear parte entera con comas
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setter(parts.join("."));
    }
  };

  /**
   * Renderizador del formulario de comisión
   */
  const renderCommissionForm = (
    title: string,
    values: {
      comparte: "No" | "Sí";
      tipo: "porcentaje" | "monto";
      valor: string;
      compartidaTipo: "porcentaje" | "monto";
      compartidaValor: string;
      condiciones: string;
    },
    setters: {
      setComparte: (val: "No" | "Sí") => void;
      setTipo: (val: "porcentaje" | "monto") => void;
      setValor: (val: string) => void;
      setCompartidaTipo: (val: "porcentaje" | "monto") => void;
      setCompartidaValor: (val: string) => void;
      setCondiciones: (val: string) => void;
    },
    isSecondInstance = false,
  ) => (
    <View
      style={
        isSecondInstance
          ? {
            marginTop: 24,
            paddingTop: 24,
            borderTopWidth: 1,
            borderTopColor: COLORS.cardBorder,
          }
          : {}
      }
    >
      {tipoOperacion === "ambas" && (
        <Text
          style={[
            styles.sectionTitle,
            { fontSize: 16, marginBottom: 12, color: COLORS.textPrimary },
          ]}
        >
          {title}
        </Text>
      )}

      <RadioGroupSelector
        label="¿Compartes comisión?"
        options={[...OPCIONES_SI_NO]}
        selectedValue={values.comparte}
        onSelect={(val) => setters.setComparte(val as any)}
      />

      {values.comparte === "Sí" && (
        <View>
          <Text style={styles.label}>¿Cuánto es tu comisión?</Text>
          <RadioGroupSelector
            options={["Porcentaje", "Monto"]}
            selectedValue={
              values.tipo === "porcentaje" ? "Porcentaje" : "Monto"
            }
            onSelect={(val) =>
              setters.setTipo(val === "Porcentaje" ? "porcentaje" : "monto")
            }
          />

          {values.tipo === "porcentaje" ? (
            <AppInput
              label="Porcentaje (%)"
              placeholder="3.0"
              keyboardType="numeric"
              value={values.valor}
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!text || (num >= 0 && num <= 100)) {
                  setters.setValor(text);
                }
              }}
            />
          ) : (
            <AppInput
              label="Monto"
              placeholder="0.00"
              keyboardType="numeric"
              value={values.valor}
              onChangeText={(text) =>
                handleCurrencyChange(text, setters.setValor)
              }
              leftIcon={
                <TouchableOpacity
                  style={styles.currencySelector}
                  onPress={() => setShowMonedaModal(true)}
                >
                  <Text style={styles.selectorText}>{moneda}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
          )}

          <Text style={styles.label}>¿Cuánto de tu comisión compartes?</Text>
          <RadioGroupSelector
            options={["Porcentaje", "Monto"]}
            selectedValue={
              values.compartidaTipo === "porcentaje" ? "Porcentaje" : "Monto"
            }
            onSelect={(val) =>
              setters.setCompartidaTipo(
                val === "Porcentaje" ? "porcentaje" : "monto",
              )
            }
          />

          {values.compartidaTipo === "porcentaje" ? (
            <AppInput
              label="Porcentaje de Comisión (%)"
              placeholder="1.5"
              keyboardType="numeric"
              value={values.compartidaValor}
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!text || (num >= 0 && num <= 100)) {
                  setters.setCompartidaValor(text);
                }
              }}
            />
          ) : (
            <AppInput
              label="Monto Compartido"
              placeholder="0.00"
              keyboardType="numeric"
              value={values.compartidaValor}
              onChangeText={(text) =>
                handleCurrencyChange(text, setters.setCompartidaValor)
              }
              leftIcon={
                <TouchableOpacity
                  style={styles.currencySelector}
                  onPress={() => setShowMonedaModal(true)}
                >
                  <Text style={styles.selectorText}>{moneda}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
          )}

          <AppInput
            label="Condiciones (opcional)"
            placeholder="Detalles de la comisión compartida..."
            value={values.condiciones}
            onChangeText={setters.setCondiciones}
            multiline
            numberOfLines={3}
            inputStyle={styles.textArea}
          />
        </View>
      )}
    </View>
  );

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {propertyId ? "Editar Propiedad" : "Crear Propiedad"}
        </Text>
        <View style={{ width: 40 }} />
      </View> */}

      <AppHeader
        title={propertyId ? "Editar Propiedad" : "Crear Propiedad"}
        showBackButton={true}
        onBack={() => onBack(false)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* ============================================ */}
        {/* 1. GALERÍA DE IMÁGENES */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Fotos de la Propiedad</Text>
          </View>
          <Text style={styles.hint}>
            Mínimo 1 imagen, máximo 15 ({images.length}/15)
          </Text>

          <GestureHandlerRootView>
            <ReordenableImages
              images={images}
              onReorder={(newOrder) => setImages(newOrder)}
              onRemove={handleRemoveImage}
            />
          </GestureHandlerRootView>

          {images.length < 15 && (
            <TouchableOpacity
              onPress={handlePickImages}
              style={[
                styles.uploadBtn,
                errors.images && styles.uploadBtnError,
                { marginTop: 12 },
              ]}
            >
              <Ionicons name="camera" size={32} color={COLORS.textTertiary} />
              <Text style={styles.uploadText}>Agregar</Text>
            </TouchableOpacity>
          )}
          {errors.images && (
            <Text style={styles.errorText}>{errors.images}</Text>
          )}
        </View>

        {/* ============================================ */}
        {/* Update Estado */}
        {/* ============================================ */}

        {propertyId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado de la Propiedad</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={styles.selectorText}>{status}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================ */}
        {/* 2. INFORMACIÓN BÁSICA */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="information-circle"
              size={24}
              color={COLORS.primary}
            />
            <Text style={styles.sectionTitle}>Información Básica</Text>
          </View>

          <AppInput
            label="Descripción *"
            placeholder="Describe las características principales..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            maxLength={500}
            helperText={`${descripcion.length}/500`}
            inputStyle={styles.textArea}
            error={errors.descripcion}
          />

          <RadioGroupSelector
            label="Tipo de Operación *"
            options={["venta", "renta", "ambas"]}
            selectedValue={tipoOperacion}
            onSelect={(val) => setTipoOperacion(val as any)}
          />

          {(tipoOperacion === "venta" || tipoOperacion === "ambas") && (
            <AppInput
              label="Precio de Venta *"
              placeholder="0.00"
              keyboardType="numeric"
              value={precioVenta}
              onChangeText={(text) =>
                handleCurrencyChange(text, setPrecioVenta)
              }
              error={errors.precioVenta}
              leftIcon={
                <TouchableOpacity
                  style={styles.currencySelector}
                  onPress={() => setShowMonedaModal(true)}
                >
                  <Text style={styles.selectorText}>{moneda}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
          )}

          {(tipoOperacion === "renta" || tipoOperacion === "ambas") && (
            <AppInput
              label="Precio de Renta Mensual *"
              placeholder="0.00"
              keyboardType="numeric"
              value={precioRenta}
              onChangeText={(text) =>
                handleCurrencyChange(text, setPrecioRenta)
              }
              error={errors.precioRenta}
              leftIcon={
                <TouchableOpacity
                  style={styles.currencySelector}
                  onPress={() => setShowMonedaModal(true)}
                >
                  <Text style={styles.selectorText}>{moneda}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
          )}

          <SelectionModal
            visible={showMonedaModal}
            onClose={() => setShowMonedaModal(false)}
            onSelect={(val) => setMoneda(val as any)}
            title="Moneda"
            options={[...MONEDAS]}
            currentValue={moneda}
          />

          <Text style={styles.label}>Tipo de Propiedad *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowTipoPrincipalModal(true)}
          >
            <Text style={styles.selectorText}>
              {tipoPrincipal.charAt(0).toUpperCase() + tipoPrincipal.slice(1)}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <SelectionModal
            visible={showTipoPrincipalModal}
            onClose={() => setShowTipoPrincipalModal(false)}
            onSelect={(val) => {
              setTipoPrincipal(val as any);
              setSubtipo("");
            }}
            title="Tipo de Propiedad"
            options={[
              { label: "Habitacional", value: "habitacional" },
              { label: "Comercial", value: "comercial" },
              { label: "Industrial", value: "industrial" },
              { label: "Agrícola", value: "agricola" },
            ]}
            currentValue={tipoPrincipal}
          />
          {/* Después del SelectionModal del subtipo */}
          {errors.subtipo && (
            <Text style={styles.errorText}>{errors.subtipo}</Text>
          )}

          <Text style={styles.label}>Subtipo *</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowSubtipoModal(true)}
          >
            <Text
              style={subtipo ? styles.selectorText : styles.selectorPlaceholder}
            >
              {subtipo || "Selecciona..."}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <SelectionModal
            visible={showSubtipoModal}
            onClose={() => setShowSubtipoModal(false)}
            onSelect={setSubtipo}
            title="Subtipo"
            options={[...PROPERTY_TYPES[tipoPrincipal]]}
            currentValue={subtipo}
            searchable
          />
        </View>

        {/* ============================================ */}
        {/* 3. UBICACIÓN (CascadeLocationSelector) */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Ubicación</Text>
          </View>

          <AppInput label="País" value={pais} editable={false} />

          <CascadeLocationSelector
            initialData={ubicacionData}
            onChange={setUbicacionData}
            showColonia={true}
          />
          {errors.estado && (
            <Text style={styles.errorText}>{errors.estado}</Text>
          )}
          {errors.ciudad && (
            <Text style={styles.errorText}>{errors.ciudad}</Text>
          )}
          {errors.municipio && (
            <Text style={styles.errorText}>{errors.municipio}</Text>
          )}

          <AppInput
            label="Calle"
            placeholder="Ej: Av. Constitución"
            value={calle}
            onChangeText={setCalle}
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <AppInput
                label="Número Ext."
                placeholder="123"
                value={numeroExterior}
                onChangeText={setNumeroExterior}
              />
            </View>
            <View style={styles.halfWidth}>
              <AppInput
                label="Número Int."
                placeholder="A"
                value={numeroInterior}
                onChangeText={setNumeroInterior}
              />
            </View>
          </View>

          <AppInput
            label="Código Postal"
            placeholder="64000"
            keyboardType="numeric"
            value={codigoPostal}
            onChangeText={setCodigoPostal}
            maxLength={6}
          />
        </View>

        {/* ============================================ */}
        {/* 4. CARACTERÍSTICAS FÍSICAS */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="home" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Características Físicas</Text>
          </View>

          {/* RECÁMARAS - Solo si no es terreno */}
          {camposVisibles.recamaras && (
            <>
              <Text style={styles.label}>
                {getLabelRecamaras(tipoPrincipal)}
              </Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowRecamarasModal(true)}
              >
                <Text style={styles.selectorText}>{recamaras || "0"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showRecamarasModal}
                onClose={() => setShowRecamarasModal(false)}
                onSelect={(val) => {
                  if (val === "Más") {
                    openNumberInput(
                      getLabelRecamaras(tipoPrincipal),
                      (customVal) => setRecamaras(customVal),
                    );
                  } else {
                    setRecamaras(val);
                  }
                }}
                title={getLabelRecamaras(tipoPrincipal)}
                options={[...RECAMARAS]}
                currentValue={recamaras}
              />
            </>
          )}

          {/* BAÑOS COMPLETOS */}
          {camposVisibles.banos && (
            <>
              <Text style={styles.label}>Baños Completos</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowBanosModal(true)}
              >
                <Text style={styles.selectorText}>{banosCompletos || "0"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showBanosModal}
                onClose={() => setShowBanosModal(false)}
                onSelect={(val) => {
                  if (val === "Más") {
                    openNumberInput("Baños Completos", (customVal) =>
                      setBanosCompletos(customVal),
                    );
                  } else {
                    setBanosCompletos(val);
                  }
                }}
                title="Baños Completos"
                options={[...BANOS]}
                currentValue={banosCompletos}
              />
            </>
          )}

          {/* MEDIOS BAÑOS */}
          {camposVisibles.mediosBanos && (
            <>
              <Text style={styles.label}>1/2 Baños</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowMediosBanosModal(true)}
              >
                <Text style={styles.selectorText}>{mediosBanos || "0"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showMediosBanosModal}
                onClose={() => setShowMediosBanosModal(false)}
                onSelect={(val) => {
                  if (val === "Más") {
                    openNumberInput("1/2 Baños", (customVal) =>
                      setMediosBanos(customVal),
                    );
                  } else {
                    setMediosBanos(val);
                  }
                }}
                title="1/2 Baños"
                options={[...MEDIOS_BANOS]}
                currentValue={mediosBanos}
              />
            </>
          )}

          {/* ESTACIONAMIENTOS */}
          {camposVisibles.estacionamientos && (
            <>
              <Text style={styles.label}>Estacionamientos</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowEstacionamientosModal(true)}
              >
                <Text style={styles.selectorText}>
                  {estacionamientos || "0"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showEstacionamientosModal}
                onClose={() => setShowEstacionamientosModal(false)}
                onSelect={(val) => {
                  if (val === "Más") {
                    openNumberInput("Estacionamientos", (customVal) =>
                      setEstacionamientos(customVal),
                    );
                  } else {
                    setEstacionamientos(val);
                  }
                }}
                title="Estacionamientos"
                options={[...ESTACIONAMIENTOS]}
                currentValue={estacionamientos}
              />
            </>
          )}

          {/* NIVELES */}
          {camposVisibles.niveles && (
            <>
              <Text style={styles.label}>Niveles</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowNivelesModal(true)}
              >
                <Text style={styles.selectorText}>{niveles || "1"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showNivelesModal}
                onClose={() => setShowNivelesModal(false)}
                onSelect={(val) => {
                  if (val === "Más") {
                    openNumberInput("Niveles", (customVal) =>
                      setNiveles(customVal),
                    );
                  } else {
                    setNiveles(val);
                  }
                }}
                title="Niveles"
                options={[...NIVELES]}
                currentValue={niveles}
              />
            </>
          )}

          {/* ANTIGÜEDAD */}
          {camposVisibles.antiguedad && (
            <>
              <Text style={styles.label}>Antigüedad (años)</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowAntiguedadModal(true)}
              >
                <Text
                  style={
                    antiguedad
                      ? styles.selectorText
                      : styles.selectorPlaceholder
                  }
                >
                  {antiguedad || "Selecciona..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showAntiguedadModal}
                onClose={() => setShowAntiguedadModal(false)}
                onSelect={(val) => {
                  if (val === "Más de 50") {
                    openNumberInput("Antigüedad (años)", (customVal) =>
                      setAntiguedad(customVal),
                    );
                  } else {
                    setAntiguedad(val);
                  }
                }}
                title="Antigüedad"
                options={[
                  "0 (Nueva)",
                  "1-5",
                  "6-10",
                  "11-20",
                  "21-50",
                  "Más de 50",
                ]}
                currentValue={antiguedad}
              />
            </>
          )}

          {/* M2 CONSTRUCCIÓN */}
          {camposVisibles.m2Construccion && (
            <AppInput
              label="m² de Construcción *"
              placeholder="m²"
              keyboardType="decimal-pad"
              value={m2Construccion || ""}
              onChangeText={(text) => {
                setM2Construccion(text);
                if (text) {
                  clearError("m2");
                  clearError("m2Construccion");
                }
              }}
              error={errors.m2}
            />
          )}

          {/* M2 TERRENO */}
          {camposVisibles.m2Terreno && (
            <AppInput
              label={`m² de Terreno ${esTerreno(subtipo) ? "*" : ""}`}
              placeholder="m²"
              keyboardType="decimal-pad"
              value={m2Terreno || ""}
              onChangeText={(text) => {
                setM2Terreno(text);
                if (text) {
                  clearError("m2");
                  clearError("m2Terreno");
                }
              }}
              error={errors.m2 || errors.m2Terreno}
            />
          )}

          {/* AMUEBLADO */}
          {camposVisibles.amueblado && (
            <RadioGroupSelector
              label="Amueblado"
              options={[...OPCIONES_AMUEBLADO]}
              selectedValue={amueblado}
              onSelect={(val) => setAmueblado(val as any)}
            />
          )}

          {/* PET FRIENDLY */}
          {tipoOperacion === "renta" || tipoOperacion === "ambas"
            ? camposVisibles.petFriendly && (
              <RadioGroupSelector
                label="Mascotas Permitidas"
                options={[...OPCIONES_SI_NO]}
                selectedValue={petFriendly}
                onSelect={(val) => setPetFriendly(val as any)}
              />
            )
            : null}
        </View>

        {/* ============================================ */}
        {/* 5. AMENIDADES */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Amenidades</Text>
          </View>

          <View style={styles.amenidadesGrid}>
            {AMENIDADES.map((amenidad) => (
              <TouchableOpacity
                key={amenidad}
                style={[
                  styles.amenidadChip,
                  amenidadesSeleccionadas.includes(amenidad) &&
                  styles.amenidadChipActive,
                ]}
                onPress={() => toggleAmenidad(amenidad)}
              >
                <Text
                  style={[
                    styles.amenidadText,
                    amenidadesSeleccionadas.includes(amenidad) &&
                    styles.amenidadTextActive,
                  ]}
                >
                  {amenidad}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ============================================ */}
        {/* 6. COMISIÓN (Sistema completo) */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Comisión</Text>
          </View>

          {renderCommissionForm(
            tipoOperacion === "ambas" ? "Comisión para Venta" : "Comisión",
            {
              comparte: comparteComision,
              tipo: comisionTipo,
              valor: comisionValor,
              compartidaTipo: comisionCompartidaTipo,
              compartidaValor: comisionCompartidaValor,
              condiciones: condicionesComision,
            },
            {
              setComparte: setComparteComision,
              setTipo: setComisionTipo,
              setValor: setComisionValor,
              setCompartidaTipo: setComisionCompartidaTipo,
              setCompartidaValor: setComisionCompartidaValor,
              setCondiciones: setCondicionesComision,
            },
          )}

          {tipoOperacion === "ambas" &&
            renderCommissionForm(
              "Comisión para Renta",
              {
                comparte: comparteComisionRenta,
                tipo: comisionTipoRenta,
                valor: comisionValorRenta,
                compartidaTipo: comisionCompartidaTipoRenta,
                compartidaValor: comisionCompartidaValorRenta,
                condiciones: condicionesComisionRenta,
              },
              {
                setComparte: setComparteComisionRenta,
                setTipo: setComisionTipoRenta,
                setValor: setComisionValorRenta,
                setCompartidaTipo: setComisionCompartidaTipoRenta,
                setCompartidaValor: setComisionCompartidaValorRenta,
                setCondiciones: setCondicionesComisionRenta,
              },
              true,
            )}
        </View>

        {/* ============================================ */}
        {/* 7. GRAVAMEN */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Gravamen</Text>
          </View>

          <RadioGroupSelector
            label="¿Tiene gravamen?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={tieneGravamen}
            onSelect={(val) => setTieneGravamen(val as any)}
          />

          {tieneGravamen === "Sí" && (
            <>
              <Text style={styles.label}>Institución</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowInstitucionGravamenModal(true)}
              >
                <Text
                  style={
                    institucionGravamen
                      ? styles.selectorText
                      : styles.selectorPlaceholder
                  }
                >
                  {institucionGravamen || "Selecciona una institución..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showInstitucionGravamenModal}
                onClose={() => setShowInstitucionGravamenModal(false)}
                onSelect={(val) => setInstitucionGravamen(val)}
                title="Institución de Gravamen"
                options={[...INSTITUCIONES_GRAVAMEN]}
                currentValue={institucionGravamen}
                searchable
              />

              <AppInput
                label="Monto del Gravamen (opcional)"
                placeholder="0.00"
                keyboardType="numeric"
                value={montoGravamen}
                onChangeText={(text) =>
                  handleCurrencyChange(text, setMontoGravamen)
                }
              />
            </>
          )}
        </View>

        {/* ============================================ */}
        {/* 8. FINANCIAMIENTO */}
        {/* ============================================ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Financiamiento</Text>
          </View>

          <RadioGroupSelector
            label="¿Acepta financiamiento?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={aceptaFinanciamiento}
            onSelect={(val) => setAceptaFinanciamiento(val as any)}
          />

          {aceptaFinanciamiento === "Sí" && (
            <>
              <Text style={styles.label}>Tipos de Financiamiento</Text>
              <View style={styles.amenidadesGrid}>
                {TIPOS_FINANCIAMIENTO.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.amenidadChip,
                      tiposFinanciamientoSeleccionados.includes(tipo) &&
                      styles.amenidadChipActive,
                    ]}
                    onPress={() => toggleFinanciamiento(tipo)}
                  >
                    <Text
                      style={[
                        styles.amenidadText,
                        tiposFinanciamientoSeleccionados.includes(tipo) &&
                        styles.amenidadTextActive,
                      ]}
                    >
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* ============================================ */}
        {/* 9. UBICACIÓN EN MAPA */}
        {/* ============================================ */}
        <View style={[styles.section, { paddingBottom: 50 }]}>
          <LocationPicker
            onLocationSelected={setLocation}
            selectedLocation={
              location.latitude !== 0 && location.longitude !== 0
                ? location
                : null
            }
            focusLocation={
              mapCenter
                ? { latitude: mapCenter.lat, longitude: mapCenter.lng }
                : null
            }
          />
          {errors.location && (
            <Text style={styles.errorText}>{errors.location}</Text>
          )}
        </View>
      </ScrollView>

      {/* ============================================ */}
      {/* FOOTER - BOTÓN PUBLICAR */}
      {/* ============================================ */}
      <View
        style={[
          styles.footer,
          propertyId ? { paddingBottom: 50 } : { paddingBottom: 50 },
        ]}
      >
        <TouchableOpacity
          style={[styles.publishBtn, uploading && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator color={COLORS.white} />
              <Text style={styles.publishText}>Publicando...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.white}
              />
              <Text style={styles.publishText}>
                {propertyId ? "Actualizar Propiedad" : "Publicar Propiedad"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ============================================ */}
      {/* MODAL DE PROGRESO */}
      {/* ============================================ */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.uploadModalTitle}>Publicando propiedad...</Text>
            <Text style={styles.uploadModalSubtitle}>
              {uploadProgress}% completado
            </Text>
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* NUMBER INPUT MODAL */}
      {/* ============================================ */}
      <NumberInputModal
        visible={showNumberInput}
        onClose={() => setShowNumberInput(false)}
        onSave={numberInputConfig.onSave}
        title={numberInputConfig.title}
        placeholder="Ingresa un número"
        maxValue={999}
        minValue={0}
      />
      <SelectionModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSelect={(val) => setStatus(val)}
        title="Estado de la Propiedad"
        options={[...PROPERTY_STATUS]}
        currentValue={status}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  selector: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    color: COLORS.textTertiary,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
    borderRadius: 12,
  },
  textArea: {
    height: 100,
    width: "100%",
    textAlignVertical: "top",
    fontSize: 15,
    padding: 14,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: "right",
    marginTop: -8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.error,
    padding: 4,
    borderRadius: 12,
  },
  uploadBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textDisabled,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  uploadBtnError: {
    borderColor: COLORS.error,
  },
  uploadText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  priceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  currencySelector: {
    width: 110,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  amenidadesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenidadChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  amenidadChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  amenidadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  amenidadTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  uploadModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },

});
