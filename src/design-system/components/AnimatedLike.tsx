import React from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { COLORS } from "../../constants/colors";
import { ThumbsUp, ThumbsDown } from "lucide-react-native";

interface AnimatedInteractionProps {
  isActive: boolean;
  onPress: () => void;
  variant?: "thumbs-up" | "thumbs-down";
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
}

// Configuración de animación "Snappy" (Rápida y profesional)
const SPRING_CONFIG = {
  mass: 0.5, // Ligero para que se mueva rápido
  stiffness: 400, // Tensión alta para velocidad
  damping: 15, // Frenado rápido para evitar rebotes exagerados
};

export default function AnimatedInteraction({
  isActive,
  onPress,
  variant = "thumbs-up",
  size = 24,
  activeColor = COLORS.primary,
  inactiveColor = COLORS.textSecondary,
  style,
}: AnimatedInteractionProps) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    onPress();

    // Secuencia de "Latido" rápido
    // 1. Crece un 25% (sutil pero visible)
    // 2. Vuelve a su tamaño original inmediatamente
    scale.value = withSequence(
      withSpring(1.25, SPRING_CONFIG),
      withSpring(1, SPRING_CONFIG)
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const IconComponent = variant === "thumbs-up" ? ThumbsUp : ThumbsDown;

  return (
    <Animated.View style={[styles.container, style, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1} // Desactivamos la opacidad nativa para controlar la animacion nosotros
        onPress={handlePress}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Aumenta área táctil
      >
        <IconComponent
          size={size}
          color={isActive ? COLORS.backgroundDeep : inactiveColor}
          fill={isActive ? activeColor : "transparent"}
          strokeWidth={isActive ? 2.5 : 2}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    padding: 4, // Padding reducido para mantenerlo compacto
  },
});
