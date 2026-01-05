import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PropertyCard from './cards/PropertyCard';
import { AppHeader } from './AppHeader';
import { COLORS } from '../constants';
import { FeedItem } from '../types';

interface LeadPropertiesModalProps {
  visible: boolean;
  onClose: () => void;
  leadName: string;
  leadPhone: string;
  busquedaId: string;
  properties: FeedItem[];
  onPropertyClick: (propertyId: string) => void;
  onDeleteSearch: (busquedaId: string) => void;
  currentUserId?: string;
}

export const LeadPropertiesModal: React.FC<LeadPropertiesModalProps> = ({
  visible,
  onClose,
  leadName,
  leadPhone,
  busquedaId,
  properties,
  onPropertyClick,
  onDeleteSearch,
  currentUserId,
}) => {
  const handleDeleteSearch = () => {
    Alert.alert(
      'Eliminar búsqueda',
      '¿Estás seguro de que deseas eliminar esta búsqueda guardada? Se eliminarán todos los matches asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDeleteSearch(busquedaId);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <AppHeader
          title={leadName}
          subtitle={leadPhone}
          showBackButton
          onBack={onClose}
          rightComponent={
            <TouchableOpacity onPress={handleDeleteSearch} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={22} color={COLORS.error} />
            </TouchableOpacity>
          }
        />

        {/* Properties List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {properties.length} {properties.length === 1 ? 'propiedad' : 'propiedades'}
            </Text>
          </View>

          {properties.map((property, index) => (
            <View key={property.id || index} style={styles.propertyCard}>
              <PropertyCard
                item={property}
                onClick={() => onPropertyClick(property.propertyDetails?.id || property.id)}
                onCommentClick={() => {}}
                currentUserId={currentUserId}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  deleteBtn: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  countBadge: {
    backgroundColor: COLORS.primaryTransparent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  propertyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
});