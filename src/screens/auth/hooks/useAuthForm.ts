/**
 * useAuthForm.ts
 * Hook para manejar el estado y validación de formularios de autenticación
 */

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { collapseSpaces } from "@/utils/stringNormalizer";
import { logger } from "@/utils/logger";

import { OneSignal } from "react-native-onesignal";
import { useImageUpload } from "@/hooks";
import { applyStoredAdvisorInvite } from "@/services/communityService";

const log = logger.scoped("auth-form");

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
  fechaInicioCarrera: string;
  biografia: string;
}

const initialFormState: AuthFormState = {
  email: "",
  password: "",
  confirmPassword: "",
  name: "",
  lastNamePaterno: "",
  lastNameMaterno: "",
  phone: "+52",
  pais: "Mexico",
  estado: "",
  avatarUri: null,
  ocupacion: "",
  modalidad: "",
  nombreInmobiliaria: "",
  fechaInicioCarrera: "",
  biografia: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,          label: "mínimo 8 caracteres" },
  { test: (p: string) => /[A-Z]/.test(p),        label: "una mayúscula" },
  { test: (p: string) => /[a-z]/.test(p),        label: "una minúscula" },
  { test: (p: string) => /\d/.test(p),            label: "un número" },
  { test: (p: string) => /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/\\]/.test(p), label: "un carácter especial (!@#...)" },
];

function getPasswordError(password: string): string {
  const missing = PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label);
  return missing.length ? `Falta${missing.length > 1 ? "n" : ""}: ${missing.join(", ")}` : "";
}

export function getPasswordStrength(password: string): { label: string; met: boolean }[] {
  return PASSWORD_RULES.map((r) => ({ label: r.label, met: r.test(password) }));
}

export function useAuthForm() {
  const [formState, setFormState] = useState<AuthFormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"login" | "register">("login");

  const { uploadImage } = useImageUpload();

  // Los errores de auth se muestran como banner INLINE dentro del bottom sheet:
  // en iOS no se puede presentar el ConfirmationModal (Modal nativo) sobre el
  // AppBottomSheet (otro Modal nativo), así que no aparecería. Reutilizamos la
  // firma de showModal pero escribimos en este estado en vez de abrir el modal.
  const [error, setError] = useState<string | null>(null);
  const showModal = useCallback(
    (opts: { title?: string; message: string; confirmText?: string }) => {
      setError(opts.message);
    },
    [],
  );
  const clearError = useCallback(() => setError(null), []);

  // Actualizar campo individual
  const updateField = useCallback(
    <K extends keyof AuthFormState>(field: K, value: AuthFormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      setError(null);
    },
    [],
  );

  // Validación inline por campo (llamar en onBlur)
  const validateField = useCallback(
    (field: keyof AuthFormState, value: string) => {
      let error = "";
      if (field === "email" && value && !EMAIL_REGEX.test(value))
        error = "Email inválido";
      if (field === "password" && value)
        error = getPasswordError(value);
      if (field === "confirmPassword" && value && value !== formState.password)
        error = "Las contraseñas no coinciden";
      if (field === "phone" && value) {
        const digits = value.replace(/\D/g, "");
        if (digits.length < 10) error = "Teléfono debe tener 10 dígitos";
      }
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    },
    [formState.password],
  );

  // Resetear formulario
  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setStep(1);
    setError(null);
  }, []);

  // Validación Paso 1 (datos básicos)
  const validateStep1 = useCallback((): boolean => {
    const {
      name,
      lastNamePaterno,
      lastNameMaterno,
      email,
      password,
      confirmPassword,
      estado,
    } = formState;

    if (
      !name ||
      !lastNamePaterno ||
      !lastNameMaterno ||
      !email ||
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
    if (!EMAIL_REGEX.test(email)) {
      showModal({
        title: "Error",
        message: "Email inválido",
        confirmText: "OK",
      });
      return false;
    }
    const pwdError = getPasswordError(password);
    if (pwdError) {
      showModal({
        title: "Contraseña insegura",
        message: pwdError,
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
        fechaInicioCarrera,
        biografia,
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
      if (!fechaInicioCarrera) {
        showModal({
          title: "Error",
          message: "Selecciona la fecha en que iniciaste tu carrera",
          confirmText: "OK",
        });
        return false;
      }
      if (!biografia) {
        showModal({
          title: "Error",
          message: "Ingrese su biografía",
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
    setError(null);
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
    log.info("handleRegister: Iniciando registro");
    setError(null);
    if (!validateStep1() || !validateProfessionalData()) return false;

    setLoading(true);
    try {
      // Verificar teléfono duplicado solo si se proporcionó
      const celularDigits = formState.phone.replace(/\D/g, "").slice(2);
      if (celularDigits.length >= 10) {
        const { data: existingPhone } = await supabase
          .from("perfiles")
          .select("id")
          .eq("celular", celularDigits)
          .maybeSingle();

        if (existingPhone) {
          showModal({
            title: "Número ya registrado",
            message: "Ya existe una cuenta registrada con este número de teléfono.",
            confirmText: "OK",
          });
          setLoading(false);
          return false;
        }
      }

      // Preparar metadata del usuario para el trigger
      const userMetadata = {
        nombre: collapseSpaces(formState.name),
        apellido_paterno: collapseSpaces(formState.lastNamePaterno),
        apellido_materno: collapseSpaces(formState.lastNameMaterno),
        prefijo_celular: "+52",
        celular: celularDigits.length >= 10 ? celularDigits : null,
        pais: "Mexico",
        estado: formState.estado,
        rol: "cliente",
        nombre_completo: collapseSpaces(
          `${formState.name} ${formState.lastNamePaterno} ${formState.lastNameMaterno}`,
        ),
        ocupacion: formState.ocupacion,
        modalidad: formState.modalidad || null,
        nombre_inmobiliaria: formState.nombreInmobiliaria || null,
        fecha_inicio_carrera: formState.fechaInicioCarrera || null,
        biografia: formState.biografia || null,
      };

      log.info("handleRegister: Iniciando registro", { email: formState.email, name: formState.name });

      const { data, error } = await supabase.auth.signUp({
        email: formState.email,
        password: formState.password,
        options: {
          data: userMetadata,
        },
      });

      if (error) {
        log.error("handleRegister: Error en signUp", error);
        throw error;
      }

      log.info("handleRegister: signUp exitoso", { userId: data.user?.id, email: data.user?.email });

      if (data.user) {
        log.info("handleRegister: Llamando RPC handle_new_user para crear perfil");
        const { error: rpcError } = await supabase.rpc('handle_new_user');
        if (rpcError) {
          log.error("handleRegister: Error en RPC handle_new_user", {
            error: rpcError,
            message: rpcError.message,
            code: rpcError.code
          });
        } else {
          log.info("handleRegister: RPC handle_new_user exitosa");
        }

        let finalAvatarUrl = "";
        if (formState.avatarUri) {
          log.info("handleRegister: Subiendo foto");
          const url = await uploadImage(
            formState.avatarUri,
            "fotos",
            "perfiles",
          );
          if (url) {
            finalAvatarUrl = url;
            log.info("handleRegister: Foto subida", { url });
          }
        }

        log.info("handleRegister: Actualizando perfil con datos profesionales", { userId: data.user.id });
        const { data: updateData, error: updateError } = await supabase
          .from("perfiles")
          .update({
            ocupacion: formState.ocupacion,
            modalidad: formState.modalidad || null,
            nombre_inmobiliaria: formState.nombreInmobiliaria || null,
            fecha_inicio_carrera: formState.fechaInicioCarrera || null,
            biografia: formState.biografia || null,
            foto: finalAvatarUrl || null,
          })
          .eq("id", data.user.id);

        if (updateError) {
          log.error("handleRegister: Error en update del perfil", {
            error: updateError,
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint
          });
        } else {
          log.info("handleRegister: Update del perfil exitoso", { updateData });
        }

        log.info("handleRegister: Configurando OneSignal");
        OneSignal.login(data.user.id);
        OneSignal.User.addTag("email", data.user.email ?? "");

        log.info("handleRegister: Procesando invitacion");
        await applyStoredAdvisorInvite(data.user.id);
        log.info("handleRegister: Registro completado exitosamente", { userId: data.user.id });
      }

      return true;
    } catch (error: any) {
      log.error("handleRegister: Error en catch", { error: error?.message, code: error?.code });
      const msg = error?.message || "";
      const isEmailDup =
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already in use");
      showModal({
        title: "Error",
        message: isEmailDup
          ? "Ya existe una cuenta registrada con este correo electrónico."
          : msg || "Ocurrió un error al registrarse",
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
    fieldErrors,
    loading,
    step,
    mode,
    error,
    // Setters
    updateField,
    setStep,
    setMode,
    resetForm,
    setFormState,
    // Validaciones
    validateField,
    validateStep1,
    validateProfessionalData,
    validateLogin,
    // Acciones
    handleLogin,
    handleRegister,
    setLoading,
    clearError,
  };
}