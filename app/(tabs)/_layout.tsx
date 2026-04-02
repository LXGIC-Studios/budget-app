import { Tabs } from "expo-router";
import { Platform, View, Text, StyleSheet } from "react-native";
import { Home, PlusCircle, BarChart3 } from "lucide-react-native";
import { colors, fonts } from "../../src/theme";

function TabIcon({ children, focused, label }: { children: React.ReactNode; focused: boolean; label: string }) {
  return (
    <View style={[
      tabStyles.iconWrap,
      focused ? tabStyles.iconWrapActive : tabStyles.iconWrapInactive,
    ]}>
      {children}
      <Text style={[
        tabStyles.iconLabel,
        focused ? tabStyles.iconLabelActive : tabStyles.iconLabelInactive,
      ]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    width: 72,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrapActive: {
    backgroundColor: "rgba(0, 255, 204, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 255, 204, 0.4)",
  },
  iconWrapInactive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  iconLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: fonts.mono as any,
  },
  iconLabelActive: {
    color: colors.primary,
  },
  iconLabelInactive: {
    color: colors.textSecondary,
  },
});

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#000",
            borderTopColor: colors.primary,
            borderTopWidth: 2,
            height: Platform.OS === "web" ? 72 : 100,
            paddingBottom: Platform.OS === "web" ? 10 : 34,
            paddingTop: 10,
            paddingHorizontal: 12,
          },
        }}
      >
        {/* ---- ACTIVE TABS ---- */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused} label="HOME">
                <Home size={20} color={color} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: "Log",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused} label="LOG">
                <PlusCircle size={20} color={color} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused} label="OVERVIEW">
                <BarChart3 size={20} color={color} strokeWidth={focused ? 2.5 : 1.5} />
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
