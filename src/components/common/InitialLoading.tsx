import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
} from "react-native";
import { COLORS } from "../../constants";

export const InitialLoading = () => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const barTranslateX = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Logo heartbeat and fade in
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.03,
            duration: 1200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
        ]),
      ),
      // Sliding loading bar animation
      Animated.loop(
        Animated.timing(barTranslateX, {
          toValue: 100,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.loaderContainer}>
        {/* Animated Loading Bar */}
        <View style={styles.loadingBarBackground}>
          <Animated.View
            style={[
              styles.loadingBarInner,
              {
                transform: [{ translateX: barTranslateX }],
              },
            ]}
          />
        </View>
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{ marginTop: 20 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  loaderContainer: {
    position: "absolute",
    bottom: 120,
    width: "100%",
    alignItems: "center",
  },
  loadingBarBackground: {
    width: 100,
    height: 4,
    backgroundColor: COLORS.dividerGray,
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingBarInner: {
    width: 100,
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    left: -100, // Start fully outside to the left
  },
});
