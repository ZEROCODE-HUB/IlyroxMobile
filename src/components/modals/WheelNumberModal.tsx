import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

interface WheelNumberModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  subtitle?: string;
  min?: number;
  max?: number;
  currentValue?: string;
}

const ITEM_HEIGHT = 42;
const VISIBLE_ITEMS = 5;
const LIST_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export default function WheelNumberModal({
  visible,
  onClose,
  onSelect,
  title,
  subtitle = "(años)",
  min = 0,
  max = 70,
  currentValue,
}: WheelNumberModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const data = Array.from({ length: max - min + 1 }, (_, i) =>
    (i + min).toString(),
  );

  data.push(`+ ${max}`);

  useEffect(() => {
    if (visible) {
      const initialValue = currentValue?.split(" ")[0] || "0";
      const index = data.indexOf(initialValue);
      const targetIndex = index !== -1 ? index : 0;

      setSelectedIndex(targetIndex);

      // Pequeño delay para asegurar que la lista esté lista
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: targetIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [visible, currentValue]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (index >= 0 && index < data.length && index !== selectedIndex) {
      setSelectedIndex(index);
    }
  };

  const handleAccept = () => {
    onSelect(data[selectedIndex]);
    onClose();
  };

  const renderItem = ({ item, index }: { item: string; index: number }) => {
    const isSelected = index === selectedIndex;
    return (
      <View style={styles.itemContainer}>
        <Text style={[styles.itemText, isSelected && styles.selectedItemText]}>
          {item}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle}> {subtitle}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.highlightBar} pointerEvents="none" />
            <FlatList
              ref={flatListRef}
              data={data}
              renderItem={renderItem}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{
                paddingVertical: (VISIBLE_ITEMS / 2 - 0.5) * ITEM_HEIGHT,
              }}
              getItemLayout={(_, index) => ({
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
            />
          </View>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Text style={styles.acceptButtonText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.blackTransparent50,
  },
  modalContent: {
    width: "88%",
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#213132",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  closeButton: {
    padding: 2,
  },
  pickerContainer: {
    height: LIST_HEIGHT,
    width: "100%",
    position: "relative",
    justifyContent: "center",
    marginBottom: 28,
  },
  highlightBar: {
    position: "absolute",
    height: 40,
    width: "100%",
    backgroundColor: "#eff2f3",
    borderRadius: 10,
    top: (LIST_HEIGHT - 40) / 2,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  itemText: {
    fontSize: 18,
    color: "#90a4a5",
    fontWeight: "400",
  },
  selectedItemText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a2e2f",
  },
  acceptButton: {
    backgroundColor: "#526d6e",
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
