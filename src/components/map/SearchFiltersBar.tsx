import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

interface SearchFiltersBarProps {
  hasActiveFilters: boolean;
  onOpenFilters: () => void;
  onClearFilters: () => void;
}

export const SearchFiltersBar: React.FC<SearchFiltersBarProps> = ({
  hasActiveFilters,
  onOpenFilters,
  onClearFilters,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={onOpenFilters}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.white} />
          <Text style={styles.filterBtnText}>Filtrar</Text>
          {hasActiveFilters && <View style={styles.activeFilterDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.clearBtn,
            !hasActiveFilters && styles.clearBtnDisabled
          ]}
          onPress={onClearFilters}
          disabled={!hasActiveFilters}
        >
          <Ionicons 
            name="refresh-outline" 
            size={20} 
            color={hasActiveFilters ? COLORS.error : COLORS.textDisabled} 
          />
          <Text style={[
            styles.clearBtnText,
            !hasActiveFilters && styles.clearBtnTextDisabled
          ]}>
            Limpiar filtros
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  filterBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  activeFilterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  clearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.errorLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  clearBtnDisabled: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.cardBorder,
  },
  clearBtnText: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '600',
  },
  clearBtnTextDisabled: {
    color: COLORS.textDisabled,
  },
});