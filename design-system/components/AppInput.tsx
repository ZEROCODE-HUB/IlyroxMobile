import React, { useState } from "react";
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

export const AppInput: React.FC<AppInputProps> = ({
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
}) => {
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
      backgroundColor: theme.isDark ? theme.colors.surface : COLORS.white,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: `0 0 0 2px ${theme.colors.primary}20`,
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
        { marginBottom: theme.spacing.md },
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
          style={[
            styles.input,
            {
              paddingVertical: theme.spacing.md,
              fontSize: theme.typography.fontSizes.md,
              color: theme.colors.text,
            },
            inputStyle,
          ]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.colors.placeholder}
          selectionColor={theme.colors.primary}
          accessibilityLabel={label || props.placeholder}
          accessibilityHint={helperText}
          accessibilityState={{ disabled: props.editable === false }}
          {...Platform.select({
            web: {
              outlineStyle: "none",
            } as any,
            default: {},
          })}
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
      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: theme.colors.error,
              fontSize: theme.typography.fontSizes.xs,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSizes.xs,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

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
