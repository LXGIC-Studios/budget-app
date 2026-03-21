import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { AppProvider, useApp } from "../src/context/AppContext";
import { colors } from "../src/theme";
import { useRouter, useSegments } from "expo-router";

function RootGuard() {
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

function AuthenticatedApp() {
  const { user } = useAuth();

  if (!user) {
    return <RootGuard />;
  }

  return (
    <AppProvider>
      <RootGuard />
    </AppProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
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
