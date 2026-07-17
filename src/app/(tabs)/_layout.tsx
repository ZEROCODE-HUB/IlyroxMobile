import { Tabs } from "expo-router";
import { COLORS } from "../../constants";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useConversations } from "../../hooks/messaging/useConversations";
import { usePendingAppointmentsCount } from "../../hooks/citas/usePendingAppointmentsCount";
import { useUnseenMatchesCount } from "../../hooks/matches/useUnseenMatchesCount";

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

          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";
          if (route.name === "index")
            iconName = "home-outline";
          else if (route.name === "Statistics")
            iconName = "stats-chart-outline";
          else if (route.name === "create")
            iconName = "add-circle-outline";
          else if (route.name === "profile")
            iconName = "person-outline";

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as Record<string, unknown>).tabBarTestID as string | undefined}
              onPress={onPress}
              style={styles.tabItem}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? COLORS.primary : COLORS.textTertiary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function TabLayout() {
  const { user } = useAuth();
  // Tracker global de mensajes no leídos (actualiza el useChatStore internamente)
  useConversations(user?.id);
  // Tracker global de citas próximas pendientes (actualiza useCitasStore)
  usePendingAppointmentsCount(user?.id);
  // Tracker global de matches sin ver (actualiza useMatchesStore)
  useUnseenMatchesCount(user?.id);

  return (
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
  );
}

const styles = StyleSheet.create({
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
});
