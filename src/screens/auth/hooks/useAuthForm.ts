/**
 * useAuthForm.ts
 * Hook para manejar el estado y validación de formularios de autenticación
 */

import { useState, useCallback, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { collapseSpaces } from "@/utils/stringNormalizer";
import { logger } from "@/utils/logger";

import { OneSignal } from "react-native-onesignal";
import { useImageUpload } from "@/hooks";
import { applyStoredAdvisorInvite } from "@/services/communityService";
import * as Burnt from "burnt";
import { isMediaUnavailable, MEDIA_UNAVAILABLE_MESSAGE } from "@/services/uploadService";

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
  // Aceptaciones legales
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedAge: boolean;
  acceptedMarketing: boolean;
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
  acceptedTerms: false,
  acceptedPrivacy: false,
  acceptedAge: false,
  acceptedMarketing: false,
};

// REV13-07: borrador del registro. Si el usuario sale a la camara/galeria y el sistema cierra o reinicia la app, el
// formulario se recupera (SIN contrasenas: esas nunca se guardan). Caduca a la hora.
const DRAFT_KEY = "ilyrox:registro_borrador:v1";
const DRAFT_MAX_AGE_MS = 60 * 60 * 1000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// REV13-10: traza del inicio de sesion en debug_logs (SIN correo ni contrasena). Si la app se cierra al fallar un inicio
// de sesion, el ultimo evento guardado dice si cerro ANTES de la respuesta del servidor o DESPUES (al mostrar el error).
function trazaLogin(evento: string, extra?: Record<string, unknown>) {
  try {
    supabase
      .from("debug_logs")
      .insert({
        contexto: "login_trace",
        payload: { evento, plataforma: Platform.OS, version: String(Platform.Version), ts: new Date().toISOString(), ...(extra ?? {}) },
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // diagnostico: nunca debe afectar al inicio de sesion
  }
}

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

  // Referencia al refreshProfile MAS RECIENTE (handleRegister se creo cuando aun no habia usuario).
  const { refreshProfile } = useAuth();
  const refreshProfileRef = useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

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

  // Guardar borrador del registro (con debounce) mientras se llena el formulario.
  useEffect(() => {
    if (mode !== "register") return;
    const { password: _p, confirmPassword: _c, ...resto } = formState;
    const { password: _p0, confirmPassword: _c0, ...restoInicial } = initialFormState;
    if (JSON.stringify(resto) === JSON.stringify(restoInicial)) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ form: resto, ts: Date.now() })).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [formState, mode]);

  // Recuperar el borrador (si existe y no caduco). Devuelve true si habia uno.
  const restoreDraft = useCallback(async (): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw);
      if (!d?.form || !d?.ts || Date.now() - d.ts > DRAFT_MAX_AGE_MS) {
        await AsyncStorage.removeItem(DRAFT_KEY);
        return false;
      }
      setFormState({ ...initialFormState, ...d.form, password: "", confirmPassword: "" });
      setStep(1);
      setMode("register");
      return true;
    } catch {
      return false;
    }
  }, []);

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
        acceptedTerms,
        acceptedPrivacy,
        acceptedAge,
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
      // Validaciones legales obligatorias
      if (!acceptedTerms) {
        showModal({
          title: "Aceptación requerida",
          message: "Debes aceptar los Términos y Condiciones de ILYROX para continuar",
          confirmText: "OK",
        });
        return false;
      }
      if (!acceptedPrivacy) {
        showModal({
          title: "Aceptación requerida",
          message: "Debes confirmar que has leído la Política de Privacidad",
          confirmText: "OK",
        });
        return false;
      }
      if (!acceptedAge) {
        showModal({
          title: "Aceptación requerida",
          message: "Debes confirmar que tienes 18 años o más",
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
      trazaLogin("intento");
      // REV13-10: un espacio al final o una mayuscula del teclado hacian fallar un correo valido.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formState.email.trim().toLowerCase(),
        password: formState.password,
      });

      if (error) throw error;

      trazaLogin("respuesta_ok");
      if (data?.user) {
        OneSignal.login(data.user.id);
      }
      return true;
    } catch (error: any) {
      trazaLogin("respuesta_error", { status: error?.status ?? null, codigo: error?.code ?? null, mensaje: String(error?.message ?? "").slice(0, 120) });
      const sinRed = /network|fetch|timeout|offline/i.test(String(error?.message ?? "")) || error?.status === 0;
      showModal({
        title: "Error",
        message: sinRed
          ? "No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo."
          : "Correo o contraseña incorrectos. Si aún no tienes cuenta, usa \"Crear cuenta\".",
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
        accepted_terms: formState.acceptedTerms,
        accepted_privacy: formState.acceptedPrivacy,
        accepted_age: formState.acceptedAge,
        accepted_marketing: formState.acceptedMarketing,
      };

      log.info("handleRegister: Iniciando registro", { email: formState.email, name: formState.name });

      const { data, error } = await supabase.auth.signUp({
        email: formState.email.trim().toLowerCase(),
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
          // La cuenta ya está creada: si el servidor de archivos falla, se
          // termina el registro sin foto y se avisa.
          let url: string | null = null;
          try {
            url = await uploadImage(formState.avatarUri, "fotos", "perfiles");
          } catch (err) {
            log.warn("handleRegister: no se pudo subir la foto", err);
            if (isMediaUnavailable(err)) {
              Burnt.toast({
                title: `${MEDIA_UNAVAILABLE_MESSAGE} Podrás agregar tu foto desde tu perfil.`,
                preset: "error",
                duration: 5,
              });
            }
          }
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
            // El teléfono se guarda aquí porque el trigger de la BD no persiste
            // `celular` (solo el id). Sin esto, el campo queda vacío en
            // "Editar Perfil" tras registrarse.
            celular: celularDigits.length >= 10 ? celularDigits : null,
            prefijo_celular: "+52",
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
        AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
        // REV13-07: el perfil se cargo al iniciar sesion, ANTES de guardar foto/ocupacion/aprobaciones. Se vuelve a
        // pedir el perfil final para que la app no se quede en la pantalla de carga con un perfil viejo o vacio.
        try {
          await refreshProfileRef.current?.();
        } catch (e) {
          log.warn("handleRegister: no se pudo refrescar el perfil", e);
        }
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
    restoreDraft,
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