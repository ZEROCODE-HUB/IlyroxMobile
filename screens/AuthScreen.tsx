import React, { useState } from "react";
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

export default function AuthScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(1); // Para el flujo de registro multietapa
  const [authMethod, setAuthMethod] = useState<"none" | "email">("none");
  const [loading, setLoading] = useState(false);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showOcupacionModal, setShowOcupacionModal] = useState(false);
  const [showModalidadModal, setShowModalidadModal] = useState(false);
  const [showExperienciaModal, setShowExperienciaModal] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Registration extra fields
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

  const validateStep2 = () => {
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

  const handleOpenModal = (selectedMode: "login" | "register") => {
    setMode(selectedMode);
    setStep(1);
    setAuthMethod("none"); // Reset to selection
    setModalVisible(true);
  };

  /*
   * FIX: Hooks can be sensitive to conditional rendering if components are defined inside.
   * Picker itself is a component, so conditional rendering is fine unless it changes order.
   * However, logic needs updates.
   */

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa email y contraseña");
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "Error de conexión",
        "El proceso está tardando demasiado. Por favor, verifica tu conexión e intenta de nuevo."
      );
    }, 20000); // 20 segundos para el flujo completo

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      } else {
        // Register
        if (!validateStep1() || !validateStep2()) {
          clearTimeout(timeoutId);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Subir avatar si existe
          let finalAvatarUrl = "";
          if (avatarUri) {
            const url = await uploadImage(avatarUri, "fotos", "fotoperfil");
            if (url) {
              finalAvatarUrl = url;
            }
          }

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

          if (userError) {
            console.error("Profile creation error:", userError);
            throw userError;
          }
        }
      }
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Auth Error Details:", error);
      let msg = error.message;
      if (
        error.message === "Network request failed" ||
        error instanceof TypeError
      ) {
        msg = "Error de conexión. Verifica tu internet.";
      }
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const estados = [
    { label: "Selecciona un estado", value: "" },
    { label: "Aguascalientes", value: "Aguascalientes" },
    { label: "Baja California", value: "Baja California" },
    { label: "Baja California Sur", value: "Baja California Sur" },
    { label: "Campeche", value: "Campeche" },
  ];

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
            {/* <LinearGradient
              colors={["#4c669f", "#3b5998", "#192f6a"]}
              style={styles.gradientLogo}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            /> */}
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === "login" ? "Bienvenido de nuevo" : "Crear cuenta"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {authMethod === "none" ? (
              <View style={styles.optionsContainer}>
                {renderOption(
                  "logo-facebook",
                  "Continuar con Facebook",
                  COLORS.white,
                  COLORS.white,
                  COLORS.facebook,
                  () => {}
                )}

                {renderOption(
                  "mail-outline",
                  "Continuar con Gmail",
                  COLORS.white,
                  COLORS.white,
                  COLORS.google,
                  () => {}
                )}
                {renderOption(
                  "logo-apple",
                  "Continuar con Apple",
                  COLORS.white,
                  COLORS.white,
                  COLORS.apple,
                  () => {}
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
            ) : (
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

                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={() => validateStep1() && setStep(2)}
                      >
                        <Text style={styles.submitButtonText}>Siguiente</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.stepTitle}>
                        Información Profesional
                      </Text>

                      <TouchableOpacity
                        style={styles.avatarUpload}
                        onPress={handlePickImage}
                      >
                        <Avatar
                          uri={avatarUri || undefined}
                          name={name}
                          size={100}
                        />
                        <Text style={styles.avatarUploadText}>
                          {avatarUri ? "Cambiar foto" : "Subir foto de perfil"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.input}
                        onPress={() => setShowOcupacionModal(true)}
                      >
                        <View style={styles.pickerTrigger}>
                          <Text
                            style={[
                              styles.pickerText,
                              !ocupacion && styles.placeholderText,
                            ]}
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

                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleAuth}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color={COLORS.white} />
                        ) : (
                          <Text style={styles.submitButtonText}>
                            Finalizar Registro
                          </Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setStep(1)}
                      >
                        <Text style={styles.backButtonText}>
                          Volver al paso 1
                        </Text>
                      </TouchableOpacity>
                    </>
                  )
                ) : (
                  <>
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
                    />
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleAuth}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.submitButtonText}>Entrar</Text>
                      )}
                    </TouchableOpacity>
                  </>
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
    // Efecto de Elevación (Sombras)
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10, // Da la sensación de estar flotando
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15, // Elevación para Android
    borderRadius: 30, // Debe coincidir con el logo
    backgroundColor: "transparent",
  },
  logo: {
    width: 160,
    height: 160,
    borderRadius: 26, // Un poco menos que el contenedor para que encaje bien
    borderWidth: 5,
    borderColor: "rgba(177, 165, 165, 0.2)", // Borde fino para separar del fondo
  },
  gradientLogo: {
    padding: 4, // Este padding crea un borde brillante con el degradado
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
    marginTop: 60, // Ajustado para que no esté pegado al borde superior
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
