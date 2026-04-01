import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { Home, PlusCircle, BarChart3 } from "lucide-react-native";
import { colors } from "../../src/theme";

function TabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <View
      style={
        focused
          ? { shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 8 }
          : undefined
      }
    >
      {children}
    </View>
  );
}

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
            borderTopColor: "rgba(0,255,204,0.2)",
            borderTopWidth: 1,
            height: Platform.OS === "web" ? 60 : 96,
            paddingBottom: Platform.OS === "web" ? 8 : 40,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.5,
            textTransform: "uppercase",
          },
        }}
      >
        {/* ---- ACTIVE TABS ---- */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <Home size={22} color={color} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: "Log",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <PlusCircle size={22} color={color} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused}>
                <BarChart3 size={22} color={color} />
              </TabIcon>
            ),
          }}
        />

        {/* ---- HIDDEN LEGACY TABS ---- */}
        <Tabs.Screen name="budget"    options={{ href: null }} />
        <Tabs.Screen name="debt"      options={{ href: null }} />
        <Tabs.Screen name="insights"  options={{ href: null }} />
        <Tabs.Screen name="history"   options={{ href: null }} />
        <Tabs.Screen name="household" options={{ href: null }} />
        <Tabs.Screen name="settings"  options={{ href: null }} />
      </Tabs>
    </View>
  );
}
