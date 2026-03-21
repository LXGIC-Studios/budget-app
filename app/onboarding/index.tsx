import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { impact } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../src/theme";

export default function OnboardingIncome() {
  const router = useRouter();
  const [income, setIncome] = useState("");

  const handleNext = () => {
    const parsed = parseFloat(income);
    if (!parsed || parsed <= 0) return;
    impact("Medium");
    router.push({
      pathname: "/onboarding/bills",
      params: { income: parsed.toString() },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inner}
      >
        <View style={styles.content}>
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={styles.title}>How much do you{"\n"}make per month?</Text>
          <Text style={styles.subtitle}>
            After taxes. We'll use this to build your budget.
          </Text>

          <View style={styles.inputRow}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.dimmed}
              keyboardType="decimal-pad"
              value={income}
              onChangeText={setIncome}
              autoFocus
            />
          </View>
        </View>

        <Pressable
          onPress={handleNext}
          style={[styles.btn, !income && styles.btnDisabled]}
        >
          <Text style={styles.btnText}>Next</Text>
        </Pressable>
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
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  step: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dollar: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  input: {
    flex: 1,
    fontSize: 48,
    fontWeight: "700",
    color: colors.white,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "700",
  },
});
