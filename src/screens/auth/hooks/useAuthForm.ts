/**
 * useAuthForm.ts
 * Hook para manejar el estado y validación de formularios de autenticación
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { perfiles } from "@/types";
import { useApp } from "@/context/AppContext";

import { OneSignal } from "react-native-onesignal";
import { useImageUpload } from "@/hooks/hooks";
import { useModal } from "@/context/ModalContext";

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
  phone: "+52 ",
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
  const { showModal } = useModal();

  // Actualizar campo individual
  const updateField = useCallback(
    <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setStep(1);
  }, []);

  // Validación Paso 1 (datos básicos)
  const validateStep1 = useCallback((): boolean => {
    const {
      name,
      lastNamePaterno,
      lastNameMaterno,
      email,
      phone,
      password,
      confirmPassword,
      estado,
    } = formState;

    if (
      !name ||
      !lastNamePaterno ||
      !lastNameMaterno ||
      !email ||
      !phone ||
      !password ||
      !estado
    ) {
      showModal({
        title: "Error",
        message: "Por favor completa todos los campos obligatorios",
        confirmText: "OK",
      });
      return false;
    }
    if (!email.includes("@")) {
      showModal({
        title: "Error",
        message: "Email inválido",
        confirmText: "OK",
      });
      return false;
    }
    if (password.length < 6) {
      showModal({
        title: "Error",
        message: "La contraseña debe tener al menos 6 caracteres",
        confirmText: "OK",
      });
      return false;
    }
    if (password !== confirmPassword) {
      showModal({
        title: "Error",
        message: "Las contraseñas no coinciden",
        confirmText: "OK",
      });
      return false;
    }
    return true;
  }, [formState]);

  // Validación datos profesionales
  const validateProfessionalData = useCallback(
    (requireEstado = false): boolean => {
      const {
        estado,
        ocupacion,
        modalidad,
        nombreInmobiliaria,
        anosExperiencia,
      } = formState;

      if (requireEstado && !estado) {
        showModal({
          title: "Error",
          message: "Selecciona tu estado",
          confirmText: "OK",
        });
        return false;
      }
      if (!ocupacion) {
        showModal({
          title: "Error",
          message: "Selecciona tu ocupación",
          confirmText: "OK",
        });
        return false;
      }
      if (ocupacion === "Asesor Inmobiliario") {
        if (!modalidad) {
          showModal({
            title: "Error",
            message: "Selecciona tu modalidad",
            confirmText: "OK",
          });
          return false;
        }
        if (modalidad === "Inmobiliaria" && !nombreInmobiliaria) {
          showModal({
            title: "Error",
            message: "Ingresa el nombre de la inmobiliaria",
            confirmText: "OK",
          });
          return false;
        }
      }
      if (anosExperiencia === "") {
        showModal({
          title: "Error",
          message: "Selecciona tus años de experiencia",
          confirmText: "OK",
        });
        return false;
      }
      return true;
    },
    [formState],
  );

  // Validación login
  const validateLogin = useCallback((): boolean => {
    const { email, password } = formState;
    if (!email || !password) {
      showModal({
        title: "Error",
        message: "Por favor ingresa email y contraseña",
        confirmText: "OK",
      });
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
      showModal({
        title: "Error",
        message: "Credenciales incorrectas",
        confirmText: "OK",
      });
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
          const url = await uploadImage(
            formState.avatarUri,
            "fotos",
            "fotoperfil",
          );
          if (url) finalAvatarUrl = url;
        }

        OneSignal.login(data.user.id);
        OneSignal.User.addTag("email", data.user.email ?? "");

        const newProfile: perfiles = {
          id: data.user.id,
          nombre: formState.name,
          apellido_paterno: formState.lastNamePaterno,
          apellido_materno: formState.lastNameMaterno,
          prefijo_celular: formState.phone.includes(" ") ? formState.phone.split(" ")[0] : "+52",
          celular: formState.phone.includes(" ") ? formState.phone.split(" ").slice(1).join(" ") : formState.phone,
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
      showModal({
        title: "Error",
        message: error.message || "Ocurrió un error al registrarse",
        confirmText: "OK",
      });
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
