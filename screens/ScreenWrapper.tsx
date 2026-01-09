import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenWrapperProps {
  children: React.ReactNode;
  withHeader?: boolean;
  isList?: boolean;
  style?: any;
}

const HEADER_HEIGHT = 130;

export const ScreenWrapper = ({
  children,
  withHeader = true,
  isList = false,
  style,
}: ScreenWrapperProps) => {
  const insets = useSafeAreaInsets();

  const paddingTop = withHeader ? insets.top + HEADER_HEIGHT : insets.top;

  const paddingBottom = insets.bottom > 0 ? insets.bottom : 15;

  if (isList) {
    return (
      <View style={[styles.container, style]}>
        {React.cloneElement(children as React.ReactElement as any, {
          contentContainerStyle: {
            paddingTop: paddingTop,
            paddingBottom: paddingBottom + 80,
          },
          maintainVisibleContentPosition: { minIndexForVisible: 0 },
        })}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: paddingTop,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
