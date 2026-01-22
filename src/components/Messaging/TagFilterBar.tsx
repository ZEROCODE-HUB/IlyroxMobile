/**
 * TagFilterBar.tsx
 * Barra de filtros de etiquetas
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface Tag {
  id: string;
  nombre: string;
  color: string;
}

interface TagFilterBarProps {
  tags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onManageTags?: () => void;
}

export default function TagFilterBar({
  tags,
  selectedTagIds,
  onToggleTag,
  onManageTags,
}: TagFilterBarProps) {
  if (tags.length === 0 && !onManageTags) {
    return null;
  }

  const isSelected = (tagId: string) => selectedTagIds.includes(tagId);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Botón de gestionar SIEMPRE visible */}
        {onManageTags && (
          <TouchableOpacity style={styles.manageButton} onPress={onManageTags}>
            <Ionicons name="settings-outline" size={18} color={COLORS.primary} />
            <Text style={styles.manageText}>Gestionar</Text>
          </TouchableOpacity>
        )}

        {/* Etiquetas */}
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagChip,
              { backgroundColor: isSelected(tag.id) ? tag.color : COLORS.background },
            ]}
            onPress={() => onToggleTag(tag.id)}
          >
            <Text
              style={[
                styles.tagText,
                { color: isSelected(tag.id) ? COLORS.white : COLORS.textSecondary },
              ]}
            >
              {tag.nombre}
            </Text>
            {isSelected(tag.id) && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        ))}

        {/* Mensaje si no hay etiquetas */}
        {tags.length === 0 && (
          <Text style={styles.emptyText}>
            No tienes etiquetas. Toca "Gestionar" para crear una.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryTransparent,
    gap: 4,
  },
  manageText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
    alignSelf: 'center',
    paddingVertical: 4,
  },
});