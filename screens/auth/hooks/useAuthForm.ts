/**
 * useAuthForm.ts
 * Hook para manejar el estado y validación de formularios de autenticación
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../../../lib/supabase";
import { perfiles } from "../../../types";
import { useApp } from "../../../context/AppContext";
import { useImageUpload } from "../../../hooks/useImageUpload";
import { OneSignal } from "react-native-onesignal";

export interface AuthFormState {
  // Credenciales
  email: string;
  password: string;
  confirmPassword: string;
  // Datos personales
  name: string;
  lastNamePaterno: string;
  lastNameMaterno: string;
  phone: string;
  pais: string;
  estado: string;
  avatarUri: string | null;
  // Datos profesionales
  ocupacion: string;
  modalidad: string;
  nombreInmobiliaria: string;
  anosExperiencia: string;
}

const initialFormState: AuthFormState = {
  email: "",
  password: "",
  confirmPassword: "",
  name: "",
  lastNamePaterno: "",
  lastNameMaterno: "",
  phone: "",
  pais: "Mexico",
  estado: "",
  avatarUri: null,
  ocupacion: "",
  modalidad: "",
  nombreInmobiliaria: "",
  anosExperiencia: "",
};

export function useAuthForm() {
  const [formState, setFormState] = useState<AuthFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"login" | "register">("login");

  const { setCurrentUser } = useApp();
  const { uploadImage } = useImageUpload();

  // Actualizar campo individual
  const updateField = useCallback(
    <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setStep(1);
  }, []);

  // Validación Paso 1 (datos básicos)
  const validateStep1 = useCallback((): boolean => {
    const { name, lastNamePaterno, lastNameMaterno, email, password, confirmPassword, estado } =
      formState;

    if (!name || !lastNamePaterno || !lastNameMaterno || !email || !password || !estado) {
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
  }, [formState]);

  // Validación datos profesionales
  const validateProfessionalData = useCallback(
    (requireEstado = false): boolean => {
      const { estado, ocupacion, modalidad, nombreInmobiliaria, anosExperiencia } = formState;

      if (requireEstado && !estado) {
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
    },
    [formState]
  );

  // Validación login
  const validateLogin = useCallback((): boolean => {
    const { email, password } = formState;
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa email y contraseña");
      return false;
    }
    return true;
  }, [formState]);

  // Login con email
  const handleLogin = useCallback(async (): Promise<boolean> => {
    if (!validateLogin()) return false;

    setLoading(true);
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
      Alert.alert("Error", error.message || "Ocurrió un error al iniciar sesión");
      return false;
    } finally {
      setLoading(false);
    }
  }, [formState, validateLogin]);

  // Registro con email
  const handleRegister = useCallback(async (): Promise<boolean> => {
    if (!validateStep1() || !validateProfessionalData()) return false;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formState.email,
        password: formState.password,
      });

      if (error) throw error;

      if (data.user) {
        let finalAvatarUrl = "";
        if (formState.avatarUri) {
          const url = await uploadImage(formState.avatarUri, "fotos", "fotoperfil");
          if (url) finalAvatarUrl = url;
        }

        OneSignal.login(data.user.id);
        OneSignal.User.addTag("email", data.user.email ?? "");

        const newProfile: perfiles = {
          id: data.user.id,
          nombre: formState.name,
          apellido_paterno: formState.lastNamePaterno,
          apellido_materno: formState.lastNameMaterno,
          prefijo_celular: null,
          celular: formState.phone || "",
          email: formState.email,
          rol: "cliente",
          pais: "Mexico",
          estado: formState.estado,
          foto: finalAvatarUrl,
          estado_registro: "pendiente",
          aprobaciones_recibidas: 0,
          aprobaciones_requeridas: 3,
          anos_experiencia: formState.anosExperiencia,
          ocupacion: formState.ocupacion,
          otro_ocupacion: null,
          modalidad: formState.modalidad || null,
          nombre_inmobiliaria: formState.nombreInmobiliaria || null,
          curso_certificacion: null,
          nombre_completo: `${formState.name} ${formState.lastNamePaterno} ${formState.lastNameMaterno}`,
          activado_en: null,
          deleted_at: null,
          biografia: null,
          sitio_web: null,
          calificacion_promedio: null,
          total_calificaciones: null,
          total_recomendaciones_positivas: null,
          total_recomendaciones_negativas: null,
        };

        const { error: profileError } = await supabase
          .from("perfiles")
          .upsert(newProfile)
          .select();

        if (profileError) throw profileError;
      }

      return true;
    } catch (error: any) {
      Alert.alert("Error", error.message || "Ocurrió un error al registrarse");
      return false;
    } finally {
      setLoading(false);
    }
  }, [formState, validateStep1, validateProfessionalData, uploadImage]);

  return {
    // Estado
    formState,
    loading,
    step,
    mode,
    // Setters
    updateField,
    setStep,
    setMode,
    resetForm,
    setFormState,
    // Validaciones
    validateStep1,
    validateProfessionalData,
    validateLogin,
    // Acciones
    handleLogin,
    handleRegister,
    setLoading,
  };
}
