import React from "react";
import { Tabs } from "expo-router";
import { COLORS } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useEffect, useRef } from "react";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { useConversations } from "../../hooks/messaging/useConversations";
import { usePendingAppointmentsCount } from "../../hooks/citas/usePendingAppointmentsCount";
import { useUnseenMatchesCount } from "../../hooks/matches/useUnseenMatchesCount";

const TAB_ICONS: Record<
  string,
  { outline: keyof typeof Ionicons.glyphMap; fill: keyof typeof Ionicons.glyphMap }
> = {
  index: { outline: "home-outline", fill: "home" },
  Statistics: { outline: "stats-chart-outline", fill: "stats-chart" },
  create: { outline: "add-circle-outline", fill: "add-circle" },
  profile: { outline: "person-outline", fill: "person" },
};

const TabIcon: React.FC<{
  routeName: string;
  isFocused: boolean;
}> = ({ routeName, isFocused }) => {
  const { outline, fill } = TAB_ICONS[routeName] ?? TAB_ICONS.index;

  const fillOpacity = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(fillOpacity, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [isFocused, fillOpacity]);

  return (
    <View style={styles.iconWrapper}>
      <Animated.View
        style={{
          opacity: fillOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
        }}
      >
        <Ionicons
          name={outline}
          size={25}
          color={isFocused ? COLORS.primary : COLORS.textTertiary}
        />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: fillOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.iconCenter}>
          <Ionicons name={fill} size={25} color={COLORS.primary} />
        </View>
      </Animated.View>
    </View>
  );
};

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomNavSafeArea,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.bottomNav}>
        {state.routes.map((route, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as Record<string, unknown>).tabBarTestID as string | undefined}
              onPress={onPress}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <TabIcon routeName={route.name} isFocused={isFocused} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function TabLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // Tracker global de mensajes no leídos (actualiza el useChatStore internamente)
  useConversations(user?.id);
  // Tracker global de citas próximas pendientes (actualiza useCitasStore)
  usePendingAppointmentsCount(user?.id);
  // Tracker global de matches sin ver (actualiza useMatchesStore)
  useUnseenMatchesCount(user?.id);

  return (
    <View style={{ flex: 1 }}>
      {/* Gradiente negro→transparente sobre el área del status bar (safe area
          top, tamaño natural). pointerEvents="none" para no bloquear toques;
          las pages extienden su contenido detrás para que se vea el degradado. */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0.45)", "rgba(0, 0, 0, 0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.topGradient,
          { height: insets.top, width: "100%" },
        ]}
        pointerEvents="none"
      />
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Feed",
          }}
        />
        <Tabs.Screen
          name="Statistics"
          options={{
            title: "Stats",
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottomNavSafeArea: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomNav: {
    flexDirection: "row",
    height: 60,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
