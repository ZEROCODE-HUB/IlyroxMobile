import React, { useState, forwardRef } from "react"; // 1. Agregamos forwardRef
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Platform,
} from "react-native";
import { useAppTheme } from "../theme";
import { COLORS } from "../../constants/colors";

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: object;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputStyle?: object;
}

// 2. Envolvemos el componente en forwardRef
export const AppInput = forwardRef<TextInput, AppInputProps>(
  (
    {
      label,
      error,
      helperText,
      containerStyle,
      leftIcon,
      rightIcon,
      onFocus,
      onBlur,
      style,
      inputStyle,
      ...props
    },
    ref // 3. Recibimos la referencia
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const theme = useAppTheme();

    const handleFocus = (e: any) => {
      setIsFocused(true);
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      if (onBlur) onBlur(e);
    };

    return (
      <View
        style={[
          styles.container,
          // 5. El margen ahora es opcional. Si pasas containerStyle, este manda.
          { marginBottom: containerStyle ? 0 : theme.spacing.md },
          containerStyle,
        ]}
      >
        {label && (
          <Text
            style={[
              styles.label,
              {
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                color: theme.colors.textSecondary,
                marginBottom: theme.spacing.xs,
              },
            ]}
          >
            {label}
          </Text>
        )}
        <View style={styles.inputContainer}>
          {leftIcon && (
            <View
              style={[
                styles.leftIconContainer,
                { marginRight: theme.spacing.sm },
              ]}
            >
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref} // 6. Pasamos la ref al input real
            style={[
              styles.input,
              {
                paddingVertical: Platform.OS === "ios" ? theme.spacing.md : 10, // Ajuste para Android
                fontSize: theme.typography.fontSizes.md,
                paddingLeft: theme.spacing.md,
              },
              inputStyle,
            ]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={theme.colors.placeholder}
            selectionColor={theme.colors.primary}
            {...props}
          />
          {rightIcon && (
            <View
              style={[
                styles.rightIconContainer,
                { marginLeft: theme.spacing.sm },
              ]}
            >
              {rightIcon}
            </View>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
  label: {},
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    textColor: COLORS.backgroundDeep,
    borderWidth: 1,
    overflow: "hidden",
    borderColor: COLORS.backgroundDeep,
    focus: COLORS.primary,
    borderRadius: 10,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
    backgroundColor: COLORS.background,
  },
  leftIconContainer: {},
  rightIconContainer: {},
  errorText: {},
  helperText: {},
});
