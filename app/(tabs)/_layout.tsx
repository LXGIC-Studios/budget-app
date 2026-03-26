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
          backgroundColor: "#080808",
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: Platform.OS === "web" ? 60 : 96,
          paddingBottom: Platform.OS === "web" ? 8 : 40,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
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
          tabBarIcon: ({ color }) => (
            <Home size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="debt"
        options={{
          title: "Debt",
          tabBarIcon: ({ color, size }) => (
            <CreditCard size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <List size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: "Household",
          tabBarIcon: ({ color }) => (
            <Users size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Settings size={20} color={color} />
          ),
        }}
      />
    </Tabs>
    </View>
  );
}
