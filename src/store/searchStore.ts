import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import type { TipoBusqueda, HistorialBusqueda } from '@/types';
import type { PropertyFilters } from './propertyFiltersStore';

export const TIPO_BUSQUEDA = {
  DRAFT: 'draft' as const,
  UBICACION: 'ubicacion' as const,
  POST: 'post' as const,
  REEL: 'reel' as const,
  USUARIO: 'usuario' as const,
  PROPIEDAD: 'propiedad' as const,
};

export type ResultData = {
  name?: string;
  type?: string;
  estado?: string;
  municipio?: string;
  placeId?: string;
  filtros?: PropertyFilters;
  tipo?: TipoBusqueda;
  resultadoTitulo?: string;
  resultadoSubtitulo?: string;
  resultadoTipoId?: string;
};

interface SearchStore {
  currentSearchId: string | null;
  currentQuery: string;
  isUpdating: boolean;
  
  startSearch: (query: string, userId: string) => Promise<string>;
  createSearchFromMap: (filtros: PropertyFilters, ubicacion?: { estado?: string; municipio?: string; colonia?: string; placeName?: string }, userId?: string) => Promise<string>;
  updateSearchWithResult: (id: string, resultData: ResultData, userId: string) => Promise<void>;
  updateSearchWithFilters: (id: string, filtros: PropertyFilters, userId: string) => Promise<void>;
  touchTimestamp: (id: string, userId: string) => Promise<void>;
  completeSearch: (id: string, userId: string) => Promise<void>;
  clearSearch: () => void;
  setCurrentSearchId: (id: string | null) => void;
}

const extractPreview = (filtros: PropertyFilters) => ({
  tipo_propiedad: filtros.tipoPropiedad || null,
  tipo_operacion: filtros.operacion || null,
  precio_min: filtros.precioMin ? parseFloat(filtros.precioMin) : null,
  precio_max: filtros.precioMax ? parseFloat(filtros.precioMax) : null,
  moneda: filtros.moneda || 'MXN',
  habitaciones: filtros.habitaciones || null,
  banos: filtros.banos || null,
  estacionamientos: filtros.estacionamientos || null,
});

export const useSearchStore = create<SearchStore>((set, get) => ({
  currentSearchId: null,
  currentQuery: '',
  isUpdating: false,

  startSearch: async (query: string, userId: string): Promise<string> => {
    const state = get();
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();
    
    // 1. IMMEDIATAMENTE agregar al caché (optimistic update)
    const optimisticSearch: HistorialBusqueda = {
      id: tempId,
      usuario_id: userId,
      query_original: query,
      tipo_busqueda: TIPO_BUSQUEDA.DRAFT,
      filtros_completos: {},
      completa: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      estado: null,
      ciudad: null,
      municipio: null,
      colonia: null,
      place_name: null,
      tipo_propiedad: null,
      tipo_operacion: null,
      precio_min: null,
      precio_max: null,
      moneda: 'MXN',
      habitaciones: null,
      banos: null,
      estacionamientos: null,
      resultado_titulo: null,
      resultado_subtitulo: null,
      resultado_tipo_id: null,
    };
    
    queryClient.setQueryData<HistorialBusqueda[]>(
      ['searchHistory', userId],
      (old) => old ? [optimisticSearch, ...old] : [optimisticSearch]
    );
    
    // 2. Marcar búsqueda anterior como completa
    if (state.currentSearchId) {
      queryClient.setQueryData<HistorialBusqueda[]>(
        ['searchHistory', userId],
        (old) => old?.map(item => 
          item.id === state.currentSearchId 
            ? { ...item, completa: true, updated_at: now }
            : item
        )
      );
      await supabase
        .from('historial_busquedas')
        .update({ completa: true, updated_at: now })
        .eq('id', state.currentSearchId)
        .eq('usuario_id', userId);
    }
    
    // 3. Guardar en Supabase
    const { data, error } = await supabase
      .from('historial_busquedas')
      .insert({
        usuario_id: userId,
        query_original: query,
        tipo_busqueda: TIPO_BUSQUEDA.DRAFT,
        filtros_completos: {},
        completa: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('🔍 [SearchStore] Error creating search:', error);
      // Rollback: quitar el optimistic update
      queryClient.setQueryData<HistorialBusqueda[]>(
        ['searchHistory', userId],
        (old) => old?.filter(item => item.id !== tempId)
      );
      throw error;
    }

    // 4. Reemplazar temp ID con real ID en caché
    queryClient.setQueryData<HistorialBusqueda[]>(
      ['searchHistory', userId],
      (old) => old?.map(item => 
        item.id === tempId ? { ...item, id: data.id } : item
      )
    );

    // Invalidar para notificar a todos los componentes suscritos
    queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });

    set({ currentSearchId: data.id, currentQuery: query });
    
    return data.id;
  },

  createSearchFromMap: async (
    filtros: PropertyFilters,
    ubicacion?: { estado?: string; municipio?: string; colonia?: string; placeName?: string },
    userId?: string
  ): Promise<string> => {
    if (!userId) throw new Error('User not authenticated');

    const preview = extractPreview(filtros);
    const queryOriginal = ubicacion?.placeName || ubicacion?.colonia || ubicacion?.municipio || ubicacion?.estado || null;
    const tempId = `temp_${Date.now()}`;
    const now = new Date().toISOString();

    // 1. IMMEDIATAMENTE agregar al caché (optimistic update)
    const optimisticSearch: HistorialBusqueda = {
      id: tempId,
      usuario_id: userId,
      query_original: queryOriginal,
      tipo_busqueda: TIPO_BUSQUEDA.UBICACION,
      filtros_completos: filtros,
      completa: false,
      estado: ubicacion?.estado || null,
      ciudad: null,
      municipio: ubicacion?.municipio || null,
      colonia: ubicacion?.colonia || null,
      place_name: ubicacion?.placeName || null,
      tipo_propiedad: preview.tipo_propiedad || null,
      tipo_operacion: preview.tipo_operacion || null,
      precio_min: preview.precio_min || null,
      precio_max: preview.precio_max || null,
      moneda: preview.moneda || 'MXN',
      habitaciones: preview.habitaciones || null,
      banos: preview.banos || null,
      estacionamientos: preview.estacionamientos || null,
      resultado_titulo: null,
      resultado_subtitulo: null,
      resultado_tipo_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    
    queryClient.setQueryData<HistorialBusqueda[]>(
      ['searchHistory', userId],
      (old) => old ? [optimisticSearch, ...old] : [optimisticSearch]
    );

    // 2. Guardar en Supabase
    const { data, error } = await supabase
      .from('historial_busquedas')
      .insert({
        usuario_id: userId,
        query_original: queryOriginal,
        tipo_busqueda: TIPO_BUSQUEDA.UBICACION,
        filtros_completos: filtros as any,
        completa: false,
        estado: ubicacion?.estado || null,
        municipio: ubicacion?.municipio || null,
        colonia: ubicacion?.colonia || null,
        place_name: ubicacion?.placeName || null,
        ...preview,
      })
      .select('id')
      .single();

    if (error) {
      console.error('🔍 [SearchStore] Error creating search from map:', error);
      // Rollback: quitar el optimistic update
      queryClient.setQueryData<HistorialBusqueda[]>(
        ['searchHistory', userId],
        (old) => old?.filter(item => item.id !== tempId)
      );
      throw error;
    }

    // 3. Reemplazar temp ID con real ID en caché
    queryClient.setQueryData<HistorialBusqueda[]>(
      ['searchHistory', userId],
      (old) => old?.map(item => 
        item.id === tempId ? { ...item, id: data.id } : item
      )
    );

    set({ currentSearchId: data.id });
    
    return data.id;
  },

  updateSearchWithResult: async (id: string, resultData: ResultData, userId: string): Promise<void> => {
    set({ isUpdating: true });

    const estado = resultData.estado || '';
    const municipio = resultData.municipio || '';
    const colonia = resultData.type === 'colonia' ? (resultData.name || '') : '';
    const placeName = resultData.name || '';
    const now = new Date().toISOString();

    const filtrosParciales: PropertyFilters = resultData.filtros || {
      tipoPropiedad: '',
      subtipo: [],
      precioMin: '',
      precioMax: '',
      moneda: 'MXN',
      operacion: '',
      locationFilter: { estado, ciudad: '', municipio, colonia },
      habitaciones: '',
      banos: '',
      mediosBanos: '',
      estacionamientos: '',
      antiguedad: '',
      niveles: '',
      m2TerrenoMin: '',
      m2ConstruccionMin: '',
      anchoTerrenoMin: '',
      largoTerrenoMin: '',
      comisionVentaMin: '',
      comisionRentaMin: '',
      amenidades: [],
      polygons: [],
      locationChips: [],
      comercialFilters: {
        tipoUbicacion: [],
        frenteMin: '',
        nivel: '',
        sobreAvenidaPrincipal: false,
        enEsquina: false,
        altaVisibilidad: false,
        altoFlujoVehicular: false,
      },
      industrialFilters: {
        ubicacion: [],
        alturaLibre: '',
        energiaKva: [],
        areaOficinasMin: '',
        patioManiobrasMin: '',
      },
      agricolaFilters: {
        tiposAgua: [],
        concesionAgua: false,
        usoTerreno: [],
        tipoRiego: [],
        electricidad: false,
        caminoAcceso: false,
        cercado: false,
        pieCarretera: false,
        accesCamiones: false,
      },
    };

    const updateData: Record<string, any> = {
      place_name: placeName || null,
      estado: estado || null,
      municipio: municipio || null,
      colonia: colonia || null,
      filtros_completos: filtrosParciales as any,
      updated_at: now,
      completa: true,
    };

    if (resultData.tipo) {
      updateData.tipo_busqueda = resultData.tipo;
    }
    if (resultData.resultadoTitulo) {
      updateData.resultado_titulo = resultData.resultadoTitulo;
    }
    if (resultData.resultadoSubtitulo) {
      updateData.resultado_subtitulo = resultData.resultadoSubtitulo;
    }
    if (resultData.resultadoTipoId) {
      updateData.resultado_tipo_id = resultData.resultadoTipoId;
    }

    // 1. IMMEDIATAMENTE actualizar o crear en caché (optimistic update)
    // Busca el item por id, o si no existe (porque startSearch aún no terminó),
    // crea uno nuevo con los datos del resultado
    queryClient.setQueryData<HistorialBusqueda[]>(
      ['searchHistory', userId],
      (old) => {
        if (!old) return [updateData as HistorialBusqueda];
        
        const existingIndex = old.findIndex(item => item.id === id);
        
        if (existingIndex >= 0) {
          // Actualizar item existente
          const updated = [...old];
          updated[existingIndex] = { ...updated[existingIndex], ...updateData };
          return updated;
        } else {
          // No existe (startSearch aún no terminó o failed) - crear nuevo
          // Usar el resultado como base de la búsqueda
          const newEntry: HistorialBusqueda = {
            id: id || `temp_${Date.now()}`,
            usuario_id: userId,
            query_original: resultData.name || resultData.resultadoTitulo || '',
            tipo_busqueda: resultData.tipo || 'propiedad',
            resultado_titulo: resultData.resultadoTitulo || null,
            resultado_subtitulo: resultData.resultadoSubtitulo || null,
            resultado_tipo_id: resultData.resultadoTipoId || null,
            estado: estado || null,
            ciudad: null,
            municipio: municipio || null,
            colonia: colonia || null,
            place_name: placeName || null,
            tipo_propiedad: null,
            tipo_operacion: null,
            precio_min: null,
            precio_max: null,
            moneda: 'MXN',
            habitaciones: null,
            banos: null,
            estacionamientos: null,
            filtros_completos: filtrosParciales as any,
            completa: true,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          return [newEntry, ...old];
        }
      }
    );

    // 2. Guardar en Supabase (si tenemos id real, si no se creó local nomas)
    if (id && !id.startsWith('temp_')) {
      const { error } = await supabase
        .from('historial_busquedas')
        .update(updateData)
        .eq('id', id)
        .eq('usuario_id', userId);

      if (error) {
        console.error('🔍 [SearchStore] Error updating search:', error);
        queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });
      }
    } else {
      // No hay id real aún, hacer INSERT
      const insertData: Record<string, any> = {
        usuario_id: userId,
        query_original: resultData.name || resultData.resultadoTitulo || 'Búsqueda',
        tipo_busqueda: resultData.tipo || 'propiedad',
        filtros_completos: filtrosParciales as any,
        completa: true,
        ...updateData,
      };
      
      const { error } = await supabase
        .from('historial_busquedas')
        .insert(insertData)
        .select('id')
        .single();
        
      if (error) {
        console.error('🔍 [SearchStore] Error creating search from result:', error);
      } else {
        // Reemplazar temp id con real id en caché
        queryClient.setQueryData<HistorialBusqueda[]>(
          ['searchHistory', userId],
          (old) => old?.map(item => 
            item.id.startsWith('temp_') ? { ...item, id: error?.data?.id || item.id } : item
          )
        );
      }
    }

    set({ isUpdating: false });
  },

  updateSearchWithFilters: async (id: string, filtros: PropertyFilters, userId: string): Promise<void> => {
    const preview = extractPreview(filtros);
    const updateData = {
      filtros_completos: filtros as any,
      updated_at: new Date().toISOString(),
      ...preview,
    };

    const { error } = await supabase
      .from('historial_busquedas')
      .update(updateData)
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) {
      console.error('🔍 [SearchStore] Error updating filters:', error);
    }

    // No invalidar aquí - solo actualiza timestamp, no cambia datos visibles
  },

  touchTimestamp: async (id: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('historial_busquedas')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) {
      console.error('🔍 [SearchStore] Error touching timestamp:', error);
    }

    // Invalidar para actualizar orden en UI
    queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });
  },

  completeSearch: async (id: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('historial_busquedas')
      .update({
        completa: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('usuario_id', userId);

    if (error) {
      console.error('🔍 [SearchStore] Error completing search:', error);
      throw error;
    }

    // Invalidar para marcar como completada en UI
    queryClient.invalidateQueries({ queryKey: ['searchHistory', userId] });
  },

  clearSearch: () => {
    set({ currentSearchId: null, currentQuery: '', isUpdating: false });
  },

  setCurrentSearchId: (id: string | null) => {
    set({ currentSearchId: id });
  },
}));
