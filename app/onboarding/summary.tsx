import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { notification } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { generateBudgetCategories } from "../../src/budget";
import { formatCurrency, getMonthKey, generateId } from "../../src/utils";
import type { Bill } from "../../src/types";

interface OnboardingDebt {
  name: string;
  type: string;
  balance: number;
  minimumPayment: number;
  emoji: string;
}

export default function OnboardingSummary() {
  const router = useRouter();
  const { saveProfile, saveBudget, addDebt } = useApp();
  const params = useLocalSearchParams<{
    income: string;
    bills: string;
    debts: string;
  }>();

  const income = parseFloat(params.income ?? "0");
  const bills: Bill[] = params.bills ? JSON.parse(params.bills) : [];
  const onboardingDebts: OnboardingDebt[] = params.debts
    ? JSON.parse(params.debts)
    : [];
  const categories = generateBudgetCategories(income, bills);
  const totalBudget = categories.reduce((s, c) => s + c.allocated, 0);
  const totalDebt = onboardingDebts.reduce((s, d) => s + d.balance, 0);

  // Determine starting baby step
  const startingBabyStep = onboardingDebts.length > 0 ? 1 : 1;

  const handleFinish = async () => {
    notification("Success");

    await saveProfile({
      monthlyIncome: income,
      currency: "USD",
      onboardingComplete: true,
      emergencyFundGoal: 1000,
      emergencyFundCurrent: 0,
      babyStep: startingBabyStep,
      createdAt: new Date().toISOString(),
    });

    await saveBudget({
      month: getMonthKey(),
      categories,
    });

    // Save debts
    const now = new Date().toISOString();
    for (const debt of onboardingDebts) {
      await addDebt({
        id: generateId(),
        name: debt.name,
        balance: debt.balance,
        minimumPayment: debt.minimumPayment,
        interestRate: 0,
        type: debt.type as any,
        createdAt: now,
        updatedAt: now,
      });
    }

    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.stepRow}>
          <View style={styles.stepDotDone} />
          <View style={styles.stepDotDone} />
          <View style={styles.stepDotDone} />
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.step}>Step 4 of 4</Text>
        </View>
        <Text style={styles.title}>Nice.{"\n"}Here's your plan.</Text>
        <Text style={styles.subtitle}>
          {formatCurrency(income)}/mo income {"\u2192"}{" "}
          {formatCurrency(totalBudget)} budgeted
        </Text>

        {/* Budget Categories */}
        <Text style={styles.sectionLabel}>BUDGET</Text>
        <View style={styles.catList}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catInfo}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={styles.catName}>{cat.name}</Text>
                {cat.type === "fixed" && (
                  <View style={styles.fixedBadge}>
                    <Text style={styles.fixedText}>FIXED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.catAmount}>
                {formatCurrency(cat.allocated)}
              </Text>
            </View>
          ))}
        </View>

        {/* Debts Section */}
        {onboardingDebts.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>DEBTS TO CRUSH</Text>
            <View style={styles.catList}>
              {onboardingDebts.map((debt, i) => (
                <View key={i} style={styles.debtRow}>
                  <View style={styles.catInfo}>
                    <Text style={styles.catEmoji}>{debt.emoji}</Text>
                    <Text style={styles.catName}>{debt.name}</Text>
                  </View>
                  <Text style={[styles.catAmount, { color: colors.red }]}>
                    {formatCurrency(debt.balance)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Debt</Text>
                <Text style={[styles.totalAmount, { color: colors.red }]}>
                  {formatCurrency(totalDebt)}
                </Text>
              </View>
            </View>

            <View style={styles.babyStepCard}>
              <Text style={styles.babyStepLabel}>YOUR STARTING POINT</Text>
              <Text style={styles.babyStepTitle}>
                Baby Step 1: Save $1,000
              </Text>
              <Text style={styles.babyStepDesc}>
                First, build a starter emergency fund. Then attack your debts
                smallest to largest.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Text style={styles.hint}>You can adjust these anytime</Text>
        <Pressable onPress={handleFinish} style={styles.btn}>
          <Text style={styles.btnText}>Let's Go</Text>
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
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  catList: {
    gap: 8,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  debtRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  catInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  fixedBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  catAmount: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  babyStepCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  babyStepLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  babyStepTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  babyStepDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  bottom: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
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
