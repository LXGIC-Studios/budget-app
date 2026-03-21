import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AppProvider, useApp } from "../src/context/AppContext";
import { colors } from "../src/theme";
import { useRouter, useSegments } from "expo-router";

function RootGuard() {
  const { profile, loading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inOnboarding = segments[0] === "onboarding";

    if (!profile?.onboardingComplete && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile?.onboardingComplete && inOnboarding) {
      router.replace("/");
    }
  }, [profile, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: "slide_from_right",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootGuard />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
