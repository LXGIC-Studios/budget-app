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
import { colors, spacing } from "../../src/theme";

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
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
            <View style={styles.stepDotInactive} />
            <View style={styles.stepDotInactive} />
            <Text style={styles.step}>STEP 1 OF 3</Text>
          </View>
          <Text style={styles.title}>HOW MUCH DO YOU{"\n"}MAKE PER MONTH?</Text>
          <Text style={styles.subtitle}>
            AFTER TAXES. WE'LL USE THIS TO BUILD YOUR BUDGET.
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
          <Text style={styles.btnText}>NEXT</Text>
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
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepDot: {
    width: 8,
    height: 8,
  },
  stepDotInactive: {
    width: 8,
    height: 8,
    backgroundColor: colors.dimmed,
  },
  step: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 42,
    letterSpacing: -1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: spacing.sm,
  },
  dollar: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.primary,
  },
  input: {
    flex: 1,
    fontSize: 48,
    fontWeight: "900",
    color: colors.white,
    fontVariant: ["tabular-nums"],
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 3,
  },
});
