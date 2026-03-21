import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { notification } from "../../src/lib/haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../../src/theme";
import { useApp } from "../../src/context/AppContext";
import { generateBudgetCategories } from "../../src/budget";
import { formatCurrency, getMonthKey } from "../../src/utils";
import type { Bill } from "../../src/types";

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
          <Text style={styles.step}>Step 3 of 3</Text>
        </View>
        <Text style={styles.title}>Nice.{"\n"}Here's your budget.</Text>
        <Text style={styles.subtitle}>
          {formatCurrency(income)}/mo income {"\u2192"} {formatCurrency(totalBudget)}{" "}
          budgeted
        </Text>

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
      </ScrollView>

      <View style={styles.bottom}>
        <Text style={styles.hint}>You can adjust these anytime in Budget</Text>
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
