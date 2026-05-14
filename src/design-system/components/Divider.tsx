import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  spacing?: keyof typeof theme.spacing | "none";
  color?: string;
  style?: ViewStyle | ViewStyle[];
}

export const Divider: React.FC<DividerProps> = ({
  orientation = "horizontal",
  spacing = "lg",
  color = COLORS.cardBorder,
  style,
}) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
  const gap = spacing === "none" ? 0 : theme.spacing[spacing];

  if (orientation === "vertical") {
    return (
      <View
        style={[
          styles.vertical,
          { backgroundColor: color, marginHorizontal: gap },
          flatStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        { backgroundColor: color, marginVertical: gap },
        flatStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth * 2,
    alignSelf: "stretch",
  },
  vertical: {
    width: StyleSheet.hairlineWidth * 2,
    alignSelf: "stretch",
  },
});
