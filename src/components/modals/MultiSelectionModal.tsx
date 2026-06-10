import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants";

type Option = string | { label: string; value: string };

interface MultiSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (values: string[]) => void;
  title: string;
  options: Option[];
  searchable?: boolean;
  currentValues?: string[];
  placeholder?: string;
}

export default function MultiSelectionModal({
  visible,
  onClose,
  onSelect,
  title,
  options,
  searchable = false,
  currentValues = [],
  placeholder = "Buscar...",
}: MultiSelectionModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const modalHeight = screenHeight * 0.9;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(currentValues);

  // Sync state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setSelectedValues(currentValues);
      setSearchQuery("");
    }
  }, [visible, currentValues]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;

    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      const label = typeof option === "string" ? option : option.label;
      return label.toLowerCase().includes(query);
    });
  }, [options, searchQuery, searchable]);

  const toggleSelection = (option: Option) => {
    const value = typeof option === "string" ? option : option.value;
    setSelectedValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const handleApply = () => {
    onSelect(selectedValues);
    onClose();
  };

  const renderItem = ({ item }: { item: Option }) => {
    const label = typeof item === "string" ? item : item.label;
    const value = typeof item === "string" ? item : item.value;
    const isSelected = selectedValues.includes(value);

    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        onPress={() => toggleSelection(item)}
      >
        <Text
          style={[styles.optionText, isSelected && styles.optionTextSelected]}
        >
          {label}
        </Text>
        {isSelected ? (
          <Ionicons name="checkbox" size={24} color={COLORS.primary} />
        ) : (
          <Ionicons
            name="square-outline"
            size={24}
            color={COLORS.textTertiary}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <AppBottomSheet visible={visible} onClose={onClose}>
      <View style={[styles.modalContent, { height: modalHeight }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            {searchable && (
              <AppInput
                containerStyle={styles.searchContainer}
                placeholder={placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                leftIcon={
                  <Ionicons
                    name="search"
                    size={20}
                    color={COLORS.textTertiary}
                  />
                }
                rightIcon={
                  searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={COLORS.textTertiary}
                      />
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            )}

            {/* List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item, index) => {
                const val = typeof item === "string" ? item : item.value;
                return `${val}-${index}`;
              }}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={20}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No se encontraron resultados
                  </Text>
                </View>
              }
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>
                  Aplicar ({selectedValues.length})
                </Text>
              </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    margin: 16,
    width: "auto",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  optionItemSelected: {
    backgroundColor: COLORS.backgroundDark,
  },
  optionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 25,
  },
  applyBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
