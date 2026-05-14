import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { COLORS } from "@/constants/colors";
import { PolygonCoord } from "@/store/propertyFiltersStore";

interface Props {
  drawingMode: boolean;
  draftPoints: PolygonCoord[];
  onCancel: () => void;
  onUndo: () => void;
  onClear: () => void;
  onConfirm: () => void;
}

export default function PolygonDrawingOverlay({
  drawingMode,
  draftPoints,
  onCancel,
  onUndo,
  onClear,
  onConfirm,
}: Props) {
  const toolbarAnim = useRef(new Animated.Value(0)).current;
  const instructionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(toolbarAnim, {
      toValue: drawingMode ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
    Animated.spring(instructionAnim, {
      toValue: drawingMode ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [drawingMode]);

  const toolbarY = toolbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const instructionY = instructionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  const canConfirm = draftPoints.length >= 3;

  return (
    <>
      {/* ── Instrucción superior (solo en drawing mode) ── */}
      <Animated.View
        style={[
          styles.instruction,
          {
            opacity: instructionAnim,
            transform: [{ translateY: instructionY }],
          },
        ]}
        pointerEvents="box-none"
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="dark" style={styles.instructionBlur}>
            <InstructionContent points={draftPoints.length} onCancel={onCancel} />
          </BlurView>
        ) : (
          <View style={styles.instructionAndroid}>
            <InstructionContent points={draftPoints.length} onCancel={onCancel} />
          </View>
        )}
      </Animated.View>

      {/* ── Toolbar inferior (solo en drawing mode) ── */}
      <Animated.View
        style={[
          styles.toolbar,
          {
            opacity: toolbarAnim,
            transform: [{ translateY: toolbarY }],
          },
        ]}
        pointerEvents={drawingMode ? "auto" : "none"}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={80} tint="light" style={styles.toolbarBlur}>
            <ToolbarContent
              draftPoints={draftPoints}
              canConfirm={canConfirm}
              onUndo={onUndo}
              onClear={onClear}
              onConfirm={onConfirm}
            />
          </BlurView>
        ) : (
          <View style={styles.toolbarAndroid}>
            <ToolbarContent
              draftPoints={draftPoints}
              canConfirm={canConfirm}
              onUndo={onUndo}
              onClear={onClear}
              onConfirm={onConfirm}
            />
          </View>
        )}
      </Animated.View>
    </>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function InstructionContent({ points, onCancel }: { points: number; onCancel: () => void }) {
  return (
    <View style={styles.instructionRow}>
      <View style={styles.instructionDot} />
      <Text style={styles.instructionText}>
        {points <= 1
          ? "Mantén presionado el mapa para añadir puntos"
          : points < 3
          ? `${points} puntos — mínimo 3 para el área`
          : `${points} puntos · Toca Aplicar para filtrar`}
      </Text>
      <TouchableOpacity onPress={onCancel} hitSlop={8} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

function ToolbarContent({
  draftPoints,
  canConfirm,
  onUndo,
  onClear,
  onConfirm,
}: {
  draftPoints: PolygonCoord[];
  canConfirm: boolean;
  onUndo: () => void;
  onClear: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.toolbarContent}>
      <View style={styles.pointsCounter}>
        <Text style={styles.pointsCounterNum}>{draftPoints.length}</Text>
        <Text style={styles.pointsCounterLabel}>pts</Text>
      </View>

      <View style={styles.toolbarDivider} />

      <TouchableOpacity
        style={[styles.toolbarBtn, draftPoints.length === 0 && styles.toolbarBtnDisabled]}
        onPress={onUndo}
        disabled={draftPoints.length === 0}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-undo"
          size={18}
          color={draftPoints.length === 0 ? COLORS.cardBorder : COLORS.textSecondary}
        />
        <Text style={[styles.toolbarBtnText, draftPoints.length === 0 && styles.toolbarBtnTextDisabled]}>
          Deshacer
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toolbarBtn, draftPoints.length === 0 && styles.toolbarBtnDisabled]}
        onPress={onClear}
        disabled={draftPoints.length === 0}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={draftPoints.length === 0 ? COLORS.cardBorder : "#ef4444"}
        />
        <Text style={[styles.toolbarBtnText, draftPoints.length === 0 && styles.toolbarBtnTextDisabled]}>
          Limpiar
        </Text>
      </TouchableOpacity>

      <View style={styles.toolbarDivider} />

      <TouchableOpacity
        style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
        onPress={onConfirm}
        disabled={!canConfirm}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark" size={18} color={canConfirm ? COLORS.white : COLORS.cardBorder} />
        <Text style={[styles.confirmBtnText, !canConfirm && styles.confirmBtnTextDisabled]}>
          Aplicar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cancelBtn: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cancelText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  instruction: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 80,
    zIndex: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  instructionBlur: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  instructionAndroid: {
    backgroundColor: "rgba(15,23,42,0.82)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  instructionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  instructionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  toolbar: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    zIndex: 10,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  toolbarBlur: {
    borderRadius: 20,
  },
  toolbarAndroid: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  toolbarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  pointsCounter: {
    alignItems: "center",
    minWidth: 36,
  },
  pointsCounterNum: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
    lineHeight: 20,
  },
  pointsCounterLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  toolbarDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 6,
  },
  toolbarBtn: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  toolbarBtnDisabled: {
    opacity: 0.4,
  },
  toolbarBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  toolbarBtnTextDisabled: {
    color: COLORS.cardBorder,
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  confirmBtnDisabled: {
    backgroundColor: COLORS.background,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
  },
  confirmBtnTextDisabled: {
    color: COLORS.cardBorder,
  },
});
