import { Tabs } from "expo-router";
import { Platform, View, Text, StyleSheet } from "react-native";
import { Home, PlusCircle, BarChart3, Sliders } from "lucide-react-native";
import { colors, fonts } from "../../src/theme";

function TabIcon({ children, focused, label }: { children: React.ReactNode; focused: boolean; label: string }) {
  return (
    <View style={[
      ts.block,
      focused ? ts.blockActive : ts.blockInactive,
    ]}>
      {children}
      <Text style={[
        ts.blockLabel,
        focused ? ts.blockLabelActive : ts.blockLabelInactive,
      ]}>{label}</Text>
    </View>
  );
}

const ts = StyleSheet.create({
  block: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blockActive: {
    backgroundColor: colors.primary,
  },
  blockInactive: {
    backgroundColor: "#080808",
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
    color: "#bbb",
  },
});

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#000",
          tabBarInactiveTintColor: "#bbb",
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#080808",
            borderTopColor: colors.primary,
            borderTopWidth: 2,
            height: Platform.OS === "web" ? 62 : 90,
            paddingBottom: 0,
            paddingTop: 0,
            paddingHorizontal: 0,
          },
          tabBarItemStyle: {
            flex: 1,
            padding: 0,
            margin: 0,
            paddingBottom: Platform.OS === "web" ? 0 : 28,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} label="HOME">
                <Home size={20} color={focused ? "#000" : "#bbb"} strokeWidth={focused ? 2.5 : 1.5} />
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
                <PlusCircle size={20} color={focused ? "#000" : "#bbb"} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="overview"
          options={{
            title: "Charts",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} label="CHARTS">
                <BarChart3 size={20} color={focused ? "#000" : "#bbb"} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />
        <Tabs.Screen
          name="budget"
          options={{
            title: "Budget",
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} label="BUDGET">
                <Sliders size={20} color={focused ? "#000" : "#bbb"} strokeWidth={focused ? 2.5 : 1.5} />
              </TabIcon>
            ),
          }}
        />

        {/* ---- HIDDEN LEGACY TABS ---- */}
        <Tabs.Screen name="debt"      options={{ href: null }} />
        <Tabs.Screen name="insights"  options={{ href: null }} />
        <Tabs.Screen name="history"   options={{ href: null }} />
        <Tabs.Screen name="household" options={{ href: null }} />
        <Tabs.Screen name="settings"  options={{ href: null }} />
      </Tabs>
    </View>
  );
}
