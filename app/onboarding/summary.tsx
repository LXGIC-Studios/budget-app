import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { notification } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { generateBudgetCategories } from "../../src/budget";
import { formatCurrency, getMonthKey } from "../../src/utils";
import type { Bill } from "../../src/types";

const CAT_COLORS: Record<string, string> = {
  food: "#FF9500",
  shopping: colors.pink,
  transport: colors.cyan,
  bills: colors.red,
  fun: colors.yellow,
  health: colors.primary,
  savings: colors.primary,
  other: colors.textSecondary,
};

export default function OnboardingSummary() {
  const router = useRouter();
  const { saveProfile, saveBudget } = useApp();
  const params = useLocalSearchParams<{ income: string; bills: string }>();

  const income = parseFloat(params.income ?? "0");
  const bills: Bill[] = params.bills ? JSON.parse(params.bills) : [];
  const categories = generateBudgetCategories(income, bills);
  const totalBudget = categories.reduce((s, c) => s + c.allocated, 0);

  const handleFinish = async () => {
    notification("Success");

    await saveProfile({
      monthlyIncome: income,
      currency: "USD",
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
    });

    await saveBudget({
      month: getMonthKey(),
      categories,
    });

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
          <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.step}>STEP 3 OF 3</Text>
        </View>
        <Text style={styles.title}>NICE.{"\n"}HERE'S YOUR BUDGET.</Text>
        <Text style={styles.subtitle}>
          {formatCurrency(income)}/MO INCOME {"\u2192"} {formatCurrency(totalBudget)}{" "}
          BUDGETED
        </Text>

        <View style={styles.accentLine} />

        <View style={styles.catList}>
          {categories.map((cat) => {
            const borderColor = CAT_COLORS[cat.name.toLowerCase()] || colors.cyan;
            return (
              <View key={cat.id} style={[styles.catRow, { borderLeftWidth: 3, borderLeftColor: borderColor }]}>
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{cat.name.toUpperCase()}</Text>
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
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <Text style={styles.hint}>YOU CAN ADJUST THESE ANYTIME IN BUDGET</Text>
        <Pressable onPress={handleFinish} style={styles.btn}>
          <Text style={styles.btnText}>LET'S GO</Text>
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
  },
  stepDotDone: {
    width: 8,
    height: 8,
    backgroundColor: colors.primary,
    opacity: 0.4,
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
    marginBottom: spacing.sm,
  },
  accentLine: {
    height: 2,
    backgroundColor: colors.cyan,
  },
  catList: {
    gap: spacing.sm,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    padding: spacing.md,
  },
  catInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  catName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  fixedBadge: {
    backgroundColor: colors.primary + "20",
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  fixedText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  catAmount: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  bottom: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
    letterSpacing: 2,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    alignItems: "center",
  },
  btnText: {
    color: colors.bg,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 3,
  },
});
