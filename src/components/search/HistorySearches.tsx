import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HistorialBusqueda } from '@/types';
import type { PropertyFilters } from '@/store/propertyFiltersStore';

interface HistorySearchesProps {
  historial: HistorialBusqueda[];
  onSelect: (busqueda: HistorialBusqueda) => void;
  onRemove: (id: string) => void;
  isLoading?: boolean;
}

export const HistorySearches: React.FC<HistorySearchesProps> = ({
  historial,
  onSelect,
  onRemove,
  isLoading = false,
}) => {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    );
  }

  if (historial.length === 0) {
    return null;
  }

  const displayedItems = showAll ? historial : historial.slice(0, 5);

  const formatNum = (n: string | number): string => {
    const val = Number(n);
    if (!Number.isFinite(val) || val <= 0) return '';
    if (val >= 1000000) return `$${val / 1000000}M`;
    if (val >= 1000) return `$${val / 1000}K`;
    return `$${val}`;
  };

  const formatPriceRange = (
    min: string | number | null | undefined,
    max: string | number | null | undefined,
    moneda: string,
  ): string => {
    const symbol = moneda === 'USD' ? '$' : '$';
    const minTxt = min != null && String(min) !== '' ? formatNum(Number(min)) : '';
    const maxTxt = max != null && String(max) !== '' ? formatNum(Number(max)) : '';

    if (minTxt && maxTxt) return `${symbol}${minTxt.slice(1)}-${maxTxt}`;
    if (minTxt) return `Desde ${minTxt}`;
    if (maxTxt) return `Hasta ${maxTxt}`;
    return '';
  };

  const formatTimeAgo = (date: string): string => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
    
    const d = new Date(date);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const getTitulo = (item: HistorialBusqueda): string => {
    // Los reels solo tenían "Reel" como título guardado; la query original
    // es mucho más útil. Siempre priorizar query_original para reels.
    if (item.tipo_busqueda === 'reel' && item.query_original) {
      return item.query_original;
    }
    if (item.resultado_titulo) return item.resultado_titulo;
    if (item.place_name) return item.place_name;
    if (item.query_original) return item.query_original;
    const parts = [item.colonia, item.municipio, item.estado].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Búsqueda sin título';
  };

  const getSubtitulo = (item: HistorialBusqueda): string | null => {
    if (item.tipo_busqueda === 'reel') return 'Reel';
    if (item.resultado_subtitulo) return item.resultado_subtitulo;
    return null;
  };

  const getIcon = (item: HistorialBusqueda): string => {
    switch (item.tipo_busqueda) {
      case 'ubicacion':
        return 'location-outline';
      case 'usuario':
        return 'person-outline';
      case 'propiedad':
        return 'home-outline';
      case 'post':
        return 'document-text-outline';
      case 'reel':
        return 'play-circle-outline';
      case 'draft':
      default:
        return 'search-outline';
    }
  };

  const getFiltrosPreview = (item: HistorialBusqueda): string => {
    const parts: string[] = [];
    const f = item.filtros_completos as Partial<PropertyFilters> | undefined;

    const tipoPropiedad = f?.tipoPropiedad || item.tipo_propiedad;
    if (tipoPropiedad) parts.push(tipoPropiedad);

    if (f?.subtipo && f.subtipo.length > 0) {
      parts.push(f.subtipo.join(', '));
    }

    const op = f?.operacion || item.tipo_operacion || '';
    if (op === 'venta') parts.push('Venta');
    else if (op === 'renta') parts.push('Renta');

    const price = formatPriceRange(
      f?.precioMin != null ? f.precioMin : item.precio_min,
      f?.precioMax != null ? f.precioMax : item.precio_max,
      f?.moneda || item.moneda || 'MXN',
    );
    if (price) parts.push(price);

    const habitaciones = f?.habitaciones || item.habitaciones;
    if (habitaciones) parts.push(`${habitaciones} rec`);
    const banos = f?.banos || item.banos;
    if (banos) parts.push(`${banos} baños`);
    if (f?.mediosBanos) parts.push(`${f.mediosBanos} m. baño`);
    const estacionamientos = f?.estacionamientos || item.estacionamientos;
    if (estacionamientos) parts.push(`${estacionamientos} cajones`);

    if (f?.m2TerrenoMin) parts.push(`Terreno ${f.m2TerrenoMin} m²`);
    if (f?.m2ConstruccionMin) parts.push(`Const. ${f.m2ConstruccionMin} m²`);
    if (f?.antiguedad) parts.push(f.antiguedad);
    if (f?.niveles) parts.push(`${f.niveles} niveles`);

    const amenidades = f?.amenidades || [];
    if (amenidades.length > 0) {
      const shown = amenidades.slice(0, 3).join(', ');
      const extra = amenidades.length - 3;
      parts.push(extra > 0 ? `${shown} y ${extra} más` : shown);
    }

    if (f) {
      const comercial = f.comercialFilters;
      if (comercial?.tipoUbicacion?.length) {
        parts.push(`Comercial: ${comercial.tipoUbicacion.join(', ')}`);
      }
      if (comercial?.frenteMin) parts.push(`Frente ${comercial.frenteMin} m`);
      if (comercial?.nivel) parts.push(`Nivel ${comercial.nivel}`);
      if (comercial?.sobreAvenidaPrincipal) parts.push('Sobre avenida');
      if (comercial?.enEsquina) parts.push('En esquina');
      if (comercial?.altaVisibilidad) parts.push('Alta visibilidad');
      if (comercial?.altoFlujoVehicular) parts.push('Alto flujo vehicular');

      const industrial = f.industrialFilters;
      if (industrial?.alturaLibre) parts.push(`Altura ${industrial.alturaLibre} m`);
      if (industrial?.areaOficinasMin) parts.push(`Oficinas ${industrial.areaOficinasMin} m²`);
      if (industrial?.patioManiobrasMin) parts.push(`Patio ${industrial.patioManiobrasMin} m²`);
      if (industrial?.energiaKva?.length) parts.push(`Energía ${industrial.energiaKva.join(', ')} KVA`);

      const agricola = f.agricolaFilters;
      if (agricola?.usoTerreno?.length) parts.push(`Uso: ${agricola.usoTerreno.join(', ')}`);
      if (agricola?.tiposAgua?.length) parts.push(`Agua: ${agricola.tiposAgua.join(', ')}`);
      if (agricola?.concesionAgua) parts.push('Con concesión de agua');
      if (agricola?.electricidad) parts.push('Con electricidad');
      if (agricola?.caminoAcceso) parts.push('Camino de acceso');
    }

    return parts.filter(Boolean).join(' · ');
  };

  const renderItem = ({ item }: { item: HistorialBusqueda }) => {
    const titulo = getTitulo(item);
    const subtitulo = getSubtitulo(item);
    const filtros = getFiltrosPreview(item);
    const iconName = getIcon(item);
    
    return (
      <Pressable
        style={styles.item}
        onPress={() => onSelect(item)}
        android_ripple={{ color: '#f0f0f0' }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={iconName as any} size={18} color="#666" />
        </View>
        <View style={styles.content}>
          <Text style={styles.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {subtitulo && (
            <Text style={styles.subtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          )}
          {filtros ? (
            <Text style={styles.filtros} numberOfLines={2}>
              {filtros}
            </Text>
          ) : null}
          <Text style={styles.time}>
            {formatTimeAgo(item.updated_at || item.created_at)}
          </Text>
        </View>
        <Pressable
          style={styles.removeBtn}
          onPress={() => onRemove(item.id)}
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color="#999" />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial de búsquedas</Text>
      </View>

      <FlatList
        data={displayedItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={showAll}
        style={showAll ? styles.listExpanded : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {historial.length > 5 && !showAll && (
        <Pressable style={styles.verMas} onPress={() => setShowAll(true)}>
          <Text style={styles.verMasText}>Ver más...</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listExpanded: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearAll: {
    fontSize: 14,
    color: '#007AFF',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingRight: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 1,
  },
  subtitulo: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  filtros: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  removeBtn: {
    padding: 6,
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 44,
  },
  verMas: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  verMasText: {
    fontSize: 14,
    color: '#007AFF',
  },
});
