/**
 * CreateProperty.tsx - VERSIÓN CORREGIDA
 * Formulario completo para crear propiedades inmobiliarias
 * CORREGIDO - Solo campos que existen en la BD
 */

import React, { useState } from "react";
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
import LocationPicker from "./LocationPicker";
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

interface CreatePropertyProps {
  onBack: () => void;
}

export default function CreateProperty({ onBack }: CreatePropertyProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { uploadImage } = useImageUpload();

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
    "porcentaje"
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
    "No"
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

  // NumberInputModal states
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputConfig, setNumberInputConfig] = useState({
    title: "",
    onSave: (val: string) => {},
  });

  // Modals para gravamen/financiamiento
  const [showInstitucionGravamenModal, setShowInstitucionGravamenModal] =
    useState(false);

  // Errores
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        : [...prev, amenidad]
    );
  };

  /**
   * Toggle tipo de financiamiento
   */
  const toggleFinanciamiento = (tipo: string) => {
    setTiposFinanciamientoSeleccionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
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
    if (tipoOperacion === "venta" && !precioVenta) {
      newErrors.precioVenta = "El precio de venta es requerido";
    }
    if (tipoOperacion === "renta" && !precioRenta) {
      newErrors.precioRenta = "El precio de renta es requerido";
    }
    if (tipoOperacion === "ambas" && (!precioVenta || !precioRenta)) {
      newErrors.precios = "Ambos precios son requeridos";
    }
    if (!ubicacionData.estado) {
      newErrors.estado = "El estado es requerido";
    }
    if (!ubicacionData.ciudad) {
      newErrors.ciudad = "La ciudad es requerida";
    }
    if (!ubicacionData.municipio) {
      newErrors.municipio = "El municipio es requerido";
    }

    // Validación de m² según tipo de propiedad
    if (esTerreno(subtipo)) {
      if (!m2Terreno) {
        newErrors.m2Terreno = "Los m² de terreno son obligatorios para terrenos";
      }
    } else {
      if (!m2Construccion && !m2Terreno) {
        newErrors.m2 = "Debes especificar al menos m² de construcción o terreno";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Publicar propiedad - CORREGIDO
   */
  const handlePublish = async () => {
    if (!validate()) {
      Alert.alert("Error", "Por favor completa todos los campos requeridos");
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
        const url = await uploadImage(images[i], "feed-images", "properties");
        if (url) {
          uploadedUrls.push(url);
        }
        setUploadProgress(10 + ((i + 1) / images.length) * 30);
      }

      if (uploadedUrls.length === 0) {
        throw new Error("No se pudieron subir las imágenes");
      }

      setUploadProgress(40);

      // 2. Crear propiedad - CORREGIDO: Campos según esquema real
      const { data: propiedad, error: propError } = await supabase
        .from("propiedades")
        .insert({
          tipo: tipoPrincipal,
          subtipo: subtipo || PROPERTY_TYPES[tipoPrincipal][0],
          descripcion: descripcion, // ✅ SÍ existe en BD
          ciudad: ubicacionData.ciudad,
          municipio: ubicacionData.municipio,
          estado: ubicacionData.estado,
          colonia: ubicacionData.colonia || null, // ✅ SÍ existe en BD
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
          metros_cuadrados_terreno: camposVisibles.m2Terreno // ✅ SÍ existe en BD
            ? parseFloat(m2Terreno) || null
            : null,
          pisos: camposVisibles.niveles ? parseInt(niveles) || 1 : null,
          amueblado: camposVisibles.amueblado ? amueblado : null,
          pet_friendly: camposVisibles.petFriendly ? petFriendly : "No",
          antiguedad: camposVisibles.antiguedad ? antiguedad : null,
          created_by: user.id, // ✅ Nombre correcto del campo en BD
        })
        .select()
        .single();

      if (propError) throw propError;

      setUploadProgress(50);

      // 3. Crear operación(es) de venta/renta con comisión
      const operaciones = [];

      if (tipoOperacion === "venta" || tipoOperacion === "ambas") {
        operaciones.push({
          propiedad_id: propiedad.id,
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
              ? parseFloat(comisionValor)
              : null,
          comision_monto_fijo:
            comparteComision === "Sí" && comisionTipo === "monto"
              ? parseFloat(comisionValor)
              : null,
          porcentaje_comision_compartida:
            comparteComision === "Sí" && comisionCompartidaTipo === "porcentaje"
              ? parseFloat(comisionCompartidaValor)
              : null,
          monto_comision_compartida:
            comparteComision === "Sí" && comisionCompartidaTipo === "monto"
              ? parseFloat(comisionCompartidaValor)
              : null,
          condiciones_comision_compartida:
            comparteComision === "Sí" && condicionesComision
              ? condicionesComision
              : null,
        });
      }

      if (tipoOperacion === "renta" || tipoOperacion === "ambas") {
        // Si es "ambas", usamos las variables de Renta secundarias.
        // Si es "renta" pura, usamos las variables principales (por defecto).
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
          propiedad_id: propiedad.id,
          tipo_operacion: "renta",
          precio: parseFloat(precioRenta.replace(/,/g, "")),
          moneda: moneda,
          comparte_comision: comparte === "Sí",
          comision_tipo:
            comparte === "Sí" ? (tipo === "monto" ? "monto_fijo" : tipo) : null,
          comision_porcentaje:
            comparte === "Sí" && tipo === "porcentaje"
              ? parseFloat(valor)
              : null,
          comision_monto_fijo:
            comparte === "Sí" && tipo === "monto" ? parseFloat(valor) : null,
          porcentaje_comision_compartida:
            comparte === "Sí" && compartidaTipo === "porcentaje"
              ? parseFloat(compartidaValor)
              : null,
          monto_comision_compartida:
            comparte === "Sí" && compartidaTipo === "monto"
              ? parseFloat(compartidaValor)
              : null,
          condiciones_comision_compartida:
            comparte === "Sí" && condiciones ? condiciones : null,
        });
      }

      const { error: opError } = await supabase
        .from("operaciones_propiedad")
        .insert(operaciones);

      if (opError) throw opError;

      setUploadProgress(60);

      // 4. Crear gravamen si existe
      if (tieneGravamen === "Sí" && institucionGravamen) {
        const institucionId = await findInstitucionFinancieraId(
          institucionGravamen
        );

        if (institucionId) {
          const { error: gravamenError } = await supabase
            .from("propiedad_gravamenes")
            .insert({
              propiedad_id: propiedad.id,
              institucion_id: institucionId,
              monto: montoGravamen ? parseFloat(montoGravamen) : null,
              notas: null,
            });

          if (gravamenError) {
            console.error("Error creando gravamen:", gravamenError);
          }
        } else {
          console.warn(
            "No se encontró ID para institución:",
            institucionGravamen
          );
        }
      }

      setUploadProgress(70);

      // 5. Crear amenidades
      if (amenidadesSeleccionadas.length > 0) {
        const amenidadesIds = await findAmenidadesIds(amenidadesSeleccionadas);

        if (amenidadesIds.length > 0) {
          const amenidadesInserts = amenidadesIds.map((amenidadId) => ({
            propiedad_id: propiedad.id,
            amenidad_id: amenidadId,
          }));

          const { error: amenidadesError } = await supabase
            .from("propiedad_amenidades")
            .insert(amenidadesInserts);

          if (amenidadesError) {
            console.error("Error creando amenidades:", amenidadesError);
          }
        }
      }

      setUploadProgress(80);

      // 6. Crear financiamientos si acepta
      if (
        aceptaFinanciamiento === "Sí" &&
        tiposFinanciamientoSeleccionados.length > 0
      ) {
        const financiamientosIds = await findTiposFinanciamientoIds(
          tiposFinanciamientoSeleccionados
        );

        if (financiamientosIds.length > 0) {
          const financiamientosInserts = financiamientosIds.map((tipoId) => ({
            propiedad_id: propiedad.id,
            tipo_financiamiento_id: tipoId,
          }));

          const { error: financiamientoError } = await supabase
            .from("propiedad_financiamientos")
            .insert(financiamientosInserts);

          if (financiamientoError) {
            console.error(
              "Error creando financiamientos:",
              financiamientoError
            );
          }
        }
      }

      setUploadProgress(90);

      // 7. Crear feed_item
      const { error: feedError } = await supabase.from("feed_items").insert({
        tipo_contenido: "propiedad",
        contenido_id: propiedad.id,
        publicado_por: user.id,
        visibilidad: "publico",
        estado_moderacion: "activo",
      });

      if (feedError) throw feedError;

      setUploadProgress(100);

      Alert.alert("¡Éxito!", "Propiedad publicada correctamente");

      setTimeout(() => {
        onBack();
      }, 500);
    } catch (error: any) {
      console.error("Error publishing property:", error);
      Alert.alert("Error", error.message || "No se pudo publicar la propiedad");
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
    isSecondInstance = false
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
              onChangeText={setters.setValor}
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
                val === "Porcentaje" ? "porcentaje" : "monto"
              )
            }
          />

          {values.compartidaTipo === "porcentaje" ? (
            <AppInput
              label="Porcentaje Compartido (%)"
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
              onChangeText={setters.setCompartidaValor}
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Propiedad</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

          <View style={styles.imagesGrid}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageBox}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity
                  onPress={() => handleRemoveImage(index)}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 15 && (
              <TouchableOpacity
                onPress={handlePickImages}
                style={[
                  styles.uploadBtn,
                  errors.images && styles.uploadBtnError,
                ]}
              >
                <Ionicons name="camera" size={32} color={COLORS.textTertiary} />
                <Text style={styles.uploadText}>Agregar</Text>
              </TouchableOpacity>
            )}
          </View>
          {errors.images && (
            <Text style={styles.errorText}>{errors.images}</Text>
          )}
        </View>

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
              onChangeText={setPrecioVenta}
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
              onChangeText={setPrecioRenta}
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
                      (customVal) => setRecamaras(customVal)
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
                      setBanosCompletos(customVal)
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
                      setMediosBanos(customVal)
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
                      setEstacionamientos(customVal)
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
                      setNiveles(customVal)
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
                      setAntiguedad(customVal)
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
              placeholder="120.5"
              keyboardType="numeric"
              value={m2Construccion}
              onChangeText={setM2Construccion}
              error={errors.m2}
            />
          )}

          {/* M2 TERRENO */}
          {camposVisibles.m2Terreno && (
            <AppInput
              label={`m² de Terreno ${esTerreno(subtipo) ? "*" : ""}`}
              placeholder="200.0"
              keyboardType="numeric"
              value={m2Terreno}
              onChangeText={setM2Terreno}
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
          {camposVisibles.petFriendly && (
            <RadioGroupSelector
              label="Mascotas Permitidas"
              options={[...OPCIONES_SI_NO]}
              selectedValue={petFriendly}
              onSelect={(val) => setPetFriendly(val as any)}
            />
          )}
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
            }
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
              true
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
                onChangeText={setMontoGravamen}
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
        <View style={styles.section}>
          <LocationPicker onLocationSelected={setLocation} />
        </View>
      </ScrollView>

      {/* ============================================ */}
      {/* FOOTER - BOTÓN PUBLICAR */}
      {/* ============================================ */}
      <View style={styles.footer}>
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
              <Text style={styles.publishText}>Publicar Propiedad</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.white,
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
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
    marginTop: -8,
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