import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTokkoBrokerStore } from '@/store/tokkoBrokerStore';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Resumen al terminar una sincronizacion (REV05-33 / REV05-30). Antes la app
 * marcaba "completada" sin decir que paso: una sincronizacion sin cambios, con
 * errores o con propiedades sin comision se veia igual que una exitosa.
 */
async function showSyncSummary(
  result: { success: boolean; message?: string } | undefined,
  userId?: string,
) {
  try {
    if (!result) return;
    if (!result.success) {
      Alert.alert(
        'No se pudo sincronizar',
        result.message || 'Intenta de nuevo en unos minutos.',
      );
      return;
    }

    const history = useTokkoBrokerStore.getState().history ?? [];
    const latest = [...history].sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    )[0];
    const isRecent =
      !!latest && Date.now() - new Date(latest.started_at).getTime() < 10 * 60 * 1000;

    const lines: string[] = [];
    if (latest && isRecent) {
      if (latest.status === 'error') {
        Alert.alert(
          'La sincronización terminó con error',
          latest.mensaje_error || 'Revisa el historial.',
        );
        return;
      }
      const nuevas = latest.propiedades_nuevas || 0;
      const actualizadas = latest.propiedades_actualizadas || 0;
      const sinCambios = latest.propiedades_sin_cambios || 0;
      const errores = latest.errores || 0;
      if (nuevas + actualizadas + sinCambios + errores === 0) {
        lines.push('Sin cambios: Tokko no reportó novedades desde la última sincronización.');
      } else {
        lines.push(
          `Nuevas: ${nuevas}`,
          `Actualizadas: ${actualizadas}`,
          `Sin cambios: ${sinCambios}`,
        );
        if (errores > 0) {
          lines.push(`Con error: ${errores}. Revisa el historial.`);
        }
      }
    }

    if (userId) {
      const { count } = await supabase
        .from('propiedades')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', userId)
        .eq('sin_comision', true)
        .is('deleted_at', null);
      if (count && count > 0) {
        lines.push(
          `${count} propiedad(es) tuya(s) sin comisión: no se muestran a otros usuarios hasta que captures la comisión.`,
        );
      }
    }

    if (lines.length === 0) return;
    Alert.alert('Sincronización terminada', lines.join('\n'));
  } catch {
    // El resumen es informativo: nunca debe romper el flujo de sincronizacion.
  }
}

export function useTokkoBroker() {
  const { user } = useAuth();
  const store = useTokkoBrokerStore();

  useEffect(() => {
    if (user?.id) {
      store.loadInitialData();
    }
    return () => {
      store.cleanup();
    };
  }, [user?.id]);

  const handleSaveAndSync = useCallback(async () => {
    if (!store.apiKey?.trim()) {
      store.setError('Ingresa una API Key válida');
      return false;
    }
    const saved = await store.saveApiKey(store.apiKey);
    if (saved) {
      const result = await store.startSync();
      await showSyncSummary(result, user?.id);
    }
    return saved;
  }, [store.apiKey, user?.id]);

  const handleSync = useCallback(async () => {
    const result = await store.startSync();
    await showSyncSummary(result, user?.id);
  }, [user?.id]);

  const handleTestSync = useCallback(async () => {
    await store.startSync(false, 2);
  }, []);

  const handleChangeApiKey = useCallback(() => {
    store.resetApiKey();
  }, []);

  return {
    apiKey: store.apiKey || '',
    setApiKey: store.setApiKey,
    hasApiKey: store.hasApiKey,
    loading: store.loading,
    syncing: store.syncState === 'syncing',
    syncProgress: store.syncProgress,
    stats: store.stats,
    history: store.history,
    error: store.error,
    handleSaveAndSync,
    handleSync,
    handleTestSync,
    changeApiKey: handleChangeApiKey,
    clearError: () => store.setError(null),
  };
}

export default useTokkoBroker;
