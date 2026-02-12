import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useModal } from "@/context/ModalContext";
import * as Linking from "expo-linking";
import { Session } from "@supabase/supabase-js";

// Función helper para parsear parámetros de URL (tanto query ? como fragment #)
const parseUrlParams = (url: string): Record<string, string> => {
  const params: Record<string, string> = {};
  
  // Parsear query params (después de ?)
  const queryMatch = url.match(/\?([^#]*)/);
  if (queryMatch) {
    const queryString = queryMatch[1];
    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) params[key] = decodeURIComponent(value || '');
    });
  }
  
  // Parsear fragment params (después de #)
  const fragmentMatch = url.match(/#(.+)/);
  if (fragmentMatch) {
    const fragmentString = fragmentMatch[1];
    fragmentString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key) params[key] = decodeURIComponent(value || '');
    });
  }
  
  return params;
};

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { showModal } = useModal();
  const localParams = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const hasProcessedLink = useRef(false);

  const validateForm = (): boolean => {
    const newErrors = {
      newPassword: "",
      confirmPassword: "",
    };

    let isValid = true;

    if (!newPassword.trim()) {
      newErrors.newPassword = "La contraseña es obligatoria";
      isValid = false;
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  useEffect(() => {
    console.log("=== ResetPasswordScreen INIT ===");
    
    // 1. Sincronizar sesión inicial
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("✅ Sesión activa encontrada al inicio");
        setCurrentSession(session);
        setIsProcessingLink(false);
        hasProcessedLink.current = true;
      }
    };
    syncSession();

    // 2. Listener de cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`🔄 Auth Event: ${event}, Session: ${session ? "YES" : "NO"}`);
      
      if (session) {
        setCurrentSession(session);
        setIsProcessingLink(false);
      }
      
      // Evento específico de recuperación de contraseña
      if (event === 'PASSWORD_RECOVERY' && session) {
        console.log("✅ PASSWORD_RECOVERY event con sesión válida");
        setIsProcessingLink(false);
        hasProcessedLink.current = true;
      }
    });

    // 3. Función para manejar parámetros de recuperación
    const handleRecoveryParams = async (params: Record<string, string>) => {
      if (!params || Object.keys(params).length === 0) return;
      if (hasProcessedLink.current) {
        console.log("⏭️  Link ya procesado, ignorando...");
        return;
      }

      console.log("🔍 Procesando parámetros:", params);

      // PRIMERO: Detectar errores
      if (params.error || params.error_description || params.error_code) {
        hasProcessedLink.current = true;
        let msg = params.error_description?.replace(/\+/g, ' ') || params.error || "Error desconocido";
        
        if (params.error_code === 'otp_expired') {
          msg = "El enlace de recuperación ha expirado o ya ha sido utilizado. Por favor, solicita uno nuevo.";
        }
        
        console.error("❌ Error en parámetros:", msg);
        setSessionError(msg);
        setIsProcessingLink(false);
        return;
      }

      // SEGUNDO: Procesar tokens válidos
      try {
        if (params.access_token && params.refresh_token) {
          console.log("🔑 Estableciendo sesión con tokens...");
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          
          if (error) throw error;
          
          hasProcessedLink.current = true;
          console.log("✅ Sesión establecida correctamente");
          setCurrentSession(data.session);
          setIsProcessingLink(false);
        } else if (params.code) {
          console.log("🔄 Intercambiando código por sesión...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
          
          if (error) throw error;
          
          hasProcessedLink.current = true;
          console.log("✅ Código intercambiado correctamente");
          setCurrentSession(data.session);
          setIsProcessingLink(false);
        } else {
          console.log("⚠️  No se encontraron tokens ni código en parámetros");
        }
      } catch (err: any) {
        console.error("💥 Error al procesar tokens:", err);
        hasProcessedLink.current = true;
        setSessionError(err.message || "No se pudo validar el enlace de recuperación.");
        setIsProcessingLink(false);
      }
    };

    // 4. Detectar y procesar links
    const checkLink = async () => {
      // Prioridad 1: Expo Router Params
      if (Object.keys(localParams).length > 0) {
        console.log("📱 Parámetros vía Expo Router");
        const params: Record<string, string> = {};
        Object.keys(localParams).forEach(key => {
          const value = localParams[key];
          params[key] = typeof value === 'string' ? value : String(value);
        });
        await handleRecoveryParams(params);
      }

      // Prioridad 2: Initial URL
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log("🔗 URL inicial:", initialUrl);
        const params = parseUrlParams(initialUrl);
        await handleRecoveryParams(params);
      }

      // Timeout de seguridad
      setTimeout(async () => {
        if (isProcessingLink && !hasProcessedLink.current) {
          console.log("⏰ Timeout alcanzado");
          const { data: { session } } = await supabase.auth.getSession();
          if (!session && !sessionError) {
            console.log("⚠️  No se detectó sesión válida");
          }
          setIsProcessingLink(false);
        }
      }, 4000);
    };

    checkLink();

    // 5. Listener para URLs entrantes
    const linkSubscription = Linking.addEventListener("url", async ({ url }) => {
      console.log("📨 URL entrante:", url);
      const params = parseUrlParams(url);
      await handleRecoveryParams(params);
    });

    return () => {
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sesión de recuperación no encontrada. El enlace es inválido o ha expirado.");
      }

      console.log("🔐 Actualizando contraseña...");
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      console.log("✅ Contraseña actualizada exitosamente");

      showModal({
        title: "Contraseña actualizada",
        message: "Tu contraseña ha sido cambiada con éxito. Ya puedes iniciar sesión.",
        confirmText: "Ir al Login",
        onConfirm: () => {
          // Cerrar sesión para forzar nuevo login
          supabase.auth.signOut();
          router.replace("/login");
        },
      });

    } catch (error: any) {
      console.error("❌ Error al actualizar contraseña:", error);
      showModal({
        title: "Error",
        message: error.message || "Ocurrió un error inesperado.",
        confirmText: "OK",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // RENDER: Loading
  if (isProcessingLink) {
    return (
      <ScreenWrapper withHeader={false} style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Validando enlace...</Text>
      </ScreenWrapper>
    );
  }

  // RENDER: Error de sesión
  if (sessionError) {
    return (
      <ScreenWrapper withHeader={false} style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
        <Text style={styles.errorTitle}>Enlace inválido</Text>
        <Text style={styles.errorSubtitle}>{sessionError}</Text>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => router.replace("/forgot-password")}
        >
          <Text style={styles.submitButtonText}>Solicitar nuevo enlace</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.backButtonText}>Volver al login</Text>
        </TouchableOpacity>
      </ScreenWrapper>
    );
  }

  // RENDER: No hay sesión válida
  if (!currentSession) {
    return (
      <ScreenWrapper withHeader={false} style={[styles.container, styles.centerContent]}>
        <Ionicons name="link-outline" size={60} color={COLORS.textTertiary} />
        <Text style={styles.errorTitle}>Enlace no detectado</Text>
        <Text style={styles.errorSubtitle}>
          No pudimos validar tu sesión de recuperación. Esto ocurre si el enlace ya expiró o si abriste la pantalla directamente.
        </Text>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => router.replace("/forgot-password")}
        >
          <Text style={styles.submitButtonText}>Solicitar nuevo enlace</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace("/login")}
        >
          <Text style={styles.backButtonText}>Volver al login</Text>
        </TouchableOpacity>
      </ScreenWrapper>
    );
  }

  // RENDER: Formulario de reset
  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Restablecer Contraseña"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.description}>
              Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
            </Text>

            {/* Campo de Nueva Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Nueva contraseña <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    errors.newPassword && styles.inputError,
                  ]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={COLORS.textTertiary}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (errors.newPassword) {
                      setErrors({ ...errors, newPassword: "" });
                    }
                  }}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.newPassword ? (
                <Text style={styles.errorText}>{errors.newPassword}</Text>
              ) : null}
            </View>

            {/* Campo de Confirmar Contraseña */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Confirmar contraseña <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor={COLORS.textTertiary}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) {
                      setErrors({ ...errors, confirmPassword: "" });
                    }
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: "center",
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  passwordContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

export default ResetPasswordScreen;