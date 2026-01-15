import React, { useState, useCallback, memo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { AppInput } from "../design-system/components/AppInput";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";
import { perfiles } from "../types";
import * as ImagePicker from "expo-image-picker";
import { ESTADOS_MEXICO } from "../constants/locations";
import { Avatar } from "../components/shared";
import SelectionModal from "../components/modals/SelectionModal";
import { COLORS } from "../constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useImageUpload } from "../hooks/useImageUpload";
import { useStableSafeInsets } from "../context/SafeInsetsContext";
import { useGoogleAuth } from "../lib/useGoogleAuth";
import { OneSignal } from "react-native-onesignal";

// Tipos para los proveedores
type AuthProvider = "google" | "facebook" | "apple";

const SubmitButton = memo(
  ({
    loading,
    onPress,
    text,
  }: {
    loading: boolean;
    onPress: () => void;
    text: string;
  }) => (
    <TouchableOpacity
      style={styles.submitButton}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <Text style={styles.submitButtonText}>{text}</Text>
      )}
    </TouchableOpacity>
  )
);

export default function AuthScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(1);
  const [authMethod, setAuthMethod] = useState<"none" | "email" | "external">(
    "none"
  );
  const [loading, setLoading] = useState(false);

  // Estados para manejo de datos faltantes en Auth Externa
  const [pendingExternalUser, setPendingExternalUser] = useState<{
    id: string;
    email: string;
    avatarUrl?: string | null;
    fullName?: string | null;
  } | null>(null);

  // Modales de selección
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showOcupacionModal, setShowOcupacionModal] = useState(false);
  const [showModalidadModal, setShowModalidadModal] = useState(false);
  const [showExperienciaModal, setShowExperienciaModal] = useState(false);

  // Form states (Email Auth)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Registration extra fields (Compartidos entre Email y External Auth)
  const [name, setName] = useState("");
  const [lastNamePaterno, setLastNamePaterno] = useState("");
  const [lastNameMaterno, setLastNameMaterno] = useState("");
  const [phone, setPhone] = useState("");
  const [pais, setPais] = useState("Mexico");
  const [estado, setEstado] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [ocupacion, setOcupacion] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [nombreInmobiliaria, setNombreInmobiliaria] = useState("");
  const [anosExperiencia, setAnosExperiencia] = useState("");

  const { setCurrentUser } = useApp();
  const { uploadImage } = useImageUpload();
  const { bottom } = useStableSafeInsets();

  // Hooks de Auth Externa
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();
  // TODO: Agregar hooks de Facebook y Apple aquí
  // const { promptAsync: promptFacebook } = useFacebookAuth();
  // const { promptAsync: promptApple } = useAppleAuth();

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  // Validación básica (Paso 1 - Email)
  const validateStep1 = () => {
    if (
      !name ||
      !lastNamePaterno ||
      !lastNameMaterno ||
      !email ||
      !password ||
      !estado
    ) {
      Alert.alert("Error", "Por favor completa todos los campos obligatorios");
      return false;
    }
    if (!email.includes("@")) {
      Alert.alert("Error", "Email inválido");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  // Validación de perfil profesional (Paso 2 - Email & External)
  const validateProfessionalData = () => {
    // Si es auth externa, validamos también el estado aquí ya que no hubo paso 1
    if (pendingExternalUser && !estado) {
      Alert.alert("Error", "Selecciona tu estado");
      return false;
    }

    if (!ocupacion) {
      Alert.alert("Error", "Selecciona tu ocupación");
      return false;
    }
    if (ocupacion === "Asesor Inmobiliario") {
      if (!modalidad) {
        Alert.alert("Error", "Selecciona tu modalidad");
        return false;
      }
      if (modalidad === "Inmobiliaria" && !nombreInmobiliaria) {
        Alert.alert("Error", "Ingresa el nombre de la inmobiliaria");
        return false;
      }
    }
    if (anosExperiencia === "") {
      Alert.alert("Error", "Selecciona tus años de experiencia");
      return false;
    }
    return true;
  };

  const handleOpenModal = useCallback((selectedMode: "login" | "register") => {
    setMode(selectedMode);
    setStep(1);
    setAuthMethod("none");
    setPendingExternalUser(null);
    setModalVisible(true);
  }, []);

  // --- LÓGICA DE AUTH EXTERNA (Google, Apple, Facebook) ---
  const handleProviderAuth = async (provider: AuthProvider) => {
    setLoading(true);
    try {
      let authResult: { user: any; error: any } | null = null;
      let externalError = null;

      // 1. Ejecutar el login del proveedor
      switch (provider) {
        case "google":
          const res = await signInWithGoogle();
          if (res?.error) {
            externalError = res.error;
          } else if (res?.user) {
            authResult = { user: res.user, error: null };
          }
          break;
        case "facebook":
          // Aquí integrarás el hook de Facebook
          // const resFB = await signInWithFacebook();
          Alert.alert("Próximamente", "Inicio con Facebook en desarrollo");
          setLoading(false);
          return;
        case "apple":
          // Aquí integrarás el hook de Apple
          // const resApple = await signInWithApple();
          Alert.alert("Próximamente", "Inicio con Apple en desarrollo");
          setLoading(false);
          return;
      }

      if (externalError) {
        // Si hubo un error explícito (y no cancelación silenciosa)
        if (externalError !== "Inicio de sesión cancelado o fallido") {
          Alert.alert("Error de Autenticación", externalError);
        }
        setLoading(false);
        return;
      }

      if (!authResult?.user) {
        setLoading(false);
        return; // Cancelado o error manejado
      }

      const user = authResult.user;

      // 2. Verificar si el perfil existe en Supabase
      const { data: profile, error: profileError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        // A) Usuario ya existe -> Login exitoso
        OneSignal.login(user.id);
        setCurrentUser(profile);
        setModalVisible(false);
      } else {
        // B) Usuario nuevo -> Solicitar datos faltantes
        // Pre-llenamos lo que podamos del proveedor
        const fullName =
          user.user_metadata?.full_name || user.user_metadata?.name || "";
        const spaceIndex = fullName.indexOf(" ");

        let extractedName = "";
        let extractedLastName = "";

        if (spaceIndex > 0) {
          extractedName = fullName.substring(0, spaceIndex);
          extractedLastName = fullName.substring(spaceIndex + 1);
        } else {
          extractedName = fullName;
        }

        setName(extractedName);
        setLastNamePaterno(extractedLastName); // Intentamos adivinar, usuario puede corregir

        setEmail(user.email || "");

        setPendingExternalUser({
          id: user.id,
          email: user.email!,
          avatarUrl:
            user.user_metadata?.avatar_url || user.user_metadata?.picture,
          fullName,
        });

        // Cambiamos la vista al formulario de completado
        setAuthMethod("external");
      }
    } catch (error: any) {
      Alert.alert("Error de Autenticación", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FINALIZAR REGISTRO EXTERNO ---
  const finalizeExternalRegistration = async () => {
    if (!pendingExternalUser) return;
    if (!validateProfessionalData()) return;

    setLoading(true);
    try {
      // Subir avatar nuevo si el usuario eligió uno diferente al de Google
      let finalAvatarUrl = pendingExternalUser.avatarUrl || "";
      if (avatarUri) {
        const url = await uploadImage(avatarUri, "fotos", "fotoperfil");
        if (url) finalAvatarUrl = url;
      }

      // Crear perfil
      const newProfile: perfiles = {
        id: pendingExternalUser.id,
        email: pendingExternalUser.email,
        nombre: name || pendingExternalUser.fullName || "Usuario",
        apellido_paterno: lastNamePaterno,
        apellido_materno: lastNameMaterno,
        celular: phone || "",
        prefijo_celular: null,
        rol: "cliente",
        pais: "Mexico",
        estado: estado,
        foto: finalAvatarUrl,
        estado_registro: "pendiente",
        aprobaciones_recibidas: 0,
        aprobaciones_requeridas: 3,
        anos_experiencia: anosExperiencia,
        ocupacion: ocupacion,
        otro_ocupacion: null,
        modalidad: modalidad || null,
        nombre_inmobiliaria: nombreInmobiliaria || null,
        curso_certificacion: null,
        nombre_completo: `${name} ${lastNamePaterno} ${lastNameMaterno}`.trim(),
        activado_en: null,
        deleted_at: null,
        biografia: null,
        sitio_web: null,
        calificacion_promedio: null,
        total_calificaciones: null,
        total_recomendaciones_positivas: null,
        total_recomendaciones_negativas: null,
      };

      const { data, error } = await supabase
        .from("perfiles")
        .upsert(newProfile)
        .select()
        .single();

      if (error) throw error;

      OneSignal.login(pendingExternalUser.id);
      setCurrentUser(data);
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert("Error al crear perfil", error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE AUTH POR EMAIL (EXISTENTE) ---
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa email y contraseña");
      return;
    }

    setLoading(true);
    // ... (Tu lógica de timeout original se mantiene aquí)
    let timeoutId: NodeJS.Timeout | null = null;
    timeoutId = setTimeout(() => {
      if (timeoutId) {
        setLoading(false);
        Alert.alert("Error de conexión", "Tiempo de espera agotado.");
      }
    }, 15000);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data?.user) {
          OneSignal.login(data.user.id);
        }
        // El listener de onAuthStateChange manejará el resto en App.tsx o context
      } else {
        // Register Email
        if (!validateStep1() || !validateProfessionalData()) {
          clearTimeout(timeoutId!);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          let finalAvatarUrl = "";
          if (avatarUri) {
            const url = await uploadImage(avatarUri, "fotos", "fotoperfil");
            if (url) finalAvatarUrl = url;
          }
          console.log("ID USER", data.user.id);

          OneSignal.login(data.user.id);

          OneSignal.User.addTag("email", data.user.email);

          const newProfile: perfiles = {
            id: data.user.id,
            nombre: name,
            apellido_paterno: lastNamePaterno,
            apellido_materno: lastNameMaterno,
            prefijo_celular: null,
            celular: phone || "",
            email: email,
            rol: "cliente",
            pais: "Mexico",
            estado: estado,
            foto: finalAvatarUrl,
            estado_registro: "pendiente",
            aprobaciones_recibidas: 0,
            aprobaciones_requeridas: 3,
            anos_experiencia: anosExperiencia,
            ocupacion: ocupacion,
            otro_ocupacion: null,
            modalidad: modalidad || null,
            nombre_inmobiliaria: nombreInmobiliaria || null,
            curso_certificacion: null,
            nombre_completo: `${name} ${lastNamePaterno} ${lastNameMaterno}`,
            activado_en: null,
            deleted_at: null,
            biografia: null,
            sitio_web: null,
            calificacion_promedio: null,
            total_calificaciones: null,
            total_recomendaciones_positivas: null,
            total_recomendaciones_negativas: null,
          };

          const { error: userError } = await supabase
            .from("perfiles")
            .upsert(newProfile)
            .select();
          if (userError) throw userError;
        }
      }
      if (timeoutId) clearTimeout(timeoutId);
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      Alert.alert("Error", error.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  };

  const renderOption = (
    icon: any,
    label: string,
    textColor: string,
    iconColor: string,
    backgroundColor: string,
    onPress: () => void,
    disabled = false
  ) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        disabled && styles.optionDisabled,
        { backgroundColor },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={24} color={iconColor} />
      <Text
        style={[
          styles.optionText,
          { color: textColor },
          disabled && styles.textDisabled,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Renderizado del formulario de datos profesionales
  // Este bloque se usa tanto para el PASO 2 de Email como para COMPLETAR PERFIL EXTERNO
  const renderProfessionalForm = (isExternal: boolean) => (
    <>
      <Text style={styles.stepTitle}>
        {isExternal ? "Completa tu Registro" : "Información Profesional"}
      </Text>

      {/* Si es externo, quizás queramos pedir nombre/apellido si Google no lo dio bien, 
          o pedir ESTADO que es obligatorio en tu lógica */}
      {isExternal && (
        <>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <AppInput
                placeholder="Nombre"
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                placeholder="Apellido Paterno"
                value={lastNamePaterno}
                onChangeText={setLastNamePaterno}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowEstadoModal(true)}
          >
            <View style={styles.pickerTrigger}>
              <Text
                style={[styles.pickerText, !estado && styles.placeholderText]}
              >
                {estado || "Selecciona tu Estado *"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </View>
          </TouchableOpacity>
          <SelectionModal
            visible={showEstadoModal}
            onClose={() => setShowEstadoModal(false)}
            onSelect={setEstado}
            title="Selecciona tu Estado"
            options={[...ESTADOS_MEXICO]}
            searchable
            currentValue={estado}
          />
        </>
      )}

      <TouchableOpacity style={styles.avatarUpload} onPress={handlePickImage}>
        <Avatar
          uri={avatarUri || pendingExternalUser?.avatarUrl || undefined}
          name={name || pendingExternalUser?.fullName || "User"}
          size={100}
        />
        <Text style={styles.avatarUploadText}>
          {avatarUri ? "Cambiar foto" : "Confirmar foto de perfil"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowOcupacionModal(true)}
      >
        <View style={styles.pickerTrigger}>
          <Text
            style={[styles.pickerText, !ocupacion && styles.placeholderText]}
          >
            {ocupacion || "Ocupación *"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <SelectionModal
        visible={showOcupacionModal}
        onClose={() => setShowOcupacionModal(false)}
        onSelect={setOcupacion}
        title="Selecciona tu Ocupación"
        options={[
          "Asesor Inmobiliario",
          "Desarrollador Inmobiliario",
          "Arquitecto",
          "Constructor",
        ]}
        currentValue={ocupacion}
      />

      {ocupacion === "Asesor Inmobiliario" && (
        <>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowModalidadModal(true)}
          >
            <View style={styles.pickerTrigger}>
              <Text
                style={[
                  styles.pickerText,
                  !modalidad && styles.placeholderText,
                ]}
              >
                {modalidad || "Modalidad *"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </View>
          </TouchableOpacity>

          <SelectionModal
            visible={showModalidadModal}
            onClose={() => setShowModalidadModal(false)}
            onSelect={setModalidad}
            title="Selecciona tu Modalidad"
            options={["Inmobiliaria", "Independiente"]}
            currentValue={modalidad}
          />

          {modalidad === "Inmobiliaria" && (
            <AppInput
              placeholder="Nombre de inmobiliaria *"
              value={nombreInmobiliaria}
              onChangeText={setNombreInmobiliaria}
            />
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.input}
        onPress={() => setShowExperienciaModal(true)}
      >
        <View style={styles.pickerTrigger}>
          <Text
            style={[
              styles.pickerText,
              !anosExperiencia && styles.placeholderText,
            ]}
          >
            {anosExperiencia
              ? `${anosExperiencia} años`
              : "Años de experiencia *"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={COLORS.textSecondary}
          />
        </View>
      </TouchableOpacity>

      <SelectionModal
        visible={showExperienciaModal}
        onClose={() => setShowExperienciaModal(false)}
        onSelect={setAnosExperiencia}
        title="Años de experiencia"
        options={[...Array(11).keys()].map((n) => ({
          label: `${n} años`,
          value: n.toString(),
        }))}
        currentValue={anosExperiencia}
      />

      <SubmitButton
        loading={loading}
        onPress={isExternal ? finalizeExternalRegistration : handleEmailAuth}
        text={isExternal ? "Guardar y Continuar" : "Finalizar Registro"}
      />

      {/* Botón de volver diferente según el contexto */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={async () => {
          if (isExternal) {
            setPendingExternalUser(null);
            setAuthMethod("none");
            // Logout de supabase para limpiar sesión incompleta si es necesario
            await supabase.auth.signOut();
            OneSignal.User.removeAlias("external_id");
            await OneSignal.logout();
          } else {
            setStep(1);
          }
        }}
      >
        <Text style={styles.backButtonText}>
          {isExternal ? "Cancelar registro" : "Volver al paso 1"}
        </Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <Image
        source={require("../assets/ImgFondo.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,2)"]}
        style={styles.gradient}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../assets/Logo.jpeg")}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.mainButton, styles.loginButton]}
            onPress={() => handleOpenModal("login")}
          >
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainButton, styles.registerButton]}
            onPress={() => handleOpenModal("register")}
          >
            <Text style={styles.registerButtonText}>Registrarse</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={[styles.modalOverlay, { paddingBottom: bottom }]}
        >
          <View
            style={[
              styles.modalContent,
              { paddingBottom: Math.max(24, bottom) },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pendingExternalUser
                  ? "Completa tu perfil"
                  : mode === "login"
                  ? "Bienvenido de nuevo"
                  : "Crear cuenta"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* SELECCIÓN DE MÉTODO DE AUTENTICACIÓN */}
            {authMethod === "none" ? (
              <View style={styles.optionsContainer}>
                {renderOption(
                  "logo-facebook",
                  "Continuar con Facebook",
                  COLORS.white,
                  COLORS.white,
                  COLORS.facebook,
                  () => handleProviderAuth("facebook")
                )}

                {renderOption(
                  "logo-google",
                  "Continuar con Google",
                  COLORS.white,
                  COLORS.white,
                  COLORS.google,
                  () => handleProviderAuth("google")
                )}

                {renderOption(
                  "logo-apple",
                  "Continuar con Apple",
                  COLORS.white,
                  COLORS.white,
                  COLORS.apple,
                  () => handleProviderAuth("apple")
                )}

                {renderOption(
                  "mail",
                  "Continuar con Email",
                  COLORS.textPrimary,
                  COLORS.textPrimary,
                  COLORS.primaryTransparent,
                  () => setAuthMethod("email")
                )}
              </View>
            ) : authMethod === "external" && pendingExternalUser ? (
              // FORMULARIO PARA COMPLETAR DATOS DE AUTH EXTERNA
              <ScrollView
                style={styles.formContainer}
                contentContainerStyle={{ width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
                {renderProfessionalForm(true)}
              </ScrollView>
            ) : (
              // FLUJO DE EMAIL ORIGINAL
              <ScrollView
                style={styles.formContainer}
                contentContainerStyle={{ width: "100%" }}
                showsVerticalScrollIndicator={false}
              >
                {mode === "register" ? (
                  step === 1 ? (
                    <>
                      <Text style={styles.stepTitle}>Información Básica</Text>
                      <AppInput
                        placeholder="Nombre *"
                        value={name}
                        onChangeText={setName}
                      />
                      <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8, minWidth: 0 }}>
                          <AppInput
                            placeholder="Apellido Paterno *"
                            value={lastNamePaterno}
                            onChangeText={setLastNamePaterno}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppInput
                            placeholder="Apellido Materno *"
                            value={lastNameMaterno}
                            onChangeText={setLastNameMaterno}
                          />
                        </View>
                      </View>

                      <AppInput
                        placeholder="Correo electrónico *"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                      />

                      <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowEstadoModal(true)}
                      >
                        <View style={styles.pickerTrigger}>
                          <Text
                            style={[
                              styles.pickerText,
                              !estado && styles.placeholderText,
                            ]}
                          >
                            {estado || "Selecciona tu Estado *"}
                          </Text>
                          <Ionicons
                            name="chevron-down"
                            size={20}
                            color={COLORS.textSecondary}
                          />
                        </View>
                      </TouchableOpacity>

                      <SelectionModal
                        visible={showEstadoModal}
                        onClose={() => setShowEstadoModal(false)}
                        onSelect={setEstado}
                        title="Selecciona tu Estado"
                        options={[...ESTADOS_MEXICO]}
                        searchable
                        currentValue={estado}
                      />

                      <AppInput
                        placeholder="Contraseña *"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                      />
                      <AppInput
                        placeholder="Confirmar contraseña *"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />

                      <SubmitButton
                        loading={false}
                        onPress={() => validateStep1() && setStep(2)}
                        text="Siguiente"
                      />
                    </>
                  ) : (
                    // REUTILIZACIÓN DE FORMULARIO PROFESIONAL PARA EMAIL (Paso 2)
                    renderProfessionalForm(false)
                  )
                ) : (
                  <View style={styles.formContainer}>
                    <AppInput
                      placeholder="Correo electrónico"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                    />
                    <AppInput
                      placeholder="Contraseña"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      inputStyle={{
                        color: COLORS.black,
                      }}
                    />
                    <SubmitButton
                      loading={loading}
                      onPress={handleEmailAuth}
                      text="Entrar"
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setAuthMethod("none")}
                >
                  <Text style={styles.backButtonText}>Volver a opciones</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Tus estilos originales intactos)
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  backgroundImage: {
    position: "absolute",
    height: "100%",
    top: 0,
    left: 0,
  },
  logoWrapper: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    borderRadius: 30,
    backgroundColor: "transparent",
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 26,
    borderWidth: 5,
    borderColor: "rgba(177, 165, 165, 0.2)",
  },
  gradientLogo: {
    padding: 4,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 60,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    width: "100%",
  },
  title: {
    color: COLORS.white,
    padding: 20,
    borderRadius: 12,
    backgroundColor: COLORS.primaryTransparent,
  },
  titleText: {
    fontSize: 65,
    fontWeight: "bold",
    color: COLORS.white,
    textShadowColor: COLORS.blackTransparent50,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
    backgroundColor: "transparent",
    padding: 10,
    borderRadius: 12,
  },
  titleLetter: {
    color: COLORS.white,
    fontSize: 67,
    fontWeight: "bold",
    padding: 2,
  },
  buttonsContainer: {
    gap: 16,
    width: "100%",
  },
  mainButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  registerButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent50,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: "40%",
    width: "100%",
    maxWidth: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    gap: 12,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  textDisabled: {
    color: COLORS.textTertiary,
  },
  formContainer: {
    width: "100%",
    maxWidth: "100%",
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...Platform.select({}),
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  avatarUpload: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarUploadText: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    width: "100%",
    maxWidth: "100%",
  },
  pickerTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textTertiary,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  backButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  backButtonText: {
    color: COLORS.textSecondary,
  },
});
