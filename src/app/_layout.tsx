import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { OneSignal } from "react-native-onesignal";
// TEMPORAL: diagnóstico del arranque por notificación (ver utils/pushDebug.ts).
import { plog } from "@/utils/pushDebug";
import { PushDebugOverlay } from "@/components/shared/PushDebugOverlay";
import { useFonts } from "expo-font";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  StatusBar,
  LogBox,
  AppState,
  AppStateStatus,
} from "react-native";

import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

import { ModalProvider } from "@/context/ModalContext";
import { SafeInsetsProvider } from "@/context/SafeInsetsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PendingApprovalScreen from "@/screens/PendingApprovalScreen";
import { InitialLoading } from "@/components/common/InitialLoading";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useOTAUpdates } from "@/hooks/useOTAUpdates";
import { VersionUpdateModal } from "@/components/modals/VersionUpdateModal";

// Ignore common warnings that do not affect functionality
LogBox.ignoreLogs([
  "Support for defaultProps will be removed",
  "MemoizedTNodeRenderer",
  "TNodeChildrenRenderer",
  "TRenderEngineProvider",
]);

/**
 * Decide a dónde navegar cuando el usuario toca una notificación push.
 * Devuelve la navegación a ejecutar, o null si no hay destino conocido.
 *
 * El destino se decide por `screen`, que es lo que realmente manda el servidor:
 * la Edge Function `enviar_notificacion_push` arma el payload como
 * `{ screen, type: additionalData.type ?? "notification", ...additionalData }`.
 *
 * Antes esto se decidía por `type` con valores en inglés ("new_message",
 * "new_match"…) que el backend NUNCA envía: en los mensajes `type` ni siquiera
 * existe (la función lo rellena con "notification") y en los matches viene en
 * español ("nuevo_match"). Además se navegaba a /(stack)/chat/[id] y
 * /(stack)/profile/[id], rutas que no existen. Resultado: ningún toque navegaba
 * y la app solo se traía al frente en la pantalla anterior.
 *
 * Las claves de los ids también son en español: conversacion_id, emisor_id,
 * propiedad_id, profesional_id.
 */
function buildNotificationNavigation(
  data: any,
  router: ReturnType<typeof useRouter>,
): (() => void) | null {
  if (!data) return null;

  switch (data.screen) {
    case "ChatDetail":
      // Se pasa el emisor (no la conversación): MessagingScreen resuelve con él
      // la conversación de esa propiedad y los datos del otro usuario (nombre y
      // foto del encabezado). Con solo conversationId se queda en la lista.
      if (!data.emisor_id) return () => router.push("/(stack)/messages");
      return () =>
        router.push({
          pathname: "/(stack)/messages",
          params: {
            initialUser: JSON.stringify({ id: data.emisor_id }),
            initialPropertyId: data.propiedad_id ?? "",
          },
        });

    case "matches":
    case "MatchDetail":
      return () => router.push("/(stack)/matches");

    case "AppointmentDetail":
      return () => router.push("/(stack)/appointments");

    case "PropertyDetail":
      if (!data.propiedad_id) return null;
      return () =>
        router.push({
          pathname: "/(stack)/property/[id]",
          params: { id: data.propiedad_id },
        });

    case "ProfileReviews":
      // La reseña es sobre uno mismo → perfil propio.
      return () => router.push("/(tabs)/profile");

    default:
      if (data.type === "recordar_filtros") return () => router.push("/(stack)/map");
      return null;
  }
}

/**
 * Captura del toque en una push, a nivel de MÓDULO.
 *
 * Con la app cerrada, OneSignal emite el evento "click" en cuanto se inicializa
 * —aquí mismo, al evaluarse este archivo—, muchísimo antes de que RootLayout
 * monte y registre un listener en un `useEffect` (hay que esperar a fuentes,
 * providers y sesión). El SDK no reemite ese evento a listeners tardíos: se
 * perdía y la app arrancaba en el feed. Con la app abierta o minimizada el
 * listener ya existía, y por eso ese caso sí funcionaba.
 *
 * Registrando el listener aquí —lo más temprano que hay JS— el dato queda
 * guardado hasta que la app esté en condiciones de navegar.
 */
let pendingNotificationData: any = null;
const notificationClickListeners = new Set<(data: any) => void>();

/** Entrega el toque a quien escuche; si aún no hay nadie, lo guarda. */
function emitNotificationClick(data: any) {
  if (notificationClickListeners.size === 0) {
    plog("  -> nadie escuchaba todavía: guardado como pendiente");
    pendingNotificationData = data;
    return;
  }
  plog("  -> entregado a la app (ya estaba montada)");
  notificationClickListeners.forEach((fn) => fn(data));
}

/** Devuelve el toque guardado (y lo consume) o null. */
function takePendingNotificationClick() {
  const data = pendingNotificationData;
  pendingNotificationData = null;
  return data;
}

// OneSignal init
if (Platform.OS !== "web") {
  OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);
  OneSignal.Notifications.requestPermission(true);
  plog("OneSignal inicializado, listener 'click' registrado");
  OneSignal.Notifications.addEventListener("click", (event: any) => {
    const data = event?.notification?.additionalData;
    plog("EVENTO click recibido. additionalData =", data ?? "(vacío)");
    if (data) emitNotificationClick(data);
  });
}

const queryClient = new QueryClient();

/**
 * React Query solo cablea `focusManager` a `visibilitychange` del navegador.
 * En React Native nadie lo hace, así que `refetchOnWindowFocus` nunca dispara
 * y queries como la de conversaciones (badge de mensajes no leídos) se quedan
 * obsoletas en el móvil aunque en la web se refresquen solas.
 */
function useReactQueryAppStateFocus() {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    };
    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  useReactQueryAppStateFocus();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <SafeAreaProvider>
                <ModalProvider>
                  <SafeInsetsProvider>
                    <BottomSheetModalProvider>
                      <QueryClientProvider client={queryClient}>
                        <RootLayoutNav />
                      </QueryClientProvider>
                    </BottomSheetModalProvider>
                  </SafeInsetsProvider>
                </ModalProvider>
              </SafeAreaProvider>
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { session, profile, loading: authLoading } = useAuth();
  const {
    updateRequired,
    versionInfo,
    loading: versionLoading,
  } = useVersionCheck();
  const segments = useSegments();
  const router = useRouter();

  // Toque en una push pendiente de navegar.
  const [notificationClick, setNotificationClick] = useState<any>(null);
  // Ruta actual siempre fresca, para la traza diferida (TEMPORAL, ver pushDebug).
  const segmentsRef = useRef<string[]>([]);
  segmentsRef.current = segments as string[];

  // Precarga las fuentes de íconos (Ionicons + MaterialCommunityIcons) antes de
  // renderizar la app. Evita que íconos como el de "Agrícola" (tractor, de
  // MaterialCommunityIcons) parpadeen o no aparezcan al cargar su fuente bajo
  // demanda al abrir la pantalla de Crear propiedad. Si la carga falla, avanzamos
  // igual para no bloquear el arranque.
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });
  const fontsReady = fontsLoaded || !!fontError;

  // Verifica/aplica actualizaciones OTA (EAS Update) silenciosamente al iniciar.
  useOTAUpdates();

  const loading = authLoading || versionLoading || !fontsReady;

  // Mostrar notificaciones aunque la app esté en foreground — efecto estable sin dependencias
  useEffect(() => {
    if (Platform.OS === "web") return;
    const handleForegroundDisplay = (event: any) => {
      try { event.getNotification().display(); } catch {}
    };
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", handleForegroundDisplay);
    return () => OneSignal.Notifications.removeEventListener("foregroundWillDisplay", handleForegroundDisplay);
  }, []);

  // Recoge el toque en una push: el que llegó antes de montar (arranque en frío,
  // guardado a nivel de módulo) y los que lleguen con la app ya viva.
  useEffect(() => {
    if (Platform.OS === "web") return;
    const onClick = (data: any) => setNotificationClick(data);
    notificationClickListeners.add(onClick);
    const pending = takePendingNotificationClick();
    plog(
      pending
        ? "RootLayout montado: recoge el click pendiente"
        : "RootLayout montado: no había click pendiente",
    );
    if (pending) setNotificationClick(pending);
    return () => {
      notificationClickListeners.delete(onClick);
    };
  }, []);

  // Global StatusBar setup
  useEffect(() => {
    StatusBar.setHidden(false);
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
      StatusBar.setBarStyle("dark-content"); // Default to dark content for light theme
    } else {
      StatusBar.setBarStyle("dark-content");
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    const isResetPassword = segments.includes("reset-password");

    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && inAuthGroup && !isResetPassword) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  /**
   * Ejecuta la navegación de una push tocada antes de que la app pudiera navegar.
   *
   * Abrir desde una push con la app cerrada tiene tres trampas, y hay que
   * esperar a las tres o el usuario acaba en el feed en vez del chat:
   *
   * 1. `rootNavigationState.key`: hasta que existe, el navegador raíz no está
   *    montado y `router.push` se descarta EN SILENCIO. Es la trampa principal:
   *    el Stack se monta en el mismo commit en que `loading` pasa a false, así
   *    que navegar en ese efecto llega demasiado pronto y se pierde.
   * 2. Salir de `(auth)`: si la sesión tarda, la app pasa por /login y el efecto
   *    de sesión de arriba hace `router.replace("/(tabs)")`, que nos pisaría.
   * 3. El tick final: el `replace` del guard se procesa en el frame siguiente,
   *    así que la navegación se encola detrás de él.
   */
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!notificationClick) return;

    const ready =
      !loading &&
      !!session &&
      !!profile &&
      !!rootNavigationState?.key &&
      segments[0] !== "(auth)";

    plog(
      `¿listo para navegar? ${ready ? "SÍ" : "NO"} ·` +
        ` loading=${loading} sesión=${!!session} perfil=${!!profile}` +
        ` navKey=${!!rootNavigationState?.key} ruta=[${segments.join("/")}]`,
    );
    if (!ready) return;

    const go = buildNotificationNavigation(notificationClick, router);
    plog(
      `destino decidido: ${go ? "hay ruta" : "NINGUNA"} para screen=${notificationClick?.screen}`,
    );
    setNotificationClick(null);
    if (!go) return;

    const timer = setTimeout(() => {
      plog("ejecutando navegación…");
      go();
      // Dónde acabamos de verdad: si algo pisa la navegación, se ve aquí.
      setTimeout(() => plog("ruta 1,5s después =", segmentsRef.current), 1500);
    }, 300);
    return () => clearTimeout(timer);
  }, [
    notificationClick,
    loading,
    session,
    profile,
    segments,
    rootNavigationState?.key,
    router,
  ]);

  if (loading) {
    return <InitialLoading />;
  }

  // Si hay sesión pero el perfil aún no carga, seguimos en loading
  if (session && !profile) {
    return <InitialLoading />;
  }

  // Verificación de aprobaciones para no-admins
  if (session && profile) {
    const isAdmin = profile.rol === "admin";
    if (
      !isAdmin &&
      (profile.aprobaciones_recibidas || 0) <
        (profile.aprobaciones_requeridas || 3)
    ) {
      return <PendingApprovalScreen />;
    }
  }

  // Main Stack incorporating all groups
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(stack)" />
        {/* Los formularios de creación guardan todo en estado local: un gesto
            lateral accidental hacía pop de la ruta y borraba lo llenado sin
            preguntar. La salida se confirma desde el propio formulario. */}
        <Stack.Screen
          name="create/property"
          options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
        />
        <Stack.Screen
          name="create/reel"
          options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
        />
        <Stack.Screen
          name="create/post"
          options={{ gestureEnabled: false, fullScreenGestureEnabled: false }}
        />
      </Stack>
      {updateRequired && versionInfo && (
        <VersionUpdateModal
          visible={updateRequired}
          storeUrl={versionInfo.store_url}
        />
      )}
      {/* TEMPORAL: diagnóstico del arranque por notificación. Quitar junto con
          utils/pushDebug.ts cuando el bug esté resuelto. */}
      <PushDebugOverlay />
    </>
  );
}

