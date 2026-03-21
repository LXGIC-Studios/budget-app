import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { AppProvider, useApp } from "../src/context/AppContext";
import { colors } from "../src/theme";
import { useRouter, useSegments } from "expo-router";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#050505", padding: 20, justifyContent: "center" }}>
          <Text style={{ color: "#FF003C", fontSize: 18, fontWeight: "bold" }}>CRASH</Text>
          <Text style={{ color: "#F0F0F0", fontSize: 14, marginTop: 10 }}>{this.state.error.message}</Text>
          <Text style={{ color: "#666", fontSize: 12, marginTop: 10 }}>{this.state.error.stack?.substring(0, 500)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function Navigator() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: appLoading } = useApp();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading || appLoading) return;

    const inLogin = segments[0] === "login";
    const inOnboarding = segments[0] === "onboarding";

    if (!user) {
      if (!inLogin) router.replace("/login");
      return;
    }

    if (!profile?.onboardingComplete && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile?.onboardingComplete && (inOnboarding || inLogin)) {
      router.replace("/");
    }
  }, [user, profile, authLoading, appLoading, segments]);

  if (authLoading || appLoading) {
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
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <Navigator />
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
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
