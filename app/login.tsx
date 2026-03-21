import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../src/context/AuthContext";
import { colors, radius, spacing } from "../src/theme";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setSubmitting(true);

    const result =
      mode === "login"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === "signup") {
      setError(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.content}>
          <Text style={styles.logo}>Stackd</Text>
          <Text style={styles.tagline}>Budget smarter.</Text>

          <View style={styles.toggle}>
            <Pressable
              onPress={() => { setMode("login"); setError(null); }}
              style={[styles.toggleBtn, mode === "login" && styles.toggleBtnActive]}
            >
              <Text
                style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}
              >
                Log In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setMode("signup"); setError(null); }}
              style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
            >
              <Text
                style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}
              >
                Sign Up
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.dimmed}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.dimmed}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.btn, submitting && styles.btnDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.btnText}>
                {mode === "login" ? "Log In" : "Create Account"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  content: {
    gap: spacing.md,
  },
  logo: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm - 2,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primary + "20",
  },
  toggleText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  toggleTextActive: {
    color: colors.primary,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    color: colors.white,
    fontSize: 16,
  },
  error: {
    color: colors.red,
    fontSize: 14,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "700",
  },
});
