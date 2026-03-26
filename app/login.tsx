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
import { colors, spacing, radius } from "../src/theme";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="Email"
            placeholderTextColor={colors.dimmed}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
          />

          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="Password"
            placeholderTextColor={colors.dimmed}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
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
    letterSpacing: 6,
    textShadowColor: 'rgba(0,255,204,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.xl,
    letterSpacing: 3,
    fontWeight: "600",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.full,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.full,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 2,
  },
  toggleTextActive: {
    color: colors.bg,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.white,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  error: {
    color: colors.red,
    fontSize: 14,
    textAlign: "center",
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
