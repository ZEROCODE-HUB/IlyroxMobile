/**
 * TagsModal.tsx
 * Modal para gestionar etiquetas de conversaciones
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants";

interface Tag {
  id: string;
  nombre: string;
  color: string;
}

interface TagsModalProps {
  visible: boolean;
  onClose: () => void;
  availableTags: Tag[];
  assignedTags: Tag[];
  onAssignTag?: (tagId: string) => Promise<boolean>;
  onRemoveTag?: (tagId: string) => Promise<boolean>;
  onCreateTag?: (name: string, color: string) => Promise<Tag | null>;
  onUpdateTag?: (
    tagId: string,
    name: string,
    color: string
  ) => Promise<boolean>;
  onDeleteTag?: (tagId: string) => Promise<boolean>;
}

const PRESET_COLORS: string[] = [
  COLORS.error,
  COLORS.warning,
  COLORS.success,
  COLORS.primary,
  COLORS.info,
  COLORS.tagPurple,
  COLORS.tagPink,
  COLORS.textSecondary,
];

export default function TagsModal({
  visible,
  onClose,
  availableTags,
  assignedTags,
  onAssignTag,
  onRemoveTag,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagsModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [togglingTagId, setTogglingTagId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  const isAssigned = (tagId: string) =>
    assignedTags.some((tag) => tag.id === tagId);

  const handleToggleTag = async (tag: Tag) => {
    if (togglingTagId) return; // Prevenir múltiples clics

    try {
      setTogglingTagId(tag.id);
      if (isAssigned(tag.id)) {
        await onRemoveTag?.(tag.id);
      } else {
        await onAssignTag?.(tag.id);
      }
    } finally {
      setTogglingTagId(null);
    }
  };

  const handleSaveTag = async () => {
    if (!newTagName.trim() || isCreating) return;

    try {
      setIsCreating(true);

      if (editingTagId && onUpdateTag) {
        const success = await onUpdateTag(
          editingTagId,
          newTagName.trim(),
          selectedColor
        );
        if (success) {
          resetForm();
        }
      } else if (onCreateTag) {
        const newTag = await onCreateTag(newTagName.trim(), selectedColor);
        if (newTag) {
          resetForm();
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewTagName("");
    setSelectedColor(PRESET_COLORS[0]);
    setShowCreateForm(false);
    setEditingTagId(null);
  };

  const handleEditClick = (tag: Tag) => {
    setEditingTagId(tag.id);
    setNewTagName(tag.nombre);
    setSelectedColor(tag.color);
    setShowCreateForm(true);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!onDeleteTag) return;

    Alert.alert(
      "Eliminar etiqueta",
      "¿Estás seguro? Se eliminará de todas las conversaciones.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await onDeleteTag(tagId);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Etiquetas</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Etiquetas disponibles - Solo mostrar si onAssignTag existe */}
            {onAssignTag && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Asignar etiquetas</Text>
                {availableTags.length === 0 ? (
                  <Text style={styles.emptyText}>
                    No hay etiquetas disponibles
                  </Text>
                ) : (
                  availableTags.map((tag) => (
                    <View key={tag.id} style={styles.tagRow}>
                      <TouchableOpacity
                        style={[
                          styles.tagItem,
                          togglingTagId === tag.id && styles.tagItemDisabled,
                        ]}
                        onPress={() => handleToggleTag(tag)}
                        disabled={togglingTagId !== null}
                      >
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: tag.color },
                          ]}
                        />
                        <Text style={styles.tagName}>{tag.nombre}</Text>
                        {togglingTagId === tag.id ? (
                          <ActivityIndicator
                            size="small"
                            color={COLORS.primary}
                          />
                        ) : isAssigned(tag.id) ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={COLORS.primary}
                          />
                        ) : null}
                      </TouchableOpacity>

                      {onUpdateTag && (
                        <TouchableOpacity
                          onPress={() => handleEditClick(tag)}
                          style={styles.actionButton}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color={COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Gestionar etiquetas - Mostrar cuando NO hay onAssignTag */}
            {!onAssignTag && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tus etiquetas</Text>
                {availableTags.length === 0 ? (
                  <Text style={styles.emptyText}>No hay etiquetas creadas</Text>
                ) : (
                  availableTags.map((tag) => (
                    <View key={tag.id} style={styles.tagRow}>
                      <View style={styles.tagItem}>
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: tag.color },
                          ]}
                        />
                        <Text style={styles.tagName}>{tag.nombre}</Text>
                      </View>

                      {onUpdateTag && (
                        <TouchableOpacity
                          onPress={() => handleEditClick(tag)}
                          style={styles.actionButton}
                        >
                          <Ionicons
                            name="pencil-outline"
                            size={18}
                            color={COLORS.textSecondary}
                          />
                        </TouchableOpacity>
                      )}

                      {onDeleteTag && (
                        <TouchableOpacity
                          onPress={() => handleDeleteTag(tag.id)}
                          style={styles.actionButton}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={COLORS.error}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Crear/Editar nueva etiqueta */}
            {(onCreateTag || editingTagId) && (
              <View style={styles.section}>
                {!showCreateForm ? (
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateForm(true)}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                    <Text style={styles.createButtonText}>
                      Crear nueva etiqueta
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.createForm}>
                    <Text style={styles.formTitle}>
                      {editingTagId ? "Editar etiqueta" : "Nueva etiqueta"}
                    </Text>
                    <AppInput
                      label="Nombre de la etiqueta"
                      placeholder="Ej: Urgente, Importante..."
                      value={newTagName}
                      onChangeText={setNewTagName}
                      maxLength={20}
                    />

                    <Text style={styles.formLabel}>Color</Text>
                    <View style={styles.colorGrid}>
                      {PRESET_COLORS.map((color) => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorOption,
                            { backgroundColor: color },
                            selectedColor === color &&
                              styles.colorOptionSelected,
                          ]}
                          onPress={() => setSelectedColor(color)}
                        >
                          {selectedColor === color && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={COLORS.white}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.formButtons}>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.buttonSecondary,
                          isCreating && styles.buttonDisabled,
                        ]}
                        onPress={() => {
                          if (!isCreating) {
                            setShowCreateForm(false);
                            setNewTagName("");
                            setSelectedColor(PRESET_COLORS[0]);
                          }
                        }}
                        disabled={isCreating}
                      >
                        <Text style={styles.buttonSecondaryText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.button,
                          styles.buttonPrimary,
                          (isCreating || !newTagName.trim()) &&
                            styles.buttonDisabled,
                        ]}
                        onPress={handleSaveTag}
                        disabled={isCreating || !newTagName.trim()}
                      >
                        {isCreating ? (
                          <>
                            <ActivityIndicator
                              size="small"
                              color={COLORS.white}
                            />
                            <Text
                              style={[
                                styles.buttonPrimaryText,
                                { marginLeft: 8 },
                              ]}
                            >
                              Creando...
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.buttonPrimaryText}>Guardar</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    padding: 20,
  },
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    maxHeight: "80%",
    height: "80%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tagItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    gap: 12,
  },
  tagItemDisabled: {
    opacity: 0.5,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tagName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: COLORS.primaryTransparent,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  createForm: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.textPrimary,
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: COLORS.cardBorder,
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
