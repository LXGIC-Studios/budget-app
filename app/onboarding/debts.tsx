import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { impact } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../../src/theme";
import type { DebtType } from "../../src/types";

interface OnboardingDebt {
  name: string;
  type: DebtType;
  balance: string;
  minimumPayment: string;
  emoji: string;
}

const DEBT_PRESETS: { name: string; type: DebtType; emoji: string }[] = [
  { name: "Credit Card", type: "credit_card", emoji: "\uD83D\uDCB3" },
  { name: "Student Loan", type: "student_loan", emoji: "\uD83C\uDF93" },
  { name: "Car Loan", type: "car_loan", emoji: "\uD83D\uDE97" },
  { name: "Medical", type: "medical", emoji: "\uD83C\uDFE5" },
  { name: "Personal Loan", type: "personal", emoji: "\uD83D\uDCB0" },
];

export default function OnboardingDebts() {
  const router = useRouter();
  const { income, bills } = useLocalSearchParams<{
    income: string;
    bills: string;
  }>();
  const [debts, setDebts] = useState<OnboardingDebt[]>([]);

  const addPreset = (preset: (typeof DEBT_PRESETS)[0]) => {
    if (debts.find((d) => d.name === preset.name)) return;
    impact("Light");
    setDebts([
      ...debts,
      {
        name: preset.name,
        type: preset.type,
        balance: "",
        minimumPayment: "",
        emoji: preset.emoji,
      },
    ]);
  };

  const updateDebt = (
    idx: number,
    field: "balance" | "minimumPayment",
    val: string
  ) => {
    const updated = [...debts];
    updated[idx] = { ...updated[idx], [field]: val };
    setDebts(updated);
  };

  const removeDebt = (idx: number) => {
    impact("Light");
    setDebts(debts.filter((_, i) => i !== idx));
  };

  const handleNext = () => {
    impact("Medium");
    const validDebts = debts
      .filter((d) => parseFloat(d.balance) > 0)
      .map((d) => ({
        name: d.name,
        type: d.type,
        balance: parseFloat(d.balance) || 0,
        minimumPayment: parseFloat(d.minimumPayment) || 0,
        emoji: d.emoji,
      }));

    router.push({
      pathname: "/onboarding/summary",
      params: {
        income,
        bills,
        debts: JSON.stringify(validDebts),
      },
    });
  };

  const unusedPresets = DEBT_PRESETS.filter(
    (p) => !debts.find((d) => d.name === p.name)
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stepRow}>
          <View style={styles.stepDotDone} />
          <View style={styles.stepDotDone} />
          <View
            style={[styles.stepDot, { backgroundColor: colors.primary }]}
          />
          <View style={styles.stepDotInactive} />
          <Text style={styles.step}>Step 3 of 4</Text>
        </View>
        <Text style={styles.title}>Do you have{"\n"}any debts?</Text>
        <Text style={styles.subtitle}>
          We'll help you crush them using the debt snowball method.
        </Text>

        {/* Presets */}
        {unusedPresets.length > 0 && (
          <View style={styles.presets}>
            {unusedPresets.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => addPreset(preset)}
                style={styles.presetChip}
              >
                <Text style={styles.presetEmoji}>{preset.emoji}</Text>
                <Text style={styles.presetText}>{preset.name}</Text>
                <Text style={styles.presetPlus}>+</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Added debts */}
        {debts.map((debt, idx) => (
          <View key={debt.name} style={styles.debtCard}>
            <View style={styles.debtHeader}>
              <View style={styles.debtInfo}>
                <Text style={styles.debtEmoji}>{debt.emoji}</Text>
                <Text style={styles.debtName}>{debt.name}</Text>
              </View>
              <Pressable
                onPress={() => removeDebt(idx)}
                style={styles.removeBtn}
              >
                <Text style={styles.removeText}>{"\u00D7"}</Text>
              </Pressable>
            </View>
            <View style={styles.debtInputs}>
              <View style={styles.debtInputRow}>
                <Text style={styles.debtInputLabel}>Balance</Text>
                <View style={styles.debtAmountRow}>
                  <Text style={styles.debtDollar}>$</Text>
                  <TextInput
                    style={styles.debtInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.dimmed}
                    value={debt.balance}
                    onChangeText={(v) => updateDebt(idx, "balance", v)}
                  />
                </View>
              </View>
              <View style={styles.debtInputRow}>
                <Text style={styles.debtInputLabel}>Min. Payment</Text>
                <View style={styles.debtAmountRow}>
                  <Text style={styles.debtDollar}>$</Text>
                  <TextInput
                    style={styles.debtInput}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.dimmed}
                    value={debt.minimumPayment}
                    onChangeText={(v) =>
                      updateDebt(idx, "minimumPayment", v)
                    }
                  />
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable onPress={handleNext} style={styles.btn}>
          <Text style={styles.btnText}>
            {debts.length === 0 ? "No Debts - Skip" : "Next"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
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
    borderRadius: 4,
  },
  stepDotDone: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    opacity: 0.4,
  },
  stepDotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dimmed,
  },
  step: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  presetEmoji: {
    fontSize: 16,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  presetPlus: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  debtCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  debtHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  debtInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  debtEmoji: {
    fontSize: 20,
  },
  debtName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  removeText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 20,
  },
  debtInputs: {
    gap: spacing.sm,
  },
  debtInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  debtInputLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  debtAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  debtDollar: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  debtInput: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
    minWidth: 60,
    textAlign: "right",
  },
  bottom: {
    padding: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: radius.md,
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "700",
  },
});
