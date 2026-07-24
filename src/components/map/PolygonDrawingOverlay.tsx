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
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  drawingMode: boolean;
  draftPoints: PolygonCoord[];
  onCancel: () => void;
  onUndo: () => void;
  onClear: () => void;
  /** Distancia desde el tope del mapContainer hasta donde empieza el área libre de la barra superior */
  topOffset?: number;
  /** Si ya hay zonas dibujadas; cuando es true no se muestra el hint inicial. */
  hasZones?: boolean;
}

export default function PolygonDrawingOverlay({
  drawingMode,
  draftPoints,
  onCancel,
  onUndo,
  onClear,
  topOffset = 0,
  hasZones = false,
}: Props) {
  const toolbarAnim = useRef(new Animated.Value(0)).current;
  const instructionAnim = useRef(new Animated.Value(0)).current;
  const hintAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // El hint guía al usuario a dibujar; solo cuando no está dibujando ni hay zonas.
  const showHint = !drawingMode && !hasZones;

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

  useEffect(() => {
    Animated.timing(hintAnim, {
      toValue: showHint ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showHint]);

  const hintY = hintAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  const toolbarY = toolbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  const instructionY = instructionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 0],
  });

  return (
    <>
      {/* ── Hint inicial: cómo empezar a dibujar (cuando no se dibuja ni hay zonas) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.instruction,
          {
            top: topOffset + 12,
            opacity: hintAnim,
            transform: [{ translateY: hintY }],
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="dark" style={styles.instructionBlur}>
            <HintContent />
          </BlurView>
        ) : (
          <View style={styles.instructionAndroid}>
            <HintContent />
          </View>
        )}
      </Animated.View>

      {/* ── Instrucción superior (solo en drawing mode) ── */}
      <Animated.View
        style={[
          styles.instruction,
          {
            top: topOffset + 12,
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
            bottom: 24 + insets.bottom,
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
              onUndo={onUndo}
              onClear={onClear}
            />
          </BlurView>
        ) : (
          <View style={styles.toolbarAndroid}>
            <ToolbarContent
              draftPoints={draftPoints}
              onUndo={onUndo}
              onClear={onClear}
            />
          </View>
        )}
      </Animated.View>
    </>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function HintContent() {
  return (
    <View style={styles.instructionRow}>
      <Ionicons name="create-outline" size={15} color={COLORS.white} />
      <Text style={styles.instructionText}>
        Mantén presionado el mapa para dibujar tu zona
      </Text>
    </View>
  );
}

function InstructionContent({ points, onCancel }: { points: number; onCancel: () => void }) {
  const msg =
    points <= 1
      ? "Toca el mapa para añadir puntos"
      : points < 3
      ? `${points} puntos — mínimo 3 para el área`
      : `${points} puntos · Toca el primer punto para cerrar`;

  return (
    <View style={styles.instructionRow}>
      <Text style={styles.instructionText}>{msg}</Text>
      <TouchableOpacity onPress={onCancel} hitSlop={8} style={styles.cancelBtn}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

function ToolbarContent({
  draftPoints,
  onUndo,
  onClear,
}: {
  draftPoints: PolygonCoord[];
  onUndo: () => void;
  onClear: () => void;
}) {
  const empty = draftPoints.length === 0;
  return (
    <View style={styles.toolbarContent}>
      {/* Contador */}
      <View style={styles.pointsCounter}>
        <Text style={styles.pointsCounterNum}>{draftPoints.length}</Text>
        <Text style={styles.pointsCounterLabel}>pts</Text>
      </View>

      <View style={styles.toolbarDivider} />

      {/* Deshacer */}
      <TouchableOpacity
        style={[styles.toolbarBtn, empty && styles.toolbarBtnDisabled]}
        onPress={onUndo}
        disabled={empty}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-undo"
          size={16}
          color={empty ? COLORS.cardBorder : COLORS.textSecondary}
        />
        <Text style={[styles.toolbarBtnText, empty && styles.toolbarBtnTextDisabled]}>
          Deshacer
        </Text>
      </TouchableOpacity>

      {/* Limpiar */}
      <TouchableOpacity
        style={[styles.toolbarBtn, empty && styles.toolbarBtnDisabled]}
        onPress={onClear}
        disabled={empty}
        activeOpacity={0.7}
      >
        <Ionicons
          name="trash-outline"
          size={16}
          color={empty ? COLORS.cardBorder : "#ef4444"}
        />
        <Text style={[styles.toolbarBtnText, empty && styles.toolbarBtnTextDisabled]}>
          Limpiar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cancelBtn: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cancelText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  instruction: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  instructionBlur: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    // Mismo motivo que `toolbarBlur`: expo-blur instala el efecto dentro de
    // draw() con un UIViewPropertyAnimator pausado, y UIKit lo anula bajo un
    // ancestro con opacity animada nativamente. Sin fondo propio, el texto
    // blanco quedaba sobre el mapa.
    backgroundColor: "rgba(15,23,42,0.82)",
  },
  instructionAndroid: {
    backgroundColor: "rgba(15,23,42,0.82)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  instructionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  toolbar: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    zIndex: 10,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  toolbarBlur: {
    borderRadius: 18,
    // El desenfoque por sí solo deja ver el mapa a través de la barra y los
    // iconos quedan ilegibles. Android usa un blanco sólido; en iOS se mantiene
    // el blur pero sobre una base casi opaca.
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  toolbarAndroid: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  toolbarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  pointsCounter: {
    alignItems: "center",
    minWidth: 30,
  },
  pointsCounterNum: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
    lineHeight: 18,
  },
  pointsCounterLabel: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  toolbarDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 8,
  },
  toolbarBtn: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
  },
  toolbarBtnDisabled: {
    opacity: 0.35,
  },
  toolbarBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  toolbarBtnTextDisabled: {
    color: COLORS.cardBorder,
  },
});
