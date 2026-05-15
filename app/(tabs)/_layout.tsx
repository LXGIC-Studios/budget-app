import { Tabs } from "expo-router";
import { Platform, View, Text, Pressable, StyleSheet } from "react-native";
import { Home, DollarSign, Calendar, Grid3x3 } from "lucide-react-native";
import { colors, fonts } from "../../src/theme";

const TABS = [
  { name: "index", label: "HOME", Icon: Home },
  { name: "budget", label: "BUDGET", Icon: DollarSign },
  { name: "bills-calendar", label: "BILLS", Icon: Calendar },
  { name: "monthly-view", label: "MONTHLY", Icon: Grid3x3 },
];

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={tb.bar}>
      {TABS.map((tab, i) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
        const focused = state.index === routeIndex;
        const { Icon } = tab;
        return (
          <Pressable
            key={tab.name}
            onPress={() => navigation.navigate(state.routes[routeIndex].name)}
            style={[tb.block, focused ? tb.blockActive : tb.blockInactive]}
          >
            <Icon size={20} color={focused ? "#000" : "#bbb"} strokeWidth={focused ? 2.5 : 1.5} />
            <Text style={[tb.label, focused ? tb.labelActive : tb.labelInactive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      {Platform.OS !== "web" && <View style={tb.safeArea} />}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    backgroundColor: "#080808",
  },
  block: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 3,
  },
  blockActive: {
    backgroundColor: colors.primary,
  },
  blockInactive: {
    backgroundColor: "#080808",
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: fonts.mono as any,
  },
  labelActive: {
    color: "#000",
  },
  labelInactive: {
    color: "#bbb",
  },
  safeArea: {
    position: "absolute",
    bottom: -34,
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: "#080808",
  },
});

export default function TabLayout() {
  return (
    <View style={{ flex: 1, paddingBottom: Platform.OS === "web" ? 0 : 34 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="budget" />
        <Tabs.Screen name="bills-calendar" />
        <Tabs.Screen name="monthly-view" />
        <Tabs.Screen name="debt" options={{ href: null }} />
        <Tabs.Screen name="insights" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
        <Tabs.Screen name="household" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="income-expenses" options={{ href: null }} />
        <Tabs.Screen name="log" options={{ href: null }} />
        <Tabs.Screen name="overview" options={{ href: null }} />
      </Tabs>
    </View>
  );
}