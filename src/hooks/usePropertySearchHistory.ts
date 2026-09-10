import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { HistorialBusqueda } from '@/types';

export function usePropertySearchHistory() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    data: historial = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['propertySearchHistory', userId],
    queryFn: async (): Promise<HistorialBusqueda[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('historial_busquedas')
        .select('*')
        .eq('usuario_id', userId)
        .is('deleted_at', null)
        .in('tipo_busqueda', ['ubicacion', 'propiedad'])
        .order('updated_at', { ascending: false })
        .limit(15);

      if (error) {
        console.error('Error fetching property search history:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const eliminarBusqueda = async (id: string): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase
      .from('historial_busquedas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) {
      console.error('Error deleting property search history:', error);
      throw error;
    }

    refetch();
  };

  return {
    historial,
    isLoading,
    eliminarBusqueda,
  };
}
