/**
 * DateSeparator.tsx
 * Separador de fecha elegante para el chat
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants";

interface DateSeparatorProps {
  date: string; // ISO date string
}

export default function DateSeparator({ date }: DateSeparatorProps) {
  const formatDate = (dateString: string) => {
    const messageDate = new Date(dateString);
    const now = new Date();
    
    // Reset hours to compare dates only
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );

    // Today
    if (messageDay.getTime() === today.getTime()) {
      return "Hoy";
    }

    // Yesterday
    if (messageDay.getTime() === yesterday.getTime()) {
      return "Ayer";
    }

    // This week (Sunday to Saturday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    if (messageDay >= startOfWeek && messageDay < today) {
      return messageDate.toLocaleDateString("es-MX", { weekday: "long" });
    }

    // Older dates
    return messageDate.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{formatDate(date)}</Text>
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
