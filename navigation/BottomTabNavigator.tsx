import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { COLORS } from "../constants";

// Screens
import Feed from "../components/Feed/Feed";
import MapSearch from "../components/map/MapSearch";
import CreateContent from "../components/CreateContent";
import Matches from "../components/Matches";
import Statistics from "../components/Statistics";
import MessagingScreen from "../components/MessagingScreen";
import Appointments from "../components/Appointments";
import Profile from "../components/Profile/Profile";
import EditProperty from "../components/Profile/EditProperty";
import PropertyDetail from "../components/Details/PropertyDetail";
import SavedSearches from "../components/SavedSearches";
import SettingsScreen from "../screens/SettingsScreen";
import EasyBrokerSettingsScreen from "../screens/EasyBrokerSettingsScreen";

// Data
import { User } from "../types";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext"; // ← AGREGAR ESTO
import { SafeAreaView } from "react-native-safe-area-context";

export type RootTabParamList = {
  Feed: undefined;
  Map: undefined;
  Create: undefined;
  Matches: undefined;
  Stats: undefined;
  Messages: { user?: User } | undefined;
  Appointments: undefined;
  Profile: { userId?: string } | undefined;
  UserProfile: { userId: string } | undefined;
  EditProperty: { propertyId: string };
  PropertyDetail: { propertyId: string };
  SavedSearches: undefined;
  Settings: undefined;
  EasyBrokerSettings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

interface BottomTabNavigatorProps {
  onScrollFeed: (scrollY: number) => void;
  onUserClick: (user: User) => void;
}

export default function BottomTabNavigator({
  onScrollFeed,
  onUserClick,
}: BottomTabNavigatorProps) {
  const { properties, saveSearch } = useApp();
  const { user, profile } = useAuth(); // ← USAR AUTH CONTEXT

  return (
    <Tab.Navigator
      id="main-tabs"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bottomNav,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Feed">
        {() => (
          <Feed
            currentUserId={user?.id} // ← DE AUTH CONTEXT
            currentUserState={profile?.estado || ""} // ← DE AUTH CONTEXT
            onUserClick={onUserClick}
            onScroll={onScrollFeed}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Stats" component={Statistics} />
      <Tab.Screen name="Create" component={CreateContent} />
      <Tab.Screen name="Profile" component={ProfileWrapper} />

      {/* Hidden Tabs (accessible via Header) */}
      <Tab.Screen name="Map">
        {() => (
          <MapSearch
            properties={properties}
            onSaveSearch={(name, leadName, leadPhone) =>
              saveSearch(name, "", leadName, leadPhone)
            }
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Matches">{() => <Matches />}</Tab.Screen>
      <Tab.Screen name="Messages" component={MessagesWrapper} />
      <Tab.Screen name="Appointments" component={Appointments} />
      <Tab.Screen name="UserProfile" component={UserProfileWrapper} />
      <Tab.Screen name="EditProperty" component={EditPropertyWrapper} />
      <Tab.Screen name="PropertyDetail" component={PropertyDetailWrapper} />
      <Tab.Screen name="SavedSearches" component={SavedSearches} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="EasyBrokerSettings" component={EasyBrokerSettingsScreen} />
    </Tab.Navigator>
  );
}

// Wrapper for Profile to handle params (own profile only)
const ProfileWrapper = ({ route, navigation }: any) => {
  // Always show own profile in this tab
  return (
    <Profile userId={undefined} onBack={() => navigation.navigate("Feed")} />
  );
};

// Wrapper for UserProfile to view other users' profiles
const UserProfileWrapper = ({ route, navigation }: any) => {
  const userId = route.params?.userId;
  return <Profile userId={userId} onBack={() => navigation.goBack()} />;
};

// Wrapper for Messages to accept params and pass to component
const MessagesWrapper = ({ route }: any) => {
  const initialUser = route.params?.initialUser as User | undefined;
  const initialPropertyId = route.params?.initialPropertyId as string | undefined;
  
  return (
    <MessagingScreen 
      initialUser={initialUser} 
      initialPropertyId={initialPropertyId}
    />
  );
};
const PropertyDetailWrapper = ({ route, navigation }: any) => {
  const { propertyId } = route.params;
  return (
    <PropertyDetail
      propertyId={propertyId}
      navigation={navigation} // ← Pasar navigation directamente
onContact={(ownerId, propId) => {
  navigation.navigate("Messages", { 
    initialUser: { id: ownerId },  // ✅ Cambiar de "user" a "initialUser"
    initialPropertyId: propId 
  });
}}
    />
  );
};

const EditPropertyWrapper = ({ route, navigation }: any) => {
  const propertyId = route.params?.propertyId;

  if (!propertyId) {
    // Manejar el caso donde propertyId es undefined
    // Podrías mostrar una alerta y navegar de vuelta
    Alert.alert("Error", "No se proporcionó un ID de propiedad para editar.");
    navigation.goBack();
    return null; // No renderizar EditProperty si no hay ID
  }

  return (
    <EditProperty
      propertyId={propertyId}
      onBack={() => navigation.goBack()}
      onSuccess={() => {
        navigation.navigate("Profile");
      }}
    />
  );
};

// Custom Tab Bar to match the original design and only show specific tabs
const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const visibleRoutes = ["Feed", "Stats", "Create", "Profile"];

  // Hide navbar when viewing other user's profile, property detail or settings
  const currentRoute = state.routes[state.index]?.name;
  if (
    currentRoute === "UserProfile" ||
    currentRoute === "PropertyDetail" ||
    currentRoute === "EditProperty" ||
    currentRoute === "Settings" ||
    currentRoute === "EasyBrokerSettings"
  ) {
    return null;
  }

  const icons: Record<string, any> = {
    Feed: "home",
    Stats: "pie-chart",
    Create: "add-circle",
    Profile: "person",
  };

  const labels: Record<string, string> = {
    Feed: "Home",
    Stats: "Estadísticas",
    Create: "Crear",
    Profile: "Mi Perfil",
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.bottomNavSafeArea}>
      <View style={styles.bottomNav}>
        {visibleRoutes.map((routeName) => {
          const routeIndex = state.routes.findIndex(
            (r: any) => r.name === routeName
          );
          if (routeIndex === -1) return null;

          const route = state.routes[routeIndex];
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              if (routeName === "Profile") {
                navigation.navigate({
                  name: routeName,
                  params: { userId: undefined },
                  merge: true,
                });
              } else {
                navigation.navigate(routeName);
              }
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={icons[routeName]}
                size={24}
                color={isFocused ? COLORS.primary : COLORS.textTertiary}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? COLORS.primary : COLORS.textTertiary },
                ]}
              >
                {labels[routeName]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  bottomNavSafeArea: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  bottomNav: {
    flexDirection: "row",
    height: 65,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
});
