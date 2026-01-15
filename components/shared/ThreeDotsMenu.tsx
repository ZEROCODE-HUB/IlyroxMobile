/**
 * ThreeDotsMenu.tsx
 * Componente reutilizable de menú de 3 puntos con opciones personalizables
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
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

// Global state to track which menu is open
let currentOpenMenu: string | null = null;
const menuCallbacks: { [key: string]: () => void } = {};

const ThreeDotsMenu: React.FC<ThreeDotsMenuProps> = ({
  options,
  buttonStyle,
  menuPosition = "top-right",
  iconColor = COLORS.white,
  iconSize = 16,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuId = React.useRef(`menu-${Math.random()}`).current;

  useEffect(() => {
    // Register this menu's close callback
    menuCallbacks[menuId] = () => setShowMenu(false);

    return () => {
      // Cleanup on unmount
      delete menuCallbacks[menuId];
      if (currentOpenMenu === menuId) {
        currentOpenMenu = null;
      }
    };
  }, [menuId]);

  const getMenuPositionStyle = (): ViewStyle => {
    switch (menuPosition) {
      case "top-right":
        return { top: 28, right: 0 };
      case "top-left":
        return { top: 28, left: 0 };
      case "bottom-right":
        return { bottom: 28, right: 0 };
      case "bottom-left":
        return { bottom: 28, left: 0 };
      default:
        return { top: 28, right: 0 };
    }
  };

  const handleToggleMenu = (e: any) => {
    e.stopPropagation();

    // Close all other menus
    if (currentOpenMenu && currentOpenMenu !== menuId) {
      menuCallbacks[currentOpenMenu]?.();
    }

    const newShowMenu = !showMenu;
    setShowMenu(newShowMenu);

    if (newShowMenu) {
      currentOpenMenu = menuId;
    } else {
      currentOpenMenu = null;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.menuButton, buttonStyle]}
        onPress={handleToggleMenu}
        activeOpacity={0.7}
      >
        <Ionicons name="ellipsis-vertical" size={iconSize} color={iconColor} />
      </TouchableOpacity>

      {showMenu && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <TouchableOpacity
            style={styles.backdrop}
            onPress={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              currentOpenMenu = null;
            }}
            activeOpacity={1}
          />

          <View style={[styles.menuDropdown, getMenuPositionStyle()]}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuOption,
                  index === options.length - 1 && styles.menuOptionLast,
                ]}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  currentOpenMenu = null;
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
        </>
      )}
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
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 9998,
  },
  menuDropdown: {
    position: "absolute",
    backgroundColor: COLORS.white,
    borderRadius: 8,
    minWidth: 120,
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