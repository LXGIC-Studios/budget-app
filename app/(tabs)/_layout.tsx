import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Home, BarChart3, CreditCard, TrendingUp, List, Users, Settings } from "lucide-react-native";
import { colors } from "../../src/theme";

export default function TabLayout() {
  return (
    <View style={{ flex: 1, paddingBottom: Platform.OS === "web" ? 44 : 0 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: "#050505",
          borderTopColor: 'rgba(0,255,204,0.15)',
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 60 : 96,
          paddingBottom: Platform.OS === "web" ? 8 : 40,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: Platform.OS === "web" ? 4 : 0,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <Home size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <BarChart3 size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="debt"
        options={{
          title: "Debt",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <CreditCard size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <TrendingUp size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <List size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: "Household",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <Users size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 6,
            } : undefined}>
              <Settings size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
