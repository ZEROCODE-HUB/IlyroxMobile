import React, { forwardRef, useState, useEffect } from "react";
import {
  Platform,
  TextInput,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Animated,
  Easing,
} from "react-native";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CommentInputProps extends React.ComponentProps<typeof AppInput> {
  onSend: () => void;
  isLoading?: boolean;
  onPickImage?: () => void;
  hasImage?: boolean;
  disableSend?: boolean;
  inputAccessoryViewID?: string;
  replyContext?: React.ReactNode;
}

export const CommentInput = forwardRef<TextInput, CommentInputProps>(
  (
    {
      onSend,
      isLoading,
      onPickImage,
      hasImage,
      disableSend,
      containerStyle,
      inputAccessoryViewID,
      replyContext,
      ...props
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const bottomPosition = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const showEvent =
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvent =
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

      const showListener = Keyboard.addListener(showEvent, (e) => {
        // Animación suave y directa con easing
        Animated.timing(bottomPosition, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === "ios" ? 250 : 200,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic),
        }).start();
      });

      const hideListener = Keyboard.addListener(hideEvent, () => {
        // Animación suave al bajar
        Animated.timing(bottomPosition, {
          toValue: 0,
          duration: Platform.OS === "ios" ? 250 : 200,
          useNativeDriver: false,
          easing: Easing.out(Easing.cubic),
        }).start();
      });

      return () => {
        showListener.remove();
        hideListener.remove();
      };
    }, []);

    return (
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            bottom: bottomPosition,
          },
        ]}
      >
        <View style={[styles.container, containerStyle]}>
          {replyContext}
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <AppInput
                ref={ref}
                containerStyle={styles.appInputContainer}
                inputStyle={styles.input}
                multiline
                maxLength={500}
                placeholder="Escribe un comentario..."
                inputAccessoryViewID={inputAccessoryViewID}
                {...props}
              />
            </View>

            <View style={styles.actions}>
              {onPickImage && (
                <TouchableOpacity
                  onPress={onPickImage}
                  disabled={isLoading}
                  style={styles.iconButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="images-outline"
                    size={24}
                    color={hasImage ? COLORS.primary : COLORS.textTertiary}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onSend}
                disabled={disableSend || isLoading}
                style={[
                  styles.sendButton,
                  disableSend && !isLoading && styles.disabledSend,
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons
                    name="send"
                    size={20}
                    color={disableSend ? COLORS.textDisabled : COLORS.primary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  animatedContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
  },
  container: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  appInputContainer: {
    marginBottom: 0,
  },
  input: {
    maxHeight: 100,
    minHeight: 40,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Platform.OS === "ios" ? 2 : 0,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledSend: {
    opacity: 0.6,
  },
});
