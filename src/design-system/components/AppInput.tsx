import React, { useState, forwardRef } from "react";
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
  showCounter?: boolean;
}

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
      showCounter,
      ...props
    },
    ref,
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

    // Determinar el color del borde según el estado
    const getBorderColor = () => {
      if (error) return COLORS.error;
      if (isFocused) return COLORS.primary;
      return COLORS.cardBorder;
    };

    // Determinar el estilo de sombra según el estado
    const getShadowStyle = () => {
      if (!isFocused) return {};
      return Platform.select({
        ios: {
          shadowColor: error ? COLORS.error : COLORS.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
        default: {},
      });
    };

    return (
      <View
        style={[
          styles.container,
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
                color: error ? COLORS.error : theme.colors.textSecondary,
                marginBottom: theme.spacing.xs,
              },
            ]}
          >
            {label}
          </Text>
        )}
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: getBorderColor(),
              borderWidth: isFocused ? 1.5 : 1,
              backgroundColor: isFocused ? COLORS.white : COLORS.background,
            },
            getShadowStyle(),
          ]}
        >
          {leftIcon && (
            <View
              style={[
                styles.leftIconContainer,
                { marginLeft: theme.spacing.md, marginRight: theme.spacing.sm },
              ]}
            >
              {leftIcon}
            </View>
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                paddingVertical: Platform.OS === "ios" ? theme.spacing.md : 12,
                fontSize: theme.typography.fontSizes.md,
                paddingLeft: leftIcon ? theme.spacing.xs : theme.spacing.md,
                paddingRight: rightIcon ? theme.spacing.xs : theme.spacing.md,
              },
              inputStyle,
            ]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={COLORS.textTertiary}
            selectionColor={theme.colors.primary}
            {...props}
          />
          {rightIcon && (
            <View
              style={[
                styles.rightIconContainer,
                { marginRight: theme.spacing.md, marginLeft: theme.spacing.sm },
              ]}
            >
              {rightIcon}
            </View>
          )}
        </View>
        <View style={styles.footerContainer}>
          <View style={{ flex: 1 }}>
            {error && <Text style={styles.errorText}>{error}</Text>}
            {helperText && !error && (
              <Text style={styles.helperText}>{helperText}</Text>
            )}
          </View>
          {showCounter && props.maxLength && (
            <Text style={styles.counterText}>
              {String(props.value || "").length}/{props.maxLength}
            </Text>
          )}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
  label: {},
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    minHeight: 52,
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
    color: COLORS.textPrimary,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as any,
      default: {},
    }),
  },
  leftIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  rightIconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  footerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  counterText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
    marginRight: 4,
  },
});
