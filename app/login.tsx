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
import { colors, spacing } from "../src/theme";

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
          <Text style={styles.logo}>STACKD</Text>
          <View style={styles.accentLine} />
          <Text style={styles.tagline}>BUDGET SMARTER.</Text>

          <View style={styles.toggle}>
            <Pressable
              onPress={() => { setMode("login"); setError(null); }}
              style={[styles.toggleBtn, mode === "login" && styles.toggleBtnActive]}
            >
              <Text
                style={[styles.toggleText, mode === "login" && styles.toggleTextActive]}
              >
                LOG IN
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setMode("signup"); setError(null); }}
              style={[styles.toggleBtn, mode === "signup" && styles.toggleBtnActive]}
            >
              <Text
                style={[styles.toggleText, mode === "signup" && styles.toggleTextActive]}
              >
                SIGN UP
              </Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="EMAIL"
            placeholderTextColor={colors.dimmed}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="PASSWORD"
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
                {mode === "login" ? "LOG IN" : "CREATE ACCOUNT"}
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
    fontSize: 56,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -3,
  },
  accentLine: {
    height: 2,
    backgroundColor: colors.cyan,
    marginHorizontal: 80,
    marginVertical: spacing.xs,
  },
  tagline: {
    color: colors.cyan,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 1.5,
  },
  toggleTextActive: {
    color: colors.bg,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.dimmed,
    padding: spacing.md,
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 1,
  },
  error: {
    color: colors.red,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
