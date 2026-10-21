/**
 * DateSeparator.tsx
 * Separador de fecha elegante para el chat
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants";
import { formatChatSeparatorDate } from "../../utils/dateFormatter";

interface DateSeparatorProps {
  date: string; // ISO date string
}

export default function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{formatChatSeparatorDate(date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 16,
  },
  bubble: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
    textTransform: "capitalize",
  },
});
