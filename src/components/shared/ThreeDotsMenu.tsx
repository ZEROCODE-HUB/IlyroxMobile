/**
 * ThreeDotsMenu.tsx
 * Componente reutilizable de menú de 3 puntos con opciones personalizables
 * Usa Modal transparente para escapar overflow:hidden de los contenedores padre
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export interface MenuOption {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}

interface ThreeDotsMenuProps {
  options: MenuOption[];
  buttonStyle?: ViewStyle;
  menuPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  iconColor?: string;
  iconSize?: number;
}

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get("window");
const MENU_WIDTH = 150;
const SCREEN_MARGIN = 10;

const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = ({
  options,
  buttonStyle,
  menuPosition = "top-right",
  iconColor = COLORS.white,
  iconSize = 16,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const buttonRef = useRef<View>(null);

  const handleToggleMenu = useCallback(
    (e: any) => {
      e.stopPropagation();

      if (showMenu) {
        setShowMenu(false);
        return;
      }

      // Medir la posición del botón en la pantalla
      buttonRef.current?.measureInWindow((x, y, width, height) => {
        setMenuAnchor({ x, y, width, height });
        setShowMenu(true);
      });
    },
    [showMenu],
  );

  const getDropdownPosition = (): ViewStyle => {
    const { x, y, width, height } = menuAnchor;

    let top = 0;
    let left = 0;
    const estimatedHeight = options.length * 45; // Aprox 45px por opción

    // 1. Cálculo base de LEFT
    if (menuPosition.includes("right")) {
      left = x + width - MENU_WIDTH;
    } else {
      left = x;
    }

    // 2. Cálculo base de TOP
    if (menuPosition.includes("top")) {
      top = y + height + 4;
    } else {
      top = y - estimatedHeight - 4;
    }

    // 3. AJUSTES DE LÍMITES HORIZONTALES
    if (left < SCREEN_MARGIN) {
      left = SCREEN_MARGIN;
    }
    if (left + MENU_WIDTH > WINDOW_WIDTH - SCREEN_MARGIN) {
      left = WINDOW_WIDTH - MENU_WIDTH - SCREEN_MARGIN;
    }

    // 4. AJUSTES DE LÍMITES VERTICALES
    if (top + estimatedHeight > WINDOW_HEIGHT - SCREEN_MARGIN) {
      // Si se sale por abajo, intentar moverlo arriba del botón
      top = y - estimatedHeight - 4;
    }
    if (top < SCREEN_MARGIN + 30) { // 30 para considerar status bar aprox
      // Si se sale por arriba, forzar abajo
      top = y + height + 4;
    }

    return { top, left };
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={buttonRef as any}
        style={[styles.menuButton, buttonStyle]}
        onPress={handleToggleMenu}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          {/* Dropdown menu posicionado absolutamente */}
          <View style={[styles.menuDropdown, getDropdownPosition()]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuOption,
                  index === options.length - 1 && styles.menuOptionLast,
                ]}
                onPress={() => {
                  setShowMenu(false);
                  option.onPress();
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={option.danger ? COLORS.error : COLORS.textPrimary}
                />
                <Text
                  style={[
                    styles.menuOptionText,
                    option.danger && styles.menuOptionTextDanger,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 9999,
  },
  menuButton: {
    backgroundColor: COLORS.blackTransparent60,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuDropdown: {
    position: "absolute",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    minWidth: 140,
    elevation: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: "hidden",
    zIndex: 10000,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  menuOptionLast: {
    borderBottomWidth: 0,
  },
  menuOptionText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  menuOptionTextDanger: {
    color: COLORS.error,
  },
});

export default ThreeDotsMenu;