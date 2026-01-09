import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants";

type Option = string | { label: string; value: string };

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  options: Option[];
  searchable?: boolean;
  currentValue?: string;
  placeholder?: string;
}

export default function SelectionModal({
  visible,
  onClose,
  onSelect,
  title,
  options,
  searchable = false,
  currentValue,
  placeholder = "Buscar...",
}: SelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery) return options;

    const query = searchQuery.toLowerCase();
    return options.filter((option) => {
      const label = typeof option === "string" ? option : option.label;
      return label.toLowerCase().includes(query);
    });
  }, [options, searchQuery, searchable]);

  const handleSelect = (option: Option) => {
    const value = typeof option === "string" ? option : option.value;
    onSelect(value);
    onClose();
    setSearchQuery(""); // Reset search on close
  };

  const renderItem = ({ item }: { item: Option }) => {
    const label = typeof item === "string" ? item : item.label;
    const value = typeof item === "string" ? item : item.value;
    const isSelected = currentValue === value;

    return (
      <TouchableOpacity
        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
        onPress={() => handleSelect(item)}
      >
        <Text
          style={[styles.optionText, isSelected && styles.optionTextSelected]}
        >
          {label}
        </Text>
        {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <View style={styles.modalContent}>
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
                leftIcon={<Ionicons name="search" size={20} color={COLORS.textTertiary} />}
                rightIcon={
                  searchQuery.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
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
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent50,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "70%", // Take up 70% of screen
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
    width: "auto", // Override AppInput's 100% to respect margins
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
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
});
