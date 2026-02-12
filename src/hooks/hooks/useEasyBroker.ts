import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useModal } from "@/context/ModalContext";

export interface SyncHistory {
    id: string;
    fecha: string;
    propiedades_procesadas: number;
    propiedades_nuevas: number;
    propiedades_actualizadas: number;
    errores: number;
    mensaje_error: string | null;
    status: string;
}

export interface Stats {
    total: number;
    lastSync: string | null;
    nuevas: number;
    actualizadas: number;
}

export const useEasyBroker = () => {
    const { user } = useAuth();
    const { showModal } = useModal();

    // Estados
    const [apiKey, setApiKey] = useState("");
    const [hasApiKey, setHasApiKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        lastSync: null,
        nuevas: 0,
        actualizadas: 0,
    });
    const [history, setHistory] = useState<SyncHistory[]>([]);
    const [syncResult, setSyncResult] = useState<{
        type: "success" | "error" | null;
        message: string | null;
    }>({ type: null, message: null });

    // Refs para control de suscripciones
    const channelRef = useRef<RealtimeChannel | null>(null);
    const isMountedRef = useRef(true);

    /**
     * Cargar datos iniciales
     */
    const loadInitialData = async () => {
        try {
            if (!isMountedRef.current) return;
            setLoading(true);

            // Cargar config
            const { data: config } = await supabase.rpc("obtener_config_easybroker");

            if (config?.success) {
                setHasApiKey(config.tiene_api_key);

                if (config.data) {
                    setStats({
                        total: config.data.total_propiedades_sincronizadas || 0,
                        lastSync: config.data.ultima_sincronizacion,
                        nuevas: 0,
                        actualizadas: 0,
                    });

                    if (config.data.sincronizacion_en_progreso) {
                        setSyncing(true);
                    }
                }
            }

            // Cargar historial
            const { data: historial } = await supabase.rpc(
                "obtener_historial_sincronizaciones",
                { p_limit: 5 }
            );

            if (historial?.success && historial.data) {
                const filtered = historial.data.filter(
                    (item: SyncHistory) =>
                        item.status === "completada" || item.status === "error"
                );
                setHistory(filtered);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    /**
     * Limpiar canal Realtime
     */
    const cleanupChannel = async () => {
        if (channelRef.current) {
            try {
                await supabase.removeChannel(channelRef.current);
            } catch (err) {
                console.warn("⚠️ Error removing sync channel:", err);
            }
            channelRef.current = null;
        }
    };

    /**
     * Configurar suscripción Realtime solo cuando está sincronizando
     */
    const setupSyncSubscription = async () => {
        if (!user?.id) return;

        // Limpiar suscripción anterior si existe
        await cleanupChannel();

        const channel = supabase
            .channel(`sync-updates-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "sincronizaciones_easybroker",
                    filter: `usuario_id=eq.${user.id}`,
                },
                (payload) => {
                    if (!isMountedRef.current) return;

                    const sync = payload.new;
                    if (sync.status === "completada") {
                        setSyncing(false);
                        loadInitialData();

                        let mensaje = "";
                        if (
                            sync.propiedades_nuevas === 0 &&
                            sync.propiedades_actualizadas === 0
                        ) {
                            mensaje = "No hay cambios. Tus propiedades ya están sincronizadas.";
                        } else {
                            mensaje = `${sync.propiedades_nuevas} nuevas, ${sync.propiedades_actualizadas} actualizadas`;
                        }

                        setSyncResult({ type: "success", message: mensaje });
                        // Alert opcional, mejor mostrarlo en UI
                        if (sync.propiedades_nuevas === 0 && sync.propiedades_actualizadas === 0) {
                            showModal({ title: "Todo al día", message: mensaje, confirmText: "OK" });
                        } else {
                            showModal({ title: "Sincronización completada", message: mensaje, confirmText: "OK" });
                        }

                    } else if (sync.status === "error") {
                        setSyncing(false);
                        loadInitialData();

                        const errorMsg =
                            sync.mensaje_error || "Hubo un problema en la sincronización";
                        setSyncResult({ type: "error", message: errorMsg });
                        showModal({ title: "Error en sincronización", message: errorMsg, confirmText: "OK" });
                    }
                }
            )
            .subscribe((status) => { });

        channelRef.current = channel;
    };

    /**
     * Effect: Cargar datos iniciales
     */
    useEffect(() => {
        isMountedRef.current = true;
        loadInitialData();

        return () => {
            isMountedRef.current = false;
            cleanupChannel();
        };
    }, []);

    /**
     * Effect: Configurar/limpiar suscripción según estado de sincronización
     */
    useEffect(() => {
        if (syncing && user?.id) {
            setupSyncSubscription();
        } else {
            cleanupChannel();
        }

        return () => {
            cleanupChannel();
        };
    }, [syncing, user?.id]);

    /**
     * Guardar API Key y sincronizar
     */
    const handleSaveAndSync = async () => {
        if (!apiKey.trim()) {
            showModal({ title: "Oops", message: "Ingresa tu API Key de EasyBroker", confirmText: "OK" });
            return;
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.rpc("guardar_api_key_easybroker", {
                p_api_key: apiKey.trim(),
            });

            if (error) throw error;

            if (data?.success) {
                setHasApiKey(true);
                setApiKey("");
                // Sincronizar automáticamente tras guardar
                setTimeout(() => {
                    handleSync();
                }, 500);
            }
        } catch (error) {
            showModal({ title: "Error", message: "No se pudo guardar la API Key", confirmText: "OK" });
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    /**
     * Iniciar sincronización manual
     */
    const handleSync = async () => {
        if (syncing) return;

        try {
            setSyncing(true);
            setSyncResult({ type: null, message: null });

            const {
                data: { user: currentUser },
            } = await supabase.auth.getUser();
            if (!currentUser) return;

            const { error } = await supabase.functions.invoke(
                "sincronizar-easybroker",
                {
                    body: { usuario_id: currentUser.id },
                }
            );

            if (error) {
                throw error;
            }

            // La suscripción Realtime manejará las actualizaciones
        } catch (error: any) {
            setSyncing(false);

            // Mejorar manejo de errores de Edge Functions
            let errorMessage = "No se pudo iniciar la sincronización";
            const errorString = error?.toString() || "";

            if (errorString.includes("FunctionsHttpError") || errorString.includes("non-2xx")) {
                errorMessage = "API Key inválida o expirada. Por favor verifica tu configuración.";
            } else if (error?.message) {
                errorMessage = error.message;
            }

            setSyncResult({ type: "error", message: errorMessage });
            showModal({ title: "Error de Sincronización", message: errorMessage, confirmText: "OK" });
            console.error("Error starting sync:", error);
        }
    };

    const changeApiKey = () => {
        setHasApiKey(false);
        setSyncResult({ type: null, message: null });
    };

    return {
        apiKey,
        setApiKey,
        hasApiKey,
        loading,
        syncing,
        stats,
        history,
        syncResult,
        handleSaveAndSync,
        handleSync,
        changeApiKey,
        setHasApiKey,
    };
};
