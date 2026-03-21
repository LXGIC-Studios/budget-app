import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { AppProvider, useApp } from "../src/context/AppContext";
import { colors } from "../src/theme";
import { useRouter, useSegments } from "expo-router";

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{flex:1,backgroundColor:'#050505',padding:20,justifyContent:'center'}}>
          <Text style={{color:'#FF003C',fontSize:18,fontWeight:'bold'}}>CRASH</Text>
          <Text style={{color:'#F0F0F0',fontSize:14,marginTop:10}}>{this.state.error.message}</Text>
          <Text style={{color:'#666',fontSize:12,marginTop:10}}>{this.state.error.stack?.substring(0,500)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function UnauthGuard() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading) return;
    const inLogin = segments[0] === "login";
    if (!inLogin) router.replace("/login");
  }, [authLoading, segments]);

  if (authLoading) {
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

function AuthGuard() {
  const { profile, loading: appLoading } = useApp();
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading || appLoading) return;

    const inLogin = segments[0] === "login";
    const inOnboarding = segments[0] === "onboarding";

    if (!profile?.onboardingComplete && !inOnboarding) {
      router.replace("/onboarding");
    } else if (profile?.onboardingComplete && (inOnboarding || inLogin)) {
      router.replace("/");
    }
  }, [profile, authLoading, appLoading, segments]);

  if (appLoading) {
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
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <UnauthGuard />;
  }

  return (
    <AppProvider>
      <AuthGuard />
    </AppProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedApp />
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
