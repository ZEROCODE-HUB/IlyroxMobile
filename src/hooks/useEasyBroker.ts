import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useModal } from "@/context/ModalContext";
import { logger } from "@/utils/logger";const log = logger.scoped("useEasyBroker");

export interface SyncHistory {
    id: string;
    fecha: string;
    propiedades_procesadas: number;
    propiedades_nuevas: number;
    propiedades_actualizadas: number;
    propiedades_sin_cambios: number;
    errores: number;
    errores_detalle: { propiedad_id: string; error: string }[] | null;
    mensaje_error: string | null;
    status: string;
}

export interface Stats {
    total: number;
    lastSync: string | null;
}

export interface SyncProgress {
    procesadas: number;
    total: number;
}

export const useEasyBroker = () => {
    const { user } = useAuth();
    const { showModal } = useModal();

    // Estados
    const [apiKey, setApiKey] = useState("");
    const [hasApiKey, setHasApiKey] = useState(false);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        lastSync: null,
    });
    const [history, setHistory] = useState<SyncHistory[]>([]);

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
                    });

                    if (config.data.sincronizacion_en_progreso) {
                        // Verificar si la sync lleva más de 15 minutos (registro huérfano)
                        const { data: syncHuerfano } = await supabase
                            .from("sincronizaciones_easybroker")
                            .select("id, started_at")
                            .eq("usuario_id", user?.id)
                            .eq("status", "en_progreso")
                            .order("started_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        const QUINCE_MINUTOS = 15 * 60 * 1000;
                        const esHuerfano = syncHuerfano &&
                            (Date.now() - new Date(syncHuerfano.started_at).getTime()) > QUINCE_MINUTOS;

                        if (esHuerfano) {
                            // Limpiar estado colgado
                            await supabase
                                .from("sincronizaciones_easybroker")
                                .update({ status: "error", mensaje_error: "Tiempo de espera agotado", completed_at: new Date().toISOString() })
                                .eq("id", syncHuerfano.id);
                            await supabase
                                .from("easybroker_config")
                                .update({ sincronizacion_en_progreso: false })
                                .eq("usuario_id", user?.id);
                        } else {
                            setSyncing(true);
                        }
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
            log.error("Error loading data:", error);
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
                log.warn("⚠️ Error removing sync channel:", err);
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

                    if (sync.status === "en_progreso") {
                        // Actualizar progreso en tiempo real
                        if (sync.propiedades_procesadas != null && sync.total_publicadas != null) {
                            setSyncProgress({
                                procesadas: sync.propiedades_procesadas,
                                total: sync.total_publicadas,
                            });
                        }
                    } else if (sync.status === "completada") {
                        setSyncing(false);
                        setSyncProgress(null);
                        loadInitialData();

                        const sinCambios = sync.propiedades_sin_cambios ?? 0;
                        const hayNovedades = sync.propiedades_nuevas > 0 || sync.propiedades_actualizadas > 0;

                        let mensaje = "";
                        if (!hayNovedades) {
                            const detalle = sinCambios > 0 ? ` ${sinCambios} ya estaban al día.` : "";
                            mensaje = `No hay cambios. Tus propiedades ya están sincronizadas.${detalle}`;
                        } else {
                            const partes: string[] = [];
                            if (sync.propiedades_nuevas > 0) partes.push(`${sync.propiedades_nuevas} nuevas`);
                            if (sync.propiedades_actualizadas > 0) partes.push(`${sync.propiedades_actualizadas} actualizadas`);
                            if (sinCambios > 0) partes.push(`${sinCambios} sin cambios`);
                            if (sync.errores > 0) partes.push(`${sync.errores} con error`);
                            mensaje = partes.join(", ");
                        }

                        showModal({
                            title: hayNovedades ? "Sincronización completada" : "Todo al día",
                            message: mensaje,
                            confirmText: "OK",
                        });

                    } else if (sync.status === "error") {
                        setSyncing(false);
                        setSyncProgress(null);
                        loadInitialData();

                        const errorMsg =
                            sync.mensaje_error || "Hubo un problema en la sincronización";
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

            // Validar API key antes de guardar
            const { data: testResult, error: testError } = await supabase.functions.invoke(
                "sincronizar-easybroker",
                { body: { usuario_id: user?.id, api_key: apiKey.trim(), test_only: true } },
            );

            if (testError || !testResult?.success) {
                showModal({
                    title: "API Key inválida",
                    message: "No se pudo conectar con EasyBroker. Verifica que la API Key sea correcta.",
                    confirmText: "Entendido",
                });
                return;
            }

            const { data, error } = await supabase.rpc("guardar_api_key_easybroker", {
                p_api_key: apiKey.trim(),
            });

            if (error) throw error;

            if (data?.success) {
                setHasApiKey(true);
                setApiKey("");
                handleSync();
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
        if (syncing || !user?.id) return;

        try {
            setSyncing(true);
            setSyncProgress(null);

            const { error } = await supabase.functions.invoke(
                "sincronizar-easybroker",
                {
                    body: { usuario_id: user.id },
                }
            );

            if (error) {
                throw error;
            }

            // La suscripción Realtime manejará las actualizaciones
        } catch (error: any) {
            setSyncing(false);
            setSyncProgress(null);

            let errorMessage = "No se pudo iniciar la sincronización";
            const errorString = error?.toString() || "";

            if (errorString.includes("FunctionsHttpError") || errorString.includes("non-2xx")) {
                errorMessage = "API Key inválida o expirada. Por favor verifica tu configuración.";
            } else if (error?.message) {
                errorMessage = error.message;
            }

            showModal({ title: "Error de Sincronización", message: errorMessage, confirmText: "OK" });
            log.error("Error starting sync:", error);
        }
    };

    const changeApiKey = () => {
        setHasApiKey(false);
    };

    return {
        apiKey,
        setApiKey,
        hasApiKey,
        loading,
        syncing,
        syncProgress,
        stats,
        history,
        handleSaveAndSync,
        handleSync,
        changeApiKey,
    };
};
