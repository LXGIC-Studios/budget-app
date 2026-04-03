import { Tabs } from "expo-router";
import { Platform, View, Text, StyleSheet } from "react-native";
import { Home, PlusCircle, BarChart3 } from "lucide-react-native";
import { colors, fonts } from "../../src/theme";

function TabIcon({ children, focused, label }: { children: React.ReactNode; focused: boolean; label: string }) {
  return (
    <View style={[
      tabStyles.block,
      focused ? tabStyles.blockActive : tabStyles.blockInactive,
    ]}>
      {children}
      <Text style={[
        tabStyles.blockLabel,
        focused ? tabStyles.blockLabelActive : tabStyles.blockLabelInactive,
      ]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  block: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: "100%",
  },
  blockActive: {
    backgroundColor: colors.primary,
  },
  blockInactive: {
    backgroundColor: "#0a0a0a",
  },
  blockLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: fonts.mono as any,
  },
  blockLabelActive: {
    color: "#000",
  },
  blockLabelInactive: {
    color: "#aaa",
  },
});

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#000",
          tabBarInactiveTintColor: "#aaa",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#000",
            borderTopColor: colors.primary,
            borderTopWidth: 2,
            height: Platform.OS === "web" ? 68 : 96,
            paddingBottom: Platform.OS === "web" ? 0 : 28,
            paddingTop: 0,
            paddingHorizontal: 0,
          },
          tabBarItemStyle: {
            padding: 0,
            margin: 0,
          },
        }}
      >
        {/* ---- ACTIVE TABS ---- */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} label="HOME">
                <Home size={22} color={focused ? "#000" : "#aaa"} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: "Log",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} label="LOG">
                <PlusCircle size={22} color={focused ? "#000" : "#aaa"} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} label="OVERVIEW">
                <BarChart3 size={22} color={focused ? "#000" : "#aaa"} strokeWidth={focused ? 2.5 : 1.5} />
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
