/**
 * EditProperty.tsx - VERSIÓN CORREGIDA COMPLETA
 * Formulario para editar propiedades inmobiliarias existentes.
 * Incluye manejo robusto de datos undefined/null y mejor gestión de imágenes
 * SOLO campos que existen en la base de datos
 */

import React, { useState, useEffect } from "react";
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
import { AppInput } from "../../design-system/components/AppInput";
import * as ImagePicker from "expo-image-picker";
import { SelectionModal } from "../modals";
import NumberInputModal from "../modals/NumberInputModal";
import RadioGroupSelector from "../common/RadioGroupSelector";
import CascadeLocationSelector from "../common/CascadeLocationSelector";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { useImageUpload } from "../../hooks";
import LocationPicker from "../CreateContent/LocationPicker";
import { COLORS } from "../../constants/colors";

// Importar helpers de catálogos
import {
  findInstitucionFinancieraId,
  findAmenidadesIds,
  findTiposFinanciamientoIds,
} from "../../lib/catalogHelpers";

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
  TIPOS_OPERACION,
  OPCIONES_AMUEBLADO,
  OPCIONES_SI_NO,
  TipoPrincipal,
  esTerreno,
  esDepartamento,
  esComercialIndustrial,
  getLabelRecamaras,
  getCamposVisibles,
} from "../../constants/propertyData";

const PROPERTY_STATUS = [
  "Publicada",
  "Suspendida",
  "Rentada",
  "Reservada",
  "Vendida",
] as const;

interface EditPropertyProps {
  propertyId: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function EditProperty({ propertyId, onBack, onSuccess }: EditPropertyProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadImage } = useImageUpload();

  // ============================================
  // 1. GALERÍA DE IMÁGENES
  // ============================================
  const [images, setImages] = useState<string[]>([]);

  // ============================================
  // 2. INFORMACIÓN BÁSICA
  // ============================================
  const [descripcionPlantaBaja, setDescripcionPlantaBaja] = useState("");
  const [descripcionPlantaAlta, setDescripcionPlantaAlta] = useState("");
  const [tipoOperacion, setTipoOperacion] = useState<"venta" | "renta" | "ambas">("venta");
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioRenta, setPrecioRenta] = useState("");
  const [moneda, setMoneda] = useState<"MXN" | "USD">("MXN");
  const [tipoPrincipal, setTipoPrincipal] = useState<TipoPrincipal>("habitacional");
  const [subtipo, setSubtipo] = useState("");
  const [status, setStatus] = useState<string>("Publicada");

  // ============================================
  // 3. UBICACIÓN
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
  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
  });

  // ============================================
  // 4. CARACTERÍSTICAS FÍSICAS (SOLO CAMPOS QUE EXISTEN EN BD)
  // ============================================
  const [recamaras, setRecamaras] = useState("0");
  const [banosCompletos, setBanosCompletos] = useState("0");
  const [estacionamientos, setEstacionamientos] = useState("0");
  const [m2Construccion, setM2Construccion] = useState("");
  const [niveles, setNiveles] = useState("1");
  const [antiguedad, setAntiguedad] = useState("");
  const [amueblado, setAmueblado] = useState<"No" | "Sí" | "Parcial">("No");
  const [petFriendly, setPetFriendly] = useState<"No" | "Sí">("No");

  // ============================================
  // 5. AMENIDADES
  // ============================================
  const [amenidadesSeleccionadas, setAmenidadesSeleccionadas] = useState<string[]>([]);

  // ============================================
  // 6. COMISIÓN
  // ============================================
  const [comparteComision, setComparteComision] = useState<"No" | "Sí">("No");
  const [comisionTipo, setComisionTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [comisionValor, setComisionValor] = useState("");
  const [comisionCompartidaTipo, setComisionCompartidaTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [comisionCompartidaValor, setComisionCompartidaValor] = useState("");
  const [condicionesComision, setCondicionesComision] = useState("");

  const [comparteComisionRenta, setComparteComisionRenta] = useState<"No" | "Sí">("No");
  const [comisionTipoRenta, setComisionTipoRenta] = useState<"porcentaje" | "monto">("porcentaje");
  const [comisionValorRenta, setComisionValorRenta] = useState("");
  const [comisionCompartidaTipoRenta, setComisionCompartidaTipoRenta] = useState<"porcentaje" | "monto">("porcentaje");
  const [comisionCompartidaValorRenta, setComisionCompartidaValorRenta] = useState("");
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
  const [aceptaFinanciamiento, setAceptaFinanciamiento] = useState<"No" | "Sí">("No");
  const [tiposFinanciamientoSeleccionados, setTiposFinanciamientoSeleccionados] = useState<string[]>([]);

  // ============================================
  // MODAL STATES
  // ============================================
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMonedaModal, setShowMonedaModal] = useState(false);
  const [showTipoPrincipalModal, setShowTipoPrincipalModal] = useState(false);
  const [showSubtipoModal, setShowSubtipoModal] = useState(false);
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputConfig, setNumberInputConfig] = useState({ title: "", onSave: (val: string) => {} });
  const [showInstitucionGravamenModal, setShowInstitucionGravamenModal] = useState(false);
  const [showAmenidadesModal, setShowAmenidadesModal] = useState(false);
  const [showFinanciamientoModal, setShowFinanciamientoModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calcular campos visibles de forma segura
  const camposVisibles = subtipo ? getCamposVisibles(subtipo) : {
    recamaras: true,
    banos: true,
    estacionamientos: true,
    m2Construccion: true,
    niveles: true,
    amueblado: true,
    petFriendly: true,
    antiguedad: true,
  };

  useEffect(() => {
    if (propertyId) {
      fetchPropertyData();
    }
  }, [propertyId]);

  /**
   * Helper para manejar valores numéricos de forma segura
   */
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (value === null || value === undefined || value === "") return defaultValue;
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? defaultValue : num;
  };

  /**
   * Helper para manejar strings de forma segura
   */
  const safeString = (value: any, defaultValue: string = ""): string => {
    if (value === null || value === undefined) return defaultValue;
    return String(value);
  };

  /**
   * Helper para manejar arrays de forma segura
   */
  const safeArray = <T,>(value: any, defaultValue: T[] = []): T[] => {
    if (!Array.isArray(value)) return defaultValue;
    return value.filter(item => item !== null && item !== undefined);
  };

  const fetchPropertyData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch propiedad base con manejo de errores robusto
      const { data: prop, error: propError } = await supabase
        .from("propiedades")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (propError) {
        console.error("Error fetching property:", propError);
        throw new Error("No se pudo cargar la propiedad");
      }

      if (!prop) {
        throw new Error("Propiedad no encontrada");
      }

      console.log("✅ Property loaded successfully");

      // Initialize basic info con valores seguros
      setDescripcionPlantaBaja(safeString(prop.descripcion_planta_baja));
      setDescripcionPlantaAlta(safeString(prop.descripcion_planta_alta));
      setTipoPrincipal(safeString(prop.tipo, "habitacional") as TipoPrincipal);
      setSubtipo(safeString(prop.subtipo));
      setStatus(prop.activo ? "Publicada" : "Suspendida");

      // Ubicación con valores seguros
      setUbicacionData({
        estado: safeString(prop.estado),
        ciudad: safeString(prop.ciudad),
        municipio: safeString(prop.municipio),
        colonia: "", // No existe en BD, se mantiene vacío
      });
      setCalle(safeString(prop.calle));
      setNumeroExterior(safeString(prop.numero_exterior));
      setNumeroInterior(safeString(prop.numero_interior));
      
      // Location con valores seguros
      setLocation({
        latitude: safeNumber(prop.latitud, 0),
        longitude: safeNumber(prop.longitud, 0),
      });

      // Características con conversión segura a string
      setRecamaras(safeNumber(prop.habitaciones, 0).toString());
      setBanosCompletos(safeNumber(prop.banos, 0).toString());
      setEstacionamientos(safeNumber(prop.estacionamientos, 0).toString());
      
      // M2 con manejo especial para valores vacíos
      const m2Const = safeNumber(prop.metros_cuadrados_construccion, 0);
      setM2Construccion(m2Const > 0 ? m2Const.toString() : "");
      
      setNiveles(safeNumber(prop.pisos, 1).toString());
      setAntiguedad(safeString(prop.antiguedad));
      
      // Amueblado y PetFriendly con valores por defecto
      const amuebladoValue = safeString(prop.amueblado, "No");
      setAmueblado(["No", "Sí", "Parcial"].includes(amuebladoValue) ? amuebladoValue as any : "No");
      
      const petValue = safeString(prop.pet_friendly, "No");
      setPetFriendly(["No", "Sí"].includes(petValue) ? petValue as any : "No");
      
      // Fotos con filtrado robusto
      const fotosArray = safeArray<string>(prop.fotos);
      const fotosValidas = fotosArray.filter(foto => 
        typeof foto === 'string' && 
        foto.trim() !== '' && 
        (foto.startsWith('http://') || foto.startsWith('https://'))
      );
      setImages(fotosValidas);

      // 2. Fetch operaciones con manejo de errores
      try {
        const { data: ops, error: opsError } = await supabase
          .from("operaciones_propiedad")
          .select("*")
          .eq("propiedad_id", propertyId);

        if (opsError) {
          console.error("Error fetching operations:", opsError);
        } else if (ops && ops.length > 0) {
          // Determinar tipo de operación
          if (ops.length === 2) {
            setTipoOperacion("ambas");
          } else if (ops.length === 1) {
            setTipoOperacion(ops[0].tipo_operacion as "venta" | "renta");
          }

          // Procesar cada operación
          ops.forEach(op => {
            if (!op) return;

            const precio = safeNumber(op.precio, 0);
            const monedaOp = safeString(op.moneda, "MXN");
            const comparteComisionOp = op.comparte_comision === true;
            const comisionTipoOp = op.comision_tipo === "monto_fijo" ? "monto" : "porcentaje";
            const comisionValorOp = safeNumber(
              op.comision_tipo === "monto_fijo" ? op.comision_monto_fijo : op.comision_porcentaje,
              0
            );
            const comisionCompartidaTipoOp = op.porcentaje_comision_compartida ? "porcentaje" : "monto";
            const comisionCompartidaValorOp = safeNumber(
              op.porcentaje_comision_compartida || op.monto_comision_compartida,
              0
            );
            const condicionesOp = safeString(op.condiciones_comision_compartida);

            if (op.tipo_operacion === "venta") {
              setPrecioVenta(precio > 0 ? precio.toString() : "");
              setMoneda(["MXN", "USD"].includes(monedaOp) ? monedaOp as any : "MXN");
              setComparteComision(comparteComisionOp ? "Sí" : "No");
              setComisionTipo(comisionTipoOp);
              setComisionValor(comisionValorOp > 0 ? comisionValorOp.toString() : "");
              setComisionCompartidaTipo(comisionCompartidaTipoOp);
              setComisionCompartidaValor(comisionCompartidaValorOp > 0 ? comisionCompartidaValorOp.toString() : "");
              setCondicionesComision(condicionesOp);
            } else if (op.tipo_operacion === "renta") {
              setPrecioRenta(precio > 0 ? precio.toString() : "");
              setMoneda(["MXN", "USD"].includes(monedaOp) ? monedaOp as any : "MXN");
              
              if (ops.length === 2) {
                // Cuando hay ambas operaciones, usar variables de renta
                setComparteComisionRenta(comparteComisionOp ? "Sí" : "No");
                setComisionTipoRenta(comisionTipoOp);
                setComisionValorRenta(comisionValorOp > 0 ? comisionValorOp.toString() : "");
                setComisionCompartidaTipoRenta(comisionCompartidaTipoOp);
                setComisionCompartidaValorRenta(comisionCompartidaValorOp > 0 ? comisionCompartidaValorOp.toString() : "");
                setCondicionesComisionRenta(condicionesOp);
              } else {
                // Solo renta, usar variables generales
                setComparteComision(comparteComisionOp ? "Sí" : "No");
                setComisionTipo(comisionTipoOp);
                setComisionValor(comisionValorOp > 0 ? comisionValorOp.toString() : "");
                setComisionCompartidaTipo(comisionCompartidaTipoOp);
                setComisionCompartidaValor(comisionCompartidaValorOp > 0 ? comisionCompartidaValorOp.toString() : "");
                setCondicionesComision(condicionesOp);
              }
            }
          });
        }
      } catch (opsError) {
        console.error("Error processing operations:", opsError);
      }

      // 3. Fetch amenidades con manejo de errores
      try {
        const { data: amens, error: amensError } = await supabase
          .from("propiedad_amenidades")
          .select("amenidades(nombre)")
          .eq("propiedad_id", propertyId);
        
        if (!amensError && amens) {
          const amenidadesNombres = amens
            .map((a: any) => a?.amenidades?.nombre)
            .filter((nombre): nombre is string => typeof nombre === 'string' && nombre.trim() !== '');
          setAmenidadesSeleccionadas(amenidadesNombres);
        } else {
          setAmenidadesSeleccionadas([]);
        }
      } catch (amensError) {
        console.error("Error fetching amenidades:", amensError);
        setAmenidadesSeleccionadas([]);
      }

      // 4. Fetch gravamen con manejo de errores
      try {
        const { data: grav, error: gravError } = await supabase
          .from("propiedad_gravamenes")
          .select("*, instituciones_financieras(nombre)")
          .eq("propiedad_id", propertyId)
          .maybeSingle();
        
        if (!gravError && grav) {
          setTieneGravamen("Sí");
          setInstitucionGravamen(safeString(grav.instituciones_financieras?.nombre));
          const monto = safeNumber(grav.monto, 0);
          setMontoGravamen(monto > 0 ? monto.toString() : "");
        } else {
          setTieneGravamen("No");
          setInstitucionGravamen("");
          setMontoGravamen("");
        }
      } catch (gravError) {
        console.error("Error fetching gravamen:", gravError);
        setTieneGravamen("No");
      }

      // 5. Fetch financiamiento con manejo de errores
      try {
        const { data: fin, error: finError } = await supabase
          .from("propiedad_financiamientos")
          .select("instituciones_financieras(nombre)")
          .eq("propiedad_id", propertyId);
        
        if (!finError && fin && fin.length > 0) {
          const financiamientosNombres = fin
            .map((f: any) => f?.instituciones_financieras?.nombre)
            .filter((nombre): nombre is string => typeof nombre === 'string' && nombre.trim() !== '');
          
          if (financiamientosNombres.length > 0) {
            setAceptaFinanciamiento("Sí");
            setTiposFinanciamientoSeleccionados(financiamientosNombres);
          } else {
            setAceptaFinanciamiento("No");
            setTiposFinanciamientoSeleccionados([]);
          }
        } else {
          setAceptaFinanciamiento("No");
          setTiposFinanciamientoSeleccionados([]);
        }
      } catch (finError) {
        console.error("Error fetching financiamiento:", finError);
        setAceptaFinanciamiento("No");
      }

    } catch (error: any) {
      console.error("Error fetching property data:", error);
      Alert.alert(
        "Error", 
        error.message || "No se pudo cargar la información de la propiedad.",
        [
          { text: "Reintentar", onPress: fetchPropertyData },
          { text: "Volver", onPress: onBack, style: "cancel" }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const openNumberInput = (title: string, onSave: (val: string) => void) => {
    setNumberInputConfig({ title, onSave });
    setShowNumberInput(true);
  };

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
      const uris = result.assets.map((asset) => asset.uri).filter(uri => uri && uri.trim() !== '');
      setImages((prev) => [...prev, ...uris].slice(0, 15));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenidad = (amenidad: string) => {
    setAmenidadesSeleccionadas((prev) =>
      prev.includes(amenidad)
        ? prev.filter((a) => a !== amenidad)
        : [...prev, amenidad]
    );
  };

  const toggleFinanciamiento = (tipo: string) => {
    setTiposFinanciamientoSeleccionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (images.length === 0) newErrors.images = "Debes agregar al menos 1 imagen";
    
    if (tipoOperacion === "venta" && (!precioVenta || precioVenta === "0")) {
      newErrors.precioVenta = "El precio de venta es requerido";
    }
    if (tipoOperacion === "renta" && (!precioRenta || precioRenta === "0")) {
      newErrors.precioRenta = "El precio de renta es requerido";
    }
    if (tipoOperacion === "ambas" && ((!precioVenta || precioVenta === "0") || (!precioRenta || precioRenta === "0"))) {
      newErrors.precios = "Ambos precios son requeridos";
    }
    
    if (!ubicacionData.estado) newErrors.estado = "El estado es requerido";
    if (!ubicacionData.ciudad) newErrors.ciudad = "La ciudad es requerida";
    if (!ubicacionData.municipio) newErrors.municipio = "El municipio es requerido";

    // Validación de m2 construcción
    if (!m2Construccion || m2Construccion === "0") {
      newErrors.m2Construccion = "Los m² de construcción son requeridos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors || {}).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos");
      return;
    }

    setUpdating(true);
    setUploadProgress(0);

    try {
      // 1. Subir nuevas imágenes (solo las que son URIs locales)
      const finalImageUrls: string[] = [];
      const newImagesToUpload = images.filter(img => 
        img && (img.startsWith('file://') || img.startsWith('content://'))
      );
      const existingImages = images.filter(img => 
        img && (img.startsWith('http://') || img.startsWith('https://'))
      );

      finalImageUrls.push(...existingImages);

      for (let i = 0; i < newImagesToUpload.length; i++) {
        try {
          const url = await uploadImage(newImagesToUpload[i], "feed-images", "properties");
          if (url) finalImageUrls.push(url);
        } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
        }
        setUploadProgress(((i + 1) / newImagesToUpload.length) * 40);
      }

      setUploadProgress(40);

      // 2. Actualizar propiedad - SOLO campos que existen en la BD
      const updateData: any = {
        tipo: tipoPrincipal,
        subtipo: subtipo || PROPERTY_TYPES[tipoPrincipal]?.[0] || "",
        descripcion_planta_baja: descripcionPlantaBaja || null,
        descripcion_planta_alta: descripcionPlantaAlta || null,
        ciudad: ubicacionData.ciudad,
        municipio: ubicacionData.municipio,
        estado: ubicacionData.estado,
        calle: calle || null,
        numero_exterior: numeroExterior || null,
        numero_interior: numeroInterior || null,
        latitud: location.latitude,
        longitud: location.longitude,
        fotos: finalImageUrls,
        activo: status === "Publicada",
      };

      // Agregar campos opcionales según visibilidad
      if (camposVisibles.recamaras) {
        updateData.habitaciones = parseInt(recamaras) || 0;
      }
      if (camposVisibles.banos) {
        updateData.banos = parseInt(banosCompletos) || 0;
      }
      if (camposVisibles.estacionamientos) {
        updateData.estacionamientos = parseInt(estacionamientos) || 0;
      }
      if (camposVisibles.m2Construccion) {
        updateData.metros_cuadrados_construccion = parseFloat(m2Construccion) || null;
      }
      
      if (camposVisibles.niveles) {
        updateData.pisos = parseInt(niveles) || 1;
      }
      if (camposVisibles.amueblado) {
        updateData.amueblado = amueblado;
      }
      if (camposVisibles.petFriendly) {
        updateData.pet_friendly = petFriendly;
      }
      if (camposVisibles.antiguedad) {
        updateData.antiguedad = antiguedad || null;
      }

      const { error: propError } = await supabase
        .from("propiedades")
        .update(updateData)
        .eq("id", propertyId);

      if (propError) throw propError;

      setUploadProgress(60);

      // 3. Actualizar operaciones (borrar y re-insertar)
      await supabase.from("operaciones_propiedad").delete().eq("propiedad_id", propertyId);

      const operaciones = [];
      
      if (tipoOperacion === "venta" || tipoOperacion === "ambas") {
        const precioVentaNum = parseFloat(precioVenta.replace(/,/g, ""));
        if (precioVentaNum > 0) {
          operaciones.push({
            propiedad_id: propertyId,
            tipo_operacion: "venta",
            precio: precioVentaNum,
            moneda: moneda,
            comparte_comision: comparteComision === "Sí",
            comision_tipo: comparteComision === "Sí" ? (comisionTipo === "monto" ? "monto_fijo" : comisionTipo) : null,
            comision_porcentaje: comparteComision === "Sí" && comisionTipo === "porcentaje" ? parseFloat(comisionValor) || null : null,
            comision_monto_fijo: comparteComision === "Sí" && comisionTipo === "monto" ? parseFloat(comisionValor) || null : null,
            porcentaje_comision_compartida: comparteComision === "Sí" && comisionCompartidaTipo === "porcentaje" ? parseFloat(comisionCompartidaValor) || null : null,
            monto_comision_compartida: comparteComision === "Sí" && comisionCompartidaTipo === "monto" ? parseFloat(comisionCompartidaValor) || null : null,
            condiciones_comision_compartida: comparteComision === "Sí" && condicionesComision ? condicionesComision : null,
          });
        }
      }

      if (tipoOperacion === "renta" || tipoOperacion === "ambas") {
        const isAmbas = tipoOperacion === "ambas";
        const comparte = isAmbas ? comparteComisionRenta : comparteComision;
        const tipo = isAmbas ? comisionTipoRenta : comisionTipo;
        const valor = isAmbas ? comisionValorRenta : comisionValor;
        const compartidaTipo = isAmbas ? comisionCompartidaTipoRenta : comisionCompartidaTipo;
        const compartidaValor = isAmbas ? comisionCompartidaValorRenta : comisionCompartidaValor;
        const condiciones = isAmbas ? condicionesComisionRenta : condicionesComision;

        const precioRentaNum = parseFloat(precioRenta.replace(/,/g, ""));
        if (precioRentaNum > 0) {
          operaciones.push({
            propiedad_id: propertyId,
            tipo_operacion: "renta",
            precio: precioRentaNum,
            moneda: moneda,
            comparte_comision: comparte === "Sí",
            comision_tipo: comparte === "Sí" ? (tipo === "monto" ? "monto_fijo" : tipo) : null,
            comision_porcentaje: comparte === "Sí" && tipo === "porcentaje" ? parseFloat(valor) || null : null,
            comision_monto_fijo: comparte === "Sí" && tipo === "monto" ? parseFloat(valor) || null : null,
            porcentaje_comision_compartida: comparte === "Sí" && compartidaTipo === "porcentaje" ? parseFloat(compartidaValor) || null : null,
            monto_comision_compartida: comparte === "Sí" && compartidaTipo === "monto" ? parseFloat(compartidaValor) || null : null,
            condiciones_comision_compartida: comparte === "Sí" && condiciones ? condiciones : null,
          });
        }
      }

      if (operaciones.length > 0) {
        const { error: opError } = await supabase.from("operaciones_propiedad").insert(operaciones);
        if (opError) throw opError;
      }

      setUploadProgress(80);

      // 4. Amenidades, Gravamen, Financiamiento (Borrar y re-insertar)
      await Promise.all([
        supabase.from("propiedad_amenidades").delete().eq("propiedad_id", propertyId),
        supabase.from("propiedad_gravamenes").delete().eq("propiedad_id", propertyId),
        supabase.from("propiedad_financiamientos").delete().eq("propiedad_id", propertyId),
      ]);

      // Re-insertar amenidades
      if (amenidadesSeleccionadas.length > 0) {
        try {
          const ids = await findAmenidadesIds(amenidadesSeleccionadas);
          if (ids.length > 0) {
            await supabase.from("propiedad_amenidades").insert(
              ids.map(id => ({ propiedad_id: propertyId, amenidad_id: id }))
            );
          }
        } catch (amenError) {
          console.error("Error updating amenidades:", amenError);
        }
      }

      // Re-insertar gravamen
      if (tieneGravamen === "Sí" && institucionGravamen) {
        try {
          const id = await findInstitucionFinancieraId(institucionGravamen);
          if (id) {
            await supabase.from("propiedad_gravamenes").insert({
              propiedad_id: propertyId,
              institucion_id: id,
              monto: montoGravamen ? parseFloat(montoGravamen) : null,
            });
          }
        } catch (gravError) {
          console.error("Error updating gravamen:", gravError);
        }
      }

      // Re-insertar financiamiento
      if (aceptaFinanciamiento === "Sí" && tiposFinanciamientoSeleccionados.length > 0) {
        try {
          const ids = await findTiposFinanciamientoIds(tiposFinanciamientoSeleccionados);
          if (ids.length > 0) {
            await supabase.from("propiedad_financiamientos").insert(
              ids.map(id => ({ propiedad_id: propertyId, tipo_financiamiento_id: id }))
            );
          }
        } catch (finError) {
          console.error("Error updating financiamiento:", finError);
        }
      }

      setUploadProgress(100);
      Alert.alert("¡Éxito!", "Propiedad actualizada correctamente");
      if (onSuccess) onSuccess();
      onBack();

    } catch (error: any) {
      console.error("Error updating property:", error);
      Alert.alert(
        "Error", 
        error.message || "No se pudo actualizar la propiedad",
        [{ text: "OK" }]
      );
    } finally {
      setUpdating(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Propiedad</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de la Propiedad</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowStatusModal(true)}
          >
            <Text style={styles.selectorText}>{status}</Text>
            <Ionicons name="chevron-down" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Imágenes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fotos ({images.length}/15)</Text>
            <TouchableOpacity onPress={handlePickImages}>
              <Text style={styles.addText}>+ Agregar</Text>
            </TouchableOpacity>
          </View>
          {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.map((img, index) => (
              <View key={`${img}-${index}`} style={styles.imageWrapper}>
                <Image 
                  source={{ uri: img }} 
                  style={styles.imageItem}
                  onError={(e) => {
                    console.log("Error loading image:", img);
                  }}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => handleRemoveImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length === 0 && (
              <TouchableOpacity style={styles.imagePlaceholder} onPress={handlePickImages}>
                <Ionicons name="camera-outline" size={40} color={COLORS.textTertiary} />
                <Text style={styles.placeholderText}>Agregar fotos</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Información Básica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          <AppInput
            label="Descripción Planta Baja"
            value={descripcionPlantaBaja}
            onChangeText={setDescripcionPlantaBaja}
            placeholder="Describe la planta baja..."
            multiline
            numberOfLines={3}
          />
          <AppInput
            label="Descripción Planta Alta"
            value={descripcionPlantaAlta}
            onChangeText={setDescripcionPlantaAlta}
            placeholder="Describe la planta alta..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Tipo de Operación</Text>
          <RadioGroupSelector
            options={["venta", "renta", "ambas"]}
            selectedValue={tipoOperacion}
            onSelect={(val) => setTipoOperacion(val as any)}
          />

          {(tipoOperacion === "venta" || tipoOperacion === "ambas") && (
            <AppInput
              label="Precio de Venta"
              value={precioVenta}
              onChangeText={setPrecioVenta}
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.precioVenta || errors.precios}
            />
          )}

          {(tipoOperacion === "renta" || tipoOperacion === "ambas") && (
            <AppInput
              label="Precio de Renta"
              value={precioRenta}
              onChangeText={setPrecioRenta}
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.precioRenta || errors.precios}
            />
          )}

          <TouchableOpacity style={styles.selector} onPress={() => setShowMonedaModal(true)}>
            <View>
              <Text style={styles.selectorLabel}>Moneda</Text>
              <Text style={styles.selectorText}>{moneda}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Tipo de Propiedad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setShowTipoPrincipalModal(true)}>
            <View>
              <Text style={styles.selectorLabel}>Tipo Principal</Text>
              <Text style={styles.selectorText}>{tipoPrincipal.toUpperCase()}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.selector} onPress={() => setShowSubtipoModal(true)}>
            <View>
              <Text style={styles.selectorLabel}>Subtipo</Text>
              <Text style={styles.selectorText}>{subtipo || "Seleccionar..."}</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <CascadeLocationSelector
            initialData={ubicacionData}
            onChange={setUbicacionData}
          />
          {errors.estado && <Text style={styles.errorText}>{errors.estado}</Text>}
          
          <AppInput label="Calle" value={calle} onChangeText={setCalle} />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppInput label="Num. Ext." value={numeroExterior} onChangeText={setNumeroExterior} />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput label="Num. Int." value={numeroInterior} onChangeText={setNumeroInterior} />
            </View>
          </View>
          
          <Text style={styles.inputLabel}>Mapa (Pin de ubicación)</Text>
          <LocationPicker
            initialLatitude={location.latitude || 0}
            initialLongitude={location.longitude || 0}
            onLocationSelected={(loc) => setLocation(loc)}
          />
        </View>

        {/* Características */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Características</Text>
          
          {camposVisibles.recamaras && (
            <TouchableOpacity 
              style={styles.selector} 
              onPress={() => openNumberInput(getLabelRecamaras(tipoPrincipal), setRecamaras)}
            >
              <Text style={styles.selectorLabel}>{getLabelRecamaras(tipoPrincipal)}</Text>
              <Text style={styles.selectorText}>{recamaras}</Text>
            </TouchableOpacity>
          )}

          {camposVisibles.banos && (
            <TouchableOpacity 
              style={styles.selector} 
              onPress={() => openNumberInput("Baños Completos", setBanosCompletos)}
            >
              <Text style={styles.selectorLabel}>Baños Completos</Text>
              <Text style={styles.selectorText}>{banosCompletos}</Text>
            </TouchableOpacity>
          )}

          {camposVisibles.estacionamientos && (
            <TouchableOpacity 
              style={styles.selector} 
              onPress={() => openNumberInput("Estacionamientos", setEstacionamientos)}
            >
              <Text style={styles.selectorLabel}>Estacionamientos</Text>
              <Text style={styles.selectorText}>{estacionamientos}</Text>
            </TouchableOpacity>
          )}

          {camposVisibles.m2Construccion && (
            <AppInput
              label="M² Construcción"
              value={m2Construccion}
              onChangeText={setM2Construccion}
              keyboardType="numeric"
              error={errors.m2Construccion}
            />
          )}

          {camposVisibles.niveles && (
            <TouchableOpacity 
              style={styles.selector} 
              onPress={() => openNumberInput("Niveles", setNiveles)}
            >
              <Text style={styles.selectorLabel}>Niveles</Text>
              <Text style={styles.selectorText}>{niveles}</Text>
            </TouchableOpacity>
          )}

          {camposVisibles.antiguedad && (
            <AppInput
              label="Antigüedad (años)"
              value={antiguedad}
              onChangeText={setAntiguedad}
              keyboardType="numeric"
            />
          )}

          {camposVisibles.amueblado && (
            <>
              <Text style={styles.inputLabel}>Amueblado</Text>
              <RadioGroupSelector
                options={["No", "Sí", "Parcial"]}
                selectedValue={amueblado}
                onSelect={(val) => setAmueblado(val as any)}
              />
            </>
          )}

          {camposVisibles.petFriendly && (
            <>
              <Text style={styles.inputLabel}>Pet Friendly</Text>
              <RadioGroupSelector
                options={["No", "Sí"]}
                selectedValue={petFriendly}
                onSelect={(val) => setPetFriendly(val as any)}
              />
            </>
          )}
        </View>

        {/* Amenidades */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Amenidades</Text>
            <TouchableOpacity onPress={() => setShowAmenidadesModal(true)}>
              <Text style={styles.addText}>
                {amenidadesSeleccionadas.length > 0 
                  ? `${amenidadesSeleccionadas.length} seleccionadas` 
                  : "+ Agregar"}
              </Text>
            </TouchableOpacity>
          </View>
          {amenidadesSeleccionadas.length > 0 && (
            <View style={styles.tagsContainer}>
              {amenidadesSeleccionadas.map((amenidad) => (
                <View key={amenidad} style={styles.tag}>
                  <Text style={styles.tagText}>{amenidad}</Text>
                  <TouchableOpacity onPress={() => toggleAmenidad(amenidad)}>
                    <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Comisión Venta */}
        {(tipoOperacion === "venta" || tipoOperacion === "ambas") && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comisión de Venta</Text>
            <Text style={styles.inputLabel}>¿Comparte comisión?</Text>
            <RadioGroupSelector
              options={["No", "Sí"]}
              selectedValue={comparteComision}
              onSelect={(val) => setComparteComision(val as any)}
            />
            {comparteComision === "Sí" && (
              <>
                <Text style={styles.inputLabel}>Tipo de comisión</Text>
                <RadioGroupSelector
                  options={["porcentaje", "monto"]}
                  selectedValue={comisionTipo}
                  onSelect={(val) => setComisionTipo(val as any)}
                />
                <AppInput
                  label={comisionTipo === "porcentaje" ? "Porcentaje (%)" : "Monto fijo"}
                  value={comisionValor}
                  onChangeText={setComisionValor}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>Comisión compartida</Text>
                <RadioGroupSelector
                  options={["porcentaje", "monto"]}
                  selectedValue={comisionCompartidaTipo}
                  onSelect={(val) => setComisionCompartidaTipo(val as any)}
                />
                <AppInput
                  label={comisionCompartidaTipo === "porcentaje" ? "Porcentaje (%)" : "Monto fijo"}
                  value={comisionCompartidaValor}
                  onChangeText={setComisionCompartidaValor}
                  keyboardType="numeric"
                />
                <AppInput
                  label="Condiciones"
                  value={condicionesComision}
                  onChangeText={setCondicionesComision}
                  placeholder="Condiciones de la comisión compartida..."
                  multiline
                  numberOfLines={2}
                />
              </>
            )}
          </View>
        )}

        {/* Comisión Renta */}
        {tipoOperacion === "ambas" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comisión de Renta</Text>
            <Text style={styles.inputLabel}>¿Comparte comisión?</Text>
            <RadioGroupSelector
              options={["No", "Sí"]}
              selectedValue={comparteComisionRenta}
              onSelect={(val) => setComparteComisionRenta(val as any)}
            />
            {comparteComisionRenta === "Sí" && (
              <>
                <Text style={styles.inputLabel}>Tipo de comisión</Text>
                <RadioGroupSelector
                  options={["porcentaje", "monto"]}
                  selectedValue={comisionTipoRenta}
                  onSelect={(val) => setComisionTipoRenta(val as any)}
                />
                <AppInput
                  label={comisionTipoRenta === "porcentaje" ? "Porcentaje (%)" : "Monto fijo"}
                  value={comisionValorRenta}
                  onChangeText={setComisionValorRenta}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>Comisión compartida</Text>
                <RadioGroupSelector
                  options={["porcentaje", "monto"]}
                  selectedValue={comisionCompartidaTipoRenta}
                  onSelect={(val) => setComisionCompartidaTipoRenta(val as any)}
                />
                <AppInput
                  label={comisionCompartidaTipoRenta === "porcentaje" ? "Porcentaje (%)" : "Monto fijo"}
                  value={comisionCompartidaValorRenta}
                  onChangeText={setComisionCompartidaValorRenta}
                  keyboardType="numeric"
                />
                <AppInput
                  label="Condiciones"
                  value={condicionesComisionRenta}
                  onChangeText={setCondicionesComisionRenta}
                  placeholder="Condiciones de la comisión compartida..."
                  multiline
                  numberOfLines={2}
                />
              </>
            )}
          </View>
        )}

        {tipoOperacion === "renta" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comisión de Renta</Text>
            <Text style={styles.inputLabel}>¿Comparte comisión?</Text>
            <RadioGroupSelector
              options={["No", "Sí"]}
              selectedValue={comparteComision}
              onSelect={(val) => setComparteComision(val as any)}
            />
            {comparteComision === "Sí" && (
              <>
                <Text style={styles.inputLabel}>Tipo de comisión</Text>
                <RadioGroupSelector
                  options={["porcentaje", "monto"]}
                  selectedValue={comisionTipo}
                  onSelect={(val) => setComisionTipo(val as any)}
                />
                <AppInput
                  label={comisionTipo === "porcentaje" ? "Porcentaje (%)" : "Monto fijo"}
                  value={comisionValor}
                  onChangeText={setComisionValor}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>Comisión compartida</Text>
                <RadioGroupSelector
                  options={["porcentaje", "monto"]}
                  selectedValue={comisionCompartidaTipo}
                  onSelect={(val) => setComisionCompartidaTipo(val as any)}
                />
                <AppInput
                  label={comisionCompartidaTipo === "porcentaje" ? "Porcentaje (%)" : "Monto fijo"}
                  value={comisionCompartidaValor}
                  onChangeText={setComisionCompartidaValor}
                  keyboardType="numeric"
                />
                <AppInput
                  label="Condiciones"
                  value={condicionesComision}
                  onChangeText={setCondicionesComision}
                  placeholder="Condiciones de la comisión compartida..."
                  multiline
                  numberOfLines={2}
                />
              </>
            )}
          </View>
        )}

        {/* Gravamen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gravamen</Text>
          <Text style={styles.inputLabel}>¿Tiene gravamen?</Text>
          <RadioGroupSelector
            options={["No", "Sí"]}
            selectedValue={tieneGravamen}
            onSelect={(val) => setTieneGravamen(val as any)}
          />
          {tieneGravamen === "Sí" && (
            <>
              <TouchableOpacity 
                style={styles.selector} 
                onPress={() => setShowInstitucionGravamenModal(true)}
              >
                <View>
                  <Text style={styles.selectorLabel}>Institución</Text>
                  <Text style={styles.selectorText}>
                    {institucionGravamen || "Seleccionar..."}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
              <AppInput
                label="Monto del gravamen"
                value={montoGravamen}
                onChangeText={setMontoGravamen}
                keyboardType="numeric"
                placeholder="0.00"
              />
            </>
          )}
        </View>

        {/* Financiamiento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financiamiento</Text>
          <Text style={styles.inputLabel}>¿Acepta financiamiento?</Text>
          <RadioGroupSelector
            options={["No", "Sí"]}
            selectedValue={aceptaFinanciamiento}
            onSelect={(val) => setAceptaFinanciamiento(val as any)}
          />
          {aceptaFinanciamiento === "Sí" && (
            <>
              <TouchableOpacity 
                style={styles.selector}
                onPress={() => setShowFinanciamientoModal(true)}
              >
                <Text style={styles.selectorText}>
                  {tiposFinanciamientoSeleccionados.length > 0
                    ? `${tiposFinanciamientoSeleccionados.length} tipos seleccionados`
                    : "Seleccionar tipos..."}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
              {tiposFinanciamientoSeleccionados.length > 0 && (
                <View style={styles.tagsContainer}>
                  {tiposFinanciamientoSeleccionados.map((tipo) => (
                    <View key={tipo} style={styles.tag}>
                      <Text style={styles.tagText}>{tipo}</Text>
                      <TouchableOpacity onPress={() => toggleFinanciamiento(tipo)}>
                        <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Botón de Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, updating && styles.saveButtonDisabled]}
          onPress={handleUpdate}
          disabled={updating}
        >
          {updating ? (
            <View style={styles.updatingContainer}>
              <ActivityIndicator color={COLORS.white} size="small" />
              <Text style={styles.saveButtonText}>Actualizando... {Math.round(uploadProgress)}%</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modales de selección */}
      <SelectionModal
        visible={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSelect={(val) => setStatus(val)}
        title="Estado de la Propiedad"
        options={[...PROPERTY_STATUS]}
        currentValue={status}
      />

      <SelectionModal
        visible={showMonedaModal}
        onClose={() => setShowMonedaModal(false)}
        onSelect={(val) => setMoneda(val as any)}
        title="Seleccionar Moneda"
        options={[...MONEDAS]}
        currentValue={moneda}
      />

      <SelectionModal
        visible={showTipoPrincipalModal}
        onClose={() => setShowTipoPrincipalModal(false)}
        onSelect={(val) => {
          setTipoPrincipal(val.toLowerCase() as TipoPrincipal);
          setSubtipo("");
        }}
        title="Tipo de Propiedad"
        options={Object.keys(PROPERTY_TYPES || {}).map(t => t.toUpperCase())}
        currentValue={tipoPrincipal.toUpperCase()}
      />

      <SelectionModal
        visible={showSubtipoModal}
        onClose={() => setShowSubtipoModal(false)}
        onSelect={(val) => setSubtipo(val)}
        title="Subtipo de Propiedad"
        options={[...(PROPERTY_TYPES[tipoPrincipal] || [])]}
        currentValue={subtipo}
      />

      <SelectionModal
        visible={showInstitucionGravamenModal}
        onClose={() => setShowInstitucionGravamenModal(false)}
        onSelect={(val) => setInstitucionGravamen(val)}
        title="Institución Financiera"
        options={[...INSTITUCIONES_GRAVAMEN]}
        currentValue={institucionGravamen}
      />

      <Modal
        visible={showAmenidadesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAmenidadesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Amenidades</Text>
              <TouchableOpacity onPress={() => setShowAmenidadesModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {AMENIDADES.map((amenidad) => (
                <TouchableOpacity
                  key={amenidad}
                  style={styles.checkboxItem}
                  onPress={() => toggleAmenidad(amenidad)}
                >
                  <Ionicons
                    name={amenidadesSeleccionadas.includes(amenidad) ? "checkbox" : "square-outline"}
                    size={24}
                    color={amenidadesSeleccionadas.includes(amenidad) ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>{amenidad}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFinanciamientoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFinanciamientoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tipos de Financiamiento</Text>
              <TouchableOpacity onPress={() => setShowFinanciamientoModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {TIPOS_FINANCIAMIENTO.map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={styles.checkboxItem}
                  onPress={() => toggleFinanciamiento(tipo)}
                >
                  <Ionicons
                    name={tiposFinanciamientoSeleccionados.includes(tipo) ? "checkbox" : "square-outline"}
                    size={24}
                    color={tiposFinanciamientoSeleccionados.includes(tipo) ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={styles.checkboxLabel}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NumberInputModal
        visible={showNumberInput}
        onClose={() => setShowNumberInput(false)}
        onSave={numberInputConfig.onSave}
        title={numberInputConfig.title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  addText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  imagesScroll: {
    flexDirection: "row",
  },
  imageWrapper: {
    marginRight: 12,
    position: "relative",
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  selectorText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  updatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  modalScroll: {
    padding: 16,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
});