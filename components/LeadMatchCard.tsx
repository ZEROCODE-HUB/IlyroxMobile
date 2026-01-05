import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropertyCard from './cards/PropertyCard';
import { COLORS } from '../constants';
import { FeedItem } from '../types';

interface LeadMatchCardProps {
  leadName: string;
  leadPhone: string;
  properties: FeedItem[];
  totalProperties: number;
  onViewMore: () => void;
  onPropertyClick: (propertyId: string) => void;
  currentUserId?: string;
}

export const LeadMatchCard: React.FC<LeadMatchCardProps> = ({
  leadName,
  leadPhone,
  properties,
  totalProperties,
  onViewMore,
  onPropertyClick,
  currentUserId,
}) => {
  const remainingProperties = totalProperties - 1;

  return (
    <View style={styles.container}>
      {/* Header del Lead */}
      <View style={styles.leadHeader}>
        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>{leadName}</Text>
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.leadPhone}>{leadPhone}</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalProperties}</Text>
        </View>
      </View>

      {/* Mostrar primera propiedad o mensaje vacío */}
      {properties.length > 0 ? (
        <>
          <PropertyCard
            item={properties[0]}
            onClick={() => onPropertyClick(properties[0].propertyDetails?.id || properties[0].id)}
            onCommentClick={() => {}}
            currentUserId={currentUserId}
          />

          {/* Botón Ver más - Siempre visible */}
          <TouchableOpacity style={styles.viewMoreBtn} onPress={onViewMore}>
            {remainingProperties > 0 ? (
              <Text style={styles.viewMoreText}>
                Ver {remainingProperties} {remainingProperties === 1 ? 'propiedad' : 'propiedades'} más
              </Text>
            ) : (
              <Text style={styles.viewMoreText}>Ver detalles</Text>
            )}
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="search-outline" size={40} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>Sin resultados en este momento</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  badge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 8,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});