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

    const inputContainerStyles = [
      styles.inputContainer,
      {
        backgroundColor: theme.colors.inputBackground,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
      },
      isFocused && {
        borderColor: theme.colors.primary,
        // Estabilizamos el fondo para evitar parpadeos
        backgroundColor: theme.isDark ? theme.colors.surface : COLORS.white,
        // 4. Reducimos la intensidad del shadow/elevation para evitar saltos de layout
        ...Platform.select({
          ios: {
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          },
          android: {
            elevation: isFocused ? 1 : 0, // Solo elevación mínima si está enfocado
          },
        }),
      },
      !!error && { borderColor: theme.colors.error },
      style,
    ];

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
        <View style={inputContainerStyles}>
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
                paddingVertical: Platform.OS === "ios" ? theme.spacing.md : 8, // Ajuste para Android
                fontSize: theme.typography.fontSizes.md,
                color: theme.colors.text,
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
    borderWidth: 1,
    overflow: "hidden",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
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
  },
  leftIconContainer: {},
  rightIconContainer: {},
  errorText: {},
  helperText: {},
});
